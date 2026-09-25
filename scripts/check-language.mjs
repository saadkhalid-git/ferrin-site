// Checks which language a first-time visitor gets, by time zone and browser languages.
import { readFileSync } from "node:fs";
import { LANGUAGE_RULES, pickLanguage } from "../src/shared/language.js";

const cfg = JSON.parse(readFileSync(new URL("../src/data/config.json", import.meta.url)));
const pick = (tz, langs) => pickLanguage(tz, langs, cfg.languages, cfg.defaultLanguage, LANGUAGE_RULES);
const cases = [
  ["Europe/Rome", ["en-US"], "it", "Italy, English browser"],
  ["Europe/Paris", ["de-DE"], "fr", "France, German browser"],
  ["Europe/Berlin", ["en-GB"], "de", "Germany"],
  ["Europe/Vienna", ["en"], "de", "Austria"],
  ["Europe/Warsaw", ["pl-PL"], "pl", "Poland"],
  ["Europe/Zurich", ["fr-CH", "de"], "fr", "Switzerland, French browser"],
  ["Europe/Zurich", ["rm-CH"], "de", "Switzerland, no supported browser language"],
  ["Europe/Brussels", ["nl-BE"], "en", "Belgium, Dutch browser"],
  ["Europe/Brussels", ["fr-BE"], "fr", "Belgium, French browser"],
  ["Europe/Luxembourg", ["lb-LU"], "fr", "Luxembourg, Luxembourgish browser"],
  ["Europe/Luxembourg", ["en-US", "fr-LU"], "en", "Luxembourg, English browser"],
  ["Europe/Madrid", ["es-ES"], "en", "Spain"],
  ["America/New_York", ["en-US"], "en", "USA"],
  ["Asia/Karachi", ["ur-PK"], "en", "Pakistan"],
  ["", [], "en", "unknown time zone"]
];
let failed = 0;
for (const [tz, langs, want, label] of cases) {
  const got = pick(tz, langs);
  if (got !== want) { failed++; console.log(`FAIL ${label}: ${tz} ${langs.join(",")} → ${got}, expected ${want}`); }
}
console.log(failed ? `${failed} of ${cases.length} language cases failed.` : `All ${cases.length} language cases pass.`);
process.exit(failed ? 1 : 0);
