"use client";

import { createContext, useContext } from "react";
import { translate, type Lang } from "./translate";

const LangContext = createContext<Lang>("nl");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

// Voor client components: const t = useT(); t("Opslaan")
export function useT() {
  const lang = useContext(LangContext);
  return (text: string, vars?: Record<string, string | number>) => translate(lang, text, vars);
}
