"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";

export default function ProcImport({
  projectId,
  documents,
  isMaster,
  hasItems,
}: {
  projectId: string;
  documents: { id: string; name: string; created_at: string }[];
  isMaster: boolean;
  hasItems: boolean;
}) {
  const tr = useT();
  const router = useRouter();
  const [documentId, setDocumentId] = useState(documents.find((d) => /stambestand|equipment/i.test(d.name))?.id ?? documents[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!documentId) return;
    if (hasItems && !window.confirm(tr("Opnieuw importeren? Pakketindeling, statussen, leveranciers en prijzen blijven behouden; aantallen en ruimtes worden bijgewerkt."))) return;
    setBusy(true);
    setError(null);
    setResult(null);
    const res = await fetch("/api/procurement/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, documentId }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error ?? tr("Importeren mislukt."));
      return;
    }
    setResult(json);
    router.refresh();
  }

  if (!isMaster) {
    return <p className="text-sm text-ink/40">{tr("Alleen Master kan de stamlijst importeren.")}</p>;
  }

  return (
    <div className="max-w-2xl space-y-4 rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
      <div>
        <h2 className="font-display text-lg text-ink">{tr("Stamlijst importeren")}</h2>
        <p className="mt-1 text-sm text-ink/50">
          {tr("Kies de Excel-stamlijst uit de documenten van dit project. Ivory bundelt alle regels per artikelcode, deelt de artikelen automatisch in inkooppakketten in en markeert twijfelgevallen. Een nieuwe versie kun je later opnieuw importeren: wat je al hebt vastgelegd blijft behouden.")}
        </p>
      </div>

      {documents.length === 0 ? (
        <p className="rounded-lg bg-amber-soft px-3 py-2 text-sm text-amber">
          {tr("Er staat nog geen Excel-bestand bij de documenten van dit project. Upload eerst de stamlijst via Documenten.")}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="min-w-[280px] flex-1 rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button
            onClick={run}
            disabled={busy || !documentId}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-soft disabled:opacity-60"
          >
            {busy ? tr("Bezig met importeren...") : hasItems ? tr("Opnieuw importeren") : tr("Importeren")}
          </button>
        </div>
      )}

      {error && <p className="rounded-lg bg-brick-soft px-3 py-2 text-sm text-brick">{error}</p>}

      {result && (
        <div className="rounded-lg bg-teal-soft p-4 text-sm text-teal">
          <p className="font-medium">{tr("Import gelukt")} — {result.document}</p>
          <ul className="mt-1 list-inside list-disc text-teal/90">
            <li>{tr("{n} artikelen ({nieuw} nieuw, {bij} bijgewerkt)", { n: result.items, nieuw: result.newItems, bij: result.updatedItems })}</li>
            <li>{tr("{n} ruimteregels", { n: result.lines })}</li>
            <li>{tr("{n} te controleren (indeling onzeker)", { n: result.flagged })}</li>
            {result.notInListAnymore > 0 && <li>{tr("{n} artikelen staan niet meer in deze stamlijst", { n: result.notInListAnymore })}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
