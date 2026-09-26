// Imports the catalogue from src/data/products.json and the language files into the database.
// Safe to run again: it only adds products (and translations) that don't exist yet, so it never
// overwrites prices, stock or text changed in the admin panel.
//   npm run db:seed
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const START_QUANTITY = 100;
const prisma = new PrismaClient();
const read = async p => JSON.parse(await readFile(new URL(`../src/${p}`, import.meta.url), "utf8"));

async function main() {
  const cfg = await read("data/config.json");
  const { products } = await read("data/products.json");
  const dicts = {};
  for (const l of cfg.languages) dicts[l] = await read(`i18n/${l}.json`);
  const en = dicts[cfg.defaultLanguage];

  let created = 0, translations = 0;
  for (const [i, p] of products.entries()) {
    const text = en.products[p.id];
    if (!text) throw new Error(`No English text for ${p.id} in en.json`);
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    const product = existing || await prisma.product.create({
      data: {
        name: text.name, slug: p.id, description: text.summary, details: text.details || [],
        price: p.price.toFixed(2), quantity: START_QUANTITY, isActive: true,
        sku: p.sku, category: p.cat, line: p.line || "pro", finishes: p.finishes, drawing: p.draw,
        lengthMm: p.length ?? null, steel: p.steel ?? null, hardness: p.hrc ?? null,
        isBestseller: Boolean(p.best), isTrial: Boolean(p.trial), contains: p.contains || [], sortOrder: i
      }
    });
    if (!existing) created++;
    for (const locale of cfg.languages.filter(l => l !== cfg.defaultLanguage)) {
      const tr = dicts[locale].products?.[p.id];
      if (!tr) continue;
      const res = await prisma.productTranslation.upsert({
        where: { productId_locale: { productId: product.id, locale } },
        update: {},
        create: { productId: product.id, locale, name: tr.name, summary: tr.summary, details: tr.details || [] }
      });
      if (res) translations++;
    }
  }
  const total = await prisma.product.count();
  console.log(`Seed done: ${created} new products (${total} in database), ${translations} translations checked.`);
}

main()
  .catch(err => { console.error("Seed failed:", err.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
