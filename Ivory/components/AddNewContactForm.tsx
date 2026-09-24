"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGlobalRole } from "@/lib/useGlobalRole";

export default function AddNewContactForm({ projectId }: { projectId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isMasterOrMain } = useGlobalRole();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .insert({
        name,
        type: role || null,
        contact_name: contactName || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (contactError || !contact) {
      setError("Aanmaken mislukt: " + contactError?.message);
      setLoading(false);
      return;
    }

    const { error: linkError } = await supabase.from("project_contacts").insert({
      project_id: projectId,
      contact_id: contact.id,
      role: role || null,
      status: "actief",
    });

    setLoading(false);
    if (linkError) {
      setError("Toewijzen aan project mislukt: " + linkError.message);
      return;
    }

    setName("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setRole("");
    setNotes("");
    setOpen(false);
    router.refresh();
  }

  if (!isMasterOrMain) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-soft"
      >
        + Nieuwe relatie
      </button>
    );
  }

  return (
    <form
      onSubmit={handleCreate}
      className="space-y-3 rounded-xl border border-ivory-line bg-ivory-card p-5 shadow-sm"
    >
      <h2 className="font-display text-lg text-ink">Nieuwe relatie</h2>
      <p className="text-xs text-ink/40">
        Deze relatie wordt algemeen aangemaakt en direct aan dit project
        gekoppeld. Je kunt 'm later ook aan andere projecten toewijzen.
      </p>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">
          Naam (bedrijf of persoon)
        </label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">
          Rol in dit project
        </label>
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="bv. Juridisch adviseur"
          className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            Contactpersoon
          </label>
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            E-mail
          </label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            Telefoon
          </label>
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">
          Notities
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
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
          {loading ? "Bezig..." : "Aanmaken en toewijzen"}
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
