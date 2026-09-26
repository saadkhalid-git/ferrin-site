// Loads the fixed site data (config, language files, categories) once, and products from the database
// on each request, mapped into the shape the page templates already use.
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "./db.js";
import { env } from "./env.js";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DIST = path.join(ROOT, "dist");
const readJson = async p => JSON.parse(await readFile(path.join(ROOT, p), "utf8"));

export async function loadSite() {
  const cfg = await readJson("src/data/config.json");
  cfg.basePath = "";                    // the server serves the site at the root
  cfg.siteOrigin = env.APPLICATION_URL; // absolute links, canonical URLs, sitemap
  const { categories } = await readJson("src/data/products.json");
  const dicts = {};
  for (const l of cfg.languages) dicts[l] = await readJson(`src/i18n/${l}.json`);
  const mediaFile = path.join(DIST, "assets/media.json");
  if (!existsSync(mediaFile)) throw new Error("dist/assets is missing. Run `npm run build:assets` first.");
  const media = JSON.parse(await readFile(mediaFile, "utf8"));
  // The static build prefixes image URLs with the GitHub Pages base path; the server serves from the root.
  const fixBase = v => typeof v === "string" ? v.replace(/^\/[^/]+\/assets\//, "/assets/") : v;
  const walk = o => Array.isArray(o) ? o.map(walk) : o && typeof o === "object" ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, walk(v)])) : fixBase(o);
  const ogFiles = new Set(existsSync(path.join(DIST, "assets/og")) ? await readdir(path.join(DIST, "assets/og")) : []);
  return { cfg, dicts, categories, media: walk(media), hasOg: id => ogFiles.has(`${id}.png`) };
}

// Database row → template product (in one language). English text lives on the product itself;
// other languages come from product_translations and fall back to English when missing.
export function toTemplateProduct(row, categories) {
  const tr = row.translations?.[0];
  const categoryDraw = categories.find(c => c.id === row.category)?.draw || { type: "nipper" };
  return {
    id: row.slug, pid: row.id, sku: row.sku, cat: row.category, line: row.line,
    price: Number(row.price), quantity: row.quantity, imageUrl: row.imageUrl || undefined,
    finishes: row.finishes?.length ? row.finishes : ["satin"], draw: row.drawing || categoryDraw,
    length: row.lengthMm ?? undefined, steel: row.steel || undefined, hrc: row.hardness || undefined,
    best: row.isBestseller || undefined, trial: row.isTrial || undefined, contains: row.isTrial ? row.contains : undefined,
    name: tr?.name ?? row.name, summary: tr?.summary ?? row.description,
    details: (tr?.details ?? row.details) || []
  };
}

export async function activeProducts(lang, site) {
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    include: { translations: { where: { locale: lang } } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });
  return rows.map(r => toTemplateProduct(r, site.categories));
}
