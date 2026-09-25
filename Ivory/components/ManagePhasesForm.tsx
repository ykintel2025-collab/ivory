"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import DeleteButton from "@/components/DeleteButton";
import { useT } from "@/lib/i18n/client";

type Phase = { id: number; number: number; name: string };

export default function ManagePhasesForm({
  projectId,
  phases,
}: {
  projectId: string;
  phases: Phase[];
}) {
  const supabase = createClient();
  const tr = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const nextNumber = phases.length
      ? Math.max(...phases.map((p) => p.number)) + 1
      : 1;

    const { error: insertError } = await supabase.from("phases").insert({
      project_id: projectId,
      number: nextNumber,
      name,
    });

    setLoading(false);
    if (insertError) {
      setError(tr("Toevoegen mislukt: ") + insertError.message);
      return;
    }
    setName("");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg text-ink">{tr("Fasen van dit project")}</h2>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="text-xs font-medium text-ink/50 hover:text-ink"
          >
            {tr("+ Fase toevoegen")}
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {phases.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-1.5 rounded-full border border-ivory-line py-1 pl-3 pr-1.5 text-sm text-ink"
          >
            {p.number}. {tr(p.name)}
            <DeleteButton
              table="phases"
              id={String(p.id)}
              confirmText={tr("Fase \"{naam}\" verwijderen? Taken/risico's die hieraan gekoppeld waren verliezen die koppeling.", { naam: p.name })}
            />
          </div>
        ))}
        {phases.length === 0 && (
          <p className="text-sm text-ink/40">{tr("Nog geen fasen ingesteld.")}</p>
        )}
      </div>

      {open && (
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-ink/60">
              {tr("Naam van de nieuwe fase")}
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tr("bv. Testen en opleveren")}
              className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-soft disabled:opacity-60"
          >
            {loading ? tr("Bezig...") : tr("Toevoegen")}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg px-4 py-2 text-sm text-ink/60 hover:bg-ivory"
          >
            {tr("Sluiten")}
          </button>
          {error && (
            <p className="w-full rounded-lg bg-brick-soft px-3 py-2 text-xs text-brick">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
