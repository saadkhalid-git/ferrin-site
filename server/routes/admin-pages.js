// Admin pages. Each one checks the session on the server before any data is loaded;
// without a valid session the visitor is sent to /admin/login.
import { readFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { prisma } from "../db.js";
import { ROOT } from "../catalog.js";
import { currentAdmin, languageStatus } from "./admin-api.js";
import * as views from "../../src/templates/admin/views.js";

export default async function adminPages(app, { site }) {
  // Cache-busting tag for the admin stylesheet and script, from their contents.
  const version = createHash("sha1").update(["admin.css", "admin.js"].map(f => readFileSync(path.join(ROOT, "src/admin", f))).join("")).digest("hex").slice(0, 8);
  const categories = site.categories.map(c => ({ id: c.id, draw: c.draw, name: site.dicts.en.categories[c.id]?.name || c.id }));
  const locales = site.cfg.languages.filter(l => l !== site.cfg.defaultLanguage);
  const html = (reply, body, code = 200) => reply.code(code).header("Cache-Control", "no-store").type("text/html; charset=utf-8").send(body);

  app.get("/admin/login", async (request, reply) => {
    if (await currentAdmin(request)) return reply.redirect("/admin/dashboard");
    const next = typeof request.query.next === "string" && /^\/admin\/[\w\-/?=&]*$/.test(request.query.next) ? request.query.next : "";
    return html(reply, views.loginPage({ version, next }));
  });
  app.get("/admin", async (request, reply) => reply.redirect((await currentAdmin(request)) ? "/admin/dashboard" : "/admin/login"));

  app.register(async pages => {
    pages.addHook("onRequest", async (request, reply) => {
      const admin = await currentAdmin(request);
      if (!admin) return reply.redirect(`/admin/login?next=${encodeURIComponent(request.url)}`);
      request.admin = admin;
    });
    const render = async (request, reply, title, active, body, code) => {
      const pendingCount = await prisma.order.count({ where: { status: "PENDING" } });
      return html(reply, views.shell({ title, active, admin: request.admin, version, pendingCount }, body), code);
    };

    pages.get("/admin/dashboard", async (request, reply) => {
      const [totalProducts, activeProducts, totalOrders, pendingOrders, latestOrders, lowStock] = await Promise.all([
        prisma.product.count(), prisma.product.count({ where: { isActive: true } }),
        prisma.order.count(), prisma.order.count({ where: { status: "PENDING" } }),
        prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
        prisma.product.findMany({ where: { isActive: true, quantity: { lte: views.LOW_STOCK } }, orderBy: [{ quantity: "asc" }, { name: "asc" }], take: 8 })
      ]);
      return render(request, reply, "Dashboard", "dashboard",
        views.dashboard({ stats: { totalProducts, activeProducts, totalOrders, pendingOrders }, latestOrders, lowStock, categories }));
    });

    pages.get("/admin/products", async (request, reply) => {
      const rows = await prisma.product.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { translations: true } });
      const products = rows.map(p => ({ ...p, languages: languageStatus(p, locales) }));
      return render(request, reply, "Products", "products", views.productList(products, categories, locales, request.query));
    });

    pages.get("/admin/products/new", async (request, reply) =>
      render(request, reply, "Create product", "products", views.productForm(null, categories, locales)));

    pages.get("/admin/products/:id/edit", async (request, reply) => {
      const p = await prisma.product.findUnique({ where: { id: request.params.id }, include: { translations: true } });
      if (!p) return render(request, reply, "Not found", "products", views.notFound(), 404);
      const translations = Object.fromEntries(locales.map(l => {
        const t = p.translations.find(x => x.locale === l);
        return [l, { name: t?.name || "", summary: t?.summary || "", details: Array.isArray(t?.details) ? t.details : [] }];
      }));
      const product = { ...p, price: p.price.toFixed(2), imageUrl: p.imageUrl || "", details: Array.isArray(p.details) ? p.details : [], translations, languages: languageStatus(p, locales) };
      return render(request, reply, `Edit ${p.name}`, "products", views.productForm(product, categories, locales));
    });

    pages.get("/admin/orders", async (request, reply) => {
      const status = views.STATUSES.includes(request.query.status) ? request.query.status : null;
      const [orders, grouped] = await Promise.all([
        prisma.order.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: 500 }),
        prisma.order.groupBy({ by: ["status"], _count: { _all: true } })
      ]);
      const counts = Object.fromEntries(grouped.map(g => [g.status, g._count._all]));
      const total = grouped.reduce((n, g) => n + g._count._all, 0);
      return render(request, reply, "Orders", "orders", views.orderList(orders, { status, counts, total }));
    });

    pages.get("/admin/orders/:id", async (request, reply) => {
      const o = await prisma.order.findUnique({ where: { id: request.params.id }, include: { items: true } });
      if (!o) return render(request, reply, "Not found", "orders", views.notFound(), 404);
      return render(request, reply, `Order ${o.orderNumber}`, "orders", views.orderDetail(o));
    });

    pages.get("/admin/*", async (request, reply) => render(request, reply, "Not found", "", views.notFound(), 404));
  });
}
