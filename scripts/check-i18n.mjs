// Checks every language file against English: same keys, same {placeholders}, all products and categories.
import { readFileSync } from "node:fs";
const cfg = JSON.parse(readFileSync(new URL("../src/data/config.json", import.meta.url)));
const load = l => JSON.parse(readFileSync(new URL(`../src/i18n/${l}.json`, import.meta.url)));
const en = load("en");
const vars = s => (String(s).match(/\{\w+\}/g) || []).sort().join(",");
let problems = 0;
const report = msg => { problems++; console.log("  " + msg); };
for (const lang of cfg.languages.filter(l => l !== "en")) {
  let d;
  try { d = load(lang); } catch (e) { console.log(`${lang}: missing or invalid (${e.message})`); problems++; continue; }
  console.log(`${lang}:`);
  for (const [k, v] of Object.entries(en.ui)) {
    if (!(k in d.ui)) report(`missing ui "${k}"`);
    else if (vars(v) !== vars(d.ui[k])) report(`placeholders differ in "${k}": ${vars(v)} vs ${vars(d.ui[k])}`);
  }
  for (const k of Object.keys(d.ui)) if (!(k in en.ui)) report(`extra ui "${k}"`);
  for (const id of Object.keys(en.categories)) if (!d.categories?.[id]?.name || !d.categories[id].blurb) report(`category "${id}" incomplete`);
  for (const [id, p] of Object.entries(en.products)) {
    const q = d.products?.[id];
    if (!q || !q.name || !q.summary || !Array.isArray(q.details)) report(`product "${id}" incomplete`);
    else if (q.details.length !== p.details.length) report(`product "${id}" has ${q.details.length} details, English has ${p.details.length}`);
  }
  if (!Array.isArray(d.faq) || d.faq.length !== en.faq.length) report(`faq has ${d.faq?.length} entries, English has ${en.faq.length}`);
}
console.log(problems ? `\n${problems} problem(s)` : "\nAll languages complete.");
process.exit(problems ? 1 : 0);
