// Creates customer orders. The browser sends product ids, finishes and quantities; everything else
// (prices, discounts, shipping, totals) is worked out here from the database, inside one transaction
// that also takes the stock. If any step fails, nothing is saved.
import { randomInt } from "node:crypto";
import { z } from "zod";
import { prisma } from "./db.js";
import { toCents, unitPriceCents, shippingCents, needsVat, normaliseVat } from "../src/shared/pricing.js";

export class OrderError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status; this.code = code; this.details = details;
  }
}

const text = (max, min = 1) => z.string().trim().min(min).max(max);

export function orderSchema(cfg) {
  const countries = cfg.shipping.zones.flatMap(zn => zn.countries);
  return z.object({
    language: z.enum(cfg.languages).default(cfg.defaultLanguage),
    botcheck: z.any().optional(),
    customer: z.object({
      name: text(120),
      company: text(160),
      email: z.string().trim().toLowerCase().max(254).email(),
      phone: z.string().trim().min(5).max(40).regex(/^\+?[0-9][0-9\s().\-\/]{3,}$/, "Enter a valid phone number"),
      street: text(200),
      postcode: text(20),
      city: text(100),
      country: z.enum(countries),
      vat: z.string().trim().max(30).optional().default(""),
      notes: z.string().trim().max(2000).optional().default("")
    }),
    items: z.array(z.object({
      productId: z.string().min(1).max(40),
      finish: z.string().min(1).max(20),
      quantity: z.number().int().min(1).max(9999)
    })).min(1).max(50)
  });
}

// FR-260926-7K3Q9X: date plus 6 random characters (no 0/O/1/I), checked for uniqueness.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
async function newOrderNumber(tx) {
  const d = new Date();
  const date = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  for (let i = 0; i < 10; i++) {
    const code = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
    const orderNumber = `FR-${date}-${code}`;
    if (!(await tx.order.findUnique({ where: { orderNumber }, select: { id: true } }))) return orderNumber;
  }
  throw new Error("Couldn't generate a unique order number");
}

const money = cents => (cents / 100).toFixed(2);

export async function createOrder(input, cfg) {
  const { customer, items, language } = input;

  // EU customers must give a VAT number in the right format.
  let vatNumber = customer.vat || null;
  if (needsVat(customer.country)) {
    vatNumber = normaliseVat(customer.country, customer.vat);
    if (!vatNumber) throw new OrderError(422, "invalid", "Check the VAT number.", { fields: { vat: "invalid" } });
  }

  // Merge repeated lines (same product and finish); volume discounts apply per line, as in the cart.
  const lines = [];
  for (const it of items) {
    const same = lines.find(l => l.productId === it.productId && l.finish === it.finish);
    if (same) same.quantity += it.quantity; else lines.push({ ...it });
  }

  const regionName = new Intl.DisplayNames(["en"], { type: "region" }).of(customer.country);

  return prisma.$transaction(async tx => {
    const ids = [...new Set(lines.map(l => l.productId))];
    const products = new Map((await tx.product.findMany({ where: { id: { in: ids } } })).map(p => [p.id, p]));

    // 1. Every product must exist, be active and come in the chosen finish. Sample kits: one per order.
    const unavailable = ids.filter(id => !products.get(id)?.isActive);
    if (unavailable.length) {
      throw new OrderError(422, "unavailable", "Some products are no longer available.",
        { products: unavailable.map(id => ({ productId: id, name: products.get(id)?.name || null })) });
    }
    for (const l of lines) {
      const p = products.get(l.productId);
      if (!p.finishes.includes(l.finish)) throw new OrderError(422, "invalid", `${p.name} isn't available in that finish.`, { productId: p.id });
      if (p.isTrial && (l.quantity > 1 || lines.filter(x => x.productId === p.id).length > 1)) {
        throw new OrderError(422, "invalid", "The sample kit is limited to one per order.", { productId: p.id });
      }
    }

    // 2. Prices from the database, in cents.
    let subtotal = 0;
    const priced = lines.map(l => {
      const p = products.get(l.productId);
      const unit = unitPriceCents(toCents(p.price.toString()), cfg.finishes, cfg.tiers, l.finish, l.quantity);
      subtotal += unit * l.quantity;
      return { ...l, product: p, unit, total: unit * l.quantity };
    });
    const shipping = shippingCents(cfg.shipping, customer.country, subtotal);
    if (shipping === null) throw new OrderError(422, "invalid", "We don't ship to that country.", { fields: { country: "invalid" } });
    const total = subtotal + shipping;

    // 3. Stock. Check everything first so the customer hears about every short line at once, then take
    //    the stock with a conditional update so two simultaneous orders can't oversell.
    const wanted = new Map();
    for (const l of priced) wanted.set(l.productId, (wanted.get(l.productId) || 0) + l.quantity);
    const short = [...wanted].filter(([id, n]) => products.get(id).quantity < n)
      .map(([id, n]) => ({ productId: id, name: products.get(id).name, available: products.get(id).quantity, requested: n }));
    if (short.length) throw new OrderError(409, "stock", "Not enough stock.", { products: short });
    for (const [id, n] of wanted) {
      const res = await tx.product.updateMany({ where: { id, quantity: { gte: n } }, data: { quantity: { decrement: n } } });
      if (res.count !== 1) {
        const now = await tx.product.findUnique({ where: { id }, select: { quantity: true, name: true } });
        throw new OrderError(409, "stock", "Not enough stock.", { products: [{ productId: id, name: now?.name, available: now?.quantity ?? 0, requested: n }] });
      }
    }

    // 4. The order and its lines, with name, SKU, finish and price copied in as they are today.
    const order = await tx.order.create({
      data: {
        orderNumber: await newOrderNumber(tx),
        customerName: customer.name, customerEmail: customer.email, customerPhone: customer.phone,
        shippingAddress: `${customer.street}\n${customer.postcode} ${customer.city}\n${regionName}`,
        company: customer.company, vatNumber, country: customer.country, language,
        customerNotes: customer.notes || null,
        status: "PENDING",
        subtotal: money(subtotal), shippingCost: money(shipping), total: money(total),
        items: {
          create: priced.map(l => ({
            productId: l.productId, productName: l.product.name, sku: l.product.sku, finish: l.finish,
            unitPrice: money(l.unit), quantity: l.quantity, lineTotal: money(l.total)
          }))
        }
      },
      include: { items: true }
    });

    return {
      orderNumber: order.orderNumber, currency: cfg.currency,
      subtotal: money(subtotal), shipping: money(shipping), total: money(total),
      items: order.items.map(i => ({ name: i.productName, sku: i.sku, finish: i.finish, quantity: i.quantity, unitPrice: i.unitPrice.toFixed(2), lineTotal: i.lineTotal.toFixed(2) }))
    };
  });
}
