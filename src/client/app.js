// Browser code. Pages are already rendered at build time; this adds the cart, live prices and forms.
import { round, tierFor, nextTier, unitPrice, shippingFor, needsVat, vatExample, normaliseVat } from "../shared/pricing.js";

const site = JSON.parse(document.getElementById("site").textContent);
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- storage (may be unavailable in private windows) ----------
const store = {
  get(key, fallback, session) {
    try { const v = (session ? sessionStorage : localStorage).getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  },
  set(key, value, session) {
    try { (session ? sessionStorage : localStorage).setItem(key, JSON.stringify(value)); } catch (e) { /* not available */ }
  }
};

// ---------- catalogue ----------
let catalogPromise;
const loadCatalog = () => (catalogPromise ||= fetch(site.catalog).then(r => {
  if (!r.ok) throw new Error("catalog " + r.status);
  return r.json();
}));
let C = null;
const t = (key, vars = {}) => String(C?.ui[key] ?? key).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
let fmt;
const money = n => fmt.format(n);
const price = (p, finish, qty) => unitPrice(p, C.finishes, C.tiers, finish, qty);

// ---------- cart ----------
let cart = store.get("ferrin-cart", []);
if (!Array.isArray(cart)) cart = [];

function saveCart() {
  store.set("ferrin-cart", cart);
  updateBadge();
}
function updateBadge() {
  const n = cart.reduce((s, l) => s + (l.qty || 0), 0);
  const badge = $("#cart-count");
  if (badge) { badge.textContent = n; badge.hidden = n === 0; }
}
// Returns how many pieces were added. Trial products (the sample kit) are limited to one per customer.
function addToCart(id, finish, qty) {
  if (C?.products[id]?.trial) {
    if (cart.some(l => l.id === id)) return 0;
    cart.push({ id, finish, qty: 1 });
    saveCart();
    return 1;
  }
  const line = cart.find(l => l.id === id && l.finish === finish);
  if (line) line.qty = Math.min(9999, line.qty + qty); else cart.push({ id, finish, qty });
  saveCart();
  return qty;
}
function cartLines() {
  const trials = new Set();
  cart = cart.filter(l => {
    const p = C.products[l.id];
    if (!p || !p.finishes.includes(l.finish) || !(l.qty > 0)) return false;
    if (p.trial) { if (trials.has(l.id)) return false; trials.add(l.id); l.qty = 1; }
    return true;
  });
  return cart.map(l => {
    const p = C.products[l.id], unit = price(p, l.finish, l.qty);
    return { ...l, p, unit, total: round(unit * l.qty) };
  });
}

// ---------- small UI helpers ----------
function toast(msg, href, linkText) {
  const el = $("#toast");
  el.innerHTML = `<span>${esc(msg)}</span>${href ? `<a href="${href}">${esc(linkText)}</a>` : ""}`;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 4500);
}

function validate(form, extra) {
  let first = null;
  const setErr = (name, msg) => {
    const err = form.querySelector(`#err-${name}`), el = form.elements[name];
    if (err) err.textContent = msg;
    if (el && el.setAttribute) el.setAttribute("aria-invalid", msg ? "true" : "false");
    if (msg && !first) first = el;
  };
  $$("[required]", form).forEach(el => {
    let msg = "";
    if (el.type === "checkbox") msg = el.checked ? "" : t(el.name === "b2b" ? "err.b2b" : "err.required");
    else if (!el.value.trim()) msg = t("err.required");
    else if (el.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim())) msg = t("err.email");
    setErr(el.name, msg);
  });
  if (extra) extra(setErr);
  if (first) first.focus();
  return !first;
}

function openMail(subject, body) {
  const a = document.createElement("a");
  a.href = `mailto:${C.orderEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Sends through Web3Forms. Resolves true when delivered, false when the email app should be used instead.
async function sendForm(form, subject, fields, message) {
  if (form.elements.botcheck?.checked) return true; // spam trap ticked: pretend it worked
  if (!C.web3formsKey) return false;
  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ access_key: C.web3formsKey, subject, from_name: `${C.brand} website`, replyto: fields.email, botcheck: false, ...fields, message })
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.success !== false;
  } catch (e) {
    return false;
  }
}

function setBusy(form, busy) {
  const btn = form.querySelector("button[type=submit]");
  if (!btn) return;
  if (busy) { btn.dataset.label = btn.textContent; btn.textContent = btn.dataset.sending || "…"; btn.disabled = true; }
  else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
}

// ---------- header ----------
function initHeader() {
  const btn = $("#menu-btn");
  const setMenu = open => { document.body.classList.toggle("menu-open", open); btn?.setAttribute("aria-expanded", String(open)); };
  btn?.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  const lang = $(".lang");
  document.addEventListener("click", e => { if (lang?.open && !lang.contains(e.target)) lang.open = false; });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (lang?.open) { lang.open = false; lang.querySelector("summary").focus(); }
    else if (document.body.classList.contains("menu-open")) { setMenu(false); btn.focus(); }
  });
  // On the home page's first screen the floating WhatsApp button would cover the hero buttons or the trust bar,
  // so it steps aside while the hero buttons are visible (see .wa-float.is-away in styles.css).
  const heroActions = $(".hero .actions"), wa = $(".wa-float");
  if (heroActions && wa && "IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => wa.classList.toggle("is-away", entry.isIntersecting)).observe(heroActions);
  }
}

// ---------- catalogue page: search and sort ----------
function initShop() {
  const form = $(".shop-tools");
  const gridEl = $(".page .grid");
  if (!form || !gridEl) return;
  const cards = $$(".card", gridEl);
  const empty = $(".empty");
  const params = new URLSearchParams(location.search);
  form.q.value = params.get("q") || "";
  form.sort.value = ["price-asc", "price-desc"].includes(params.get("sort")) ? params.get("sort") : "featured";
  function apply() {
    const q = form.q.value.trim().toLowerCase(), sort = form.sort.value;
    let shown = 0;
    cards.forEach(c => { const hit = !q || c.dataset.search.includes(q); c.hidden = !hit; shown += hit; });
    const ordered = sort === "featured" ? cards : [...cards].sort((a, b) => (a.dataset.price - b.dataset.price) * (sort === "price-asc" ? 1 : -1));
    ordered.forEach(c => gridEl.appendChild(c));
    empty.hidden = shown > 0;
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (sort !== "featured") p.set("sort", sort);
    history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
  }
  form.addEventListener("submit", e => { e.preventDefault(); apply(); });
  form.q.addEventListener("input", apply);
  form.sort.addEventListener("change", apply);
  $("[data-clear]")?.addEventListener("click", () => { form.q.value = ""; apply(); form.q.focus(); });
  apply();
}

// ---------- product page ----------
function tierRows(p, finish, qty) {
  const cur = tierFor(C.tiers, qty);
  const rows = $$("#tiers tbody tr");
  C.tiers.forEach((tr, i) => {
    const row = rows[i];
    if (!row) return;
    row.classList.toggle("current", tr === cur);
    row.children[1].textContent = money(price(p, finish, tr.min));
  });
}

function initProduct() {
  const form = $("#buy");
  if (!form) return;
  const p = C.products[form.dataset.id];
  const qtyEl = form.elements.qty;
  const read = () => ({ finish: form.querySelector("input[name=finish]:checked").value, qty: Math.max(1, Math.min(9999, parseInt(qtyEl.value, 10) || 1)) });
  function update() {
    const { finish, qty } = read();
    const unit = price(p, finish, qty);
    $("#unit").textContent = money(unit);
    tierRows(p, finish, qty);
    const nt = p.trial ? null : nextTier(C.tiers, qty);
    $("#line-total").textContent = t("pdp.lineTotal", { qty, unit: money(unit), total: money(round(unit * qty)) }) +
      (nt ? `. ${t("pdp.nextTier", { n: nt.min - qty, pct: Math.round(nt.off * 100) })}` : "");
  }
  form.addEventListener("click", e => {
    const b = e.target.closest("[data-step]");
    if (!b) return;
    qtyEl.value = Math.max(1, Math.min(9999, (parseInt(qtyEl.value, 10) || 1) + Number(b.dataset.step)));
    update();
  });
  form.addEventListener("input", update);
  form.addEventListener("submit", e => {
    e.preventDefault();
    const { finish, qty } = read();
    const added = addToCart(p.id, finish, qty);
    toast(added ? t("pdp.added", { qty: added, name: `${p.name} (${t("finish." + finish)})` }) : t("kit.inCart"), site.urls.cart, t("pdp.viewCart"));
  });
  update();
}

// "Add to cart" buttons outside a product page, such as the sample kit on the home page.
function initAddButtons() {
  $$("[data-add]").forEach(b => b.addEventListener("click", async () => {
    await loadCatalog();
    const p = C?.products[b.dataset.add];
    if (!p) return;
    const added = addToCart(p.id, p.def, 1);
    toast(added ? t("pdp.added", { qty: added, name: `${p.name} (${t("finish." + p.def)})` }) : t("kit.inCart"), site.urls.cart, t("pdp.viewCart"));
  }));
}

function initGallery() {
  const g = $("[data-gallery]");
  if (!g) return;
  const panels = $$(".gallery-panel", g), buttons = $$("[data-show]", g);
  const show = id => {
    panels.forEach(p => { p.hidden = p.id !== id; });
    buttons.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.show === id)));
  };
  buttons.forEach(b => b.addEventListener("click", () => show(b.dataset.show)));
  g.classList.add("enhanced");
  show(buttons[0].dataset.show);
}

// ---------- cart page ----------
function initCart() {
  const root = $("#cart-root");
  if (!root) return;
  const form = $("#checkout"), emptyBox = $(".cart-empty");
  const country = () => form.elements.country.value;

  function render() {
    const lines = cartLines();
    saveCart();
    if (!lines.length) {
      root.innerHTML = `<h2>${esc(root.dataset.emptyH)}</h2>`;
      emptyBox.hidden = false;
      form.hidden = true;
      return;
    }
    emptyBox.hidden = true;
    form.hidden = false;
    const subtotal = round(lines.reduce((s, l) => s + l.total, 0));
    const ship = shippingFor(C.shipping, country(), subtotal);
    const countryName = C.countries.find(c => c.code === country())?.name || "";
    const more = ship.zone?.freeAbove && ship.price ? round(C.shipping.freeFrom - subtotal) : 0;
    root.innerHTML = `<div class="cart">
      <ul class="lines">${lines.map((l, i) => {
        const nt = l.p.trial ? null : nextTier(C.tiers, l.qty);
        return `<li class="line">
          <a class="line-draw" href="${l.p.url}" tabindex="-1" aria-hidden="true">${l.p.thumb}</a>
          <div class="line-info">
            <a href="${l.p.url}"><strong>${esc(l.p.name)}</strong></a>
            <span class="muted">${esc(l.p.sku)}, ${esc(t("finish." + l.finish))}, ${t("cart.each", { price: money(l.unit) })}</span>
            ${nt ? `<span class="nudge">${t("cart.nudge", { n: nt.min - l.qty, pct: Math.round(nt.off * 100) })}</span>` : ""}
          </div>
          ${l.p.trial ? `<span class="qty-fixed"><strong>1</strong> <small class="muted">${esc(t("kit.one"))}</small></span>` : `<div class="stepper small" role="group" aria-label="${esc(t("cart.qtyFor", { name: l.p.name }))}">
            <button type="button" data-line="${i}" data-step="-1" aria-label="${esc(t("pdp.dec"))}">−</button>
            <input type="number" min="1" max="9999" value="${l.qty}" data-line="${i}" aria-label="${esc(t("pdp.qty"))}">
            <button type="button" data-line="${i}" data-step="1" aria-label="${esc(t("pdp.inc"))}">+</button>
          </div>`}
          <strong class="line-total">${money(l.total)}</strong>
          <button type="button" class="link" data-remove="${i}">${t("cart.remove")}</button>
        </li>`;
      }).join("")}</ul>
      <aside class="summary">
        <h2 class="h-small">${t("cart.summary")}</h2>
        <dl>
          <div><dt>${t("cart.subtotal")}</dt><dd>${money(subtotal)}</dd></div>
          <div><dt>${t("cart.shippingTo", { country: esc(countryName) })}</dt><dd>${ship.price ? money(ship.price) : t("cart.free")}</dd></div>
          <div class="grand"><dt>${t("cart.total")}</dt><dd>${money(round(subtotal + ship.price))}</dd></div>
        </dl>
        ${more > 0 ? `<p class="muted">${t("cart.freeFrom", { min: money(C.shipping.freeFrom), more: money(more) })}</p>` : ""}
        <p class="muted">${t("cart.import")}</p>
        <p class="muted">${t("cart.noPayment")}</p>
      </aside>
    </div>`;
  }

  root.addEventListener("click", e => {
    const step = e.target.closest("[data-step]"), rm = e.target.closest("[data-remove]");
    if (step) { const l = cart[step.dataset.line]; l.qty = Math.max(1, Math.min(C.products[l.id].trial ? 1 : 9999, l.qty + Number(step.dataset.step))); render(); $(`[data-line="${step.dataset.line}"][data-step="${step.dataset.step}"]`)?.focus(); }
    if (rm) { cart.splice(Number(rm.dataset.remove), 1); render(); }
  });
  root.addEventListener("change", e => {
    if (e.target.dataset.line === undefined) return;
    cart[e.target.dataset.line].qty = Math.max(1, Math.min(9999, parseInt(e.target.value, 10) || 1));
    render();
  });

  // Country decides shipping and whether a VAT number is required.
  const vatInput = form.elements.vat, vatLabel = $("#vat-label"), vatHint = $("#hint-vat");
  function updateCountry() {
    const c = country(), eu = needsVat(c);
    vatInput.required = eu;
    vatLabel.innerHTML = eu ? esc(vatLabel.dataset.vat) : `${esc(vatLabel.dataset.tax)} <small class="muted">${esc(vatLabel.dataset.optional)}</small>`;
    vatHint.textContent = eu ? vatHint.dataset.hint.replace("{example}", vatExample(c)) : "";
    // An error for the previous country's format no longer applies; it's checked again on submit.
    $("#err-vat").textContent = "";
    vatInput.removeAttribute("aria-invalid");
    store.set("ferrin-country", c);
    render();
  }
  const saved = store.get("ferrin-country", null);
  if (saved && C.countries.some(c => c.code === saved)) form.elements.country.value = saved;
  form.elements.country.addEventListener("change", updateCountry);
  updateCountry();

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const ok = validate(form, setErr => {
      const c = country();
      if (needsVat(c) && vatInput.value.trim()) setErr("vat", normaliseVat(c, vatInput.value) ? "" : t("err.vat", { example: vatExample(c) }));
    });
    if (!ok) return;
    const d = Object.fromEntries(new FormData(form));
    const lines = cartLines();
    const subtotal = round(lines.reduce((s, l) => s + l.total, 0));
    const ship = shippingFor(C.shipping, d.country, subtotal);
    const countryName = C.countries.find(c => c.code === d.country)?.name || d.country;
    const vat = needsVat(d.country) ? normaliseVat(d.country, d.vat) : d.vat;
    const ref = "FR-" + Date.now().toString(36).toUpperCase().slice(-6);
    const body = [
      `Order request ${ref}`, "",
      ...lines.map(l => `${l.qty} × ${l.p.name} [${l.p.sku}, ${t("finish." + l.finish)}] @ ${money(l.unit)} = ${money(l.total)}`), "",
      `Subtotal: ${money(subtotal)}`, `Shipping (${countryName}): ${ship.price ? money(ship.price) : t("cart.free")}`,
      `Total excl. VAT: ${money(round(subtotal + ship.price))}`, "",
      `Name: ${d.name}`, `Company: ${d.company}`, `Email: ${d.email}`, `Phone: ${d.phone || "-"}`,
      `Address: ${d.street}, ${d.postcode} ${d.city}, ${countryName}`, `VAT / tax number: ${vat || "-"}`,
      `Language: ${site.lang}`, "", `Notes: ${d.notes || "-"}`
    ].join("\n");
    const subject = `Order request ${ref}, ${d.company}`;
    setBusy(form, true);
    const sent = await sendForm(form, subject, {
      name: d.name, company: d.company, email: d.email, phone: d.phone || "", country: countryName, vat: vat || "",
      order_ref: ref, total_excl_vat: money(round(subtotal + ship.price)), language: site.lang
    }, body);
    setBusy(form, false);
    store.set("ferrin-last-order", { ref, body, email: d.email, via: sent ? "form" : "email" }, true);
    if (!sent) openMail(subject, body);
    cart = [];
    saveCart();
    setTimeout(() => location.assign(site.urls.sent), sent ? 0 : 400);
  });

  render();
}

function initOrderSent() {
  const root = $("#sent-root");
  if (!root) return;
  const o = store.get("ferrin-last-order", null, true);
  if (!o) return;
  const mail = `<a href="mailto:${esc(C.orderEmail)}">${esc(C.orderEmail)}</a>`;
  root.innerHTML = o.via === "form"
    ? `<h1>${t("sent.title")}</h1>
       <p class="lede">${t("sent.p", { ref: `<strong>${esc(o.ref)}</strong>`, email: esc(o.email) })}</p>
       <pre class="order-text">${esc(o.body)}</pre>
       <div class="actions"><a class="btn" href="${site.urls.shop}">${t("sent.back")}</a></div>`
    : `<h1>${t("sent.titleEmail")}</h1>
       <p class="lede">${t("sent.pEmail", { ref: `<strong>${esc(o.ref)}</strong>` })}</p>
       <p>${t("sent.copyP", { email: mail })}</p>
       <pre class="order-text">${esc(o.body)}</pre>
       <div class="actions"><button class="btn" type="button" id="copy-order">${t("sent.copy")}</button><a class="btn btn-ghost" href="${site.urls.shop}">${t("sent.back")}</a></div>`;
  document.title = `${o.via === "form" ? t("sent.title") : t("sent.titleEmail")} | ${C.brand}`;
  $("#copy-order")?.addEventListener("click", () => {
    navigator.clipboard.writeText(o.body).then(() => toast(t("sent.copied")), () => toast(t("sent.copyFail")));
  });
}

// ---------- quick order ----------
function initQuickOrder() {
  const form = $("#quick");
  if (!form) return;
  const rows = $$("tr[data-id]", form);
  const bar = $(".quick-bar", form);
  if (bar && "ResizeObserver" in window) new ResizeObserver(() => document.documentElement.style.setProperty("--quickbar-h", bar.offsetHeight + "px")).observe(bar);
  const qty = row => Math.max(0, Math.min(9999, parseInt(row.querySelector("input").value, 10) || 0));
  function update() {
    let n = 0, sum = 0;
    rows.forEach(row => {
      const p = C.products[row.dataset.id], q = qty(row), finish = row.querySelector("select").value;
      const unit = price(p, finish, Math.max(1, q));
      row.querySelector("[data-unit]").textContent = money(unit);
      row.querySelector("[data-total]").textContent = q ? money(round(unit * q)) : "—";
      row.classList.toggle("has-qty", q > 0);
      if (q) { n++; sum += unit * q; }
    });
    $("#quick-sum").textContent = n ? t("qo.sum", { n, total: money(round(sum)) }) : "";
    $("#quick-err").textContent = "";
  }
  form.addEventListener("input", update);
  form.addEventListener("change", update);
  form.addEventListener("submit", e => {
    e.preventDefault();
    const chosen = rows.filter(r => qty(r) > 0);
    if (!chosen.length) { $("#quick-err").textContent = t("qo.none"); return; }
    chosen.forEach(r => { addToCart(r.dataset.id, r.querySelector("select").value, qty(r)); });
    chosen.forEach(r => { r.querySelector("input").value = ""; });
    update();
    toast(t("qo.added", { n: chosen.length }), site.urls.cart, t("pdp.viewCart"));
  });
  update();
}

// ---------- quote and contact forms ----------
function initMessageForm(id) {
  const form = document.getElementById(id);
  if (!form) return;
  if (id === "quote") {
    const pid = new URLSearchParams(location.search).get("product");
    const p = pid && C.products[pid];
    if (p && !form.elements.products.value) form.elements.products.value = `${p.moq} × ${p.name} [${p.sku}]`;
  }
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!validate(form)) return;
    const d = Object.fromEntries(new FormData(form));
    delete d.botcheck;
    const subject = `${form.dataset.subject}: ${d.company || d.name}`;
    const body = Object.entries(d).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n\n") + `\n\nLanguage: ${site.lang}`;
    const status = $(".form-status", form);
    setBusy(form, true);
    const sent = await sendForm(form, subject, { ...d, language: site.lang }, body);
    setBusy(form, false);
    if (sent) { form.reset(); status.textContent = t("form.sent"); }
    else { openMail(subject, body); status.textContent = t("form.email"); }
  });
}

// ---------- start ----------
initHeader();
updateBadge();
$("[data-print]")?.addEventListener("click", () => window.print());
initShop();
initGallery();

initAddButtons();

const needsCatalog = ["#buy", "#cart-root", "#sent-root", "#quick", "#quote", "#contact", "[data-add]"].some(s => $(s));
if (needsCatalog) {
  loadCatalog().then(cat => {
    C = cat;
    fmt = new Intl.NumberFormat(C.locale, { style: "currency", currency: C.currency });
    initProduct();
    initCart();
    initOrderSent();
    initQuickOrder();
    initMessageForm("quote");
    initMessageForm("contact");
  }).catch(err => console.error("Couldn't load the catalogue", err));
}
