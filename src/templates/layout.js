// Page shell and small building blocks shared by every page.
import { drawTool } from "../shared/drawings.js";
import { unitPrice, tierFor, lowestPrice } from "../shared/pricing.js";
import { icon } from "./icons.js";

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- parts ----------

export function steelLabel(ctx, p, short) {
  if (short) return p.steel;
  return `${p.steel} ${ctx.t("spec.stainless")}${p.hrc ? `, ${p.hrc}` : ""}`;
}

// Technical drawing with a title block. Used as the "Dimensions" view and when a product has no photo.
export function sheet(ctx, p, big) {
  return `<div class="sheet${big ? " sheet-big" : ""}">
    ${drawTool(p.draw, p.length, p.name)}
    <dl class="titleblock">
      <div><dt>${ctx.t("spec.part")}</dt><dd>${esc(p.sku)}</dd></div>
      <div><dt>${ctx.t("spec.steel")}</dt><dd>${esc(steelLabel(ctx, p, true))}</dd></div>
      ${p.length ? `<div><dt>${ctx.t("spec.length")}</dt><dd>${p.length} mm</dd></div>` : ""}
    </dl>
  </div>`;
}

export function picture(ctx, photo, alt, sizes, eager) {
  return `<picture>
    <source type="image/webp" srcset="${photo.src[400].webp} 400w, ${photo.src[1000].webp} 1000w" sizes="${sizes}">
    <img src="${photo.src[1000].jpg}" srcset="${photo.src[400].jpg} 400w, ${photo.src[1000].jpg} 1000w" sizes="${sizes}"
      width="${photo.width}" height="${photo.height}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
  </picture>`;
}

// Site imagery from public/images/<name>.jpg. Returns the fallback (default: nothing) when the file isn't there yet.
export function siteImage(ctx, name, alt, sizes, eager, fallback = "") {
  const img = ctx.images?.[name];
  if (!img) return fallback;
  const set = kind => img.srcs.map(s => `${s[kind]} ${s.w}w`).join(", ");
  const largest = img.srcs[img.srcs.length - 1];
  return `<picture>
    <source type="image/webp" srcset="${set("webp")}" sizes="${sizes}">
    <img src="${largest.jpg}" srcset="${set("jpg")}" sizes="${sizes}" width="${img.width}" height="${img.height}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
  </picture>`;
}

// Product line badge: "Ferrin Pro" or "Ferrin Essential".
export function lineBadge(ctx, p) {
  if (!p.line) return "";
  return `<span class="line-badge line-${p.line}">${ctx.t("line." + p.line)}</span>`;
}

export function cardMedia(ctx, p) {
  const photos = ctx.photos[p.sku];
  if (!photos || !photos.length) return `<div class="card-media is-drawing">${drawTool(Object.assign({ nodim: true }, p.draw), 0, false)}</div>`;
  return `<div class="card-media">${picture(ctx, photos[0], p.name, "(max-width: 560px) 50vw, (max-width: 1000px) 33vw, 280px")}</div>`;
}

export function card(ctx, p) {
  const tiers = ctx.cfg.tiers;
  const sub = p.trial ? ctx.t("kit.one") : ctx.t("card.bulk", { price: ctx.money(lowestPrice(p, tiers)), n: tiers[tiers.length - 1].min });
  return `<a class="card" href="${ctx.url(`product/${p.id}`)}" data-search="${esc((p.name + " " + p.sku + " " + p.summary).toLowerCase())}" data-price="${p.price}">
    ${cardMedia(ctx, p)}
    <div class="card-body">
      ${lineBadge(ctx, p)}
      <h3>${esc(p.name)}</h3>
      <p class="price"><strong>${ctx.money(p.price)}</strong> <span class="muted">${sub}</span></p>
    </div>
  </a>`;
}

export const grid = (ctx, list) => `<div class="grid">${list.map(p => card(ctx, p)).join("")}</div>`;

export function tierLabel(ctx, i) {
  const tiers = ctx.cfg.tiers, t = tiers[i], next = tiers[i + 1];
  return next ? ctx.t("unit.range", { from: t.min, to: next.min - 1 }) : ctx.t("unit.plus", { from: t.min });
}

export function tierTable(ctx, p, finish, qty, caption = "") {
  const { tiers, finishes } = ctx.cfg;
  const cur = tierFor(tiers, qty);
  return `<table class="tiers">${caption ? `<caption>${caption}</caption>` : ""}
    <thead><tr><th scope="col">${ctx.t("tier.qty")}</th><th scope="col">${ctx.t("tier.price")}</th><th scope="col">${ctx.t("tier.saving")}</th></tr></thead>
    <tbody>${tiers.map((t, i) => `<tr class="${t === cur ? "current" : ""}">
      <td>${tierLabel(ctx, i)}</td><td>${ctx.money(unitPrice(p, finishes, tiers, finish, t.min))}</td><td>${t.off ? Math.round(t.off * 100) + "%" : "—"}</td></tr>`).join("")}
    </tbody></table>`;
}

export function field(ctx, name, labelKey, type, required, ac, opts = {}) {
  const hint = opts.hint ? `<small class="hint" id="hint-${name}">${opts.hint}</small>` : "";
  return `<label class="field${opts.wide ? " wide" : ""}"><span>${ctx.t(labelKey)}${required ? "" : ` <small class="muted">${ctx.t("co.optional")}</small>`}</span>
    <input name="${name}" type="${type}" ${required ? "required" : ""} autocomplete="${ac}" aria-describedby="${opts.hint ? `hint-${name} ` : ""}err-${name}">
    ${hint}<em class="err" id="err-${name}"></em></label>`;
}

export function textarea(ctx, name, labelKey, opts = {}) {
  return `<label class="field${opts.wide ? " wide" : ""}"><span>${ctx.t(labelKey)}${opts.required ? "" : ` <small class="muted">${ctx.t("co.optional")}</small>`}</span>
    <textarea name="${name}" rows="${opts.rows || 3}" ${opts.required ? "required" : ""} placeholder="${esc(opts.placeholder || "")}" aria-describedby="err-${name}"></textarea>
    <em class="err" id="err-${name}"></em></label>`;
}

// Hidden spam trap. Real visitors never see or tick it.
export const honeypot = `<input type="checkbox" name="botcheck" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">`;

export function crumbs(ctx, items) {
  return `<nav class="crumbs" aria-label="Breadcrumb"><a href="${ctx.url("")}">${ctx.t("nav.home")}</a>${items.map(([label, path]) =>
    ` / ${path != null ? `<a href="${ctx.url(path)}">${esc(label)}</a>` : `<span>${esc(label)}</span>`}`).join("")}</nav>`;
}

export function breadcrumbLd(ctx, items) {
  const all = [[ctx.t("nav.home"), ""], ...items];
  return {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: all.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: ctx.abs(ctx.url(path)) }))
  };
}

// The four promises shown under the hero and in the footer. Only facts stated elsewhere on the site.
export function trustItems(ctx) {
  const { t, cfg } = ctx;
  const minPL = Math.min(...Object.values(cfg.privateLabelMinimum));
  return [
    { icon: "shieldCheck", title: t("trust.sharpT"), text: t("trust.sharpP") },
    { icon: "truck", title: t("trust.shipT"), text: t("trust.shipP") },
    { icon: "tag", title: t("trust.plT", { n: minPL }), text: t("trust.plP") },
    { icon: "message", title: t("trust.replyT"), text: t("trust.replyP") }
  ];
}

export const waLink = (ctx, inner, cls = "", label = "") =>
  `<a${cls ? ` class="${cls}"` : ""} href="${ctx.wa}" target="_blank" rel="noopener"${label ? ` aria-label="${esc(label)}"` : ""}>${inner}</a>`;

// Email, phone, WhatsApp and address with icons.
export function contactList(ctx) {
  const { cfg, t } = ctx;
  return `<ul class="contact-list">
    <li>${icon("mail")}<a href="mailto:${esc(cfg.orderEmail)}">${esc(cfg.orderEmail)}</a></li>
    ${cfg.phone ? `<li>${icon("phone")}<a href="${ctx.tel}">${esc(cfg.phone)}</a></li>` : ""}
    ${ctx.wa ? `<li>${icon("whatsapp")}${waLink(ctx, `${t("nav.whatsapp")} ${esc(cfg.whatsapp)}`)}</li>` : ""}
    <li>${icon("mapPin")}<span>${esc(cfg.address)}</span></li>
  </ul>`;
}

// ---------- page shell ----------

export function layout(ctx, page) {
  const { cfg, t, lang } = ctx;
  const title = page.title ? `${page.title} | ${cfg.brand}` : `${cfg.brand} | ${t("meta.tagline")}`;
  const langs = page.langs || cfg.languages;
  const canonical = ctx.abs(ctx.url(page.path));
  const alternates = langs.length > 1 ? langs.map(l => `<link rel="alternate" hreflang="${l}" href="${ctx.abs(ctx.url(page.path, l))}">`).join("\n  ") +
    `\n  <link rel="alternate" hreflang="x-default" href="${ctx.abs(ctx.url(page.path, cfg.defaultLanguage))}">` : "";
  const heroImg = ctx.images?.hero;
  const og = ctx.abs(page.ogImage || (heroImg ? heroImg.srcs[heroImg.srcs.length - 1].jpg : ctx.asset("og/default.png")));
  const nav = [["catalogue", "shop"], ["quickOrder", "quick-order"], ["privateLabel", "private-label"], ["about", "about"], ["faq", "faq"], ["contact", "contact"]];
  const legalBase = cfg.defaultLanguage;
  const site = { lang, base: cfg.basePath, catalog: ctx.asset(`catalog-${lang}.json`) + `?v=${ctx.version}`,
    urls: { cart: ctx.url("cart"), sent: ctx.url("order-sent"), shop: ctx.url("shop"), terms: ctx.url("terms", legalBase) } };
  const credits = ctx.credits?.length
    ? `<p class="credits">${t("footer.credits")}: ${ctx.credits.map(c => `<a href="${esc(c.url)}" rel="noopener">${esc(c.photographer)}</a> (${esc(c.source)}${c.license ? `, ${esc(c.license)}` : ""})`).join(", ")}</p>` : "";

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(page.description || t("meta.home"))}">
  ${page.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${canonical}">`}
  ${page.noindex ? "" : alternates}
  <meta property="og:type" content="${page.ogType || "website"}">
  <meta property="og:site_name" content="${esc(cfg.brand)}">
  <meta property="og:title" content="${esc(page.title || cfg.brand)}">
  <meta property="og:description" content="${esc(page.description || t("meta.home"))}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${og}">
  <meta property="og:locale" content="${cfg.locales[lang].replace("-", "_")}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#22211F">
  <link rel="icon" href="${ctx.asset("favicon.svg")}" type="image/svg+xml">
  <link rel="preload" href="${ctx.asset("fonts/archivo-latin-wdth-normal.woff2")}" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="${ctx.asset("fonts/bodoni-moda-latin-opsz-normal.woff2")}" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${ctx.asset("styles.css")}?v=${ctx.version}">
  ${(page.jsonld || []).map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join("\n  ")}
  <script id="site" type="application/json">${JSON.stringify(site)}</script>
  <script type="module" src="${ctx.asset("js/client/app.js")}?v=${ctx.version}"></script>
  ${cfg.goatcounter ? `<script data-goatcounter="https://${esc(cfg.goatcounter)}.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>` : ""}
</head>
<body class="page-${page.key}">
  <a class="skip" href="#main">${t("nav.skip")}</a>
  <p class="trade-strip">${t("trade.strip")}</p>
  <header class="site-header on-dark">
    <div class="wrap header-inner">
      <a class="logo" href="${ctx.url("")}" aria-label="${esc(cfg.brand)}, ${t("nav.home")}">
        <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="3"/><path d="M9 8h14v4H14v3h8v4h-8v5H9z"/></svg>
        <span>${esc(cfg.brand)}</span>
      </a>
      <nav class="nav" id="nav" aria-label="${t("nav.main")}">
        ${nav.map(([k, path]) => `<a href="${ctx.url(path)}"${page.nav === path ? ' aria-current="page" class="active"' : ""}>${t("nav." + k)}</a>`).join("\n        ")}
      </nav>
      <div class="header-tools">
        ${ctx.wa ? waLink(ctx, `${icon("whatsapp")}<span class="hdr-label">${t("nav.whatsapp")}</span>`, "hdr-btn hdr-wa", t("wa.label")) : ""}
        <details class="lang">
          <summary class="hdr-btn" aria-label="${t("nav.language")}: ${esc(ctx.langName(lang))}">${icon("globe")}<span>${lang.toUpperCase()}</span></summary>
          <ul>${cfg.languages.map(l => {
            const target = langs.includes(l) ? page.path : "";
            return `<li><a href="${ctx.url(target, l)}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ""}>${esc(ctx.langName(l))}</a></li>`;
          }).join("")}</ul>
        </details>
        <a class="hdr-btn cart-btn" href="${ctx.url("cart")}"${page.key === "cart" ? ' aria-current="page"' : ""}>
          ${icon("bag")}<span class="cart-label">${t("nav.cart")}</span> <span id="cart-count" class="count" hidden>0</span></a>
        <button class="hdr-btn menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="nav" aria-label="${t("nav.menu")}">${icon("menu", "", "i-open")}${icon("close", "", "i-close")}</button>
      </div>
    </div>
  </header>

  <main id="main" tabindex="-1">
${page.body}
  </main>

  <footer class="site-footer on-dark">
    <div class="wrap">
      <ul class="footer-trust">${trustItems(ctx).map(i => `<li>${icon(i.icon)}<span>${i.title}</span></li>`).join("")}</ul>
      <div class="footer-inner">
        <div class="footer-brand">
          <p class="logo-text">${esc(cfg.brand)}</p>
          <p class="footer-tagline">${t("footer.tagline")}</p>
          ${contactList(ctx)}
        </div>
        <nav aria-label="${t("footer.shop")}">
          <h2 class="h-small">${t("footer.shop")}</h2>
          ${ctx.cats.slice(0, 5).map(c => `<a href="${ctx.url(`shop/${c.id}`)}">${esc(c.name)}</a>`).join("\n          ")}
          <a href="${ctx.url("price-list")}">${t("nav.priceList")}</a>
        </nav>
        <nav aria-label="${t("footer.company")}">
          <h2 class="h-small">${t("footer.company")}</h2>
          <a href="${ctx.url("private-label")}">${t("nav.privateLabel")}</a>
          <a href="${ctx.url("about")}">${t("nav.about")}</a>
          <a href="${ctx.url("faq")}">${t("nav.faq")}</a>
          <a href="${ctx.url("contact")}">${t("nav.contact")}</a>
        </nav>
        <nav aria-label="${t("footer.legal")}">
          <h2 class="h-small">${t("footer.legal")}</h2>
          <a href="${ctx.url("terms", legalBase)}" hreflang="${legalBase}">${t("footer.terms")}</a>
          <a href="${ctx.url("privacy", legalBase)}" hreflang="${legalBase}">${t("footer.privacy")}</a>
          <a href="${ctx.url("legal-notice", legalBase)}" hreflang="${legalBase}">${t("footer.notice")}</a>
          ${t("footer.legalLang") ? `<small>${t("footer.legalLang")}</small>` : ""}
        </nav>
      </div>
      <div class="fine">
        <p>© ${ctx.year} ${esc(cfg.brand)}. ${t("footer.fine")}</p>
        ${credits}
      </div>
    </div>
  </footer>

  ${ctx.wa ? waLink(ctx, icon("whatsapp"), "wa-float", t("wa.label")) : ""}
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
</body>
</html>
`;
}
