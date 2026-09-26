// Builds the context every page template receives. Shared by the static build (build.mjs) and the
// server (server/render.js), so both render identical pages. Products passed in are already in the
// page's language: { id (slug), sku, cat, price, finishes, draw, name, summary, details, ... }.
import { drawTool } from "../shared/drawings.js";
import { baseFinish } from "../shared/pricing.js";
import { LANGUAGE_KEY, LANGUAGE_RULES, pickLanguage } from "../shared/language.js";

const DEFAULT_COUNTRY = { en: "LU", de: "DE", fr: "FR", pl: "PL", it: "IT" };

export function makeContext({ cfg, dicts, categories, products, lang, media, version, warn = () => {}, now = new Date() }) {
  const { photos = {}, images = {}, credits = [] } = media || {};
  const d = dicts[lang], en = dicts[cfg.defaultLanguage];
  const t = (key, vars = {}) => {
    let s = d.ui[key];
    if (s === undefined) { warn(`${lang}: missing "${key}"`); s = en.ui[key]; }
    if (s === undefined) { warn(`missing key "${key}"`); return key; }
    return s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  };
  const cats = categories.map(c => {
    const tr = d.categories[c.id] || en.categories[c.id];
    if (!d.categories[c.id]) warn(`${lang}: missing category ${c.id}`);
    return { ...c, ...tr };
  });
  const moneyFmt = new Intl.NumberFormat(cfg.locales[lang], { style: "currency", currency: cfg.currency });
  const regions = new Intl.DisplayNames([cfg.locales[lang]], { type: "region" });
  const languagesFmt = l => new Intl.DisplayNames([l], { type: "language" }).of(l);
  const countryCodes = cfg.shipping.zones.flatMap(z => z.countries);
  const countries = countryCodes.map(code => ({ code, name: regions.of(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, cfg.locales[lang]));
  const def = DEFAULT_COUNTRY[lang];
  countries.sort((a, b) => (a.code === def ? -1 : b.code === def ? 1 : 0));
  const base = cfg.basePath;
  const digits = s => String(s || "").replace(/\D/g, "");
  return {
    lang, cfg, t, photos, images, credits, version, buildDate: now, countries,
    wa: cfg.whatsapp ? `https://wa.me/${digits(cfg.whatsapp)}` : "",
    tel: cfg.phone ? `tel:+${digits(cfg.phone)}` : "",
    faq: d.faq || en.faq,
    products, cats,
    byId: id => products.find(p => p.id === id),
    catOf: id => cats.find(c => c.id === id),
    inCat: id => products.filter(p => p.cat === id),
    money: n => moneyFmt.format(n),
    url: (p = "", l = lang) => `${base}/${l}/${p ? p.replace(/\/$/, "") + "/" : ""}`,
    asset: p => `${base}/assets/${p}`,
    abs: u => cfg.siteOrigin + u,
    langName: l => { const n = languagesFmt(l); return n.charAt(0).toUpperCase() + n.slice(1); },
    year: now.getFullYear()
  };
}

// Static catalogue text (build.mjs): localise products.json with the language files.
export function localiseStatic(products, dicts, lang, defaultLanguage, warn = () => {}) {
  const d = dicts[lang], en = dicts[defaultLanguage];
  return products.map(p => {
    const tr = d.products[p.id] || en.products[p.id];
    if (!d.products[p.id]) warn(`${lang}: missing product ${p.id}`);
    return { ...p, ...tr };
  });
}

// Every page of one language, in the order they're built.
export function pageList(pages, ctx, cfg) {
  return [
    pages.home(ctx), pages.shop(ctx),
    ...ctx.cats.map(c => pages.shop(ctx, c)),
    ...ctx.products.map(p => pages.product(ctx, p)),
    pages.cart(ctx), pages.orderSent(ctx), pages.quickOrder(ctx), pages.priceList(ctx),
    pages.privateLabel(ctx), pages.about(ctx), pages.contact(ctx), pages.faq(ctx),
    ...(ctx.lang === cfg.defaultLanguage ? pages.legal(ctx) : [])
  ];
}

// What the browser script needs: interface text, pricing rules and the products (with stock when known).
export function catalogFor(ctx, dicts) {
  const { cfg } = ctx;
  const items = {};
  for (const p of ctx.products) {
    const ph = ctx.photos[p.sku]?.[0];
    const thumb = p.imageUrl ? `<img src="${escAttr(p.imageUrl)}" alt="" loading="lazy">`
      : ph ? `<img src="${ph.src[400].jpg}" alt="" loading="lazy">`
      : drawTool(Object.assign({ nodim: true }, p.draw), 0, false);
    items[p.id] = {
      id: p.id, pid: p.pid, sku: p.sku, name: p.name, price: p.price, finishes: p.finishes, def: baseFinish(p, cfg.finishes),
      url: ctx.url(`product/${p.id}`), cat: p.cat, moq: cfg.privateLabelMinimum[p.cat], line: p.line, trial: Boolean(p.trial),
      stock: typeof p.quantity === "number" ? p.quantity : null, thumb
    };
  }
  const ui = {};
  for (const k of Object.keys(dicts[cfg.defaultLanguage].ui)) ui[k] = ctx.t(k);
  return {
    lang: ctx.lang, locale: cfg.locales[ctx.lang], currency: cfg.currency, brand: cfg.brand,
    orderEmail: cfg.orderEmail, web3formsKey: cfg.web3formsKey, whatsapp: ctx.wa, ordersApi: Boolean(cfg.ordersApi),
    tiers: cfg.tiers, finishes: cfg.finishes, shipping: cfg.shipping,
    countries: ctx.countries, ui, products: items
  };
}

const escAttr = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// The start page: saved language first, otherwise one picked from the device's time zone.
export function rootIndex(ctx) {
  const { cfg } = ctx;
  const langs = cfg.languages;
  const links = langs.map(l => `<li><a href="${ctx.url("", l)}" hreflang="${l}" lang="${l}">${ctx.langName(l)}</a></li>`).join("");
  return `<!doctype html>
<html lang="${cfg.defaultLanguage}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${cfg.brand}</title>
  ${langs.map(l => `<link rel="alternate" hreflang="${l}" href="${ctx.abs(ctx.url("", l))}">`).join("\n  ")}
  <link rel="alternate" hreflang="x-default" href="${ctx.abs(ctx.url("", cfg.defaultLanguage))}">
  <link rel="icon" href="${ctx.asset("favicon.svg")}" type="image/svg+xml">
  <script>
    (function () {
      var base = ${JSON.stringify(cfg.basePath)}, langs = ${JSON.stringify(langs)}, def = ${JSON.stringify(cfg.defaultLanguage)};
      var KEY = ${JSON.stringify(LANGUAGE_KEY)}, rules = ${JSON.stringify(LANGUAGE_RULES)};
      var pickLanguage = ${pickLanguage.toString()};
      // 1. A language saved on an earlier visit, or chosen in the language menu, wins.
      var lang = null;
      try { lang = localStorage.getItem(KEY); } catch (e) {}
      // 2. Otherwise pick one from the device's time zone (country) and remember it.
      if (langs.indexOf(lang) < 0) {
        var tz = "";
        try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
        lang = pickLanguage(tz, navigator.languages || [navigator.language || ""], langs, def, rules);
        try { localStorage.setItem(KEY, lang); } catch (e) {}
      }
      // Links from the first version of the site used #/product/..., #/shop/... and so on.
      var h = location.hash.replace(/^#\\/?/, "").split("?")[0].replace(/\\/$/, "");
      location.replace(base + "/" + lang + "/" + (h ? h + "/" : ""));
    })();
  </script>
  <style>body{font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 16px;color:#22211F;background:#F3F3F1}a{color:#8A6A2F}</style>
</head>
<body>
  <h1>${cfg.brand}</h1>
  <ul>${links}</ul>
</body>
</html>
`;
}

export function sitemap(entries) {
  const urls = entries.map(e => `  <url>
    <loc>${e.loc}</loc>
${e.alts.map(a => `    <xhtml:link rel="alternate" hreflang="${a.lang}" href="${a.href}"/>`).join("\n")}
  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

export function sitemapEntry(ctx, page) {
  const langs = page.langs || ctx.cfg.languages;
  return { loc: ctx.abs(ctx.url(page.path)), alts: langs.length > 1 ? langs.map(l => ({ lang: l, href: ctx.abs(ctx.url(page.path, l)) })) : [] };
}
