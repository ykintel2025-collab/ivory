"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; full_name: string };

const SECTIONS = [
  { value: "risks", label: "Risico's" },
  { value: "tasks", label: "Taken" },
  { value: "scope", label: "Scope" },
  { value: "tracker", label: "Registraties" },
  { value: "suppliers", label: "Apparatuur" },
  { value: "parties", label: "Partijen & Communicatie" },
  { value: "documents", label: "Documenten" },
  { value: "budget", label: "Budget" },
];

export default function AddProjectMemberForm({
  projectId,
  availableProfiles,
}: {
  projectId: string;
  availableProfiles: Profile[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [accessLevel, setAccessLevel] = useState("volledig");
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError("Toevoegen mislukt: " + insertError.message);
      return;
    }

    setUserId("");
    setAccessLevel("volledig");
    setSections([]);
    setOpen(false);
    router.refresh();
  }

  if (availableProfiles.length === 0) {
    return (
      <p className="text-xs text-ink/40">
        Iedereen met een account staat al in dit project. Nieuwe collega's
        maak je eerst aan via Supabase → Authentication → Users, daarna
        verschijnen ze hier.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-soft"
      >
        + Teamlid toevoegen
      </button>
    );
  }

  return (
    <form
      onSubmit={handleAdd}
      className="space-y-3 rounded-xl border border-ivory-line bg-ivory-card p-5 shadow-sm"
    >
      <h2 className="font-display text-lg text-ink">Teamlid toevoegen</h2>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">
          Persoon
        </label>
        <select
          required
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
        >
          <option value="">Kies iemand...</option>
          {availableProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">
          Toegangsniveau
        </label>
        <div className="flex gap-3">
          <label className="flex items-center gap-1.5 text-sm text-ink">
            <input
              type="radio"
              checked={accessLevel === "volledig"}
              onChange={() => setAccessLevel("volledig")}
            />
            Volledig — ziet alles
          </label>
          <label className="flex items-center gap-1.5 text-sm text-ink">
            <input
              type="radio"
              checked={accessLevel === "beperkt"}
              onChange={() => setAccessLevel("beperkt")}
            />
            Beperkt — alleen gekozen onderdelen
          </label>
        </div>
      </div>

      {accessLevel === "beperkt" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            Zichtbare onderdelen
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
                {s.label}
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
          {loading ? "Bezig..." : "Toevoegen"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-4 py-2 text-sm text-ink/60 hover:bg-ivory"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
