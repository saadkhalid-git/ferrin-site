(function () {
  const S = window.SITE, P = window.PRODUCTS, C = window.CATEGORIES, F = window.FINISHES;
  const app = document.getElementById("app");
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = new Intl.NumberFormat("en-IE", { style: "currency", currency: S.currency });
  const money = n => fmt.format(n);
  const round = n => Math.round(n * 100) / 100;
  const byId = id => P.find(p => p.id === id);
  const catOf = id => C.find(c => c.id === id);
  const HS = { "cuticle-nippers": "8214.20", "nail-nippers": "8214.20", "manicure-scissors": "8213.00", "pushers-files": "8214.20",
    tweezers: "8203.20", barber: "8213.00", grooming: "8213.00", sets: "8214.20" };
  const MOQ = { "cuticle-nippers": 100, "nail-nippers": 100, "manicure-scissors": 100, "pushers-files": 200,
    tweezers: 200, barber: 50, grooming: 50, sets: 50 };

  // ---------- pricing ----------
  const tierFor = qty => [...S.tiers].reverse().find(t => qty >= t.min);
  const nextTier = qty => S.tiers.find(t => t.min > qty);
  const unitPrice = (p, finish, qty) => round(p.price * (1 + F[finish].pct) * (1 - tierFor(qty).off));
  const lowestPrice = p => round(p.price * (1 - S.tiers[S.tiers.length - 1].off));

  // ---------- cart ----------
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem("ferrin-cart")) || []; } catch (e) { cart = []; }
  cart = cart.filter(l => byId(l.id) && F[l.finish]);
  function saveCart() {
    try { localStorage.setItem("ferrin-cart", JSON.stringify(cart)); } catch (e) { /* storage unavailable */ }
    const n = cart.reduce((s, l) => s + l.qty, 0);
    const badge = document.getElementById("cart-count");
    badge.textContent = n;
    badge.hidden = n === 0;
  }
  function addToCart(id, finish, qty) {
    const line = cart.find(l => l.id === id && l.finish === finish);
    if (line) line.qty += qty; else cart.push({ id, finish, qty });
    saveCart();
  }
  function totals() {
    const lines = cart.map(l => {
      const p = byId(l.id), unit = unitPrice(p, l.finish, l.qty);
      return { ...l, p, unit, total: round(unit * l.qty) };
    });
    const subtotal = round(lines.reduce((s, l) => s + l.total, 0));
    const shipping = subtotal === 0 || subtotal >= S.freeShippingFrom ? 0 : S.shippingFlat;
    return { lines, subtotal, shipping, total: round(subtotal + shipping) };
  }

  // ---------- shared pieces ----------
  function sheet(p, big) {
    return `<div class="sheet${big ? " sheet-big" : ""}">
      ${drawTool(p.draw, p.length, p.name)}
      <dl class="titleblock">
        <div><dt>Part</dt><dd>${esc(p.sku)}</dd></div>
        <div><dt>Steel</dt><dd>${esc(p.steel.split(",")[0].replace(" stainless", ""))}</dd></div>
        <div><dt>Length</dt><dd>${p.length} mm</dd></div>
      </dl>
    </div>`;
  }
  function card(p) {
    return `<a class="card" href="#/product/${p.id}">
      ${sheet(p)}
      <div class="card-body">
        <h3>${esc(p.name)}</h3>
        <p class="price">${money(p.price)} <span class="muted">${money(lowestPrice(p))} each at 50+</span></p>
      </div>
    </a>`;
  }
  const grid = list => `<div class="grid">${list.map(card).join("")}</div>`;
  const setTitle = t => { document.title = t ? `${t} | ${S.brand}` : `${S.brand} | Salon instruments from Sialkot`; };

  function toast(msg, href, linkText) {
    const el = document.getElementById("toast");
    el.innerHTML = `<span>${esc(msg)}</span>${href ? `<a href="${href}">${esc(linkText)}</a>` : ""}`;
    el.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove("show"), 4000);
  }

  function mailto(subject, body) {
    return `mailto:${S.orderEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  // ---------- views ----------
  function home() {
    setTitle();
    const hero = byId("cuticle-nipper-full-jaw");
    const steps = [
      ["Choose your instruments", "Pick from the catalogue or send us a sample or drawing of what you sell today."],
      ["Approve samples", "We make samples with your logo and ship them to you. You check them with your own technicians."],
      ["Choose packaging", "Laser-etched logo, embossed cases, printed boxes and barcodes for retail."],
      ["Production and inspection", "Every piece is checked by hand and the order is inspected before it ships."]
    ];
    return `
    <section class="hero wrap">
      <div class="hero-copy">
        <h1>Salon instruments, hand-finished in Sialkot</h1>
        <p class="lede">Nippers, scissors, tweezers and barber shears from the city that makes most of the world's steel hand instruments. Order a few pieces to test, then buy by the box at volume prices or with your own brand on them.</p>
        <div class="actions">
          <a class="btn" href="#/shop">Browse the catalogue</a>
          <a class="btn btn-ghost" href="#/private-label">Ask about private label</a>
        </div>
        <ul class="facts">
          <li><strong>Up to 22% off</strong> volume prices, applied in the cart</li>
          <li><strong>From 50 pcs</strong> for your own logo</li>
          <li><strong>4–7 days</strong> door-to-door to the EU</li>
        </ul>
      </div>
      <a class="hero-sheet" href="#/product/${hero.id}" aria-label="${esc(hero.name)}">
        ${sheet(hero, true)}
        <span class="hero-caption"><span>${esc(hero.name)}</span><strong>${money(hero.price)}</strong></span>
      </a>
    </section>

    <section class="wrap section">
      <div class="section-head"><h2>Shop by instrument</h2><a href="#/shop">See all ${P.length} products</a></div>
      <div class="cats">
        ${C.map(c => `<a class="cat" href="#/shop/${c.id}">
          <div class="cat-draw">${drawTool(Object.assign({ nodim: true }, c.draw), 0, c.name)}</div>
          <h3>${esc(c.name)}</h3>
          <p>${P.filter(p => p.cat === c.id).length} products</p>
        </a>`).join("")}
      </div>
    </section>

    <section class="band">
      <div class="wrap pricing">
        <div>
          <h2>The more you order, the less each piece costs</h2>
          <p>Discounts apply to each product line automatically in the cart. Mix finishes and categories freely. All prices exclude VAT.</p>
        </div>
        ${tierTable(hero, "satin", 1)}
      </div>
    </section>

    <section class="wrap section">
      <div class="section-head"><h2>Best sellers</h2><a href="#/shop">Browse the catalogue</a></div>
      ${grid(P.filter(p => p.best).slice(0, 8))}
    </section>

    <section class="wrap section process">
      <div class="section-head"><h2>Your brand, made in our workshops</h2><a href="#/private-label">Private label details</a></div>
      <ol class="steps">${steps.map(s => `<li><h3>${s[0]}</h3><p>${s[1]}</p></li>`).join("")}</ol>
    </section>

    <section class="wrap section workshop">
      <div>
        <h2>Why Sialkot</h2>
        <p>Sialkot has made steel hand instruments for more than a century. Thousands of workshops there grind, polish, set and sharpen instruments for salons, clinics and brands around the world.</p>
        <p>We work with a small number of these workshops, specify the steel for each product, and check every nipper, shear and tweezer before it's packed. You get workshop pricing without having to manage the factory yourself.</p>
      </div>
      <dl class="specs">
        <div><dt>Manicure steel</dt><dd>AISI 420 stainless, 52–54 HRC</dd></div>
        <div><dt>Shear steel</dt><dd>440C stainless, 58–60 HRC</dd></div>
        <div><dt>Edges</dt><dd>Hand-sharpened, tested before packing</dd></div>
        <div><dt>Origin</dt><dd>Made in Pakistan</dd></div>
      </dl>
    </section>`;
  }

  function tierTable(p, finish, qty) {
    const cur = tierFor(qty);
    return `<table class="tiers">
      <thead><tr><th scope="col">Quantity</th><th scope="col">Price per piece</th><th scope="col">Saving</th></tr></thead>
      <tbody>${S.tiers.map(t => `<tr class="${t === cur ? "current" : ""}">
        <td>${t.label}</td><td>${money(unitPrice(p, finish, t.min))}</td><td>${t.off ? Math.round(t.off * 100) + "%" : "—"}</td></tr>`).join("")}
      </tbody></table>`;
  }

  function shop(catId, params) {
    const cat = catOf(catId);
    const q = (params.get("q") || "").trim().toLowerCase();
    const sort = params.get("sort") || "featured";
    let list = P.filter(p => (!cat || p.cat === cat.id) &&
      (!q || (p.name + " " + p.sku + " " + p.summary).toLowerCase().includes(q)));
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    setTitle(cat ? cat.name : "Catalogue");
    const base = cat ? `#/shop/${cat.id}` : "#/shop";
    return `
    <section class="wrap page">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a> / ${cat ? `<a href="#/shop">Catalogue</a> / <span>${esc(cat.name)}</span>` : "<span>Catalogue</span>"}</nav>
      <div class="shop">
        <aside class="filters">
          <h2 class="h-small">Instruments</h2>
          <ul>
            <li><a href="#/shop" class="${!cat ? "active" : ""}">All products <span>${P.length}</span></a></li>
            ${C.map(c => `<li><a href="#/shop/${c.id}" class="${cat === c ? "active" : ""}">${esc(c.name)} <span>${P.filter(p => p.cat === c.id).length}</span></a></li>`).join("")}
          </ul>
        </aside>
        <div>
          <header class="shop-head">
            <div>
              <h1>${cat ? esc(cat.name) : "Catalogue"}</h1>
              <p class="muted">${cat ? esc(cat.blurb) : "Every instrument, with volume prices shown on each product."}</p>
            </div>
            <form class="shop-tools" data-base="${base}">
              <label><span class="sr">Search</span><input type="search" name="q" value="${esc(q)}" placeholder="Search products or part numbers"></label>
              <label><span class="sr">Sort</span>
                <select name="sort">
                  <option value="featured" ${sort === "featured" ? "selected" : ""}>Featured</option>
                  <option value="price-asc" ${sort === "price-asc" ? "selected" : ""}>Price, low to high</option>
                  <option value="price-desc" ${sort === "price-desc" ? "selected" : ""}>Price, high to low</option>
                </select>
              </label>
            </form>
          </header>
          ${list.length ? grid(list) : `<div class="empty"><p>No products match "${esc(q)}".</p><a class="btn btn-ghost" href="${base}">Clear search</a></div>`}
        </div>
      </div>
    </section>`;
  }

  function product(id) {
    const p = byId(id);
    if (!p) return notFound();
    const cat = catOf(p.cat);
    setTitle(p.name);
    const related = P.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 4);
    const def = p.finishes.reduce((a, f) => (F[f].pct < F[a].pct ? f : a));
    return `
    <section class="wrap page">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a> / <a href="#/shop/${cat.id}">${esc(cat.name)}</a> / <span>${esc(p.name)}</span></nav>
      <div class="pdp">
        <div class="pdp-media">${sheet(p, true)}</div>
        <form class="pdp-info" id="buy" data-id="${p.id}">
          <p class="muted">Part ${esc(p.sku)}</p>
          <h1>${esc(p.name)}</h1>
          <p class="lede">${esc(p.summary)}</p>
          <p class="pdp-price"><span id="unit">${money(unitPrice(p, def, 1))}</span> <span class="muted">per piece, excl. VAT</span></p>

          <fieldset class="finishes">
            <legend>Finish</legend>
            ${p.finishes.map(f => `<label class="chip"><input type="radio" name="finish" value="${f}" ${f === def ? "checked" : ""}>
              <span>${F[f].name}${F[f].pct ? ` <small>+${Math.round(F[f].pct * 100)}%</small>` : ""}</span></label>`).join("")}
          </fieldset>

          <div class="buy-row">
            <div class="stepper" role="group" aria-label="Quantity">
              <button type="button" data-step="-1" aria-label="Decrease quantity">−</button>
              <input id="qty" name="qty" type="number" min="1" max="9999" value="1" inputmode="numeric" aria-label="Quantity">
              <button type="button" data-step="1" aria-label="Increase quantity">+</button>
            </div>
            <button class="btn" type="submit">Add to cart</button>
          </div>
          <p class="muted" id="line-total"></p>

          <div id="tiers">${tierTable(p, def, 1)}</div>

          <h2 class="h-small">Details</h2>
          <ul class="ticks">${p.details.map(d => `<li>${esc(d)}</li>`).join("")}</ul>
          <dl class="specs">
            <div><dt>Steel</dt><dd>${esc(p.steel)}</dd></div>
            <div><dt>Length</dt><dd>${p.length} mm</dd></div>
            <div><dt>HS code</dt><dd>${HS[p.cat]}</dd></div>
            <div><dt>Origin</dt><dd>Made in Pakistan</dd></div>
            <div><dt>Private label</dt><dd>From ${MOQ[p.cat]} pcs · <a href="#/private-label?product=${p.id}">Request a quote</a></dd></div>
          </dl>
        </form>
      </div>
      ${related.length ? `<div class="section"><div class="section-head"><h2>More ${esc(cat.name.toLowerCase())}</h2><a href="#/shop/${cat.id}">See all</a></div>${grid(related)}</div>` : ""}
    </section>`;
  }

  function bindProduct() {
    const form = document.getElementById("buy");
    if (!form) return;
    const p = byId(form.dataset.id);
    const qtyEl = form.querySelector("#qty");
    const read = () => ({ finish: form.querySelector("input[name=finish]:checked").value, qty: Math.max(1, Math.min(9999, parseInt(qtyEl.value, 10) || 1)) });
    function update() {
      const { finish, qty } = read();
      const unit = unitPrice(p, finish, qty);
      form.querySelector("#unit").textContent = money(unit);
      form.querySelector("#tiers").innerHTML = tierTable(p, finish, qty);
      const nt = nextTier(qty);
      form.querySelector("#line-total").textContent = `${qty} × ${money(unit)} = ${money(round(unit * qty))}` +
        (nt ? ` · Order ${nt.min - qty} more for ${Math.round(nt.off * 100)}% off each` : "");
    }
    form.addEventListener("click", e => {
      const b = e.target.closest("[data-step]");
      if (!b) return;
      qtyEl.value = Math.max(1, (parseInt(qtyEl.value, 10) || 1) + Number(b.dataset.step));
      update();
    });
    form.addEventListener("input", update);
    form.addEventListener("submit", e => {
      e.preventDefault();
      const { finish, qty } = read();
      addToCart(p.id, finish, qty);
      toast(`Added ${qty} × ${p.name} (${F[finish].name}) to your cart`, "#/cart", "View cart");
    });
    update();
  }

  const COUNTRIES = ["Luxembourg", "Belgium", "France", "Germany", "Netherlands", "Austria", "Italy", "Spain", "Portugal", "Poland",
    "Czechia", "Denmark", "Sweden", "Finland", "Ireland", "Greece", "Hungary", "Romania", "Slovakia", "Slovenia", "Croatia",
    "Bulgaria", "Estonia", "Latvia", "Lithuania", "Cyprus", "Malta", "Switzerland", "United Kingdom", "Norway", "Other"];

  function cartView() {
    setTitle("Cart");
    const t = totals();
    if (!t.lines.length) return `<section class="wrap page narrow"><h1>Your cart is empty</h1>
      <p class="lede">Add instruments from the catalogue. Volume discounts are applied here automatically.</p>
      <a class="btn" href="#/shop">Browse the catalogue</a></section>`;
    return `
    <section class="wrap page">
      <h1>Cart</h1>
      <div class="cart">
        <div>
          <ul class="lines">
            ${t.lines.map((l, i) => {
              const nt = nextTier(l.qty);
              return `<li class="line">
                <a class="line-draw" href="#/product/${l.p.id}">${drawTool(Object.assign({ nodim: true }, l.p.draw), 0, l.p.name)}</a>
                <div class="line-info">
                  <a href="#/product/${l.p.id}"><strong>${esc(l.p.name)}</strong></a>
                  <span class="muted">${esc(l.p.sku)} · ${F[l.finish].name} · ${money(l.unit)} each</span>
                  ${nt ? `<span class="nudge">Add ${nt.min - l.qty} more for ${Math.round(nt.off * 100)}% off each</span>` : ""}
                </div>
                <div class="stepper small" role="group" aria-label="Quantity for ${esc(l.p.name)}">
                  <button type="button" data-line="${i}" data-step="-1" aria-label="Decrease">−</button>
                  <input type="number" min="1" max="9999" value="${l.qty}" data-line="${i}" aria-label="Quantity">
                  <button type="button" data-line="${i}" data-step="1" aria-label="Increase">+</button>
                </div>
                <strong class="line-total">${money(l.total)}</strong>
                <button type="button" class="link" data-remove="${i}">Remove</button>
              </li>`;
            }).join("")}
          </ul>
        </div>
        <aside class="summary">
          <h2 class="h-small">Order summary</h2>
          <dl>
            <div><dt>Subtotal</dt><dd>${money(t.subtotal)}</dd></div>
            <div><dt>Shipping</dt><dd>${t.shipping ? money(t.shipping) : "Free"}</dd></div>
            <div class="grand"><dt>Total excl. VAT</dt><dd>${money(t.total)}</dd></div>
          </dl>
          ${t.shipping ? `<p class="muted">Free shipping from ${money(S.freeShippingFrom)}. Add ${money(S.freeShippingFrom - t.subtotal)} more.</p>` : ""}
          <p class="muted">No payment is taken on this site. We confirm stock and send an invoice by email within one working day.</p>
        </aside>
      </div>

      <form class="checkout" id="checkout" novalidate>
        <h2>Your details</h2>
        <div class="fields">
          ${field("name", "Full name", "text", true, "name")}
          ${field("company", "Company or salon", "text", false, "organization")}
          ${field("email", "Email", "email", true, "email")}
          ${field("phone", "Phone", "tel", false, "tel")}
          ${field("address", "Delivery address", "text", true, "street-address", true)}
          <label class="field"><span>Country</span>
            <select name="country" required autocomplete="country-name">${COUNTRIES.map(c => `<option>${c}</option>`).join("")}</select></label>
          ${field("vat", "VAT number (for businesses)", "text", false, "off")}
          <label class="field wide"><span>Notes</span><textarea name="notes" rows="3" placeholder="Delivery times, logo questions, anything else"></textarea></label>
        </div>
        <button class="btn" type="submit">Send order request</button>
        <p class="muted">This opens your email app with the order filled in, addressed to ${esc(S.orderEmail)}.</p>
      </form>
    </section>`;
  }

  function field(name, label, type, required, ac, wide) {
    return `<label class="field${wide ? " wide" : ""}"><span>${label}${required ? "" : ' <small class="muted">optional</small>'}</span>
      <input name="${name}" type="${type}" ${required ? "required" : ""} autocomplete="${ac}">
      <em class="err" id="err-${name}"></em></label>`;
  }

  function validate(form) {
    let ok = true;
    form.querySelectorAll("input[required], textarea[required]").forEach(el => {
      const err = form.querySelector(`#err-${el.name}`);
      let msg = "";
      if (!el.value.trim()) msg = "Enter your " + el.closest("label").querySelector("span").firstChild.textContent.trim().toLowerCase() + ".";
      else if (el.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) msg = "Enter an email address like name@example.com.";
      if (err) err.textContent = msg;
      el.setAttribute("aria-invalid", msg ? "true" : "false");
      if (msg && ok) { el.focus(); ok = false; }
    });
    return ok;
  }

  let lastOrder = null;
  function bindCart() {
    const root = document.querySelector(".cart");
    if (!root) return;
    const rerender = () => { saveCart(); render(); };
    root.addEventListener("click", e => {
      const step = e.target.closest("[data-step]"), rm = e.target.closest("[data-remove]");
      if (step) { const l = cart[step.dataset.line]; l.qty = Math.max(1, l.qty + Number(step.dataset.step)); rerender(); }
      if (rm) { cart.splice(Number(rm.dataset.remove), 1); rerender(); }
    });
    root.addEventListener("change", e => {
      if (e.target.dataset.line === undefined) return;
      cart[e.target.dataset.line].qty = Math.max(1, Math.min(9999, parseInt(e.target.value, 10) || 1));
      rerender();
    });
    document.getElementById("checkout").addEventListener("submit", e => {
      e.preventDefault();
      const form = e.target;
      if (!validate(form)) return;
      const d = Object.fromEntries(new FormData(form));
      const t = totals();
      const ref = "FR-" + Date.now().toString(36).toUpperCase().slice(-6);
      const body = [
        `Order request ${ref}`, "",
        ...t.lines.map(l => `${l.qty} × ${l.p.name} [${l.p.sku}, ${F[l.finish].name}] @ ${money(l.unit)} = ${money(l.total)}`), "",
        `Subtotal: ${money(t.subtotal)}`, `Shipping: ${t.shipping ? money(t.shipping) : "Free"}`, `Total excl. VAT: ${money(t.total)}`, "",
        `Name: ${d.name}`, `Company: ${d.company || "-"}`, `Email: ${d.email}`, `Phone: ${d.phone || "-"}`,
        `Address: ${d.address}`, `Country: ${d.country}`, `VAT number: ${d.vat || "-"}`, "", `Notes: ${d.notes || "-"}`
      ].join("\n");
      lastOrder = { ref, body, email: d.email };
      window.location.href = mailto(`Order request ${ref} – ${d.company || d.name}`, body);
      cart = []; saveCart();
      location.hash = "#/order-sent";
    });
  }

  function orderSent() {
    setTitle("Order request ready");
    if (!lastOrder) return `<section class="wrap page narrow"><h1>No order in progress</h1><a class="btn" href="#/shop">Browse the catalogue</a></section>`;
    return `<section class="wrap page narrow">
      <h1>Send the email to place your order</h1>
      <p class="lede">Your email app should now show order request <strong>${lastOrder.ref}</strong> addressed to ${esc(S.orderEmail)}. Press send in your email app. We reply to ${esc(lastOrder.email)} with an invoice within one working day.</p>
      <p>If your email app didn't open, copy the order below and email it to <a href="mailto:${S.orderEmail}">${esc(S.orderEmail)}</a>.</p>
      <pre class="order-text" id="order-text">${esc(lastOrder.body)}</pre>
      <div class="actions"><button class="btn" type="button" id="copy-order">Copy order</button><a class="btn btn-ghost" href="#/shop">Back to the catalogue</a></div>
    </section>`;
  }

  function privateLabel(params) {
    setTitle("Private label");
    const pre = byId(params.get("product") || "");
    return `
    <section class="wrap page">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a> / <span>Private label</span></nav>
      <div class="split">
        <div>
          <h1>Put your brand on professional instruments</h1>
          <p class="lede">For salon suppliers, nail academies, barber brands and online shops. You choose the instruments, finish and packaging. We make samples, then produce and inspect your order.</p>
          <h2>Minimum order per product</h2>
          <table class="tiers">
            <thead><tr><th scope="col">Instrument</th><th scope="col">Minimum</th><th scope="col">Lead time</th></tr></thead>
            <tbody>${C.map(c => `<tr><td>${esc(c.name)}</td><td>${MOQ[c.id]} pcs</td><td>${MOQ[c.id] <= 50 ? "5–6 weeks" : "4–5 weeks"}</td></tr>`).join("")}</tbody>
          </table>
          <h2>Branding options</h2>
          <ul class="ticks">
            <li>Laser-etched logo on the instrument</li>
            <li>Embossed logo on leather and zip cases</li>
            <li>Printed boxes, blister cards and EAN barcodes</li>
            <li>Custom finishes: mirror, satin, matte black, coloured titanium</li>
          </ul>
          <h2>How it works</h2>
          <ol class="steps compact">
            <li><h3>Send your request</h3><p>Tell us the products, quantities and branding you need.</p></li>
            <li><h3>Get a quote and samples</h3><p>Quote within two working days. Branded samples in about two weeks.</p></li>
            <li><h3>Approve and pay the deposit</h3><p>30% to start production, balance before shipping.</p></li>
            <li><h3>Inspection and delivery</h3><p>Independent inspection is available on request before dispatch.</p></li>
          </ol>
        </div>
        <form class="panel" id="quote" novalidate>
          <h2>Request a quote</h2>
          <div class="fields one">
            ${field("name", "Full name", "text", true, "name")}
            ${field("company", "Company", "text", true, "organization")}
            ${field("email", "Email", "email", true, "email")}
            <label class="field"><span>Products</span><textarea name="products" rows="4" placeholder="e.g. 300 × cuticle nipper, full jaw, matte black">${pre ? `${MOQ[pre.cat]} × ${pre.name} [${pre.sku}]` : ""}</textarea></label>
            <label class="field"><span>Branding and packaging</span><textarea name="branding" rows="3" placeholder="Logo on instrument, printed box, leather case…"></textarea></label>
          </div>
          <button class="btn" type="submit">Send quote request</button>
          <p class="muted">Opens your email app, addressed to ${esc(S.orderEmail)}.</p>
        </form>
      </div>
    </section>`;
  }

  function simpleForm(id, subject, fieldsToText) {
    const form = document.getElementById(id);
    if (!form) return;
    form.addEventListener("submit", e => {
      e.preventDefault();
      if (!validate(form)) return;
      const d = Object.fromEntries(new FormData(form));
      window.location.href = mailto(subject(d), fieldsToText(d));
      toast("Your email app should open with the message ready to send.");
    });
  }

  function about() {
    setTitle("About");
    return `<section class="wrap page narrow">
      <h1>About ${esc(S.brand)}</h1>
      <p class="lede">We sell professional beauty, barber and grooming instruments made in Sialkot, Pakistan, to salons and resellers in Europe.</p>
      <p>Sialkot's workshops make instruments for many well-known brands, but buying there directly means dealing with minimum orders, samples, quality checks and export paperwork. We take care of that. You get instruments at close to workshop prices, in the quantity you need.</p>
      <h2>How we check quality</h2>
      <ul class="ticks">
        <li>We specify the steel and hardness for every product</li>
        <li>Nippers are test-cut on cuticle film; shears are test-cut on wet cotton</li>
        <li>Tweezer tips are checked for alignment under magnification</li>
        <li>Orders can be inspected independently before they ship</li>
      </ul>
      <h2>What we don't sell</h2>
      <p>We sell instruments for cosmetic, salon and grooming use only. We don't sell surgical or medical devices.</p>
      <div class="actions"><a class="btn" href="#/shop">Browse the catalogue</a><a class="btn btn-ghost" href="#/contact">Contact us</a></div>
    </section>`;
  }

  function contact() {
    setTitle("Contact");
    return `<section class="wrap page">
      <div class="split">
        <div>
          <h1>Contact</h1>
          <p class="lede">Questions about products, samples or wholesale accounts. We reply within one working day.</p>
          <dl class="specs">
            <div><dt>Email</dt><dd><a href="mailto:${S.orderEmail}">${esc(S.orderEmail)}</a></dd></div>
            <div><dt>Phone</dt><dd>${esc(S.phone)}</dd></div>
            <div><dt>Workshop</dt><dd>${esc(S.address)}</dd></div>
          </dl>
        </div>
        <form class="panel" id="contact" novalidate>
          <h2>Send a message</h2>
          <div class="fields one">
            ${field("name", "Full name", "text", true, "name")}
            ${field("email", "Email", "email", true, "email")}
            <label class="field"><span>Message</span><textarea name="message" rows="5" required></textarea><em class="err" id="err-message"></em></label>
          </div>
          <button class="btn" type="submit">Send message</button>
        </form>
      </div>
    </section>`;
  }

  function faq() {
    setTitle("FAQ");
    const qs = [
      ["Do prices include VAT?", "No. Prices exclude VAT. EU businesses with a valid VAT number are invoiced without VAT under the reverse-charge rules; private buyers pay the VAT of their country."],
      ["How do I pay?", "After you send an order request we email an invoice. You pay by bank transfer, and we ship when the payment arrives."],
      ["How long does delivery take?", "Stock items ship from Sialkot by express courier and usually arrive in the EU in 4–7 working days."],
      ["Will I pay import duty?", "Import duty and customs handling depend on your country and the product. Many instruments from Pakistan enter the EU duty-free under the GSP+ scheme when the correct origin statement is on the invoice, which we include."],
      ["Can I order a sample first?", "Yes. Order a single piece at the normal price. If you then order 50 or more of the same product within 60 days, we credit the sample price."],
      ["What if an instrument is faulty?", "Tell us within 30 days of delivery with a photo and we'll replace it or refund it."],
      ["Do you resharpen?", "Barber and grooming shears can be sent back for sharpening. Ask us for the current price."]
    ];
    return `<section class="wrap page narrow"><h1>Frequently asked questions</h1>
      <div class="faq">${qs.map(q => `<details><summary>${q[0]}</summary><p>${q[1]}</p></details>`).join("")}</div>
      <p>Still have a question? <a href="#/contact">Contact us</a>.</p></section>`;
  }

  function legal(kind) {
    setTitle(kind === "privacy" ? "Privacy" : "Terms");
    return `<section class="wrap page narrow"><h1>${kind === "privacy" ? "Privacy policy" : "Terms of sale"}</h1>
      <p class="notice">This page is a placeholder. Replace it with your own ${kind === "privacy" ? "privacy policy (GDPR)" : "terms of sale"} before the site goes live.</p></section>`;
  }

  function notFound() {
    setTitle("Page not found");
    return `<section class="wrap page narrow"><h1>Page not found</h1><p class="lede">The link may be old or mistyped.</p><a class="btn" href="#/shop">Go to the catalogue</a></section>`;
  }

  // ---------- router ----------
  function render() {
    const raw = location.hash.replace(/^#/, "") || "/";
    const [path, qs] = raw.split("?");
    const params = new URLSearchParams(qs || "");
    const parts = path.split("/").filter(Boolean);
    let html;
    switch (parts[0]) {
      case undefined: html = home(); break;
      case "shop": html = parts[1] && !catOf(parts[1]) ? notFound() : shop(parts[1], params); break;
      case "product": html = product(parts[1]); break;
      case "cart": html = cartView(); break;
      case "order-sent": html = orderSent(); break;
      case "private-label": html = privateLabel(params); break;
      case "about": html = about(); break;
      case "contact": html = contact(); break;
      case "faq": html = faq(); break;
      case "terms": html = legal("terms"); break;
      case "privacy": html = legal("privacy"); break;
      default: html = notFound();
    }
    app.innerHTML = html;
    document.querySelectorAll(".nav a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#/" + (parts[0] || "")));
    document.body.classList.remove("menu-open");
    document.getElementById("menu-btn").setAttribute("aria-expanded", "false");
    bindProduct();
    bindCart();
    simpleForm("quote", d => `Private label quote – ${d.company}`, d =>
      `Name: ${d.name}\nCompany: ${d.company}\nEmail: ${d.email}\n\nProducts:\n${d.products || "-"}\n\nBranding and packaging:\n${d.branding || "-"}`);
    simpleForm("contact", d => `Message from ${d.name}`, d => `Name: ${d.name}\nEmail: ${d.email}\n\n${d.message}`);
    const tools = document.querySelector(".shop-tools");
    if (tools) {
      const go = () => {
        const q = tools.q.value.trim(), s = tools.sort.value;
        const p = new URLSearchParams();
        if (q) p.set("q", q);
        if (s !== "featured") p.set("sort", s);
        const next = tools.dataset.base + (p.toString() ? "?" + p : "");
        if (location.hash !== next) location.hash = next;
      };
      tools.addEventListener("submit", e => { e.preventDefault(); go(); });
      tools.sort.addEventListener("change", go);
      tools.q.addEventListener("search", go);
    }
    const copy = document.getElementById("copy-order");
    if (copy) copy.addEventListener("click", () => {
      navigator.clipboard.writeText(lastOrder.body).then(() => toast("Order copied. Paste it into an email to " + S.orderEmail + "."),
        () => toast("Select the order text and copy it manually."));
    });
    if (!render.keepScroll) window.scrollTo(0, 0);
    render.keepScroll = false;
    app.focus({ preventScroll: true });
  }

  // cart edits re-render without jumping to top
  document.addEventListener("click", e => { if (e.target.closest(".cart [data-step], .cart [data-remove]")) render.keepScroll = true; }, true);
  document.addEventListener("change", e => { if (e.target.closest(".cart")) render.keepScroll = true; }, true);

  document.getElementById("menu-btn").addEventListener("click", e => {
    const open = document.body.classList.toggle("menu-open");
    e.currentTarget.setAttribute("aria-expanded", String(open));
  });
  document.querySelectorAll("[data-brand]").forEach(el => { el.textContent = S.brand; });
  document.getElementById("year").textContent = new Date().getFullYear();
  document.getElementById("footer-email").innerHTML = `<a href="mailto:${S.orderEmail}">${esc(S.orderEmail)}</a>`;

  window.addEventListener("hashchange", render);
  saveCart();
  render();
})();
