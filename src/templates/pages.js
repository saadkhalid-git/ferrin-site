// One function per page. Each returns { key, path, title, description, body, ... } for layout().
import { drawTool } from "../shared/drawings.js";
import { unitPrice, lowestPrice, baseFinish } from "../shared/pricing.js";
import { esc, sheet, picture, siteImage, grid, tierTable, tierLabel, field, textarea, honeypot, crumbs, breadcrumbLd, steelLabel, lineBadge, trustItems, waLink, availability, externalImage } from "./layout.js";
import { icon } from "./icons.js";
import { legalPages } from "./legal.js";

export function home(ctx) {
  const { t, cfg } = ctx;
  const hero = ctx.byId(cfg.heroProduct);
  const kit = ctx.products.find(p => p.trial);
  const heroPhoto = siteImage(ctx, "hero", t("home.heroAlt"), "(max-width: 899px) 100vw, 50vw", true);
  const productPhoto = ctx.photos[hero.sku]?.[0];
  // Without a hero photo, show the hero product: its own photo if there is one, otherwise its drawing on charcoal.
  const heroAside = heroPhoto ? "" : `<a class="hero-aside" href="${ctx.url(`product/${hero.id}`)}">
          ${productPhoto ? `<div class="photo">${picture(ctx, productPhoto, hero.name, "(max-width: 899px) 100vw, 560px", true)}</div>` : sheet(ctx, hero, true)}
          <span class="hero-caption"><span>${esc(hero.name)}</span><strong>${ctx.money(hero.price)}</strong></span>
        </a>`;
  const catSizes = "(max-width: 1000px) 50vw, 290px";
  const craftIcons = ["disc", "sparkles", "scissors", "searchCheck"];
  const kitParts = kit ? kit.contains.map(id => ctx.byId(id)).filter(Boolean) : [];
  const kitSeparately = kitParts.reduce((sum, p) => sum + p.price, 0);
  const whyPhoto = siteImage(ctx, "shears", "", "(max-width: 899px) 100vw, 560px");
  return {
    key: "home", path: "", description: t("meta.home"),
    jsonld: [
      { "@context": "https://schema.org", "@type": "Organization", name: cfg.brand, url: ctx.abs(ctx.url("")), email: cfg.orderEmail,
        telephone: cfg.phone, address: cfg.address, logo: ctx.abs(ctx.asset("logo.png")) },
      { "@context": "https://schema.org", "@type": "WebSite", name: cfg.brand, url: ctx.abs(ctx.url("")), inLanguage: ctx.lang }
    ],
    body: `
    <section class="hero on-dark${heroPhoto ? " has-photo" : ""}">
      ${heroPhoto ? `<div class="hero-photo">${heroPhoto}</div>` : ""}
      <div class="wrap hero-inner">
        <div class="hero-copy">
          <h1>${t("home.h1")}</h1>
          <p class="lede">${t("home.lede")}</p>
          <div class="actions">
            <a class="btn" href="${ctx.url("shop")}">${t("home.ctaShop")}${icon("arrowRight")}</a>
            ${kit ? `<a class="btn btn-ghost" href="#sample-kit">${icon("package")}${t("home.ctaKit")}</a>` : ""}
          </div>
        </div>
        ${heroAside}
      </div>
    </section>

    <section class="trust" aria-label="${esc(t("trust.label"))}">
      <ul class="wrap trust-list">${trustItems(ctx).map(i => `
        <li>${icon(i.icon)}<div><strong>${i.title}</strong><span>${i.text}</span></div></li>`).join("")}
      </ul>
    </section>

    <section class="wrap section">
      <div class="section-head"><h2>${t("home.shopBy")}</h2><a class="more" href="${ctx.url("shop")}">${t("home.seeAll", { n: ctx.products.length })}${icon("arrowRight")}</a></div>
      <div class="cats">
        ${ctx.cats.map(c => {
          const img = siteImage(ctx, ctx.images[c.id] ? c.id : c.image, "", catSizes);
          return `<a class="cat${img ? " has-photo" : ""}" href="${ctx.url(`shop/${c.id}`)}">
          <div class="cat-media">${img || drawTool(Object.assign({ nodim: true }, c.draw), 0, false)}</div>
          <div class="cat-body"><h3>${esc(c.name)}</h3><p>${t("unit.count", { n: ctx.inCat(c.id).length })}</p></div>
        </a>`;
        }).join("")}
      </div>
    </section>

    <section class="craft">
      <div class="wrap section">
        <div class="section-head stacked"><h2>${t("craft.h")}</h2><p>${t("craft.p")}</p></div>
        <ol class="craft-steps">${[1, 2, 3, 4].map(i => `
          <li>
            <div class="craft-media">${siteImage(ctx, `craft-${i}`, "", "(max-width: 560px) 100vw, (max-width: 1000px) 50vw, 280px", false, `<div class="craft-ph">${icon(craftIcons[i - 1])}</div>`)}</div>
            <h3><span class="step-no" aria-hidden="true">${String(i).padStart(2, "0")}</span>${t(`craft.s${i}`)}</h3>
            <p>${t(`craft.s${i}p`)}</p>
          </li>`).join("")}
        </ol>
      </div>
    </section>

    <section class="wrap section">
      <div class="section-head"><h2>${t("home.best")}</h2><a class="more" href="${ctx.url("shop")}">${t("home.ctaShop")}${icon("arrowRight")}</a></div>
      ${grid(ctx, ctx.products.filter(p => p.best && !p.trial).slice(0, 8))}
    </section>

    ${kit ? `<section class="wrap section" id="sample-kit">
      <div class="kit">
        <div class="kit-media">${siteImage(ctx, "flatlay", "", "(max-width: 899px) 100vw, 560px", false, sheet(ctx, kit, true))}</div>
        <div class="kit-body">
          <h2>${t("home.kitH")}</h2>
          <p>${t("home.kitP")}</p>
          <ul class="kit-list">${kitParts.map(p => `<li>${icon("check")}<a href="${ctx.url(`product/${p.id}`)}">${esc(p.name)}</a></li>`).join("")}</ul>
          <p class="kit-price"><strong>${ctx.money(kit.price)}</strong> <span>${t("kit.perKit")}</span></p>
          <p class="muted kit-sep">${t("home.kitSeparately", { price: ctx.money(kitSeparately) })}</p>
          <div class="actions">
            <button type="button" class="btn" data-add="${kit.id}">${icon("bag")}${t("home.kitAdd")}</button>
            <a class="btn btn-ghost" href="${ctx.url(`product/${kit.id}`)}">${t("home.kitDetails")}</a>
          </div>
          <p class="muted kit-note">${t("kit.one")}</p>
        </div>
      </div>
    </section>` : ""}

    <section class="band on-dark">
      <div class="wrap pricing">
        <div>
          <h2>${t("home.pricingH")}</h2>
          <p>${t("home.pricingP")}</p>
        </div>
        ${tierTable(ctx, hero, baseFinish(hero, cfg.finishes), 1, `<a href="${ctx.url(`product/${hero.id}`)}">${esc(hero.name)}</a> · ${esc(hero.sku)}`)}
      </div>
    </section>

    <section class="wrap section process">
      <div class="section-head"><h2>${t("home.plH")}</h2><a class="more" href="${ctx.url("private-label")}">${t("home.plLink")}${icon("arrowRight")}</a></div>
      <ol class="steps">${[1, 2, 3, 4].map(i => `<li><h3>${t(`home.step${i}`)}</h3><p>${t(`home.step${i}p`)}</p></li>`).join("")}</ol>
    </section>

    <section class="why">
      <div class="wrap section why-inner${whyPhoto ? " has-photo" : ""}">
        ${whyPhoto ? `<div class="why-media">${whyPhoto}</div>` : ""}
        <div class="why-copy">
          <h2>${t("home.whyH")}</h2>
          <p>${t("home.why1")}</p>
          <p>${t("home.why2")}</p>
        </div>
        <dl class="specs">
          <div><dt>${t("spec.manicureSteel")}</dt><dd>AISI 420 ${t("spec.stainless")}, 52–54 HRC</dd></div>
          <div><dt>${t("spec.shearSteel")}</dt><dd>440C ${t("spec.stainless")}, 58–60 HRC</dd></div>
          <div><dt>${t("spec.edges")}</dt><dd>${t("spec.edgesV")}</dd></div>
          <div><dt>${t("spec.origin")}</dt><dd>${t("spec.originV")}</dd></div>
        </dl>
      </div>
    </section>`
  };
}

export function shop(ctx, cat) {
  const { t } = ctx;
  const list = cat ? ctx.inCat(cat.id) : ctx.products;
  const path = cat ? `shop/${cat.id}` : "shop";
  const trail = cat ? [[t("shop.title"), "shop"], [cat.name, null]] : [[t("shop.title"), null]];
  return {
    key: "shop", path, nav: "shop",
    title: cat ? cat.name : t("shop.title"),
    description: cat ? cat.blurb : t("meta.shop", { n: ctx.products.length }),
    jsonld: [breadcrumbLd(ctx, cat ? [[t("shop.title"), "shop"], [cat.name, path]] : [[t("shop.title"), "shop"]])],
    body: `
    <section class="wrap page">
      ${crumbs(ctx, trail)}
      <div class="shop">
        <aside class="filters">
          <h2 class="h-small">${t("shop.instruments")}</h2>
          <ul>
            <li><a href="${ctx.url("shop")}"${!cat ? ' class="active" aria-current="page"' : ""}>${t("shop.all")} <span>${ctx.products.length}</span></a></li>
            ${ctx.cats.map(c => `<li><a href="${ctx.url(`shop/${c.id}`)}"${cat === c ? ' class="active" aria-current="page"' : ""}>${esc(c.name)} <span>${ctx.inCat(c.id).length}</span></a></li>`).join("")}
          </ul>
        </aside>
        <div>
          <header class="shop-head">
            <div>
              <h1>${cat ? esc(cat.name) : t("shop.title")}</h1>
              <p class="muted">${cat ? esc(cat.blurb) : t("shop.lede")}</p>
            </div>
            <form class="shop-tools" role="search">
              <label class="search">${icon("search")}<span class="sr">${t("shop.search")}</span><input type="search" name="q" placeholder="${esc(t("shop.searchPh"))}"></label>
              <label><span class="sr">${t("shop.sort")}</span>
                <select name="sort">
                  <option value="featured">${t("shop.featured")}</option>
                  <option value="price-asc">${t("shop.priceAsc")}</option>
                  <option value="price-desc">${t("shop.priceDesc")}</option>
                </select>
              </label>
            </form>
          </header>
          ${cat ? "" : `<section class="product-lines" aria-labelledby="lines-h">
            <h2 id="lines-h" class="h-small">${t("shop.linesH")}</h2>
            <dl>
              <div><dt>${lineBadge(ctx, { line: "pro" })}</dt><dd>${t("shop.linePro")}</dd></div>
              <div><dt>${lineBadge(ctx, { line: "essential" })}</dt><dd>${t("shop.lineEssential")}</dd></div>
            </dl>
          </section>`}
          ${grid(ctx, list)}
          <div class="empty" hidden><p>${t("shop.noMatch")}</p><button type="button" class="btn btn-ghost" data-clear>${t("shop.clear")}</button></div>
        </div>
      </div>
    </section>`
  };
}

function gallery(ctx, p) {
  const photos = ctx.photos[p.sku] || [];
  const t = ctx.t;
  if (p.imageUrl) return `<div class="gallery" data-gallery>
    <div class="gallery-main">
      <figure class="gallery-panel is-external" id="g-ext">${externalImage(p, p.name, true)}</figure>
      <figure class="gallery-panel" id="g-dim">${sheet(ctx, p, true)}</figure>
    </div>
    <div class="thumbs" role="group" aria-label="${t("pdp.gallery")}">
      <button type="button" data-show="g-ext" aria-pressed="true" aria-label="${t("pdp.photo", { n: 1 })}"><img src="${esc(p.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>
      <button type="button" data-show="g-dim" aria-pressed="false" class="thumb-dim">${drawTool(Object.assign({ nodim: true }, p.draw), 0, false)}<span>${t("pdp.dimensions")}</span></button>
    </div>
  </div>`;
  if (!photos.length) return sheet(ctx, p, true);
  return `<div class="gallery" data-gallery>
    <div class="gallery-main">
      ${photos.map((ph, i) => `<figure class="gallery-panel" id="g-${i}">${picture(ctx, ph, `${p.name}, ${t("pdp.photo", { n: i + 1 })}`, "(max-width: 820px) 100vw, 600px", i === 0)}</figure>`).join("")}
      <figure class="gallery-panel" id="g-dim">${sheet(ctx, p, true)}</figure>
    </div>
    <div class="thumbs" role="group" aria-label="${t("pdp.gallery")}">
      ${photos.map((ph, i) => `<button type="button" data-show="g-${i}" aria-label="${t("pdp.photo", { n: i + 1 })}"${i === 0 ? ' aria-pressed="true"' : ' aria-pressed="false"'}>
        <img src="${ph.src[400].jpg}" alt="" width="${ph.width}" height="${ph.height}" loading="lazy"></button>`).join("")}
      <button type="button" data-show="g-dim" aria-pressed="false" class="thumb-dim">${drawTool(Object.assign({ nodim: true }, p.draw), 0, false)}<span>${t("pdp.dimensions")}</span></button>
    </div>
  </div>`;
}

export function product(ctx, p) {
  const { t, cfg } = ctx;
  const cat = ctx.catOf(p.cat);
  // A sample kit shows what's in it; other products show more from the same category.
  const kit = Boolean(p.trial && p.contains?.length);
  const related = kit ? p.contains.map(id => ctx.byId(id)).filter(Boolean) : ctx.inCat(p.cat).filter(x => x.id !== p.id).slice(0, 4);
  const stockKnown = typeof p.quantity === "number", soldOut = stockKnown && p.quantity <= 0;
  const maxQty = stockKnown ? Math.max(1, Math.min(9999, p.quantity)) : 9999;
  const def = baseFinish(p, cfg.finishes);
  const last = cfg.tiers[cfg.tiers.length - 1];
  const photos = ctx.photos[p.sku] || [];
  const ogFile = ctx.hasOg ? ctx.hasOg(p.id) : true;
  const fallbackOg = ctx.asset(ogFile ? `og/${p.id}.png` : "og/default.png");
  const images = p.imageUrl ? [p.imageUrl] : photos.length ? photos.map(ph => ctx.abs(ph.src[1000].jpg)) : [ctx.abs(fallbackOg)];
  const single = unitPrice(p, cfg.finishes, cfg.tiers, def, 1);
  const offer = {
    "@type": "Offer", url: ctx.abs(ctx.url(`product/${p.id}`)), priceCurrency: cfg.currency,
    price: single.toFixed(2), availability: soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition"
  };
  offer.priceSpecification = p.trial
    ? { "@type": "UnitPriceSpecification", priceCurrency: cfg.currency, valueAddedTaxIncluded: false, price: single.toFixed(2) }
    : cfg.tiers.map(tr => ({
      "@type": "UnitPriceSpecification", priceCurrency: cfg.currency, valueAddedTaxIncluded: false,
      price: unitPrice(p, cfg.finishes, cfg.tiers, def, tr.min).toFixed(2),
      eligibleQuantity: { "@type": "QuantitativeValue", minValue: tr.min, unitCode: "C62" }
    }));
  return {
    key: "product", path: `product/${p.id}`, nav: "shop", title: p.name, ogType: "product",
    ogImage: p.imageUrl || (photos.length ? photos[0].src[1000].jpg : fallbackOg),
    description: p.trial
      ? t("meta.productTrial", { summary: p.summary, sku: p.sku, price: ctx.money(single) })
      : t("meta.product", { summary: p.summary, sku: p.sku, price: ctx.money(lowestPrice(p, cfg.tiers)), min: last.min }),
    jsonld: [
      {
        "@context": "https://schema.org", "@type": "Product", name: p.name, sku: p.sku, mpn: p.sku, description: p.summary,
        image: images, brand: { "@type": "Brand", name: cfg.brand }, category: cat.name,
        countryOfOrigin: "PK", ...(p.steel ? { material: steelLabel(ctx, p) } : {}), offers: offer
      },
      breadcrumbLd(ctx, [[cat.name, `shop/${cat.id}`], [p.name, `product/${p.id}`]])
    ],
    body: `
    <section class="wrap page">
      ${crumbs(ctx, [[cat.name, `shop/${cat.id}`], [p.name, null]])}
      <div class="pdp">
        <div class="pdp-media">${gallery(ctx, p)}</div>
        <form class="pdp-info" id="buy" data-id="${p.id}"${stockKnown ? ` data-stock="${p.quantity}"` : ""}>
          <p class="pdp-meta">${lineBadge(ctx, p)}<span class="muted">${t("pdp.part", { sku: esc(p.sku) })}</span></p>
          <h1>${esc(p.name)}</h1>
          <p class="lede">${esc(p.summary)}</p>
          <p class="pdp-price"><span id="unit">${ctx.money(single)}</span> <span class="muted">${p.trial ? t("kit.perKit") : t("pdp.perPiece")}</span></p>
          ${availability(ctx, p) ? `<p class="pdp-stock">${availability(ctx, p)}</p>` : ""}
          ${p.trial ? `<p class="notice kit-limit">${icon("package")}<span>${t("pdp.trialLimit")}</span></p>` : ""}

          <fieldset class="finishes">
            <legend>${t("pdp.finish")}</legend>
            ${p.finishes.map(f => `<label class="chip"><input type="radio" name="finish" value="${f}"${f === def ? " checked" : ""}>
              <span>${t("finish." + f)}${cfg.finishes[f] ? ` <small>+${Math.round(cfg.finishes[f] * 100)}%</small>` : ""}</span></label>`).join("")}
          </fieldset>

          <div class="buy-row">
            ${p.trial ? `<input id="qty" name="qty" type="hidden" value="1">` : `<div class="stepper" role="group" aria-label="${t("pdp.qty")}">
              <button type="button" data-step="-1" aria-label="${t("pdp.dec")}">−</button>
              <input id="qty" name="qty" type="number" min="1" max="${maxQty}" value="1" inputmode="numeric" aria-label="${t("pdp.qty")}"${soldOut ? " disabled" : ""}>
              <button type="button" data-step="1" aria-label="${t("pdp.inc")}">+</button>
            </div>`}
            <button class="btn" type="submit"${soldOut ? " disabled" : ""}>${icon("bag")}${soldOut ? t("stock.out") : t("pdp.add")}</button>
          </div>
          <p class="muted" id="line-total" aria-live="polite"></p>
          <ul class="pdp-trust">
            <li>${icon("shieldCheck")}${t("trust.sharpT")}</li>
            <li>${icon("truck")}${t("trust.shipT")}</li>
            ${p.trial ? "" : `<li>${icon("tag")}${t("pdp.trustPL")}</li>`}
          </ul>

          ${p.trial ? "" : `<div id="tiers">${tierTable(ctx, p, def, 1)}</div>`}

          <h2 class="h-small">${t("pdp.details")}</h2>
          ${p.details?.length ? `<ul class="ticks">${p.details.map(d => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}
          <dl class="specs">
            ${p.steel ? `<div><dt>${t("spec.steel")}</dt><dd>${esc(steelLabel(ctx, p))}</dd></div>` : ""}
            ${p.length ? `<div><dt>${t("spec.length")}</dt><dd>${p.length} mm</dd></div>` : ""}
            <div><dt>${t("spec.hs")}</dt><dd>${cfg.hsCodes[p.cat]}</dd></div>
            <div><dt>${t("spec.origin")}</dt><dd>${t("spec.originV")}</dd></div>
            ${p.trial ? "" : `<div><dt>${t("spec.privateLabel")}</dt><dd>${t("spec.fromPcs", { n: cfg.privateLabelMinimum[p.cat] })}. <a href="${ctx.url("private-label")}?product=${p.id}">${t("spec.requestQuote")}</a></dd></div>`}
          </dl>
        </form>
      </div>
      ${related.length ? `<div class="section"><div class="section-head"><h2>${kit ? t("pdp.contains") : t("pdp.related")}</h2>${kit ? "" : `<a class="more" href="${ctx.url(`shop/${cat.id}`)}">${t("pdp.seeAll")}${icon("arrowRight")}</a>`}</div>${grid(ctx, related)}</div>` : ""}
    </section>`
  };
}

export function cart(ctx) {
  const { t, cfg } = ctx;
  const countries = ctx.countries;
  const terms = `<a href="${ctx.url("terms", cfg.defaultLanguage)}" target="_blank" rel="noopener">${t("co.termsLink")}</a>`;
  return {
    key: "cart", path: "cart", title: t("cart.title"), noindex: true,
    body: `
    <section class="wrap page">
      <h1>${t("cart.title")}</h1>
      <div id="cart-root" data-empty-h="${esc(t("cart.emptyH"))}">
        <p class="muted">${t("cart.loading")}</p>
        <noscript><p>${t("cart.noscript", { email: `<a href="mailto:${esc(cfg.orderEmail)}">${esc(cfg.orderEmail)}</a>` })}</p></noscript>
      </div>
      <div class="cart-empty" hidden>
        <p class="lede">${t("cart.emptyP")}</p>
        <div class="actions"><a class="btn" href="${ctx.url("shop")}">${t("home.ctaShop")}</a><a class="btn btn-ghost" href="${ctx.url("quick-order")}">${t("nav.quickOrder")}</a></div>
      </div>

      <form class="checkout" id="checkout" novalidate hidden>
        <h2>${t("co.h")}</h2>
        <div class="fields">
          ${field(ctx, "name", "co.name", "text", true, "name")}
          ${field(ctx, "company", "co.company", "text", true, "organization")}
          ${field(ctx, "email", "co.email", "email", true, "email")}
          ${field(ctx, "phone", "co.phone", "tel", true, "tel")}
          ${field(ctx, "street", "co.street", "text", true, "street-address", { wide: true })}
          ${field(ctx, "postcode", "co.postcode", "text", true, "postal-code")}
          ${field(ctx, "city", "co.city", "text", true, "address-level2")}
          <label class="field"><span>${t("co.country")}</span>
            <select name="country" required autocomplete="country">${countries.map(c => `<option value="${c.code}">${esc(c.name)}</option>`).join("")}</select></label>
          <label class="field"><span id="vat-label" data-vat="${esc(t("co.vat"))}" data-tax="${esc(t("co.taxId"))}" data-optional="${esc(t("co.optional"))}">${t("co.vat")}</span>
            <input name="vat" type="text" autocomplete="off" aria-describedby="hint-vat err-vat" spellcheck="false">
            <small class="hint" id="hint-vat" data-hint="${esc(t("co.vatHint"))}"></small><em class="err" id="err-vat"></em></label>
          ${textarea(ctx, "notes", "co.notes", { wide: true, placeholder: t("co.notesPh") })}
          <label class="check wide"><input type="checkbox" name="b2b" required aria-describedby="err-b2b"> <span>${t("co.b2b", { terms })}</span><em class="err" id="err-b2b"></em></label>
          ${honeypot}
        </div>
        <p class="form-error" id="checkout-error" role="alert" hidden></p>
        <button class="btn" type="submit" data-sending="${esc(t("co.sending"))}">${t("co.submit")}</button>
        <p class="muted">${t("co.help")}</p>
      </form>
    </section>`
  };
}

export function orderSent(ctx) {
  const { t } = ctx;
  return {
    key: "sent", path: "order-sent", title: t("sent.title"), noindex: true,
    body: `
    <section class="wrap page narrow" id="sent-root">
      <h1>${t("sent.none")}</h1>
      <p class="lede">${t("sent.noneP")}</p>
      <div class="actions"><a class="btn" href="${ctx.url("shop")}">${t("sent.back")}</a></div>
    </section>`
  };
}

export function quickOrder(ctx) {
  const { t, cfg } = ctx;
  return {
    key: "quick", path: "quick-order", nav: "quick-order", title: t("qo.title"), description: t("qo.lede"),
    body: `
    <section class="wrap page">
      ${crumbs(ctx, [[t("qo.title"), null]])}
      <div class="page-head">
        <div><h1>${t("qo.title")}</h1><p class="lede">${t("qo.lede")}</p></div>
        <a class="btn btn-ghost" href="${ctx.url("price-list")}">${t("nav.priceList")}</a>
      </div>
      <noscript><p class="notice">${t("qo.noscript")}</p></noscript>
      <form id="quick" class="quick">
        ${ctx.cats.map(c => `
        <table class="qo-table">
          <caption>${esc(c.name)}</caption>
          <thead><tr><th scope="col">${t("qo.product")}</th><th scope="col">${t("qo.finish")}</th><th scope="col" class="num">${t("qo.price")}</th><th scope="col" class="num">${t("qo.qty")}</th><th scope="col" class="num">${t("qo.total")}</th></tr></thead>
          <tbody>${ctx.inCat(c.id).filter(p => !p.trial).map(p => {
            const def = baseFinish(p, cfg.finishes);
            return `<tr data-id="${p.id}">
              <th scope="row"><a href="${ctx.url(`product/${p.id}`)}">${esc(p.name)}</a><small class="muted">${esc(p.sku)}</small></th>
              <td><select name="finish-${p.id}" aria-label="${t("qo.finish")}: ${esc(p.name)}">${p.finishes.map(f => `<option value="${f}"${f === def ? " selected" : ""}>${t("finish." + f)}</option>`).join("")}</select></td>
              <td class="num" data-unit>${ctx.money(unitPrice(p, cfg.finishes, cfg.tiers, def, 1))}</td>
              <td class="num"><input type="number" name="qty-${p.id}" min="0" max="9999" inputmode="numeric" placeholder="0" aria-label="${t("qo.qty")}: ${esc(p.name)}"></td>
              <td class="num" data-total>—</td>
            </tr>`;
          }).join("")}</tbody>
        </table>`).join("")}
        <div class="quick-bar">
          <span id="quick-sum" aria-live="polite"></span>
          <em class="err" id="quick-err"></em>
          <button class="btn" type="submit">${t("qo.add")}</button>
        </div>
      </form>
    </section>`
  };
}

export function priceList(ctx) {
  const { t, cfg } = ctx;
  const others = Object.entries(cfg.finishes).filter(([, v]) => v).map(([k, v]) => `${t("finish." + k).toLowerCase()} +${Math.round(v * 100)}%`).join(", ");
  const date = new Intl.DateTimeFormat(cfg.locales[ctx.lang], { dateStyle: "long" }).format(ctx.buildDate);
  return {
    key: "prices", path: "price-list", title: t("pl.title"), description: t("pl.lede", { finishes: others }),
    body: `
    <section class="wrap page">
      ${crumbs(ctx, [[t("pl.title"), null]])}
      <div class="print-head"><strong>${esc(cfg.brand)}</strong><span>${esc(cfg.orderEmail)} · ${esc(cfg.phone)}${cfg.whatsapp && cfg.whatsapp !== cfg.phone ? ` · WhatsApp ${esc(cfg.whatsapp)}` : ""}</span></div>
      <div class="page-head">
        <div>
          <h1>${t("pl.title")}</h1>
          <p class="lede">${t("pl.lede", { finishes: others })}</p>
          <p class="muted">${t("pl.valid", { date })} ${t("trade.strip")}</p>
        </div>
        <button type="button" class="btn btn-ghost no-print" data-print>${icon("printer")}${t("pl.print")}</button>
      </div>
      ${ctx.cats.map(c => `
      <div class="table-scroll"><table class="price-table">
        <caption>${esc(c.name)}</caption>
        <thead><tr><th scope="col">${t("spec.part")}</th><th scope="col">${t("qo.product")}</th><th scope="col" class="num">${t("spec.length")}</th>
          ${cfg.tiers.map((_, i) => `<th scope="col" class="num">${tierLabel(ctx, i)}</th>`).join("")}</tr></thead>
        <tbody>${ctx.inCat(c.id).filter(p => !p.trial).map(p => {
          const def = baseFinish(p, cfg.finishes);
          return `<tr><td>${esc(p.sku)}</td><th scope="row"><a href="${ctx.url(`product/${p.id}`)}">${esc(p.name)}</a></th><td class="num">${p.length} mm</td>
            ${cfg.tiers.map(tr => `<td class="num">${ctx.money(unitPrice(p, cfg.finishes, cfg.tiers, def, tr.min))}</td>`).join("")}</tr>`;
        }).join("")}</tbody>
      </table></div>`).join("")}
      <p class="muted">${t("pl.contact", { email: esc(cfg.orderEmail) })}</p>
    </section>`
  };
}

export function privateLabel(ctx) {
  const { t, cfg } = ctx;
  return {
    key: "pl", path: "private-label", nav: "private-label", title: t("plp.title"), description: t("plp.lede"),
    body: `
    <section class="wrap page">
      ${crumbs(ctx, [[t("plp.title"), null]])}
      <div class="split">
        <div>
          <h1>${t("plp.h1")}</h1>
          <p class="lede">${t("plp.lede")}</p>
          <h2>${t("plp.moqH")}</h2>
          <table class="tiers">
            <thead><tr><th scope="col">${t("plp.instrument")}</th><th scope="col">${t("plp.minimum")}</th><th scope="col">${t("plp.lead")}</th></tr></thead>
            <tbody>${ctx.cats.map(c => { const m = cfg.privateLabelMinimum[c.id]; return `<tr><td>${esc(c.name)}</td><td>${t("unit.pcs", { n: m })}</td><td>${m <= 50 ? t("plp.leadLong") : t("plp.leadShort")}</td></tr>`; }).join("")}</tbody>
          </table>
          <h2>${t("plp.brandH")}</h2>
          <ul class="ticks">${[1, 2, 3, 4].map(i => `<li>${t(`plp.brand${i}`)}</li>`).join("")}</ul>
          <h2>${t("plp.howH")}</h2>
          <ol class="steps compact">${[1, 2, 3, 4].map(i => `<li><h3>${t(`plp.s${i}`)}</h3><p>${t(`plp.s${i}p`)}</p></li>`).join("")}</ol>
        </div>
        <form class="panel" id="quote" novalidate data-subject="Private label quote">
          <h2>${t("plp.formH")}</h2>
          <div class="fields one">
            ${field(ctx, "name", "co.name", "text", true, "name")}
            ${field(ctx, "company", "plp.company", "text", true, "organization")}
            ${field(ctx, "email", "co.email", "email", true, "email")}
            ${textarea(ctx, "products", "plp.products", { rows: 4, required: true, placeholder: t("plp.productsPh") })}
            ${textarea(ctx, "branding", "plp.branding", { rows: 3, placeholder: t("plp.brandingPh") })}
            ${honeypot}
          </div>
          <button class="btn" type="submit" data-sending="${esc(t("co.sending"))}">${t("plp.submit")}</button>
          <p class="form-status" role="status"></p>
        </form>
      </div>
    </section>`
  };
}

export function about(ctx) {
  const { t, cfg } = ctx;
  return {
    key: "about", path: "about", nav: "about", title: t("about.title"), description: t("about.lede"),
    body: `
    <section class="wrap page narrow">
      <h1>${t("about.h1", { brand: esc(cfg.brand) })}</h1>
      <p class="lede">${t("about.lede")}</p>
      <p>${t("about.p1")}</p>
      <h2>${t("about.qcH")}</h2>
      <ul class="ticks">${[1, 2, 3, 4].map(i => `<li>${t(`about.qc${i}`)}</li>`).join("")}</ul>
      <h2>${t("about.notH")}</h2>
      <p>${t("about.notP")}</p>
      <div class="actions"><a class="btn" href="${ctx.url("shop")}">${t("home.ctaShop")}</a><a class="btn btn-ghost" href="${ctx.url("contact")}">${t("faq.contact")}</a></div>
    </section>`
  };
}

export function contact(ctx) {
  const { t, cfg } = ctx;
  return {
    key: "contact", path: "contact", nav: "contact", title: t("contact.title"), description: t("contact.lede"),
    body: `
    <section class="wrap page">
      <div class="split">
        <div>
          <h1>${t("contact.title")}</h1>
          <p class="lede">${t("contact.lede")}</p>
          <dl class="specs contact-specs">
            <div><dt>${icon("mail")}${t("contact.email")}</dt><dd><a href="mailto:${esc(cfg.orderEmail)}">${esc(cfg.orderEmail)}</a></dd></div>
            ${cfg.phone ? `<div><dt>${icon("phone")}${t("contact.phone")}</dt><dd><a href="${ctx.tel}">${esc(cfg.phone)}</a></dd></div>` : ""}
            ${ctx.wa ? `<div><dt>${icon("whatsapp")}${t("nav.whatsapp")}</dt><dd>${waLink(ctx, esc(cfg.whatsapp))}</dd></div>` : ""}
            <div><dt>${icon("mapPin")}${t("contact.workshop")}</dt><dd>${esc(cfg.address)}</dd></div>
          </dl>
          ${ctx.wa ? `<div class="actions">${waLink(ctx, `${icon("whatsapp")}${t("wa.label")}`, "btn")}</div>` : ""}
        </div>
        <form class="panel" id="contact" novalidate data-subject="Website message">
          <h2>${t("contact.formH")}</h2>
          <div class="fields one">
            ${field(ctx, "name", "co.name", "text", true, "name")}
            ${field(ctx, "company", "co.company", "text", false, "organization")}
            ${field(ctx, "email", "co.email", "email", true, "email")}
            ${textarea(ctx, "message", "contact.message", { rows: 5, required: true })}
            ${honeypot}
          </div>
          <button class="btn" type="submit" data-sending="${esc(t("co.sending"))}">${t("contact.submit")}</button>
          <p class="form-status" role="status"></p>
        </form>
      </div>
    </section>`
  };
}

export function faq(ctx) {
  const { t } = ctx;
  return {
    key: "faq", path: "faq", nav: "faq", title: t("faq.title"),
    description: ctx.faq.slice(0, 3).map(q => q[0]).join(" "),
    jsonld: [{
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: ctx.faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } }))
    }],
    body: `
    <section class="wrap page narrow">
      <h1>${t("faq.title")}</h1>
      <div class="faq">${ctx.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</div>
      <p>${t("faq.more")} <a href="${ctx.url("contact")}">${t("faq.contact")}</a>.</p>
    </section>`
  };
}

export function legal(ctx) {
  return legalPages(ctx).map(pg => ({
    key: "legal", path: pg.path, title: pg.title, langs: [ctx.cfg.defaultLanguage],
    body: `
    <section class="wrap page narrow legal">
      <h1>${pg.title}</h1>
      <p class="notice">${ctx.t("legal.draft")}</p>
      ${pg.html}
    </section>`
  }));
}

export function notFound(ctx) {
  const { t } = ctx;
  return {
    key: "404", path: "404", title: t("nf.title"), noindex: true, langs: [],
    body: `
    <section class="wrap page narrow">
      <h1>${t("nf.title")}</h1>
      <p class="lede">${t("nf.lede")}</p>
      <div class="actions"><a class="btn" href="${ctx.url("shop")}">${t("nf.cta")}</a></div>
    </section>`
  };
}
