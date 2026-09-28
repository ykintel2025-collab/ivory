"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";

// Schakelaar (alleen Master): verplichte tweestapsverificatie voor iedereen aan/uit.
export default function TwoFactorSwitch({ required }: { required: boolean }) {
  const supabase = createClient();
  const tr = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleToggle() {
    const message = required
      ? tr("Tweestapsverificatie uitzetten? Iedereen kan dan inloggen met alleen een wachtwoord. Zet het zo snel mogelijk weer aan.")
      : tr("Tweestapsverificatie weer verplicht maken? Wie nog geen authenticator heeft, moet die bij de volgende klik instellen.");
    if (!confirm(message)) return;
    setBusy(true);
    setError("");
    const { error: e } = await supabase.rpc("set_twofa_required", { p_on: !required });
    setBusy(false);
    if (e) { setError(e.message); return; }
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg text-ink">{tr("Tweestapsverificatie")}</h2>
          <p className="text-xs text-ink/40">
            {required
              ? tr("Verplicht voor iedereen: inloggen vraagt om een code uit de authenticator-app.")
              : tr("Tijdelijk UIT: iedereen kan inloggen met alleen een wachtwoord. Zet dit zo snel mogelijk weer aan.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${required ? "text-teal" : "text-brick"}`}>
            {required ? tr("Aan") : tr("Uit")}
          </span>
          <button
            role="switch"
            aria-checked={required}
            onClick={handleToggle}
            disabled={busy}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
              required ? "bg-teal" : "bg-brick"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                required ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-brick">{error}</p>}
    </div>
  );
}
