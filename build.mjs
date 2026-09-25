// Builds the static site into dist/.
//   node build.mjs                      → uses basePath from src/data/config.json
//   BASE_PATH="" node build.mjs         → for a custom domain or serving dist/ at the root
//   LANGS=en node build.mjs             → build only some languages (faster while editing)
import { readFile, writeFile, mkdir, rm, cp, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { drawTool } from "./src/shared/drawings.js";
import { baseFinish, unitPrice } from "./src/shared/pricing.js";
import { layout } from "./src/templates/layout.js";
import * as pages from "./src/templates/pages.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, "dist");
const SRC = path.join(ROOT, "src");
const read = async p => JSON.parse(await readFile(path.join(SRC, p), "utf8"));

const cfg = await read("data/config.json");
if (process.env.BASE_PATH !== undefined) cfg.basePath = process.env.BASE_PATH.replace(/\/$/, "");
if (process.env.WEB3FORMS_KEY) cfg.web3formsKey = process.env.WEB3FORMS_KEY;
if (process.env.LANGS) cfg.languages = process.env.LANGS.split(","); // e.g. LANGS=en for a quick build
const { categories, products } = await read("data/products.json");
const dicts = {};
for (const l of cfg.languages) dicts[l] = await read(`i18n/${l}.json`);

const DEFAULT_COUNTRY = { en: "LU", de: "DE", fr: "FR", pl: "PL", it: "IT" };
const COUNTRY_CODES = cfg.shipping.zones.flatMap(z => z.countries);
const buildDate = new Date();
const warnings = new Set();

// ---------- helpers ----------
async function write(rel, content) {
  const file = path.join(DIST, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}
const hash = s => createHash("sha1").update(s).digest("hex").slice(0, 8);

function makeCtx(lang, photos, version) {
  const d = dicts[lang], en = dicts[cfg.defaultLanguage];
  const t = (key, vars = {}) => {
    let s = d.ui[key];
    if (s === undefined) { warnings.add(`${lang}: missing "${key}"`); s = en.ui[key]; }
    if (s === undefined) { warnings.add(`missing key "${key}"`); return key; }
    return s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  };
  const cats = categories.map(c => {
    const tr = d.categories[c.id] || en.categories[c.id];
    if (!d.categories[c.id]) warnings.add(`${lang}: missing category ${c.id}`);
    return { ...c, ...tr };
  });
  const prods = products.map(p => {
    const tr = d.products[p.id] || en.products[p.id];
    if (!d.products[p.id]) warnings.add(`${lang}: missing product ${p.id}`);
    return { ...p, ...tr };
  });
  const moneyFmt = new Intl.NumberFormat(cfg.locales[lang], { style: "currency", currency: cfg.currency });
  const regions = new Intl.DisplayNames([cfg.locales[lang]], { type: "region" });
  const languagesFmt = l => new Intl.DisplayNames([l], { type: "language" }).of(l);
  const countries = COUNTRY_CODES.map(code => ({ code, name: regions.of(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, cfg.locales[lang]));
  const def = DEFAULT_COUNTRY[lang];
  countries.sort((a, b) => (a.code === def ? -1 : b.code === def ? 1 : 0));
  const base = cfg.basePath;
  return {
    lang, cfg, t, photos, version, buildDate, countries,
    faq: d.faq || en.faq,
    products: prods, cats,
    byId: id => prods.find(p => p.id === id),
    catOf: id => cats.find(c => c.id === id),
    inCat: id => prods.filter(p => p.cat === id),
    money: n => moneyFmt.format(n),
    url: (p = "", l = lang) => `${base}/${l}/${p ? p.replace(/\/$/, "") + "/" : ""}`,
    asset: p => `${base}/assets/${p}`,
    abs: u => cfg.siteOrigin + u,
    langName: l => { const n = languagesFmt(l); return n.charAt(0).toUpperCase() + n.slice(1); },
    year: buildDate.getFullYear()
  };
}

// ---------- images ----------
const OG_STYLE = `
  .o{fill:#F6F7F8;stroke:#1C2A3A;stroke-width:1.6;stroke-linejoin:round}
  .b{fill:none;stroke:#1C2A3A;stroke-width:10px;stroke-linecap:round}
  .bi{fill:none;stroke:#F6F7F8;stroke-width:6.6px;stroke-linecap:round}
  .a{fill:none;stroke:#2E4FA3;stroke-width:2;stroke-linecap:round}.edge{stroke-width:3}
  .hatch{stroke:#66727E;stroke-width:1}.teeth{fill:none;stroke:#1C2A3A;stroke-width:1.2}
  .stitch{fill:none;stroke:#66727E;stroke-dasharray:4 4}
  .dim line{stroke:#66727E;stroke-width:1}.dim path{fill:#66727E}.dim-bg{fill:#F6F7F8}
  .dim text{font:600 12px sans-serif;fill:#66727E;text-anchor:middle}`;

function sheetSvg(drawSvg, w, h) {
  const inner = drawSvg.replace('<svg class="drawing"', `<svg x="${w * 0.1}" y="${h * 0.1}" width="${w * 0.8}" height="${h * 0.8}"`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><pattern id="g" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#1C2A3A" stroke-opacity=".07"/></pattern><style>${OG_STYLE}</style></defs>
    <rect width="${w}" height="${h}" fill="#F6F7F8"/><rect width="${w}" height="${h}" fill="url(#g)"/>
    ${inner}</svg>`;
}

async function processPhotos() {
  const dir = path.join(ROOT, "public", "photos");
  const out = {};
  if (!existsSync(dir)) return out;
  const skus = new Map(products.map(p => [p.sku.toLowerCase(), p.sku]));
  const files = (await readdir(dir)).filter(f => /\.(jpe?g|png|webp)$/i.test(f)).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  for (const f of files) {
    const m = f.match(/^(.+)-(\d+)\.(jpe?g|png|webp)$/i);
    const sku = m && skus.get(m[1].toLowerCase());
    if (!sku) { warnings.add(`photo "${f}" doesn't match a part number (expected e.g. FN-C05-1.jpg)`); continue; }
    const name = `${sku.toLowerCase()}-${m[2]}`;
    const src = {};
    let width, height;
    for (const w of [400, 1000]) {
      src[w] = {};
      const pipeline = () => sharp(path.join(dir, f)).rotate().resize({ width: w, withoutEnlargement: true });
      const webp = await pipeline().webp({ quality: 78 }).toBuffer({ resolveWithObject: true });
      const jpg = await pipeline().flatten({ background: "#ffffff" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
      await write(`assets/photos/${name}-${w}.webp`, webp.data);
      await write(`assets/photos/${name}-${w}.jpg`, jpg);
      src[w].webp = `${cfg.basePath}/assets/photos/${name}-${w}.webp`;
      src[w].jpg = `${cfg.basePath}/assets/photos/${name}-${w}.jpg`;
      if (w === 1000) { width = webp.info.width; height = webp.info.height; }
    }
    (out[sku] = out[sku] || []).push({ src, width, height });
  }
  return out;
}

async function renderImages() {
  for (const p of products) {
    const svg = sheetSvg(drawTool(p.draw, p.length, ""), 1200, 630);
    await write(`assets/og/${p.id}.png`, await sharp(Buffer.from(svg)).png().toBuffer());
  }
  const hero = products.find(p => p.id === cfg.heroProduct);
  await write("assets/og/default.png", await sharp(Buffer.from(sheetSvg(drawTool(hero.draw, hero.length, ""), 1200, 630))).png().toBuffer());
  const favicon = await readFile(path.join(SRC, "favicon.svg"));
  await write("assets/favicon.svg", favicon);
  await write("assets/logo.png", await sharp(favicon).resize(512, 512).png().toBuffer());
}

// ---------- catalogue for the browser ----------
function catalog(ctx) {
  const items = {};
  for (const p of ctx.products) {
    const ph = ctx.photos[p.sku]?.[0];
    items[p.id] = {
      id: p.id, sku: p.sku, name: p.name, price: p.price, finishes: p.finishes, def: baseFinish(p, cfg.finishes),
      url: ctx.url(`product/${p.id}`), cat: p.cat, moq: cfg.privateLabelMinimum[p.cat],
      thumb: ph ? `<img src="${ph.src[400].jpg}" alt="" loading="lazy">` : drawTool(Object.assign({ nodim: true }, p.draw), 0, "")
    };
  }
  const ui = {};
  for (const k of Object.keys(dicts[cfg.defaultLanguage].ui)) ui[k] = ctx.t(k);
  return {
    lang: ctx.lang, locale: cfg.locales[ctx.lang], currency: cfg.currency, brand: cfg.brand,
    orderEmail: cfg.orderEmail, web3formsKey: cfg.web3formsKey,
    tiers: cfg.tiers, finishes: cfg.finishes, shipping: cfg.shipping,
    countries: ctx.countries, ui, products: items
  };
}

// ---------- root pages ----------
function rootIndex(ctx) {
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
      // Links from the first version of the site used #/product/..., #/shop/... and so on.
      var h = location.hash.replace(/^#\\/?/, "").split("?")[0];
      if (h) { location.replace(base + "/" + def + "/" + h.replace(/\\/$/, "") + "/"); return; }
      var pick = def;
      var prefs = navigator.languages || [navigator.language || ""];
      for (var i = 0; i < prefs.length; i++) { var c = String(prefs[i]).slice(0, 2).toLowerCase(); if (langs.indexOf(c) > -1) { pick = c; break; } }
      location.replace(base + "/" + pick + "/");
    })();
  </script>
  <style>body{font:16px/1.5 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 16px;color:#1C2A3A;background:#E9ECEE}</style>
</head>
<body>
  <h1>${cfg.brand}</h1>
  <ul>${links}</ul>
</body>
</html>
`;
}

function sitemap(entries) {
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

// ---------- main ----------
async function main() {
  const started = Date.now();
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  // Styles with the self-hosted font, and browser scripts.
  const fontDir = path.join(ROOT, "node_modules/@fontsource-variable/archivo/files");
  const fontCss = ["latin-ext", "latin"].map(set => {
    const range = { "latin-ext": "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
      latin: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" }[set];
    return `@font-face { font-family: "Archivo"; font-style: normal; font-display: swap; font-weight: 100 900; font-stretch: 62% 125%;
  src: url(fonts/archivo-${set}-wdth-normal.woff2) format("woff2-variations"), url(fonts/archivo-${set}-wdth-normal.woff2) format("woff2"); unicode-range: ${range}; }`;
  }).join("\n");
  for (const set of ["latin", "latin-ext"]) await cp(path.join(fontDir, `archivo-${set}-wdth-normal.woff2`), path.join(DIST, `assets/fonts/archivo-${set}-wdth-normal.woff2`));
  const css = fontCss + "\n" + await readFile(path.join(SRC, "styles.css"), "utf8");
  await write("assets/styles.css", css);
  await cp(path.join(SRC, "client"), path.join(DIST, "assets/js/client"), { recursive: true });
  await cp(path.join(SRC, "shared"), path.join(DIST, "assets/js/shared"), { recursive: true });
  const clientSrc = await readFile(path.join(SRC, "client/app.js"), "utf8") + await readFile(path.join(SRC, "shared/pricing.js"), "utf8");
  const version = hash(css + clientSrc + JSON.stringify(cfg) + JSON.stringify(products) + JSON.stringify(dicts));

  const photos = await processPhotos();
  await renderImages();

  const sitemapEntries = [];
  let pageCount = 0;
  for (const lang of cfg.languages) {
    const ctx = makeCtx(lang, photos, version);
    const list = [
      pages.home(ctx), pages.shop(ctx),
      ...ctx.cats.map(c => pages.shop(ctx, c)),
      ...ctx.products.map(p => pages.product(ctx, p)),
      pages.cart(ctx), pages.orderSent(ctx), pages.quickOrder(ctx), pages.priceList(ctx),
      pages.privateLabel(ctx), pages.about(ctx), pages.contact(ctx), pages.faq(ctx),
      ...(lang === cfg.defaultLanguage ? pages.legal(ctx) : [])
    ];
    for (const page of list) {
      await write(path.join(lang, page.path, "index.html"), layout(ctx, page));
      pageCount++;
      if (!page.noindex) {
        const langs = page.langs || cfg.languages;
        sitemapEntries.push({ loc: ctx.abs(ctx.url(page.path)), alts: langs.length > 1 ? langs.map(l => ({ lang: l, href: ctx.abs(ctx.url(page.path, l)) })) : [] });
      }
    }
    await write(`assets/catalog-${lang}.json`, JSON.stringify(catalog(ctx)));
    if (lang === cfg.defaultLanguage) {
      await write("index.html", rootIndex(ctx));
      await write("404.html", layout(ctx, pages.notFound(ctx)));
      const origin = ctx.abs("");
      await write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${origin}${cfg.basePath}/sitemap.xml\n`);
    }
  }
  await write("sitemap.xml", sitemap(sitemapEntries));
  await write(".nojekyll", "");

  // Sanity check: every product and tier price is a real number.
  for (const p of products) for (const tr of cfg.tiers) {
    const v = unitPrice(p, cfg.finishes, cfg.tiers, baseFinish(p, cfg.finishes), tr.min);
    if (!Number.isFinite(v) || v <= 0) throw new Error(`Bad price for ${p.id}`);
  }

  const photoCount = Object.values(photos).reduce((n, a) => n + a.length, 0);
  console.log(`Built ${pageCount} pages in ${cfg.languages.length} languages, ${photoCount} photos, base path "${cfg.basePath || "/"}" in ${Date.now() - started} ms.`);
  if (warnings.size) console.warn(`\n${warnings.size} warning(s):\n  ` + [...warnings].slice(0, 40).join("\n  "));
}

await main();
