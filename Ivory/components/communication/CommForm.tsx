"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";
import { CHANNELS, COMM_SELECT, DIRECTIONS } from "@/lib/parties/labels";
import type { CommEntry } from "@/lib/parties/labels";

const input = "w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none";
const lbl = "mb-1 block text-xs font-medium text-ink/60";

// Nieuw contactmoment. Een ingevulde vervolgactie wordt in de database automatisch een taak.
export default function CommForm({
  projectId,
  parties,
  profiles,
  defaultPartyId,
  onSaved,
  onCancel,
}: {
  projectId: string;
  parties: { id: string; name: string }[];
  profiles: { id: string; full_name: string }[];
  defaultPartyId?: string;
  onSaved: (entry: CommEntry) => void;
  onCancel?: () => void;
}) {
  const supabase = createClient();
  const tr = useT();
  const [f, setF] = useState({
    contact_date: new Date().toISOString().slice(0, 10),
    channel: "email",
    direction: "uit",
    party_id: defaultPartyId ?? "",
    contact_person: "",
    subject: "",
    summary: "",
    follow_up: "",
    follow_up_owner: "",
    follow_up_due: "",
    waiting: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.summary.trim()) return;
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("communication_log")
      .insert({
        project_id: projectId,
        party_id: f.party_id || null,
        contact_date: f.contact_date,
        channel: f.channel,
        direction: f.direction,
        contact_person: f.contact_person.trim() || null,
        subject: f.subject.trim() || null,
        summary: f.summary.trim(),
        follow_up: f.follow_up.trim() || null,
        follow_up_owner: f.follow_up_owner || null,
        follow_up_due: f.follow_up_due || null,
        waiting: f.follow_up.trim() ? f.waiting : false,
      })
      .select(COMM_SELECT)
      .single();
    setBusy(false);
    if (err || !data) {
      setError(tr("Opslaan mislukt: ") + (err?.message ?? ""));
      return;
    }
    onSaved(data as CommEntry);
    setF({ ...f, contact_person: "", subject: "", summary: "", follow_up: "", follow_up_owner: "", follow_up_due: "", waiting: false });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-ivory-line bg-ivory-card p-5 shadow-sm">
      <div className="grid gap-3 md:grid-cols-4">
        <label>
          <span className={lbl}>{tr("Datum")}</span>
          <input type="date" required className={input} value={f.contact_date} onChange={(e) => set({ contact_date: e.target.value })} />
        </label>
        <label>
          <span className={lbl}>{tr("Kanaal")}</span>
          <select className={input} value={f.channel} onChange={(e) => set({ channel: e.target.value })}>
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.icon} {tr(c.label)}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={lbl}>{tr("Richting")}</span>
          <select className={input} value={f.direction} onChange={(e) => set({ direction: e.target.value })}>
            {DIRECTIONS.map((d) => (
              <option key={d.value} value={d.value}>{tr(d.label)}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={lbl}>{tr("Partij")}</span>
          <select className={input} value={f.party_id} onChange={(e) => set({ party_id: e.target.value })}>
            <option value="">{tr("— intern / geen partij —")}</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label>
          <span className={lbl}>{tr("Onderwerp")}</span>
          <input className={input} value={f.subject} onChange={(e) => set({ subject: e.target.value })} placeholder={tr("bv. Offerteaanvraag verstuurd")} />
        </label>
        <label>
          <span className={lbl}>{tr("Contactpersoon")}</span>
          <input className={input} value={f.contact_person} onChange={(e) => set({ contact_person: e.target.value })} />
        </label>
      </div>
      <label className="block">
        <span className={lbl}>{tr("Wat is er besproken of afgesproken?")}</span>
        <textarea required rows={3} className={input} value={f.summary} onChange={(e) => set({ summary: e.target.value })} />
      </label>

      <div className="rounded-lg border border-dashed border-ivory-line p-3">
        <p className="mb-2 text-xs font-medium text-ink/60">{tr("Vervolgactie (wordt automatisch een taak)")}</p>
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
          <input className={input} value={f.follow_up} onChange={(e) => set({ follow_up: e.target.value })} placeholder={tr("bv. Offerte ontvangen en beoordelen")} />
          <select className={input} value={f.follow_up_owner} onChange={(e) => set({ follow_up_owner: e.target.value })} disabled={!f.follow_up.trim()}>
            <option value="">{tr("Eigenaar...")}</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
          <input type="date" className={input} value={f.follow_up_due} onChange={(e) => set({ follow_up_due: e.target.value })} disabled={!f.follow_up.trim()} />
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs text-ink/70">
          <input type="checkbox" checked={f.waiting} disabled={!f.follow_up.trim()} onChange={(e) => set({ waiting: e.target.checked })} />
          {tr("We wachten hiervoor op de partij (komt in 'Wacht op extern')")}
        </label>
      </div>

      {error && <p className="rounded-lg bg-brick-soft px-3 py-2 text-xs text-brick">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-soft disabled:opacity-60">
          {busy ? tr("Bezig...") : tr("Contactmoment opslaan")}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-ink/60 hover:bg-ivory">
            {tr("Annuleren")}
          </button>
        )}
      </div>
    </form>
  );
}
