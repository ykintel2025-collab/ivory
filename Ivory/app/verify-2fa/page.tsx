"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

export default function Verify2FAPage() {
  const supabase = createClient();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === aal.currentLevel) {
      router.push("/projects");
      return;
    }

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verified = factors?.totp.find((f) => f.status === "verified");
    if (verified) setFactorId(verified.id);
    setChecking(false);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setError(null);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });

    if (challengeError || !challenge) {
      setError("Er ging iets mis. Probeer het opnieuw.");
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    setLoading(false);
    if (verifyError) {
      setError("Code onjuist. Controleer je authenticator-app en probeer opnieuw.");
      return;
    }

    router.push("/projects");
    router.refresh();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory">
        <p className="text-sm text-ink/40">Bezig...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="w-full max-w-sm rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
        <div className="mb-4 flex justify-center">
          <Image
            src="/logo-crest.png"
            alt="Ivory Global Care"
            width={40}
            height={40}
            className="h-10 w-10 rounded-full"
          />
        </div>
        <h1 className="mb-1 text-center font-display text-xl text-ink">
          Verificatiecode
        </h1>
        <p className="mb-5 text-center text-sm text-ink/50">
          Voer de 6-cijferige code in uit je authenticator-app
        </p>
        <form onSubmit={handleVerify} className="space-y-3">
          <input
            required
            autoFocus
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
            maxLength={6}
            className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-3 text-center text-2xl tracking-[0.4em] text-ink focus:border-ink focus:outline-none"
            placeholder="······"
          />
          {error && (
            <p className="rounded-lg bg-brick-soft px-3 py-2 text-xs text-brick">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !factorId || code.length !== 6}
            className="w-full rounded-lg bg-ink px-3 py-2.5 text-sm font-medium text-ivory hover:bg-ink-soft disabled:opacity-60"
          >
            {loading ? "Bezig..." : "Bevestigen"}
          </button>
        </form>
        <button
          onClick={handleLogout}
          className="mt-4 w-full text-center text-xs text-ink/40 hover:text-ink/60"
        >
          Uitloggen en met een ander account proberen
        </button>
      </div>
    </div>
  );
}
