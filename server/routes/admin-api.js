// Admin API. Every route except login requires a valid admin session, checked here on the server.
// State-changing requests must also come from this application's own pages (Origin check).
import { z } from "zod";
import { prisma } from "../db.js";
import { env, isProduction } from "../env.js";
import { SESSION_COOKIE, cookieOptions, createSession, readSession, sameOrigin, verifyPassword, verifyAgainstDummy } from "../auth.js";

const STATUSES = ["PENDING", "APPROVED", "PROCESSING", "DELIVERED", "CANCELLED"];

// Loads the admin behind the session cookie, or null. Also confirms the account still exists.
export async function currentAdmin(request) {
  const session = await readSession(request);
  if (!session) return null;
  return prisma.adminUser.findUnique({ where: { id: session.id }, select: { id: true, name: true, email: true, role: true } });
}

// Bullet points: an array, or text with one bullet per line.
const detailsField = z.union([z.array(z.string()), z.string()])
  .transform(v => (Array.isArray(v) ? v : v.split("\n")).map(x => x.trim()).filter(Boolean))
  .pipe(z.array(z.string().max(200, "Keep each bullet under 200 characters")).max(12, "Use at most 12 bullets"));

export function productSchema(categories, locales = ["de", "fr", "pl", "it"]) {
  const price = z.union([z.string(), z.number()]).transform(v => String(v).trim().replace(",", "."))
    .pipe(z.string().regex(/^\d{1,6}(\.\d{1,2})?$/, "Enter a price like 12.90 (not negative, at most 2 decimals)"));
  // Other languages: all optional. A language with any text needs a name; an empty one falls back to English.
  const translation = z.object({
    name: z.string().trim().max(200).default(""),
    summary: z.string().trim().max(2000).default(""),
    details: detailsField.default([])
  }).superRefine((t, ctx) => {
    if (!t.name && (t.summary || t.details.length)) ctx.addIssue({ code: "custom", path: ["name"], message: "Add a name, or clear this language to use English" });
  });
  return z.object({
    name: z.string().trim().min(1, "Enter a name").max(200),
    slug: z.string().trim().toLowerCase().min(1, "Enter a slug").max(120).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens"),
    sku: z.string().trim().toUpperCase().min(2, "Enter a part number").max(32).regex(/^[A-Z0-9][A-Z0-9-]*$/, "Use letters, numbers and hyphens"),
    category: z.enum(categories.map(c => c.id), { message: "Choose a category" }),
    line: z.enum(["pro", "essential"]).default("pro"),
    description: z.string().trim().max(2000).default(""),
    details: detailsField.default([]),
    price,
    quantity: z.coerce.number({ message: "Enter a quantity" }).int("Use a whole number").min(0, "Quantity can't be negative").max(1000000),
    imageUrl: z.string().trim().max(500).refine(v => v === "" || /^https:\/\/[^\s]+$/i.test(v), "Use an https:// link, or leave empty").default(""),
    isActive: z.boolean().default(true),
    translations: z.object(Object.fromEntries(locales.map(l => [l, translation.optional()]))).optional()
  });
}

// How complete each language is: "complete" (name, description, bullets), "partial" or "missing".
export function languageStatus(p, locales) {
  const grade = (name, summary, details) => !name ? "missing" : summary && Array.isArray(details) && details.length ? "complete" : "partial";
  const out = { en: grade(p.name, p.description, p.details) };
  for (const l of locales) {
    const t = p.translations?.find(x => x.locale === l);
    out[l] = t ? grade(t.name, t.summary, t.details) : "missing";
  }
  return out;
}

// Saves the other-language text in the same transaction as the product.
async function saveTranslations(tx, productId, translations) {
  if (!translations) return;
  for (const [locale, t] of Object.entries(translations)) {
    if (!t) continue;
    if (!t.name && !t.summary && !t.details.length) {
      await tx.productTranslation.deleteMany({ where: { productId, locale } });
    } else {
      await tx.productTranslation.upsert({
        where: { productId_locale: { productId, locale } },
        update: { name: t.name, summary: t.summary, details: t.details },
        create: { productId, locale, name: t.name, summary: t.summary, details: t.details }
      });
    }
  }
}

function fieldErrors(error) {
  const fields = {};
  for (const i of error.issues) {
    const key = i.path.filter(p => typeof p === "string").join(".");
    if (key && !fields[key]) fields[key] = i.message;
  }
  return fields;
}

const adminProduct = p => ({
  id: p.id, name: p.name, slug: p.slug, sku: p.sku, category: p.category, line: p.line, description: p.description,
  details: Array.isArray(p.details) ? p.details : [],
  price: p.price.toFixed(2), quantity: p.quantity, imageUrl: p.imageUrl || "", isActive: p.isActive,
  createdAt: p.createdAt, updatedAt: p.updatedAt
});

export default async function adminApi(app, { site }) {
  const locales = site.cfg.languages.filter(l => l !== site.cfg.defaultLanguage);
  const schema = productSchema(site.categories, locales);
  const partialSchema = schema.partial();
  const withTranslations = p => ({
    ...adminProduct(p),
    translations: Object.fromEntries(locales.map(l => {
      const t = p.translations?.find(x => x.locale === l);
      return [l, { name: t?.name || "", summary: t?.summary || "", details: Array.isArray(t?.details) ? t.details : [] }];
    })),
    languages: languageStatus(p, locales)
  });
  const loadFull = id => prisma.product.findUnique({ where: { id }, include: { translations: true } });

  // --- login / logout ---
  // Failed attempts are counted per IP address and email: 5 failures lock that pair for 15 minutes.
  // A successful login clears the count. The plugin limit below only stops floods from one IP.
  const FAIL_MAX = 5, FAIL_WINDOW = 15 * 60 * 1000;
  const failures = new Map();
  const failKey = (req, email) => `${req.ip}|${email}`;
  const locked = key => { const f = failures.get(key); if (f && f.until < Date.now()) failures.delete(key); return (failures.get(key)?.count || 0) >= FAIL_MAX; };
  const addFailure = key => { const f = failures.get(key); failures.set(key, { count: (f && f.until > Date.now() ? f.count : 0) + 1, until: Date.now() + FAIL_WINDOW }); };
  setInterval(() => { const now = Date.now(); for (const [k, f] of failures) if (f.until < now) failures.delete(k); }, 60_000).unref();

  app.post("/api/admin/login", {
    config: { rateLimit: { max: 30, timeWindow: "15 minutes", errorResponseBuilder: () => ({ statusCode: 429, message: "Too many attempts. Wait 15 minutes and try again." }) } }
  }, async (request, reply) => {
    if (!sameOrigin(request, env.APPLICATION_URL)) return reply.code(403).send({ error: "Request refused." });
    const body = z.object({ email: z.string().trim().toLowerCase().max(254), password: z.string().min(1).max(200) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Enter your email and password." });
    const key = failKey(request, body.data.email);
    if (locked(key)) return reply.code(429).send({ error: "Too many failed attempts. Wait 15 minutes and try again." });
    const admin = await prisma.adminUser.findUnique({ where: { email: body.data.email } });
    const ok = admin ? await verifyPassword(admin.passwordHash, body.data.password) : await verifyAgainstDummy(body.data.password);
    if (!admin || !ok) { addFailure(key); return reply.code(401).send({ error: "Email or password is incorrect." }); }
    failures.delete(key);
    reply.setCookie(SESSION_COOKIE, await createSession(admin), cookieOptions(isProduction));
    return { ok: true, name: admin.name };
  });

  app.post("/api/admin/logout", async (request, reply) => {
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });

  // --- everything below needs a session ---
  app.register(async protectedRoutes => {
    protectedRoutes.addHook("onRequest", async (request, reply) => {
      reply.header("Cache-Control", "no-store");
      const admin = await currentAdmin(request);
      if (!admin) return reply.code(401).send({ error: "Log in to continue." });
      if (request.method !== "GET" && !sameOrigin(request, env.APPLICATION_URL)) return reply.code(403).send({ error: "Request refused." });
      request.admin = admin;
    });

    protectedRoutes.get("/api/admin/me", async request => request.admin);

    protectedRoutes.get("/api/admin/stats", async () => {
      const [totalProducts, activeProducts, totalOrders, pendingOrders, latest] = await Promise.all([
        prisma.product.count(), prisma.product.count({ where: { isActive: true } }),
        prisma.order.count(), prisma.order.count({ where: { status: "PENDING" } }),
        prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, orderNumber: true, customerName: true, company: true, total: true, status: true, createdAt: true } })
      ]);
      return { totalProducts, activeProducts, totalOrders, pendingOrders, latestOrders: latest.map(o => ({ ...o, total: o.total.toFixed(2) })) };
    });

    // --- products ---
    protectedRoutes.get("/api/admin/products", async () => {
      const rows = await prisma.product.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { translations: true } });
      return rows.map(p => ({ ...adminProduct(p), languages: languageStatus(p, locales) }));
    });

    protectedRoutes.get("/api/admin/products/:id", async (request, reply) => {
      const p = await loadFull(request.params.id);
      return p ? withTranslations(p) : reply.code(404).send({ error: "Product not found." });
    });

    const saveErrors = (err, reply) => {
      if (err.code === "P2002") {
        const target = String(err.meta?.target || "");
        const field = target.includes("sku") ? "sku" : "slug";
        return reply.code(409).send({ error: `That ${field === "sku" ? "part number" : "slug"} is already used by another product.`, fields: { [field]: "Already used by another product" } });
      }
      if (err.code === "P2025") return reply.code(404).send({ error: "Product not found." });
      throw err;
    };

    protectedRoutes.post("/api/admin/products", async (request, reply) => {
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) return reply.code(422).send({ error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) });
      const d = parsed.data;
      const last = await prisma.product.aggregate({ _max: { sortOrder: true } });
      try {
        const { translations, ...data } = d;
        const id = await prisma.$transaction(async tx => {
          const p = await tx.product.create({ data: { ...data, imageUrl: data.imageUrl || null, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
          await saveTranslations(tx, p.id, translations);
          return p.id;
        });
        return reply.code(201).send(withTranslations(await loadFull(id)));
      } catch (err) { return saveErrors(err, reply); }
    });

    protectedRoutes.put("/api/admin/products/:id", async (request, reply) => {
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) return reply.code(422).send({ error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) });
      const d = parsed.data;
      try {
        const { translations, ...data } = d;
        await prisma.$transaction(async tx => {
          await tx.product.update({ where: { id: request.params.id }, data: { ...data, imageUrl: data.imageUrl || null } });
          await saveTranslations(tx, request.params.id, translations);
        });
        return withTranslations(await loadFull(request.params.id));
      } catch (err) { return saveErrors(err, reply); }
    });

    // Activate / deactivate (and other single-field changes) without resending the whole form.
    protectedRoutes.patch("/api/admin/products/:id", async (request, reply) => {
      const parsed = partialSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(422).send({ error: "Check the highlighted fields.", fields: fieldErrors(parsed.error) });
      // Only the fields actually sent: validation defaults must not overwrite the rest.
      const sent = new Set(Object.keys(request.body || {}));
      const { translations, ...all } = parsed.data;
      const data = Object.fromEntries(Object.entries(all).filter(([k]) => sent.has(k)));
      if ("imageUrl" in data) data.imageUrl = data.imageUrl || null;
      try {
        await prisma.$transaction(async tx => {
          await tx.product.update({ where: { id: request.params.id }, data });
          await saveTranslations(tx, request.params.id, translations);
        });
        return withTranslations(await loadFull(request.params.id));
      }
      catch (err) { return saveErrors(err, reply); }
    });

    // Products that appear in past orders can't be deleted (the orders keep pointing at them);
    // deactivate them instead so they disappear from the shop.
    protectedRoutes.delete("/api/admin/products/:id", async (request, reply) => {
      const id = request.params.id;
      const product = await prisma.product.findUnique({ where: { id }, select: { id: true } });
      if (!product) return reply.code(404).send({ error: "Product not found." });
      const used = await prisma.orderItem.count({ where: { productId: id } });
      if (used) return reply.code(409).send({ error: `This product is in ${used} order line${used === 1 ? "" : "s"}, so it can't be deleted. Deactivate it instead.`, code: "in_orders" });
      await prisma.product.delete({ where: { id } });
      return { ok: true };
    });

    // --- orders ---
    protectedRoutes.get("/api/admin/orders", async request => {
      const status = STATUSES.includes(request.query.status) ? request.query.status : undefined;
      const rows = await prisma.order.findMany({
        where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: 500,
        select: { id: true, orderNumber: true, customerName: true, company: true, total: true, status: true, createdAt: true }
      });
      return rows.map(o => ({ ...o, total: o.total.toFixed(2) }));
    });

    protectedRoutes.get("/api/admin/orders/:id", async (request, reply) => {
      const o = await prisma.order.findUnique({ where: { id: request.params.id }, include: { items: true } });
      if (!o) return reply.code(404).send({ error: "Order not found." });
      return {
        ...o, subtotal: o.subtotal.toFixed(2), shippingCost: o.shippingCost.toFixed(2), total: o.total.toFixed(2),
        items: o.items.map(i => ({ ...i, unitPrice: i.unitPrice.toFixed(2), lineTotal: i.lineTotal.toFixed(2) }))
      };
    });

    protectedRoutes.patch("/api/admin/orders/:id/status", async (request, reply) => {
      const body = z.object({ status: z.enum(STATUSES) }).safeParse(request.body);
      if (!body.success) return reply.code(422).send({ error: "Choose a valid status." });
      try {
        const o = await prisma.order.update({ where: { id: request.params.id }, data: { status: body.data.status }, select: { id: true, status: true, updatedAt: true } });
        return o;
      } catch (err) {
        if (err.code === "P2025") return reply.code(404).send({ error: "Order not found." });
        throw err;
      }
    });
  });
}
