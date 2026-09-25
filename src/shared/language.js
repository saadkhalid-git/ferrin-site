// Chooses the site language on a first visit, and remembers it.
// The country comes from the device's time zone: no location permission prompt and no request to a
// third-party IP lookup, so nothing about the visitor leaves the browser.
// Used by build.mjs (inlined into the root page) and by the browser (language menu).

export const LANGUAGE_KEY = "ferrin-lang";

// Time zones that identify one country. CLDR keeps a separate zone for each of these countries.
export const LANGUAGE_RULES = {
  zones: {
    "Europe/Rome": "IT", "Europe/San_Marino": "SM", "Europe/Vatican": "VA",
    "Europe/Paris": "FR", "Europe/Monaco": "MC",
    "Europe/Berlin": "DE", "Europe/Busingen": "DE", "Europe/Vienna": "AT", "Europe/Vaduz": "LI",
    "Europe/Warsaw": "PL",
    "Europe/Zurich": "CH", "Europe/Brussels": "BE", "Europe/Luxembourg": "LU"
  },
  // One language: always use it. Several: use the visitor's browser language if the site has it,
  // otherwise `fallback` (null means the site default, English).
  countries: {
    IT: { langs: ["it"] }, SM: { langs: ["it"] }, VA: { langs: ["it"] },
    FR: { langs: ["fr"] }, MC: { langs: ["fr"] },
    DE: { langs: ["de"] }, AT: { langs: ["de"] }, LI: { langs: ["de"] },
    PL: { langs: ["pl"] },
    CH: { langs: ["de", "fr", "it"], fallback: "de" },
    BE: { langs: ["fr", "de"], fallback: null },
    LU: { langs: ["fr", "de"], fallback: "fr" }
  }
};

// Written without modern syntax because build.mjs inlines this function into the root page as-is.
export function pickLanguage(timeZone, browserLanguages, supported, siteDefault, rules) {
  var country = rules.zones[timeZone];
  var info = country && rules.countries[country];
  if (!info) return siteDefault;
  if (info.langs.length === 1) return supported.indexOf(info.langs[0]) > -1 ? info.langs[0] : siteDefault;
  var list = browserLanguages || [];
  for (var i = 0; i < list.length; i++) {
    var code = String(list[i]).slice(0, 2).toLowerCase();
    if (supported.indexOf(code) > -1) return code;
  }
  return info.fallback && supported.indexOf(info.fallback) > -1 ? info.fallback : siteDefault;
}

export function saveLanguage(lang) {
  try { localStorage.setItem(LANGUAGE_KEY, lang); } catch (e) { /* storage unavailable */ }
}
