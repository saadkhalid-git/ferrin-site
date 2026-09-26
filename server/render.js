// Renders the public pages with the existing templates, using products from the database.
import { layout } from "../src/templates/layout.js";
import * as pages from "../src/templates/pages.js";
import { makeContext, catalogFor, rootIndex, sitemap, sitemapEntry, pageList } from "../src/site/context.js";
import { activeProducts } from "./catalog.js";

export async function contextFor(site, lang) {
  const products = await activeProducts(lang, site);
  const ctx = makeContext({ cfg: site.cfg, dicts: site.dicts, categories: site.categories, products, lang, media: site.media, version: site.media.version });
  ctx.catalogUrl = `/api/products?lang=${lang}`;
  ctx.ordersApi = "/api/orders";
  ctx.hasOg = site.hasOg;
  return ctx;
}

const SIMPLE = {
  "": "home", cart: "cart", "order-sent": "orderSent", "quick-order": "quickOrder", "price-list": "priceList",
  "private-label": "privateLabel", about: "about", contact: "contact", faq: "faq"
};

// Returns the HTML for /<lang>/<route>/, or null for "not found".
export async function renderRoute(site, lang, route) {
  const ctx = await contextFor(site, lang);
  const parts = route.split("/").filter(Boolean);
  let page = null;
  if (parts.length <= 1 && SIMPLE[parts[0] || ""]) page = pages[SIMPLE[parts[0] || ""]](ctx);
  else if (parts[0] === "shop" && parts.length === 1) page = pages.shop(ctx);
  else if (parts[0] === "shop" && parts.length === 2) { const cat = ctx.catOf(parts[1]); if (cat) page = pages.shop(ctx, cat); }
  else if (parts[0] === "product" && parts.length === 2) { const p = ctx.byId(parts[1]); if (p) page = pages.product(ctx, p); }
  else if (parts.length === 1 && lang === site.cfg.defaultLanguage) page = pages.legal(ctx).find(pg => pg.path === parts[0]) || null;
  return page ? layout(ctx, page) : null;
}

export async function renderNotFound(site, lang) {
  const ctx = await contextFor(site, lang);
  return layout(ctx, pages.notFound(ctx));
}

export async function renderRoot(site) {
  return rootIndex(await contextFor(site, site.cfg.defaultLanguage));
}

export async function renderSitemap(site) {
  const entries = [];
  for (const lang of site.cfg.languages) {
    const ctx = await contextFor(site, lang);
    for (const page of pageList(pages, ctx, site.cfg)) if (!page.noindex) entries.push(sitemapEntry(ctx, page));
  }
  return sitemap(entries);
}

export async function catalogJson(site, lang) {
  return catalogFor(await contextFor(site, lang), site.dicts);
}
