"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Project = { id: string; name: string };

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

export default function AssignUserToProjectForm({
  userId,
  availableProjects,
}: {
  userId: string;
  availableProjects: Project[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [accessLevel, setAccessLevel] = useState("volledig");
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSection(value: string) {
    setSections((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  }

  async function handleAssign(e: React.FormEvent) {
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
      setError("Toewijzen mislukt: " + insertError.message);
      return;
    }

    setProjectId("");
    setAccessLevel("volledig");
    setSections([]);
    setOpen(false);
    router.refresh();
  }

  if (availableProjects.length === 0) {
    return <p className="text-xs text-ink/30">Al aan alle projecten gekoppeld.</p>;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-ink/50 hover:text-gold"
      >
        + Aan project toevoegen
      </button>
    );
  }

  return (
    <form
      onSubmit={handleAssign}
      className="mt-2 space-y-2 rounded-lg border border-ivory-line bg-ivory p-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <select
          required
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-md border border-ivory-line bg-ivory-card px-2 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
        >
          <option value="">Kies project...</option>
          {availableProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={accessLevel}
          onChange={(e) => setAccessLevel(e.target.value)}
          className="rounded-md border border-ivory-line bg-ivory-card px-2 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
        >
          <option value="volledig">Volledig</option>
          <option value="beperkt">Beperkt</option>
        </select>
      </div>

      {accessLevel === "beperkt" && (
        <div className="grid grid-cols-2 gap-1">
          {SECTIONS.map((s) => (
            <label key={s.value} className="flex items-center gap-1.5 text-xs text-ink">
              <input
                type="checkbox"
                checked={sections.includes(s.value)}
                onChange={() => toggleSection(s.value)}
              />
              {s.label}
            </label>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-brick">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-ink px-3 py-1 text-xs font-medium text-ivory hover:bg-ink-soft disabled:opacity-60"
        >
          {loading ? "..." : "Toevoegen"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-1 text-xs text-ink/50 hover:bg-ivory-line"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
