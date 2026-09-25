"use client";

import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n/client";
import { LANG_COOKIE, type Lang } from "@/lib/i18n/translate";

export default function LanguageSwitcher({ tone = "light" }: { tone?: "light" | "dark" }) {
  const lang = useLang();
  const router = useRouter();

  function choose(next: Lang) {
    if (next === lang) return;
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  const base = "rounded-md px-2 py-1 text-xs font-semibold transition";
  const idle = tone === "dark" ? "text-ivory/50 hover:text-ivory" : "text-ink/40 hover:text-ink";
  const active = tone === "dark" ? "bg-ivory text-ink" : "bg-ink text-ivory";

  return (
    <div
      role="group"
      aria-label="Language / Taal"
      className={`inline-flex items-center gap-0.5 rounded-lg border p-0.5 ${tone === "dark" ? "border-ivory/20" : "border-ivory-line bg-ivory-card"}`}
    >
      {(["nl", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => choose(l)}
          aria-pressed={lang === l}
          className={`${base} ${lang === l ? active : idle}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
