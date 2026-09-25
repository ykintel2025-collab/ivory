"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";

type Contact = { contact_id: string; name: string };

export default function AddCommunicationLogForm({
  projectId,
  contacts,
}: {
  projectId: string;
  contacts: Contact[];
}) {
  const supabase = createClient();
  const tr = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [contactDate, setContactDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [summary, setSummary] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("communication_log").insert({
      project_id: projectId,
      party_id: contactId || null,
      contact_date: contactDate,
      summary,
      follow_up: followUp || null,
      logged_by: user?.id ?? null,
    });

    setLoading(false);
    if (insertError) {
      setError(tr("Opslaan mislukt: ") + insertError.message);
      return;
    }

    setContactId("");
    setSummary("");
    setFollowUp("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-ivory-line bg-ivory-card px-4 py-2 text-sm font-medium text-ink hover:border-gold"
      >
        {tr("+ Contactmoment loggen")}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleCreate}
      className="space-y-3 rounded-xl border border-ivory-line bg-ivory-card p-5 shadow-sm"
    >
      <h2 className="font-display text-lg text-ink">{tr("Contactmoment loggen")}</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            {tr("Partij")}
          </label>
          <select
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
            className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          >
            <option value="">{tr("Kies een partij...")}</option>
            {contacts.map((c) => (
              <option key={c.contact_id} value={c.contact_id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            {tr("Datum")}
          </label>
          <input
            type="date"
            required
            value={contactDate}
            onChange={(e) => setContactDate(e.target.value)}
            className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">
          {tr("Samenvatting (bv. \"Telefonisch overleg over betaalschema\")")}
        </label>
        <textarea
          required
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">
          {tr("Vervolgactie (optioneel)")}
        </label>
        <input
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
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
          {loading ? tr("Bezig...") : tr("Opslaan")}
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
