"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGlobalRole } from "@/lib/useGlobalRole";
import { useT } from "@/lib/i18n/client";

type Profile = { id: string; full_name: string };

const SECTIONS = [
  { value: "risks", label: "Risico's" },
  { value: "tasks", label: "Taken" },
  { value: "scope", label: "Scope" },
  { value: "parties", label: "Partijen & Communicatie" },
  { value: "documents", label: "Documenten" },
  { value: "budget", label: "Budget" },
  { value: "procurement", label: "Inkoop" },
];

export default function AddProjectMemberForm({
  projectId,
  availableProfiles,
}: {
  projectId: string;
  availableProfiles: Profile[];
}) {
  const supabase = createClient();
  const tr = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [accessLevel, setAccessLevel] = useState("volledig");
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isMaster } = useGlobalRole();

  function toggleSection(value: string) {
    setSections((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from("project_members").insert({
      project_id: projectId,
      user_id: userId,
      role: "lid",
      access_level: accessLevel,
      allowed_sections: accessLevel === "beperkt" ? sections : [],
      visible: true,
    });

    setLoading(false);
    if (insertError) {
      setError(tr("Toevoegen mislukt: ") + insertError.message);
      return;
    }

    setUserId("");
    setAccessLevel("volledig");
    setSections([]);
    setOpen(false);
    router.refresh();
  }

  if (!isMaster) return null;

  if (availableProfiles.length === 0) {
    return (
      <p className="text-xs text-ink/40">
        {tr("Iedereen met een account staat al in dit project. Nieuwe collega's maak je eerst aan via Instellingen, daarna verschijnen ze hier.")}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-soft"
      >
        {tr("+ Teamlid toevoegen")}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleAdd}
      className="space-y-3 rounded-xl border border-ivory-line bg-ivory-card p-5 shadow-sm"
    >
      <h2 className="font-display text-lg text-ink">{tr("Teamlid toevoegen")}</h2>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">
          {tr("Persoon")}
        </label>
        <select
          required
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
        >
          <option value="">{tr("Kies iemand...")}</option>
          {availableProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">
          {tr("Toegangsniveau")}
        </label>
        <div className="flex gap-3">
          <label className="flex items-center gap-1.5 text-sm text-ink">
            <input
              type="radio"
              checked={accessLevel === "volledig"}
              onChange={() => setAccessLevel("volledig")}
            />
            {tr("Volledig — ziet alles")}
          </label>
          <label className="flex items-center gap-1.5 text-sm text-ink">
            <input
              type="radio"
              checked={accessLevel === "beperkt"}
              onChange={() => setAccessLevel("beperkt")}
            />
            {tr("Beperkt — alleen gekozen onderdelen")}
          </label>
        </div>
      </div>

      {accessLevel === "beperkt" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            {tr("Zichtbare onderdelen")}
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {SECTIONS.map((s) => (
              <label
                key={s.value}
                className="flex items-center gap-1.5 text-sm text-ink"
              >
                <input
                  type="checkbox"
                  checked={sections.includes(s.value)}
                  onChange={() => toggleSection(s.value)}
                />
                {tr(s.label)}
              </label>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-brick-soft px-3 py-2 text-xs text-brick">
          {error}
        </p>
      )}

      <div className="flex gap-2">
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
          {tr("Annuleren")}
        </button>
      </div>
    </form>
  );
}
