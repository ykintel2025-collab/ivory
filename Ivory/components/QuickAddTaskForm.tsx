"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Project = { id: string; name: string };
type Profile = { id: string; full_name: string };

export default function QuickAddTaskForm({
  projects,
  profiles,
}: {
  projects: Project[];
  profiles: Profile[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [urgency, setUrgency] = useState("normaal");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from("tasks").insert({
      project_id: projectId || null,
      title,
      owner_id: ownerId || null,
      urgency,
      due_date: dueDate || null,
      status: "te_doen",
    });

    setLoading(false);
    if (insertError) {
      setError("Aanmaken mislukt: " + insertError.message);
      return;
    }

    setTitle("");
    setOwnerId("");
    setUrgency("normaal");
    setDueDate("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-soft"
      >
        + Snel een taak toevoegen
      </button>
    );
  }

  return (
    <form
      onSubmit={handleCreate}
      className="space-y-3 rounded-xl border border-ivory-line bg-ivory-card p-5 shadow-sm"
    >
      <h2 className="font-display text-lg text-ink">Snel een taak toevoegen</h2>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">Titel</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Project (optioneel)</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          >
            <option value="">Los (geen project)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            Toegewezen aan
          </label>
          <select
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          >
            <option value="">Niemand</option>
            {profiles.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            Urgentie
          </label>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          >
            <option value="normaal">Normaal</option>
            <option value="hoog">Hoog</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            Deadline
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </div>
      </div>

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
          {loading ? "Bezig..." : "Taak aanmaken"}
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
