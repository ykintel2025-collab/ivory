"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useT } from "@/lib/i18n/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const tr = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(tr("Inloggen mislukt. Controleer je e-mail en wachtwoord."));
      return;
    }

    router.push("/projects");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Ink brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-ink px-12 py-12 md:flex">
        <Image
          src="/logo-full.png"
          alt="Ivory Global Care"
          width={220}
          height={76}
          className="h-auto w-48"
          priority
        />
        <div>
          <p className="font-display text-4xl leading-tight text-ivory">
            {tr("Alle projecten,")}
            <br />
            <span className="italic text-gold">{tr("één overzicht.")}</span>
          </p>
          <p className="mt-4 max-w-sm text-sm text-ivory/50">
            {tr("Risico's, taken, scope en partijen — voor elk project op één plek, altijd actueel.")}
          </p>
        </div>
        <p className="text-xs text-ivory/30">Ivory Global Care BV</p>
      </div>

      {/* Login form */}
      <div className="relative flex w-full items-center justify-center bg-ivory px-6 md:w-1/2">
        <div className="absolute right-4 top-4">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-sm">
          <h1 className="mb-1 font-display text-2xl text-ink">{tr("Welkom terug")}</h1>
          <p className="mb-8 text-sm text-ink/50">{tr("Log in om verder te gaan")}</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">
                {tr("E-mail")}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                placeholder={tr("naam@ivory-project.local")}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink/70">
                {tr("Wachtwoord")}
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-brick-soft px-3 py-2 text-sm text-brick">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-ink px-3 py-2.5 text-sm font-medium text-ivory transition hover:bg-ink-soft disabled:opacity-60"
            >
              {loading ? tr("Bezig...") : tr("Inloggen")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
