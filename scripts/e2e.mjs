// End-to-end test of the Phase 1 flow against a running server (npm run dev in another terminal).
//   npm run test:e2e
// Uses ADMIN_EMAIL / ADMIN_PASSWORD from .env. Creates a test product and a test order (both marked "E2E"),
// and leaves the product deactivated at the end so it doesn't show in the shop.
import "dotenv/config";

const BASE = process.env.APPLICATION_URL || "http://localhost:3000";
const ORIGIN = new URL(BASE).origin;
let cookie = "";
let passed = 0;
const failures = [];

async function req(method, path, body, { auth = true, origin = ORIGIN, rawCookie } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (origin) headers.Origin = origin;
  const c = rawCookie ?? (auth ? cookie : "");
  if (c) headers.Cookie = c;
  const res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: "manual" });
  const setCookie = res.headers.get("set-cookie");
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* HTML */ }
  return { status: res.status, json, text, setCookie, location: res.headers.get("location") };
}

function check(step, condition, detail = "") {
  if (condition) { passed++; console.log(`  ok   ${step}`); }
  else { failures.push(step); console.log(`  FAIL ${step}${detail ? ` (${detail})` : ""}`); }
}

const stamp = Date.now().toString(36).toUpperCase();
const customer = {
  name: "E2E Test Buyer", company: "E2E Salon Sàrl", email: "e2e@example.com", phone: "+352 000 000 000",
  street: "1 Rue du Test", postcode: "L-1111", city: "Luxembourg", country: "LU", vat: "LU12345678", notes: "E2E test order"
};

console.log(`Phase 1 end-to-end test against ${BASE}\n`);

// 1–2. Application up, database reachable
let r = await req("GET", "/api/products?lang=en", undefined, { auth: false });
check("1–2. app runs and reads products from the database", r.status === 200 && Object.keys(r.json?.products || {}).length > 0, `status ${r.status}`);

// 20 (first). Unauthorised access is refused
for (const [m, p] of [["GET", "/api/admin/products"], ["POST", "/api/admin/products"], ["GET", "/api/admin/orders"], ["PATCH", "/api/admin/orders/x/status"], ["DELETE", "/api/admin/products/x"], ["GET", "/api/admin/stats"]]) {
  r = await req(m, p, m === "GET" || m === "DELETE" ? undefined : {}, { auth: false });
  check(`20. ${m} ${p} without login → 401`, r.status === 401, `got ${r.status}`);
}
r = await req("GET", "/api/admin/products", undefined, { rawCookie: "ferrin_admin=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4Iiwicm9sZSI6IkFETUlOIn0.forged" });
check("20. forged session token → 401", r.status === 401, `got ${r.status}`);
r = await req("GET", "/admin/dashboard", undefined, { auth: false });
check("20. /admin/dashboard without login redirects to login", r.status === 302 && r.location?.includes("/admin/login"), `got ${r.status}`);

// 3. Admin logs in
r = await req("POST", "/api/admin/login", { email: process.env.ADMIN_EMAIL, password: "wrong-password-123" }, { auth: false });
check("3. wrong password → 401", r.status === 401, `got ${r.status}`);
r = await req("POST", "/api/admin/login", { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }, { auth: false });
cookie = (r.setCookie || "").split(";")[0];
check("3. admin logs in and gets an HTTP-only session cookie", r.status === 200 && cookie.startsWith("ferrin_admin=") && /HttpOnly/i.test(r.setCookie) && /SameSite=Strict/i.test(r.setCookie), `status ${r.status}`);
r = await req("POST", "/api/admin/products", { name: "x" }, { origin: "https://evil.example" });
check("20. logged-in request from another site (CSRF) → 403", r.status === 403, `got ${r.status}`);

// 4. Products
r = await req("GET", "/api/admin/products");
check("4. admin opens Products", r.status === 200 && Array.isArray(r.json) && r.json.length > 0, `status ${r.status}`);
r = await req("GET", "/admin/products");
check("4. /admin/products page renders", r.status === 200 && r.text.includes("Create product"));

// 16 (validation)
r = await req("POST", "/api/admin/products", { name: "", slug: "x", sku: "XX", category: "tweezers", price: "-1", quantity: -2 });
check("16. invalid product (empty name, negative price and quantity) → 422 with field errors",
  r.status === 422 && r.json?.fields?.name && r.json?.fields?.price && r.json?.fields?.quantity, JSON.stringify(r.json?.fields));

// 5. Create product
const slug = `e2e-tweezers-${stamp.toLowerCase()}`;
r = await req("POST", "/api/admin/products", {
  name: `E2E Test Tweezers ${stamp}`, slug, sku: `E2E-${stamp}`, category: "tweezers", line: "pro",
  description: "Created by the end-to-end test.", price: "20.00", quantity: 5, imageUrl: "", isActive: true
});
const product = r.json;
check("5. admin creates a product", r.status === 201 && product?.id && product.price === "20.00", `status ${r.status} ${JSON.stringify(r.json)}`);
r = await req("POST", "/api/admin/products", { name: "Dup", slug, sku: `E2E-DUP-${stamp}`, category: "tweezers", price: "1", quantity: 1 });
check("16. duplicate slug → 409", r.status === 409 && r.json?.fields?.slug, `got ${r.status}`);

// 6. Visible on the shop
r = await req("GET", "/api/products?lang=en", undefined, { auth: false });
check("6. product appears in the public catalogue", r.json?.products?.[slug]?.price === 20, JSON.stringify(r.json?.products?.[slug]));
r = await req("GET", "/en/shop/tweezers/", undefined, { auth: false });
check("6. product appears on the customer-facing category page", r.text.includes(`E2E Test Tweezers ${stamp}`));
r = await req("GET", `/de/product/${slug}/`, undefined, { auth: false });
check("6. product page works in another language (English fallback)", r.status === 200 && r.text.includes(`E2E Test Tweezers ${stamp}`));

// 7–8. Price change
r = await req("PUT", `/api/admin/products/${product.id}`, { ...product, price: "25.50" });
check("7. admin changes the price", r.status === 200 && r.json?.price === "25.50", `status ${r.status}`);
r = await req("GET", `/en/product/${slug}/`, undefined, { auth: false });
check("8. new price appears on the website", r.text.includes("€25.50"));

// Multilingual product text
r = await req("PUT", `/api/admin/products/${product.id}`, { ...product, price: "25.50", details: ["Hand-aligned tips", "Satin grip"],
  translations: { de: { name: `E2E Pinzette ${stamp}`, summary: "Deutsche Beschreibung.", details: ["Von Hand ausgerichtet"] }, fr: { name: `E2E Pince ${stamp}`, summary: "", details: [] } } });
check("A. admin saves German and French text", r.status === 200 && r.json?.translations?.de?.name === `E2E Pinzette ${stamp}`, `status ${r.status} ${JSON.stringify(r.json?.fields || "")}`);
check("A. language completeness: EN and DE complete, FR name only, IT missing",
  r.json?.languages?.en === "complete" && r.json?.languages?.de === "complete" && r.json?.languages?.fr === "partial" && r.json?.languages?.it === "missing", JSON.stringify(r.json?.languages));
r = await req("GET", `/de/product/${slug}/`, undefined, { auth: false });
check("A. German page shows the German name and description", r.text.includes(`E2E Pinzette ${stamp}`) && r.text.includes("Deutsche Beschreibung."));
r = await req("GET", `/it/product/${slug}/`, undefined, { auth: false });
check("A. Italian page falls back to English", r.text.includes(`E2E Test Tweezers ${stamp}`));
r = await req("GET", "/api/products?lang=fr", undefined, { auth: false });
check("A. French catalogue uses the French name", r.json?.products?.[slug]?.name === `E2E Pince ${stamp}`);
r = await req("PUT", `/api/admin/products/${product.id}`, { ...product, price: "25.50", translations: { de: { name: "", summary: "Text without a name", details: [] } } });
check("A. a translation with text but no name is rejected (422)", r.status === 422 && r.json?.fields?.["translations.de.name"], JSON.stringify(r.json?.fields));
r = await req("PUT", `/api/admin/products/${product.id}`, { ...product, price: "25.50", details: ["Hand-aligned tips", "Satin grip"], translations: { de: { name: "", summary: "", details: [] } } });
const deGone = (await req("GET", `/de/product/${slug}/`, undefined, { auth: false })).text.includes(`E2E Test Tweezers ${stamp}`);
check("A. clearing German makes the German page fall back to English", r.status === 200 && r.json?.languages?.de === "missing" && deGone);

const statsBefore = (await req("GET", "/api/admin/stats")).json;

// 9–12. Customer order (the browser sends a fake price, which must be ignored)
r = await req("POST", "/api/orders", {
  language: "en", customer,
  items: [{ productId: product.id, finish: "satin", quantity: 2, unitPrice: 0.01, price: 0.01 }]
}, { auth: false });
const order = r.json;
check("9–11. customer submits an order and the backend creates it", r.status === 201 && /^FR-\d{6}-[A-Z0-9]{6}$/.test(order?.orderNumber || ""), `status ${r.status} ${JSON.stringify(r.json)}`);
check("10. prices sent by the browser are ignored (2 × €25.50 + €9.90 shipping = €60.90)",
  order?.items?.[0]?.unitPrice === "25.50" && order?.subtotal === "51.00" && order?.shipping === "9.90" && order?.total === "60.90", JSON.stringify(order));
r = await req("GET", `/api/admin/products/${product.id}`);
check("12. product quantity reduced from 5 to 3", r.json?.quantity === 3, `quantity ${r.json?.quantity}`);

// 15 (negatives on orders)
const ordersBefore = (await req("GET", "/api/admin/orders")).json.length;
r = await req("POST", "/api/orders", { language: "en", customer, items: [{ productId: product.id, finish: "satin", quantity: 10 }] }, { auth: false });
check("15. ordering more than the stock → 409", r.status === 409 && r.json?.code === "stock" && r.json?.products?.[0]?.available === 3, `status ${r.status}`);
const ordersAfter = (await req("GET", "/api/admin/orders")).json.length;
const stockAfter = (await req("GET", `/api/admin/products/${product.id}`)).json.quantity;
check("15. no partial order was created and stock is unchanged", ordersAfter === ordersBefore && stockAfter === 3, `orders ${ordersBefore}→${ordersAfter}, stock ${stockAfter}`);
r = await req("POST", "/api/orders", { language: "en", customer: { ...customer, email: "not-an-email", name: "" }, items: [{ productId: product.id, finish: "satin", quantity: 0 }] }, { auth: false });
check("16. invalid customer email, empty name and zero quantity → 422", r.status === 422 && r.json?.fields?.email && r.json?.fields?.name, `status ${r.status}`);
r = await req("POST", "/api/orders", { language: "en", customer: { ...customer, phone: "" }, items: [{ productId: product.id, finish: "satin", quantity: 1 }] }, { auth: false });
check("11. phone number is required", r.status === 422 && r.json?.fields?.phone, `status ${r.status}`);

// 13–15. Admin sees it
r = await req("GET", "/api/admin/stats");
check("13. dashboard counts the new pending order", r.json?.totalOrders === statsBefore.totalOrders + 1 && r.json?.pendingOrders === statsBefore.pendingOrders + 1 && r.json?.latestOrders?.[0]?.orderNumber === order.orderNumber);
r = await req("GET", "/admin/dashboard");
check("13. dashboard page lists the order", r.text.includes(order.orderNumber));
r = await req("GET", "/api/admin/orders");
const listed = r.json?.[0];
check("14–15. orders list shows it first, as Pending", listed?.orderNumber === order.orderNumber && listed.status === "PENDING");

// 16–17. Details keep the historical price after another price change
await req("PUT", `/api/admin/products/${product.id}`, { ...product, price: "30.00", quantity: 3 });
r = await req("GET", `/api/admin/orders/${listed.id}`);
const item = r.json?.items?.[0];
check("16–17. order details show name, quantity and the historical price (€25.50 after the product became €30.00)",
  r.status === 200 && item?.productName === `E2E Test Tweezers ${stamp}` && item.quantity === 2 && item.unitPrice === "25.50" && r.json.total === "60.90" && r.json.customerPhone === customer.phone);
r = await req("GET", `/admin/orders/${listed.id}`);
check("16. order detail page renders", r.status === 200 && r.text.includes("€25.50") && r.text.includes(customer.street));

// 18–19. Status
r = await req("PATCH", `/api/admin/orders/${listed.id}/status`, { status: "APPROVED" });
check("18. admin changes status to Approved", r.status === 200 && r.json?.status === "APPROVED");
r = await req("GET", `/api/admin/orders/${listed.id}`);
const page = await req("GET", `/admin/orders/${listed.id}`);
check("19. status persists after refresh", r.json?.status === "APPROVED" && /value="APPROVED" selected/.test(page.text));
r = await req("PATCH", `/api/admin/orders/${listed.id}/status`, { status: "SHIPPED_TO_MARS" });
check("16. invalid status → 422", r.status === 422);

// Deletion rules
r = await req("DELETE", `/api/admin/products/${product.id}`);
check("8. product used in an order can't be deleted (409, deactivate instead)", r.status === 409 && r.json?.code === "in_orders");
await req("PUT", `/api/admin/products/${product.id}`, { ...product, price: "30.00", quantity: 3, line: "essential", imageUrl: "https://example.com/e2e.jpg",
  details: ["Hand-aligned tips", "Satin grip"], translations: { fr: { name: `E2E Pince ${stamp}`, summary: "Texte.", details: [] } } });
const beforePatch = (await req("GET", `/api/admin/products/${product.id}`)).json;
r = await req("PATCH", `/api/admin/products/${product.id}`, { isActive: false });
check("8. product can be deactivated", r.status === 200 && r.json?.isActive === false);
const keep = o => JSON.stringify([o?.description, o?.details, o?.line, o?.imageUrl, o?.price, o?.translations]);
check("8. deactivating changes nothing else (description, bullets, line, image, price, translations)",
  keep(r.json) === keep(beforePatch) && beforePatch.details.length === 2 && beforePatch.line === "essential", `${keep(beforePatch)} → ${keep(r.json)}`);
r = await req("GET", "/api/products?lang=en", undefined, { auth: false });
check("9. deactivated product disappears from the shop", !r.json?.products?.[slug]);
r = await req("GET", `/en/product/${slug}/`, undefined, { auth: false });
check("9. its product page returns 404", r.status === 404);
r = await req("POST", "/api/orders", { language: "en", customer, items: [{ productId: product.id, finish: "satin", quantity: 1 }] }, { auth: false });
check("10. ordering an inactive product → 422", r.status === 422 && r.json?.code === "unavailable");
r = await req("GET", `/api/admin/orders/${listed.id}`);
check("8. the old order still works after deactivation", r.status === 200 && r.json.items[0].productName === `E2E Test Tweezers ${stamp}`);
const temp = (await req("POST", "/api/admin/products", { name: `E2E Temp ${stamp}`, slug: `e2e-temp-${stamp.toLowerCase()}`, sku: `E2E-T-${stamp}`, category: "tweezers", price: "1.00", quantity: 1 })).json;
r = await req("DELETE", `/api/admin/products/${temp.id}`);
check("8. product never ordered can be deleted", r.status === 200);

// Logout
r = await req("POST", "/api/admin/logout", {});
check("logout clears the session", r.status === 200 && /ferrin_admin=;/.test(r.setCookie || ""));

// Rate limit (with a made-up email so the real admin isn't locked out)
let last = 0;
for (let i = 0; i < 6; i++) last = (await req("POST", "/api/admin/login", { email: `ratelimit-${stamp}@example.com`, password: "x" }, { auth: false })).status;
check("17. 6th failed login attempt for an email is refused (429)", last === 429, `got ${last}`);
r = await req("POST", "/api/admin/login", { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }, { auth: false });
check("17. the limit is per email: the real admin can still log in", r.status === 200, `got ${r.status}`);

console.log(`\n${passed} passed, ${failures.length} failed.`);
if (failures.length) { console.log("Failed:\n  " + failures.join("\n  ")); process.exit(1); }
