// Pricing, shipping and VAT-number rules. Imported by build.mjs and by the browser,
// so the prices printed on pages and the prices in the cart always match.

export const round = n => Math.round(n * 100) / 100;

export const tierFor = (tiers, qty) => [...tiers].reverse().find(t => qty >= t.min);
export const nextTier = (tiers, qty) => tiers.find(t => t.min > qty);

// finishes: { satin: 0, mirror: 0.05, ... } — surcharge as a fraction of the base price
export const unitPrice = (product, finishes, tiers, finish, qty) =>
  round(product.price * (1 + (finishes[finish] || 0)) * (1 - tierFor(tiers, qty).off));

export const lowestPrice = (product, tiers) => round(product.price * (1 - tiers[tiers.length - 1].off));

export const baseFinish = (product, finishes) =>
  product.finishes.reduce((a, f) => ((finishes[f] || 0) < (finishes[a] || 0) ? f : a));

export function zoneFor(shipping, country) {
  return shipping.zones.find(z => z.countries.includes(country)) || null;
}

export function shippingFor(shipping, country, subtotal) {
  const zone = zoneFor(shipping, country);
  if (!zone || subtotal === 0) return { zone, price: 0 };
  if (zone.freeAbove && subtotal >= shipping.freeFrom) return { zone, price: 0 };
  return { zone, price: zone.price };
}

// Formats of EU VAT numbers. Greece uses the prefix EL.
const VAT = {
  AT: /^ATU\d{8}$/, BE: /^BE[01]\d{9}$/, BG: /^BG\d{9,10}$/, CY: /^CY\d{8}[A-Z]$/, CZ: /^CZ\d{8,10}$/,
  DE: /^DE\d{9}$/, DK: /^DK\d{8}$/, EE: /^EE\d{9}$/, GR: /^EL\d{9}$/, ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
  FI: /^FI\d{8}$/, FR: /^FR[A-HJ-NP-Z0-9]{2}\d{9}$/, HR: /^HR\d{11}$/, HU: /^HU\d{8}$/, IE: /^IE\d[0-9A-Z+*]\d{5}[A-Z]{1,2}$/,
  IT: /^IT\d{11}$/, LT: /^LT(\d{9}|\d{12})$/, LU: /^LU\d{8}$/, LV: /^LV\d{11}$/, MT: /^MT\d{8}$/,
  NL: /^NL\d{9}B\d{2}$/, PL: /^PL\d{10}$/, PT: /^PT\d{9}$/, RO: /^RO\d{2,10}$/, SE: /^SE\d{12}$/,
  SI: /^SI\d{8}$/, SK: /^SK\d{10}$/
};
const VAT_EXAMPLE = {
  AT: "ATU12345678", BE: "BE0123456789", DE: "DE123456789", FR: "FR12345678901", IT: "IT12345678901",
  LU: "LU12345678", NL: "NL123456789B01", PL: "PL1234567890", ES: "ESA1234567B", GR: "EL123456789"
};

export const needsVat = country => Boolean(VAT[country]);
export const vatExample = country => VAT_EXAMPLE[country] || (country === "GR" ? "EL123456789" : `${country}…`);

// Returns the cleaned number, or null if it doesn't match the country's format.
export function normaliseVat(country, raw) {
  const prefix = country === "GR" ? "EL" : country;
  let v = String(raw || "").toUpperCase().replace(/[\s.\-]/g, "");
  if (!v) return null;
  if (!v.startsWith(prefix) && /^[0-9]/.test(v)) v = prefix + v;
  return VAT[country] ? (VAT[country].test(v) ? v : null) : v;
}
