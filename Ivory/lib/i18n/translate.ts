import { EN } from "./en";

export type Lang = "nl" | "en";

export const LANG_COOKIE = "lang";

// Nederlands is de brontaal: de Nederlandse tekst is de sleutel, EN bevat de vertaling.
// Ontbreekt een vertaling, dan valt het terug op de Nederlandse tekst.
// Variabelen: t("Welkom {naam}", { naam: "Jan" }).
export function translate(lang: Lang, text: string, vars?: Record<string, string | number>): string {
  let out = lang === "en" ? EN[text] ?? text : text;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

export function parseLang(value: string | undefined | null): Lang {
  return value === "en" ? "en" : "nl";
}

export const DATE_LOCALE: Record<Lang, string> = { nl: "nl-NL", en: "en-GB" };
