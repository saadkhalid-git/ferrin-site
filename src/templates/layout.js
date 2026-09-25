// Page shell and small building blocks shared by every page.
import { drawTool } from "../shared/drawings.js";
import { unitPrice, tierFor, lowestPrice } from "../shared/pricing.js";

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- parts ----------

export function steelLabel(ctx, p, short) {
  if (short) return p.steel;
  return `${p.steel} ${ctx.t("spec.stainless")}${p.hrc ? `, ${p.hrc}` : ""}`;
}

export function sheet(ctx, p, big) {
  return `<div class="sheet${big ? " sheet-big" : ""}">
    ${drawTool(p.draw, p.length, p.name)}
    <dl class="titleblock">
      <div><dt>${ctx.t("spec.part")}</dt><dd>${esc(p.sku)}</dd></div>
      <div><dt>${ctx.t("spec.steel")}</dt><dd>${esc(steelLabel(ctx, p, true))}</dd></div>
      <div><dt>${ctx.t("spec.length")}</dt><dd>${p.length} mm</dd></div>
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

export function cardMedia(ctx, p) {
  const photos = ctx.photos[p.sku];
  if (!photos || !photos.length) return sheet(ctx, p);
  return `<div class="photo">${picture(ctx, photos[0], p.name, "(max-width: 520px) 50vw, 280px")}</div>`;
}

export function card(ctx, p) {
  const tiers = ctx.cfg.tiers;
  return `<a class="card" href="${ctx.url(`product/${p.id}`)}" data-search="${esc((p.name + " " + p.sku + " " + p.summary).toLowerCase())}" data-price="${p.price}">
    ${cardMedia(ctx, p)}
    <div class="card-body">
      <h3>${esc(p.name)}</h3>
      <p class="price">${ctx.money(p.price)} <span class="muted">${ctx.t("card.bulk", { price: ctx.money(lowestPrice(p, tiers)), n: tiers[tiers.length - 1].min })}</span></p>
    </div>
  </a>`;
}

export const grid = (ctx, list) => `<div class="grid">${list.map(p => card(ctx, p)).join("")}</div>`;

export function tierLabel(ctx, i) {
  const tiers = ctx.cfg.tiers, t = tiers[i], next = tiers[i + 1];
  return next ? ctx.t("unit.range", { from: t.min, to: next.min - 1 }) : ctx.t("unit.plus", { from: t.min });
}

export function tierTable(ctx, p, finish, qty) {
  const { tiers, finishes } = ctx.cfg;
  const cur = tierFor(tiers, qty);
  return `<table class="tiers">
    <thead><tr><th scope="col">${ctx.t("tier.qty")}</th><th scope="col">${ctx.t("tier.price")}</th><th scope="col">${ctx.t("tier.saving")}</th></tr></thead>
    <tbody>${tiers.map((t, i) => `<tr class="${t === cur ? "current" : ""}">
      <td>${tierLabel(ctx, i)}</td><td>${ctx.money(unitPrice(p, finishes, tiers, finish, t.min))}</td><td>${t.off ? Math.round(t.off * 100) + "%" : "—"}</td></tr>`).join("")}
    </tbody></table>`;
}

export function field(ctx, name, labelKey, type, required, ac, opts = {}) {
  const hint = opts.hint ? `<small class="hint" id="hint-${name}">${opts.hint}</small>` : "";
  return `<label class="field${opts.wide ? " wide" : ""}"><span>${ctx.t(labelKey)}${required ? "" : ` <small class="muted">${ctx.t("co.optional")}</small>`}</span>
    <input name="${name}" type="${type}" ${required ? "required" : ""} autocomplete="${ac}"${opts.hint ? ` aria-describedby="hint-${name}"` : ""}>
    ${hint}<em class="err" id="err-${name}"></em></label>`;
}

export function textarea(ctx, name, labelKey, opts = {}) {
  return `<label class="field${opts.wide ? " wide" : ""}"><span>${ctx.t(labelKey)}${opts.required ? "" : ` <small class="muted">${ctx.t("co.optional")}</small>`}</span>
    <textarea name="${name}" rows="${opts.rows || 3}" ${opts.required ? "required" : ""} placeholder="${esc(opts.placeholder || "")}"></textarea>
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

// ---------- page shell ----------

export function layout(ctx, page) {
  const { cfg, t, lang } = ctx;
  const title = page.title ? `${page.title} | ${cfg.brand}` : `${cfg.brand} | ${t("meta.tagline")}`;
  const langs = page.langs || cfg.languages;
  const canonical = ctx.abs(ctx.url(page.path));
  const alternates = langs.length > 1 ? langs.map(l => `<link rel="alternate" hreflang="${l}" href="${ctx.abs(ctx.url(page.path, l))}">`).join("\n  ") +
    `\n  <link rel="alternate" hreflang="x-default" href="${ctx.abs(ctx.url(page.path, cfg.defaultLanguage))}">` : "";
  const og = ctx.abs(page.ogImage || ctx.asset("og/default.png"));
  const nav = [["catalogue", "shop"], ["quickOrder", "quick-order"], ["privateLabel", "private-label"], ["about", "about"], ["faq", "faq"], ["contact", "contact"]];
  const legalBase = cfg.defaultLanguage;
  const site = { lang, base: cfg.basePath, catalog: ctx.asset(`catalog-${lang}.json`) + `?v=${ctx.version}`,
    urls: { cart: ctx.url("cart"), sent: ctx.url("order-sent"), shop: ctx.url("shop"), terms: ctx.url("terms", legalBase) } };

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
  <meta name="theme-color" content="#1C2A3A">
  <link rel="icon" href="${ctx.asset("favicon.svg")}" type="image/svg+xml">
  <link rel="preload" href="${ctx.asset("fonts/archivo-latin-wdth-normal.woff2")}" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${ctx.asset("styles.css")}?v=${ctx.version}">
  ${(page.jsonld || []).map(j => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join("\n  ")}
  <script id="site" type="application/json">${JSON.stringify(site)}</script>
  <script type="module" src="${ctx.asset("js/client/app.js")}?v=${ctx.version}"></script>
  ${cfg.goatcounter ? `<script data-goatcounter="https://${esc(cfg.goatcounter)}.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>` : ""}
</head>
<body class="page-${page.key}">
  <a class="skip" href="#main">${t("nav.skip")}</a>
  <p class="trade-strip">${t("trade.strip")}</p>
  <header class="site-header">
    <div class="wrap header-inner">
      <a class="logo" href="${ctx.url("")}" aria-label="${esc(cfg.brand)}, ${t("nav.home")}">
        <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="6"/><path d="M9 8h14v4H14v3h8v4h-8v5H9z"/></svg>
        <span>${esc(cfg.brand)}</span>
      </a>
      <nav class="nav" id="nav" aria-label="Main">
        ${nav.map(([k, path]) => `<a href="${ctx.url(path)}"${page.nav === path ? ' aria-current="page" class="active"' : ""}>${t("nav." + k)}</a>`).join("\n        ")}
      </nav>
      <details class="lang">
        <summary aria-label="${t("nav.language")}: ${esc(ctx.langName(lang))}">${lang.toUpperCase()}</summary>
        <ul>${cfg.languages.map(l => {
          const target = langs.includes(l) ? page.path : "";
          return `<li><a href="${ctx.url(target, l)}" hreflang="${l}" lang="${l}"${l === lang ? ' aria-current="true"' : ""}>${esc(ctx.langName(l))}</a></li>`;
        }).join("")}</ul>
      </details>
      <a class="cart-btn" href="${ctx.url("cart")}">
        <svg class="cart-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z M9 8V6a3 3 0 0 1 6 0v2"/></svg>
        <span class="cart-label">${t("nav.cart")}</span> <span id="cart-count" class="count" hidden>0</span></a>
      <button class="menu-btn" id="menu-btn" type="button" aria-expanded="false" aria-controls="nav" aria-label="${t("nav.menu")}"><span></span><span></span></button>
    </div>
  </header>

  <main id="main" tabindex="-1">
${page.body}
  </main>

  <footer class="site-footer">
    <div class="wrap footer-inner">
      <div>
        <p class="logo-text">${esc(cfg.brand)}</p>
        <p class="muted">${t("footer.tagline")}</p>
        <p><a href="mailto:${esc(cfg.orderEmail)}">${esc(cfg.orderEmail)}</a></p>
      </div>
      <nav aria-label="${t("footer.shop")}">
        <h2 class="h-small">${t("footer.shop")}</h2>
        ${ctx.cats.slice(0, 5).map(c => `<a href="${ctx.url(`shop/${c.id}`)}">${esc(c.name)}</a>`).join("\n        ")}
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
        ${t("footer.legalLang") ? `<small class="muted">${t("footer.legalLang")}</small>` : ""}
      </nav>
    </div>
    <div class="wrap fine">© ${ctx.year} ${esc(cfg.brand)}. ${t("footer.fine")}</div>
  </footer>

  <div id="toast" class="toast" role="status" aria-live="polite"></div>
</body>
</html>
`;
}
