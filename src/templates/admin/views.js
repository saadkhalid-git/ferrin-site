// Admin panel pages (English interface). Rendered on the server after the session has been checked;
// src/admin/admin.js adds the interactive parts (tabs, filters, saving, dialogs, toasts).
import { esc } from "../layout.js";
import { drawTool } from "../../shared/drawings.js";

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
export const money = v => eur.format(Number(v));
const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Luxembourg" });
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/Luxembourg" });
export const when = d => dateFmt.format(new Date(d));
const STATUS_LABEL = { PENDING: "Pending", APPROVED: "Approved", PROCESSING: "Processing", DELIVERED: "Delivered", CANCELLED: "Cancelled" };
export const STATUSES = Object.keys(STATUS_LABEL);
const LANG_NAME = { en: "English", de: "Deutsch", fr: "Français", pl: "Polski", it: "Italiano" };
export const LOW_STOCK = 10;

// Outline icons (Lucide, ISC licence), same style as the shop's icons.
const ICONS = {
  dashboard: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>',
  package: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.7 4.4a2 2 0 0 0 2 0L20.7 7"/>',
  orders: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  pencil: '<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  back: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  languages: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
  euro: '<path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>'
};
export const ico = (name, cls = "") => `<svg class="ico${cls ? " " + cls : ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;

const statusBadge = s => `<span class="status status-${s.toLowerCase()}">${STATUS_LABEL[s] || esc(s)}</span>`;
const stockBadge = (qty, active = true) => {
  const cls = qty <= 0 ? "is-out" : qty <= LOW_STOCK ? "is-low" : "is-ok";
  return `<span class="stock ${cls}${active ? "" : " is-muted"}">${qty <= 0 ? "Out of stock" : qty}</span>`;
};
const drawingOf = (p, categories) => p.drawing || categories.find(c => c.id === p.category)?.draw || { type: "nipper" };
export function thumb(p, categories) {
  if (p.imageUrl) return `<span class="thumb"><img src="${esc(p.imageUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>`;
  return `<span class="thumb is-drawing">${drawTool(Object.assign({ nodim: true }, drawingOf(p, categories)), 0, false)}</span>`;
}
const langPills = (status, locales) => `<span class="langs">${["en", ...locales].map(l => {
  const s = status?.[l] || "missing";
  return `<abbr class="lang is-${s}" title="${LANG_NAME[l] || l}: ${s === "complete" ? "complete" : s === "partial" ? "name only" : "not translated (shows English)"}">${l.toUpperCase()}</abbr>`;
}).join("")}</span>`;

function page(title, body, { version, bare } = {}) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${esc(title)} | Ferrin admin</title>
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/admin-assets/admin.css?v=${version}">
  <script type="module" src="/admin-assets/admin.js?v=${version}"></script>
</head>
<body class="${bare ? "admin-bare" : "admin"}">
${body}
</body>
</html>
`;
}

export function shell({ title, active, admin, version, pendingCount = 0 }, content) {
  const link = (href, key, iconName, label, badge) => `<a href="${href}"${active === key ? ' aria-current="page"' : ""}>${ico(iconName)}<span>${label}</span>${badge ? `<span class="nav-badge" aria-label="${badge} pending">${badge}</span>` : ""}</a>`;
  const initials = String(admin.name || "?").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return page(title, `
  <a class="skip" href="#main">Skip to content</a>
  <aside class="sidebar">
    <a class="brand" href="/admin/dashboard"><span class="mark">F</span><span>Ferrin <small>Admin</small></span></a>
    <nav aria-label="Admin">
      ${link("/admin/dashboard", "dashboard", "dashboard", "Dashboard")}
      ${link("/admin/products", "products", "package", "Products")}
      ${link("/admin/orders", "orders", "orders", "Orders", pendingCount)}
    </nav>
    <div class="sidebar-foot">
      <a class="side-link" href="/" target="_blank" rel="noopener">${ico("external")}<span>View shop</span></a>
      <div class="who"><span class="avatar" aria-hidden="true">${esc(initials)}</span><span><strong>${esc(admin.name)}</strong><small>${esc(admin.email)}</small></span></div>
      <button type="button" class="side-link" data-logout>${ico("logout")}<span>Log out</span></button>
    </div>
  </aside>
  <main id="main" tabindex="-1">
    ${content}
  </main>
  <div class="toasts" role="status" aria-live="polite"></div>
  <dialog class="dialog" id="confirm-dialog" aria-labelledby="confirm-title">
    <form method="dialog">
      <h2 id="confirm-title"></h2>
      <p id="confirm-text"></p>
      <div class="dialog-actions">
        <button class="btn btn-ghost" value="cancel" type="submit">Cancel</button>
        <button class="btn" value="ok" type="submit" id="confirm-ok">Confirm</button>
      </div>
    </form>
  </dialog>`, { version });
}

export function loginPage({ version, next }) {
  return page("Log in", `
  <main class="login">
    <form id="login-form" class="card" novalidate data-next="${esc(next || "/admin/dashboard")}">
      <p class="brand"><span class="mark">F</span><span>Ferrin <small>Admin</small></span></p>
      <h1>Log in</h1>
      <p class="muted">Manage products, stock and orders.</p>
      <label class="field"><span>Email</span><input name="email" type="email" autocomplete="username" required></label>
      <label class="field"><span>Password</span><input name="password" type="password" autocomplete="current-password" required></label>
      <p class="form-error" role="alert" hidden></p>
      <button class="btn btn-block" type="submit">Log in</button>
    </form>
  </main>`, { version, bare: true });
}

const pageHead = (title, sub, actions = "") =>
  `<header class="page-head"><div><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ""}</div>${actions ? `<div class="head-actions">${actions}</div>` : ""}</header>`;

export function dashboard({ stats, latestOrders, lowStock, categories }) {
  const card = (label, value, href, iconName, tone = "") => `<a class="stat${tone ? " " + tone : ""}" href="${href}">
    <span class="stat-icon">${ico(iconName)}</span><span class="stat-label">${label}</span><strong>${value}</strong></a>`;
  return `
    ${pageHead("Dashboard", "An overview of the shop.", `<a class="btn" href="/admin/products/new">${ico("plus")}Create product</a>`)}
    <div class="stats">
      ${card("Total products", stats.totalProducts, "/admin/products", "package")}
      ${card("Active products", stats.activeProducts, "/admin/products?status=active", "eye")}
      ${card("Total orders", stats.totalOrders, "/admin/orders", "orders")}
      ${card("Pending orders", stats.pendingOrders, "/admin/orders?status=PENDING", "clock", stats.pendingOrders ? "is-attention" : "")}
    </div>
    <div class="dash-grid">
      <section class="card">
        <div class="card-head"><h2>Latest orders</h2><a href="/admin/orders">All orders</a></div>
        ${latestOrders.length ? `<ul class="order-feed">${latestOrders.map(o => `<li>
          <a href="/admin/orders/${esc(o.id)}">
            <span><strong class="mono">${esc(o.orderNumber)}</strong><small>${esc(o.company || o.customerName)} · ${dayFmt.format(new Date(o.createdAt))}</small></span>
            <span class="feed-right"><strong>${money(o.total)}</strong>${statusBadge(o.status)}</span>
          </a></li>`).join("")}</ul>`
        : `<p class="empty">No orders yet. Orders placed in the shop appear here.</p>`}
      </section>
      <section class="card">
        <div class="card-head"><h2>Low stock</h2><a href="/admin/products?sort=stock">All products</a></div>
        ${lowStock.length ? `<ul class="stock-list">${lowStock.map(p => `<li><a href="/admin/products/${esc(p.id)}/edit">
          ${thumb(p, categories)}<span><strong>${esc(p.name)}</strong><small class="mono">${esc(p.sku)}</small></span>${stockBadge(p.quantity)}</a></li>`).join("")}</ul>`
        : `<p class="empty">${ico("check")} All active products have more than ${LOW_STOCK} in stock.</p>`}
      </section>
    </div>`;
}

export function productList(products, categories, locales, query = {}) {
  const catName = id => categories.find(c => c.id === id)?.name || id;
  const status = ["active", "inactive"].includes(query.status) ? query.status : "";
  return `
    ${pageHead("Products", `${products.length} products. Prices exclude VAT; volume discounts are applied automatically.`, `<a class="btn" href="/admin/products/new">${ico("plus")}Create product</a>`)}
    <div class="toolbar" role="search">
      <label class="search">${ico("search")}<span class="sr">Search products</span><input type="search" id="product-search" placeholder="Search by name or part number" autocomplete="off"></label>
      <label><span class="sr">Category</span><select id="product-category"><option value="">All categories</option>${categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>
      <label><span class="sr">Status</span><select id="product-status"><option value="">Active and inactive</option><option value="active"${status === "active" ? " selected" : ""}>Active only</option><option value="inactive"${status === "inactive" ? " selected" : ""}>Inactive only</option></select></label>
    </div>
    ${products.length ? `<div class="table-wrap"><table class="products">
      <thead><tr><th scope="col" colspan="2">Product</th><th scope="col">Category</th><th scope="col" class="num">Price</th><th scope="col" class="num">Stock</th><th scope="col">Languages</th><th scope="col">Status</th><th scope="col"><span class="sr">Actions</span></th></tr></thead>
      <tbody>${products.map(p => `<tr data-id="${esc(p.id)}" data-name="${esc(p.name)}" data-slug="${esc(p.slug)}" data-category="${esc(p.category)}" data-status="${p.isActive ? "active" : "inactive"}" data-search="${esc(`${p.name} ${p.sku} ${p.slug}`.toLowerCase())}"${p.isActive ? "" : ' class="is-inactive"'}>
        <td class="thumb-cell">${thumb(p, categories)}</td>
        <td><a class="row-title" href="/admin/products/${esc(p.id)}/edit">${esc(p.name)}</a><small class="mono">${esc(p.sku)}</small></td>
        <td>${esc(catName(p.category))}</td>
        <td class="num">${money(p.price)}</td>
        <td class="num">${stockBadge(p.quantity, p.isActive)}</td>
        <td>${langPills(p.languages, locales)}</td>
        <td>${p.isActive ? '<span class="status status-active">Active</span>' : '<span class="status status-inactive">Inactive</span>'}</td>
        <td class="actions">
          <a class="btn btn-small btn-ghost" href="/admin/products/${esc(p.id)}/edit">${ico("pencil")}Edit</a>
          <details class="menu">
            <summary class="btn btn-small btn-ghost btn-icon" aria-label="More actions for ${esc(p.name)}">${ico("more")}</summary>
            <div class="menu-list">
              <button type="button" data-toggle="${p.isActive ? "false" : "true"}">${ico(p.isActive ? "eyeOff" : "eye")}${p.isActive ? "Deactivate" : "Activate"}</button>
              ${p.isActive ? `<a href="/en/product/${esc(p.slug)}/" target="_blank" rel="noopener">${ico("external")}View in shop</a>` : ""}
              <button type="button" class="danger" data-delete>${ico("trash")}Delete</button>
            </div>
          </details>
        </td>
      </tr>`).join("")}
      <tr class="no-results" hidden><td colspan="8">No products match these filters.</td></tr>
      </tbody>
    </table></div>
    <p class="legend muted">Languages: <abbr class="lang is-complete">EN</abbr> complete · <abbr class="lang is-partial">EN</abbr> name only · <abbr class="lang is-missing">EN</abbr> not translated, the shop shows English.</p>`
    : `<p class="empty">No products yet. <a href="/admin/products/new">Create the first one.</a></p>`}`;
}

export function productForm(product, categories, locales) {
  const p = product || { name: "", slug: "", sku: "", category: categories[0].id, line: "pro", description: "", details: [], price: "", quantity: 0, imageUrl: "", isActive: true, translations: {}, languages: {} };
  const field = (key, label, input, hint = "") =>
    `<label class="field"><span>${label}</span>${input}${hint ? `<small class="hint">${hint}</small>` : ""}<em class="err" id="err-${key.replace(/\./g, "-")}"></em></label>`;
  const val = v => esc(v ?? "");
  const lines = arr => esc((arr || []).join("\n"));
  const statusOf = l => p.languages?.[l] || (l === "en" ? (p.name ? "partial" : "missing") : "missing");
  const tab = (l, i) => `<button type="button" role="tab" id="tab-${l}" aria-controls="panel-${l}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-lang="${l}">
      <span>${LANG_NAME[l] || l}</span><span class="tab-state is-${statusOf(l)}" aria-label="${statusOf(l) === "complete" ? "complete" : statusOf(l) === "partial" ? "incomplete" : "missing"}"></span></button>`;
  const enPanel = `
    <div role="tabpanel" id="panel-en" aria-labelledby="tab-en" data-lang="en">
      ${field("name", "Name", `<input name="name" value="${val(p.name)}" required maxlength="200" data-en="name">`)}
      ${field("description", "Description", `<textarea name="description" rows="4" maxlength="2000" data-en="summary">${val(p.description)}</textarea>`, "A sentence or two shown under the name.")}
      ${field("details", "Details", `<textarea name="details" rows="4" data-en="details">${lines(p.details)}</textarea>`, "One bullet point per line, up to 12.")}
    </div>`;
  const trPanel = l => {
    const t = p.translations?.[l] || { name: "", summary: "", details: [] };
    return `
    <div role="tabpanel" id="panel-${l}" aria-labelledby="tab-${l}" data-lang="${l}" hidden>
      <div class="panel-note"><p class="muted">${ico("languages")} Leave empty to show the English text in ${LANG_NAME[l]}.</p><button type="button" class="btn btn-small btn-ghost" data-copy-en="${l}">${ico("copy")}Copy English</button></div>
      ${field(`translations.${l}.name`, "Name", `<input name="tr.${l}.name" value="${val(t.name)}" maxlength="200" placeholder="${val(p.name)}" lang="${l}">`)}
      ${field(`translations.${l}.summary`, "Description", `<textarea name="tr.${l}.summary" rows="4" maxlength="2000" placeholder="${val(p.description)}" lang="${l}">${val(t.summary)}</textarea>`)}
      ${field(`translations.${l}.details`, "Details", `<textarea name="tr.${l}.details" rows="4" placeholder="${lines(p.details)}" lang="${l}">${lines(t.details)}</textarea>`, "One bullet point per line.")}
    </div>`;
  };
  return `
    <a class="back" href="/admin/products">${ico("back")}Products</a>
    ${pageHead(product ? esc(product.name) : "Create product", product ? `<span class="mono">${esc(product.sku)}</span>${product.isActive ? ` · <a href="/en/product/${esc(product.slug)}/" target="_blank" rel="noopener">View in shop</a>` : " · Inactive"}` : "Add a product to the shop.")}
    <form id="product-form" class="product-form" novalidate data-id="${product ? esc(product.id) : ""}">
      <p class="form-error" role="alert" hidden></p>
      <div class="form-grid">
        <section class="card content-card">
          <div class="card-head"><h2>Text</h2><span class="muted small">${ico("languages")} ${1 + locales.length} languages</span></div>
          <div class="tabs" role="tablist" aria-label="Language">${["en", ...locales].map(tab).join("")}</div>
          ${enPanel}
          ${locales.map(trPanel).join("")}
        </section>
        <div class="side-cards">
          <section class="card">
            <h2>Price and stock</h2>
            ${field("price", "Price per piece (EUR, excl. VAT)", `<input name="price" value="${val(p.price)}" required inputmode="decimal" placeholder="12.90">`, "For 1–9 pieces. Volume discounts are applied automatically.")}
            ${field("quantity", "Quantity in stock", `<input name="quantity" value="${val(p.quantity)}" required type="number" min="0" step="1" inputmode="numeric">`)}
          </section>
          <section class="card">
            <h2>Organisation</h2>
            ${field("sku", "Part number", `<input name="sku" value="${val(p.sku)}" required maxlength="32" autocapitalize="characters">`)}
            ${field("slug", "Web address", `<input name="slug" value="${val(p.slug)}" required maxlength="120"${product ? "" : " data-autoslug"}>`, "The shop shows this product at /en/product/&lt;address&gt;/")}
            ${field("category", "Category", `<select name="category">${categories.map(c => `<option value="${c.id}"${c.id === p.category ? " selected" : ""}>${esc(c.name)}</option>`).join("")}</select>`)}
            ${field("line", "Product line", `<select name="line"><option value="pro"${p.line === "pro" ? " selected" : ""}>Ferrin Pro</option><option value="essential"${p.line === "essential" ? " selected" : ""}>Ferrin Essential</option></select>`)}
          </section>
          <section class="card">
            <h2>Image</h2>
            <div class="image-preview${p.imageUrl ? "" : " is-empty"}">${p.imageUrl ? `<img src="${val(p.imageUrl)}" alt="" referrerpolicy="no-referrer">` : `${ico("image")}<span>No image: the shop shows the technical drawing.</span>`}</div>
            ${field("imageUrl", "Image URL", `<input name="imageUrl" value="${val(p.imageUrl)}" type="url" maxlength="500" placeholder="https://…">`, "Optional. An https:// link to a photo.")}
          </section>
          <section class="card">
            <h2>Visibility</h2>
            <label class="switch"><input type="checkbox" name="isActive"${p.isActive ? " checked" : ""}><span class="switch-ui" aria-hidden="true"></span><span>Show in the shop</span></label>
          </section>
        </div>
      </div>
      <div class="savebar">
        <span class="save-state" data-state="clean">No unsaved changes</span>
        <a class="btn btn-ghost" href="/admin/products">Cancel</a>
        <button class="btn" type="submit">${product ? "Save changes" : "Create product"}</button>
      </div>
    </form>`;
}

export function orderList(orders, { status, counts, total }) {
  const chip = s => `<a class="chip" href="/admin/orders${s ? `?status=${s}` : ""}"${status === s || (!status && !s) ? ' aria-current="page"' : ""}>${s ? STATUS_LABEL[s] : "All"}<span>${s ? counts[s] || 0 : total}</span></a>`;
  return `
    ${pageHead("Orders", "Newest first. Change a status here or open an order for details.")}
    <nav class="chips" aria-label="Filter by status">${[null, ...STATUSES].map(chip).join("")}</nav>
    ${orders.length ? `
    <div class="toolbar" role="search">
      <label class="search">${ico("search")}<span class="sr">Search orders</span><input type="search" id="order-search" placeholder="Search by order number, customer or company" autocomplete="off"></label>
    </div>
    <div class="table-wrap"><table class="orders">
      <thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col">Date</th><th scope="col" class="num">Total</th><th scope="col">Status</th><th scope="col"><span class="sr">Actions</span></th></tr></thead>
      <tbody>${orders.map(o => `<tr data-search="${esc(`${o.orderNumber} ${o.customerName} ${o.company} ${o.customerEmail}`.toLowerCase())}">
        <td class="mono"><a class="row-title" href="/admin/orders/${esc(o.id)}">${esc(o.orderNumber)}</a></td>
        <td>${esc(o.customerName)}<small>${esc(o.company)}</small></td>
        <td class="nowrap">${when(o.createdAt)}</td>
        <td class="num">${money(o.total)}</td>
        <td><label class="sr" for="st-${esc(o.id)}">Status of ${esc(o.orderNumber)}</label>
          <select class="status-select status-${o.status.toLowerCase()}" id="st-${esc(o.id)}" data-order="${esc(o.id)}" data-number="${esc(o.orderNumber)}">${STATUSES.map(s => `<option value="${s}"${s === o.status ? " selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}</select></td>
        <td class="actions"><a class="btn btn-small btn-ghost" href="/admin/orders/${esc(o.id)}">${ico("eye")}View</a></td>
      </tr>`).join("")}
      <tr class="no-results" hidden><td colspan="6">No orders match your search.</td></tr>
      </tbody>
    </table></div>`
    : `<p class="empty">${status ? `No ${STATUS_LABEL[status].toLowerCase()} orders.` : "No orders yet. Orders placed in the shop appear here."}</p>`}`;
}

export function orderDetail(o) {
  const flow = ["PENDING", "APPROVED", "PROCESSING", "DELIVERED"];
  const at = flow.indexOf(o.status);
  const steps = o.status === "CANCELLED"
    ? `<p class="cancelled">${ico("alert")} This order is cancelled.</p>`
    : `<ol class="progress">${flow.map((s, i) => `<li class="${i < at ? "is-done" : i === at ? "is-current" : ""}"${i === at ? ' aria-current="step"' : ""}><span class="dot">${i < at ? ico("check") : i + 1}</span>${STATUS_LABEL[s]}</li>`).join("")}</ol>`;
  const address = `${o.company}\n${o.customerName}\n${o.shippingAddress}`;
  return `
    <a class="back" href="/admin/orders">${ico("back")}Orders</a>
    ${pageHead(`Order <span class="mono">${esc(o.orderNumber)}</span>`, `Placed ${when(o.createdAt)} · ${esc(o.language.toUpperCase())} · ${statusBadge(o.status)}`)}
    <section class="card progress-card" id="progress">${steps}</section>
    <div class="detail">
      <section class="card">
        <div class="card-head"><h2>Products</h2><span class="muted small">Prices as charged when ordered</span></div>
        <div class="table-wrap is-flat"><table>
          <thead><tr><th scope="col">Product</th><th scope="col">Finish</th><th scope="col" class="num">Qty</th><th scope="col" class="num">Unit price</th><th scope="col" class="num">Total</th></tr></thead>
          <tbody>${o.items.map(i => `<tr><td>${esc(i.productName)}<small class="mono">${esc(i.sku)}</small></td><td>${esc(i.finish)}</td><td class="num">${i.quantity}</td><td class="num">${money(i.unitPrice)}</td><td class="num">${money(i.lineTotal)}</td></tr>`).join("")}</tbody>
          <tfoot>
            <tr><th scope="row" colspan="4">Subtotal</th><td class="num">${money(o.subtotal)}</td></tr>
            <tr><th scope="row" colspan="4">Shipping</th><td class="num">${Number(o.shippingCost) ? money(o.shippingCost) : "Free"}</td></tr>
            <tr class="grand"><th scope="row" colspan="4">Total excl. VAT</th><td class="num">${money(o.total)}</td></tr>
          </tfoot>
        </table></div>
      </section>
      <div class="side-cards">
        <section class="card">
          <h2>Status</h2>
          <form id="status-form" data-id="${esc(o.id)}" class="inline">
            <label class="sr" for="status">Status</label>
            <select id="status" name="status">${STATUSES.map(s => `<option value="${s}"${s === o.status ? " selected" : ""}>${STATUS_LABEL[s]}</option>`).join("")}</select>
            <button class="btn" type="submit">Update</button>
          </form>
        </section>
        <section class="card">
          <h2>Customer</h2>
          <dl class="dl">
            <div><dt>Name</dt><dd>${esc(o.customerName)}</dd></div>
            <div><dt>Company</dt><dd>${esc(o.company)}</dd></div>
            <div><dt>Email</dt><dd><a href="mailto:${esc(o.customerEmail)}">${esc(o.customerEmail)}</a></dd></div>
            <div><dt>Phone</dt><dd><a href="tel:${esc(o.customerPhone.replace(/[^\d+]/g, ""))}">${esc(o.customerPhone)}</a></dd></div>
            <div><dt>VAT number</dt><dd>${o.vatNumber ? esc(o.vatNumber) : "—"}</dd></div>
            <div><dt>Ship to</dt><dd class="pre">${esc(o.shippingAddress)}</dd></div>
            <div><dt>Notes</dt><dd class="pre">${o.customerNotes ? esc(o.customerNotes) : "—"}</dd></div>
          </dl>
          <div class="card-actions">
            <button type="button" class="btn btn-small btn-ghost" data-copy="${esc(address)}">${ico("copy")}Copy address</button>
            <a class="btn btn-small btn-ghost" href="mailto:${esc(o.customerEmail)}?subject=${encodeURIComponent(`Your order ${o.orderNumber}`)}">${ico("mail")}Email customer</a>
          </div>
        </section>
      </div>
    </div>`;
}

export function notFound() {
  return `${pageHead("Not found", "")}<p class="empty">That page doesn't exist. <a href="/admin/dashboard">Go to the dashboard</a>.</p>`;
}
