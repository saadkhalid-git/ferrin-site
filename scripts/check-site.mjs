// Checks the built site in dist/: every internal link and asset exists, JSON-LD parses,
// every page has a title, description and canonical link, and the sitemap only lists real pages.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const cfg = JSON.parse(readFileSync(path.join(root, "..", "src/data/config.json"), "utf8"));
const base = (process.env.BASE_PATH ?? cfg.basePath).replace(/\/$/, "");
const origin = cfg.siteOrigin;

const walk = dir => readdirSync(dir).flatMap(f => { const p = path.join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const html = walk(root).filter(f => f.endsWith(".html"));
const errors = [];
const toFile = url => {
  let u = url.split("#")[0].split("?")[0];
  if (u.startsWith(origin)) u = u.slice(origin.length);
  if (!u.startsWith(base + "/") && u !== base) return null; // not ours
  u = decodeURIComponent(u.slice(base.length));
  const p = path.join(root, u);
  return u.endsWith("/") ? path.join(p, "index.html") : p;
};

let links = 0;
for (const file of html) {
  const rel = path.relative(root, file);
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1].replace(/&amp;/g, "&");
    if (/^(mailto:|https?:\/\/(?!saadkhalid)|data:|#)/.test(url)) continue;
    const target = toFile(url);
    if (target === null) continue;
    links++;
    if (!existsSync(target)) errors.push(`${rel}: broken link ${url}`);
  }
  for (const m of src.matchAll(/srcset="([^"]+)"/g)) for (const part of m[1].split(",")) {
    const target = toFile(part.trim().split(" ")[0]);
    if (target && !existsSync(target)) errors.push(`${rel}: missing image ${part.trim()}`);
  }
  for (const m of src.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { errors.push(`${rel}: invalid JSON-LD`); }
  }
  if (rel === "index.html") continue;
  if (!/<title>[^<]+<\/title>/.test(src)) errors.push(`${rel}: no title`);
  if (!/<meta name="description" content="[^"]+">/.test(src)) errors.push(`${rel}: no description`);
  if (!src.includes('rel="canonical"') && !src.includes('content="noindex"')) errors.push(`${rel}: no canonical`);
}

const sitemap = readFileSync(path.join(root, "sitemap.xml"), "utf8");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
for (const loc of locs) { const f = toFile(loc); if (!f || !existsSync(f)) errors.push(`sitemap: ${loc} doesn't exist`); }

console.log(`${html.length} pages, ${links} internal links, ${locs.length} sitemap URLs checked.`);
if (errors.length) { console.log(errors.slice(0, 50).join("\n")); console.log(`${errors.length} problem(s)`); process.exit(1); }
console.log("No problems found.");
