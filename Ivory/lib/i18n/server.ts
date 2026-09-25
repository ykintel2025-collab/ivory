import { cookies } from "next/headers";
import { LANG_COOKIE, parseLang, translate, type Lang } from "./translate";

export function getLang(): Lang {
  return parseLang(cookies().get(LANG_COOKIE)?.value);
}

// Voor server components: const t = getT(); t("Taken")
export function getT() {
  const lang = getLang();
  return (text: string, vars?: Record<string, string | number>) => translate(lang, text, vars);
}
