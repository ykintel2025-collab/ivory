"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import GlobalShell from "@/components/GlobalShell";

export default function SecurityPage() {
  const supabase = createClient();
  const [factors, setFactors] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadFactors();
  }, []);

  async function loadFactors() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
    setReady(true);
  }

  async function startEnroll() {
    setError(null);

    // Eventuele eerdere, nooit-afgemaakte pogingen eerst opruimen
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const f of existing?.totp ?? []) {
      if ((f.status as string) === "unverified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error || !data) {
      setError(error?.message ?? "Kon niet starten.");
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrolling(true);
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setLoading(true);
    setError(null);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (challengeError || !challenge) {
      setError(challengeError?.message ?? "Fout bij aanmaken verificatie.");
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
      setError("Code onjuist. Controleer je app en probeer opnieuw.");
      return;
    }

    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setCode("");
    loadFactors();
  }

  async function removeFactor(id: string) {
    if (!window.confirm("Tweestapsverificatie uitschakelen voor jouw account?")) return;
    await supabase.auth.mfa.unenroll({ factorId: id });
    loadFactors();
  }

  const verifiedFactors = factors.filter((f) => f.status === "verified");
  const hasVerifiedFactor = verifiedFactors.length > 0;

  return (
    <GlobalShell>
      <div className="max-w-lg space-y-6">
        <div>
          <h1 className="font-display text-3xl text-ink">Beveiliging</h1>
          <p className="text-sm text-ink/50">
            Tweestapsverificatie voor jouw account
          </p>
        </div>

        <div className="rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
          {!ready ? (
            <p className="text-sm text-ink/40">Bezig...</p>
          ) : hasVerifiedFactor ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-teal">
                ✓ Tweestapsverificatie is ingeschakeld
              </p>
              {verifiedFactors.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border border-ivory-line px-3 py-2.5"
                >
                  <span className="text-sm text-ink">Authenticator-app</span>
                  <button
                    onClick={() => removeFactor(f.id)}
                    className="text-xs font-medium text-brick hover:underline"
                  >
                    Uitschakelen
                  </button>
                </div>
              ))}
            </div>
          ) : enrolling ? (
            <form onSubmit={confirmEnroll} className="space-y-4">
              <p className="text-sm text-ink/70">
                Scan deze QR-code met je authenticator-app (Google
                Authenticator, Microsoft Authenticator, of Authy):
              </p>
              {qrCode && (
                <div className="flex justify-center rounded-lg bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="QR-code" className="h-48 w-48" />
                </div>
              )}
              <details className="text-xs text-ink/50">
                <summary className="cursor-pointer">
                  Kan niet scannen? Voer handmatig in
                </summary>
                <p className="mt-1 break-all rounded bg-ivory p-2 font-mono">
                  {secret}
                </p>
              </details>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">
                  Voer de 6-cijferige code in die je app nu toont
                </label>
                <input
                  required
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                  maxLength={6}
                  className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-center text-lg tracking-widest text-ink focus:border-ink focus:outline-none"
                  placeholder="123456"
                />
              </div>
              {error && (
                <p className="rounded-lg bg-brick-soft px-3 py-2 text-xs text-brick">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-soft disabled:opacity-60"
                >
                  {loading ? "Bezig..." : "Bevestigen"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEnrolling(false);
                    setQrCode(null);
                    setSecret(null);
                    setError(null);
                  }}
                  className="rounded-lg px-4 py-2 text-sm text-ink/60 hover:bg-ivory"
                >
                  Annuleren
                </button>
              </div>
            </form>
          ) : (
            <div>
              <p className="mb-3 text-sm text-ink/60">
                Tweestapsverificatie staat nog uit. Zonder dit kan iedereen
                met alleen je wachtwoord inloggen.
              </p>
              <button
                onClick={startEnroll}
                className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-soft"
              >
                Tweestapsverificatie inschakelen
              </button>
              {error && (
                <p className="mt-2 rounded-lg bg-brick-soft px-3 py-2 text-xs text-brick">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </GlobalShell>
  );
}
