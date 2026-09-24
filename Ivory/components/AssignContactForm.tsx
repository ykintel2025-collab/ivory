"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGlobalRole } from "@/lib/useGlobalRole";

type Contact = { id: string; name: string; type: string | null };

export default function AssignContactForm({
  projectId,
  availableContacts,
}: {
  projectId: string;
  availableContacts: Contact[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isMasterOrMain } = useGlobalRole();

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase.from("project_contacts").insert({
      project_id: projectId,
      contact_id: contactId,
      role: role || null,
      status: "actief",
    });

    setLoading(false);
    if (insertError) {
      setError("Toewijzen mislukt: " + insertError.message);
      return;
    }

    setContactId("");
    setRole("");
    setOpen(false);
    router.refresh();
  }

  if (!isMasterOrMain) return null;

  if (availableContacts.length === 0) {
    return null;
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-ivory-line bg-ivory-card px-4 py-2 text-sm font-medium text-ink hover:border-gold"
      >
        Bestaande relatie toewijzen
      </button>
    );
  }

  return (
    <form
      onSubmit={handleAssign}
      className="space-y-3 rounded-xl border border-ivory-line bg-ivory-card p-5 shadow-sm"
    >
      <h2 className="font-display text-lg text-ink">
        Bestaande relatie toewijzen
      </h2>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">
          Relatie
        </label>
        <select
          required
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
        >
          <option value="">Kies een relatie...</option>
          {availableContacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.type ? ` (${c.type})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">
          Rol in dit project
        </label>
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="bv. Leverancier medische gassen"
          className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
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
          disabled={loading}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-soft disabled:opacity-60"
        >
          {loading ? "Bezig..." : "Toewijzen"}
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
