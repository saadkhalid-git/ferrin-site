// Admin panel behaviour: login, product form with language tabs, list filters, inline order status,
// confirmation dialog and toast messages. All permission checks happen on the server.
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

async function api(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method, credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json", Accept: "application/json" } : { Accept: "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch {
    return { ok: false, status: 0, data: { error: "Can't reach the server. Check your connection and try again." } };
  }
  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (res.status === 401 && !url.endsWith("/login")) location.href = `/admin/login?next=${encodeURIComponent(location.pathname)}`;
  return { ok: res.ok, status: res.status, data };
}

// ---------- feedback ----------
function toast(message, kind = "ok") {
  const box = $(".toasts");
  if (!box) return;
  const el = document.createElement("div");
  el.className = `toast toast-${kind}`;
  el.textContent = message;
  box.append(el);
  setTimeout(() => el.classList.add("is-leaving"), 3800);
  setTimeout(() => el.remove(), 4200);
}

// Resolves true when the admin confirms. Uses the page's <dialog>; falls back to window.confirm.
function confirmAction({ title, text, ok = "Confirm", danger = false }) {
  const dlg = $("#confirm-dialog");
  if (!dlg?.showModal) return Promise.resolve(window.confirm(`${title}\n\n${text}`));
  $("#confirm-title", dlg).textContent = title;
  $("#confirm-text", dlg).textContent = text;
  const okBtn = $("#confirm-ok", dlg);
  okBtn.textContent = ok;
  okBtn.classList.toggle("btn-danger-solid", danger);
  dlg.returnValue = "";
  dlg.showModal();
  okBtn.focus();
  return new Promise(resolve => dlg.addEventListener("close", () => resolve(dlg.returnValue === "ok"), { once: true }));
}

function busy(button, on, label) {
  if (!button) return;
  if (on) { button.dataset.label = button.innerHTML; button.textContent = label || "Saving…"; button.disabled = true; }
  else { if (button.dataset.label) button.innerHTML = button.dataset.label; button.disabled = false; }
}

const flashKey = "ferrin-admin-flash";
function flashNext(message) { try { sessionStorage.setItem(flashKey, message); } catch { /* ignore */ } }
try { const m = sessionStorage.getItem(flashKey); if (m) { sessionStorage.removeItem(flashKey); toast(m); } } catch { /* ignore */ }

// ---------- login / logout ----------
const login = $("#login-form");
if (login) {
  login.addEventListener("submit", async e => {
    e.preventDefault();
    const err = $(".form-error", login), btn = $("button[type=submit]", login);
    err.hidden = true;
    const email = login.email.value.trim(), password = login.password.value;
    if (!email || !password) { err.textContent = "Enter your email and password."; err.hidden = false; return; }
    busy(btn, true, "Logging in…");
    const { ok, data } = await api("POST", "/api/admin/login", { email, password });
    busy(btn, false);
    if (ok) location.href = login.dataset.next || "/admin/dashboard";
    else { err.textContent = data.error || "Login failed."; err.hidden = false; login.password.value = ""; login.password.focus(); }
  });
}

$("[data-logout]")?.addEventListener("click", async () => {
  await api("POST", "/api/admin/logout");
  location.href = "/admin/login";
});

// Close open "more" menus when clicking elsewhere or pressing Escape.
document.addEventListener("click", e => $$("details.menu[open]").forEach(d => { if (!d.contains(e.target)) d.open = false; }));
document.addEventListener("keydown", e => { if (e.key === "Escape") $$("details.menu[open]").forEach(d => { d.open = false; d.querySelector("summary").focus(); }); });

// Copy buttons (e.g. shipping address)
$$("[data-copy]").forEach(b => b.addEventListener("click", () => {
  navigator.clipboard.writeText(b.dataset.copy).then(() => toast("Address copied."), () => toast("Couldn't copy. Select the text instead.", "error"));
}));

// ---------- product form ----------
const form = $("#product-form");
if (form) {
  // Language tabs (arrow keys move between tabs, as in the ARIA tabs pattern).
  const tabs = $$('[role="tab"]', form);
  const show = tab => {
    tabs.forEach(t => { const on = t === tab; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; });
    $$('[role="tabpanel"]', form).forEach(p => { p.hidden = p.id !== tab.getAttribute("aria-controls"); });
  };
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => show(t));
    t.addEventListener("keydown", e => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const next = tabs[(i + d + tabs.length) % tabs.length];
      show(next); next.focus();
    });
  });

  // Tab state dots: missing (no name), partial (name only), complete (name, description, bullets).
  const langState = lang => {
    const get = k => (lang === "en" ? form.elements[k === "summary" ? "description" : k] : form.elements[`tr.${lang}.${k}`])?.value.trim();
    return !get("name") ? "missing" : get("summary") && get("details") ? "complete" : "partial";
  };
  const refreshStates = () => tabs.forEach(t => {
    const s = langState(t.dataset.lang), dot = $(".tab-state", t);
    dot.className = `tab-state is-${s}`;
    dot.setAttribute("aria-label", s === "complete" ? "complete" : s === "partial" ? "incomplete" : "missing");
  });

  // Keep the other languages' English placeholders in step with the English text.
  const syncPlaceholders = () => {
    const en = { name: form.elements.name.value, summary: form.elements.description.value, details: form.elements.details.value };
    $$("[name^='tr.']", form).forEach(el => { el.placeholder = en[el.name.split(".")[2]] || ""; });
  };

  $$("[data-copy-en]", form).forEach(b => b.addEventListener("click", () => {
    const l = b.dataset.copyEn;
    form.elements[`tr.${l}.name`].value = form.elements.name.value;
    form.elements[`tr.${l}.summary`].value = form.elements.description.value;
    form.elements[`tr.${l}.details`].value = form.elements.details.value;
    form.elements[`tr.${l}.name`].focus();
    markDirty(); refreshStates();
    toast("English text copied. Translate it before saving.");
  }));

  // Web address from the name, until the admin edits it.
  const slugify = s => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
  let slugTouched = !form.slug.hasAttribute("data-autoslug");
  form.slug.addEventListener("input", () => { slugTouched = true; });
  form.name.addEventListener("input", () => { if (!slugTouched) form.slug.value = slugify(form.name.value); });

  // Image preview
  const preview = $(".image-preview", form);
  const updatePreview = () => {
    const url = form.imageUrl.value.trim();
    if (/^https:\/\/\S+$/i.test(url)) {
      preview.classList.remove("is-empty");
      preview.replaceChildren(Object.assign(document.createElement("img"), { src: url, alt: "", referrerPolicy: "no-referrer", onerror() { preview.classList.add("is-broken"); } }));
      preview.classList.remove("is-broken");
    } else if (!url) {
      preview.classList.add("is-empty");
      preview.innerHTML = "<span>No image: the shop shows the technical drawing.</span>";
    }
  };
  form.imageUrl.addEventListener("change", updatePreview);

  // Unsaved-changes state and warning.
  const state = $(".save-state", form);
  let dirty = false, saving = false;
  function markDirty() {
    if (dirty) return;
    dirty = true;
    state.dataset.state = "dirty";
    state.textContent = "Unsaved changes";
  }
  form.addEventListener("input", () => { markDirty(); refreshStates(); syncPlaceholders(); });
  form.addEventListener("change", markDirty);
  window.addEventListener("beforeunload", e => { if (dirty && !saving) { e.preventDefault(); e.returnValue = ""; } });

  const lines = v => v.split("\n").map(x => x.trim()).filter(Boolean);
  form.addEventListener("submit", async e => {
    e.preventDefault();
    $$(".err", form).forEach(el => { el.textContent = ""; });
    $$("[aria-invalid]", form).forEach(el => el.removeAttribute("aria-invalid"));
    const errBox = $(".form-error", form);
    errBox.hidden = true;
    const translations = {};
    for (const t of tabs.map(t => t.dataset.lang).filter(l => l !== "en")) {
      translations[t] = {
        name: form.elements[`tr.${t}.name`].value, summary: form.elements[`tr.${t}.summary`].value,
        details: lines(form.elements[`tr.${t}.details`].value)
      };
    }
    const body = {
      name: form.name.value, slug: form.slug.value, sku: form.sku.value, category: form.category.value, line: form.line.value,
      description: form.description.value, details: lines(form.details.value),
      price: form.price.value, quantity: form.quantity.value === "" ? null : Number(form.quantity.value),
      imageUrl: form.imageUrl.value, isActive: form.isActive.checked, translations
    };
    const id = form.dataset.id;
    const btn = $("button[type=submit]", form);
    busy(btn, true);
    const { ok, data } = await api(id ? "PUT" : "POST", id ? `/api/admin/products/${id}` : "/api/admin/products", body);
    busy(btn, false);
    if (ok) {
      saving = true;
      flashNext(`Saved "${data.name}".`);
      location.href = id ? location.pathname : `/admin/products/${data.id}/edit`;
      return;
    }
    let first = null;
    for (const [key, msg] of Object.entries(data.fields || {})) {
      const el = $(`#err-${key.replace(/\./g, "-")}`, form);
      if (el) el.textContent = msg;
      const [a, l, f] = key.split(".");
      const input = a === "translations" ? form.elements[`tr.${l}.${f}`] : form.elements[key];
      if (input) { input.setAttribute("aria-invalid", "true"); first = first || input; }
    }
    errBox.textContent = data.error || "The product couldn't be saved.";
    errBox.hidden = false;
    if (first) {
      const panel = first.closest('[role="tabpanel"]');
      if (panel?.hidden) show($(`#tab-${panel.dataset.lang}`, form));
      first.focus();
    } else errBox.scrollIntoView({ block: "center" });
  });
  refreshStates();
}

// ---------- product list: filters and actions ----------
const productTable = $("table.products");
if (productTable) {
  const search = $("#product-search"), cat = $("#product-category"), st = $("#product-status");
  const rows = $$("tbody tr[data-id]", productTable), none = $(".no-results", productTable);
  const apply = () => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    rows.forEach(r => {
      const hit = (!q || r.dataset.search.includes(q)) && (!cat.value || r.dataset.category === cat.value) && (!st.value || r.dataset.status === st.value);
      r.hidden = !hit; shown += hit;
    });
    none.hidden = shown > 0;
  };
  [search, cat, st].forEach(el => el.addEventListener("input", apply));
  apply();

  productTable.addEventListener("click", async e => {
    const row = e.target.closest("tr[data-id]");
    if (!row) return;
    const id = row.dataset.id, name = row.dataset.name;
    const toggle = e.target.closest("[data-toggle]");
    if (toggle) {
      const activate = toggle.dataset.toggle === "true";
      if (!activate && !(await confirmAction({ title: `Deactivate "${name}"?`, text: "It disappears from the shop. Past orders aren't affected, and you can activate it again at any time.", ok: "Deactivate" }))) return;
      const { ok, data } = await api("PATCH", `/api/admin/products/${id}`, { isActive: activate });
      if (ok) { flashNext(`${activate ? "Activated" : "Deactivated"} "${name}".`); location.reload(); }
      else toast(data.error || "Couldn't update the product.", "error");
    }
    if (e.target.closest("[data-delete]")) {
      if (!(await confirmAction({ title: `Delete "${name}"?`, text: "This removes the product for good. It can't be undone.", ok: "Delete", danger: true }))) return;
      const { ok, status, data } = await api("DELETE", `/api/admin/products/${id}`);
      if (ok) { row.remove(); toast(`Deleted "${name}".`); return; }
      if (status === 409 && data.code === "in_orders") {
        if (await confirmAction({ title: "This product has orders", text: `${data.error} Deactivating hides it from the shop and keeps order history intact.`, ok: "Deactivate instead" })) {
          const res = await api("PATCH", `/api/admin/products/${id}`, { isActive: false });
          if (res.ok) { flashNext(`Deactivated "${name}".`); location.reload(); }
          else toast(res.data.error || "Couldn't deactivate the product.", "error");
        }
        return;
      }
      toast(data.error || "Couldn't delete the product.", "error");
    }
  });
}

// ---------- orders: search and inline status ----------
const orderTable = $("table.orders");
if (orderTable) {
  const search = $("#order-search");
  const rows = $$("tbody tr[data-search]", orderTable), none = $(".no-results", orderTable);
  search?.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    let shown = 0;
    rows.forEach(r => { const hit = !q || r.dataset.search.includes(q); r.hidden = !hit; shown += hit; });
    none.hidden = shown > 0;
  });
  orderTable.addEventListener("change", async e => {
    const sel = e.target.closest("select[data-order]");
    if (!sel) return;
    const label = sel.selectedOptions[0].textContent;
    sel.disabled = true;
    const { ok, data } = await api("PATCH", `/api/admin/orders/${sel.dataset.order}/status`, { status: sel.value });
    sel.disabled = false;
    if (ok) {
      sel.className = `status-select status-${data.status.toLowerCase()}`;
      sel.dataset.saved = sel.value;
      toast(`${sel.dataset.number} is now ${label}.`);
    } else {
      sel.value = sel.dataset.saved || sel.querySelector("[selected]")?.value;
      toast(data.error || "Couldn't update the status.", "error");
    }
  });
}

// ---------- order detail: status ----------
const statusForm = $("#status-form");
if (statusForm) {
  statusForm.addEventListener("submit", async e => {
    e.preventDefault();
    const btn = $("button", statusForm);
    busy(btn, true, "Updating…");
    const { ok, data } = await api("PATCH", `/api/admin/orders/${statusForm.dataset.id}/status`, { status: statusForm.status.value });
    busy(btn, false);
    if (ok) { flashNext(`Status changed to ${statusForm.status.selectedOptions[0].textContent}.`); location.reload(); }
    else toast(data.error || "Couldn't update the status.", "error");
  });
}
