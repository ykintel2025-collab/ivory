"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang, useT } from "@/lib/i18n/client";
import { DATE_LOCALE } from "@/lib/i18n/translate";
import { BIDDER_STAGES, opt } from "@/lib/tender/labels";
import type { Bid, Bidder } from "@/lib/tender/labels";
import type { useRows } from "@/lib/useRows";
import type { TenderData } from "./TenderView";

const input = "rounded-lg border border-ivory-line bg-ivory-card px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none";

export default function TenderCandidates({
  data,
  bidders,
  bids,
  goBids,
}: {
  data: TenderData;
  bidders: ReturnType<typeof useRows<Bidder>>;
  bids: Bid[];
  goBids: () => void;
}) {
  const tr = useT();
  const supabase = createClient();
  const locale = DATE_LOCALE[useLang()];
  const [contactId, setContactId] = useState("");
  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short" }) : "—");

  const taken = new Set(bidders.rows.map((b) => b.contact_id));
  const available = data.contacts.filter((c) => !taken.has(c.id));

  async function addCandidate() {
    if (!contactId) return;
    const row = await bidders.add({ project_id: data.projectId, contact_id: contactId, stage: "benaderd", invited_at: new Date().toISOString().slice(0, 10) });
    if (!row) return;
    // Zorg dat de partij ook bij Partijen staat, als kandidaat-leverancier.
    if (!data.projectContactIds.includes(contactId)) {
      await supabase.from("project_contacts").insert({ project_id: data.projectId, contact_id: contactId, party_role: "kandidaat", status: "in gesprek" });
    } else {
      await supabase.from("project_contacts").update({ party_role: "kandidaat" }).eq("project_id", data.projectId).eq("contact_id", contactId).eq("party_role", "overig");
    }
    setContactId("");
  }

  const stageCounts = BIDDER_STAGES.map((s) => ({ ...s, n: bidders.rows.filter((b) => b.stage === s.value).length })).filter((s) => s.n);

  return (
    <div className="space-y-4">
      {stageCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stageCounts.map((s) => (
            <span key={s.value} className={`rounded-full px-3 py-1 text-xs font-medium ${s.color}`}>{tr(s.label)} · {s.n}</span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-ivory-line bg-ivory-card p-3 shadow-sm">
        <label className="min-w-[260px] flex-1">
          <span className="mb-1 block text-xs font-medium text-ink/50">{tr("Kandidaat toevoegen (uit Relaties)")}</span>
          <select className={`${input} w-full`} value={contactId} onChange={(e) => setContactId(e.target.value)}>
            <option value="">{tr("Kies een relatie...")}</option>
            {available.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <button onClick={addCandidate} disabled={!contactId} className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-ivory hover:bg-ink-soft disabled:opacity-50">
          {tr("+ Kandidaat")}
        </button>
        <p className="w-full text-xs text-ink/40">{tr("Staat de partij er nog niet tussen? Maak hem eerst aan via Partijen → + Nieuwe partij.")}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ivory-line bg-ivory-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ivory-line bg-ivory text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-3 py-2">{tr("Kandidaat")}</th>
              <th className="px-3 py-2">{tr("Fase")}</th>
              <th className="px-3 py-2">{tr("Benaderd op")}</th>
              <th className="px-3 py-2">{tr("Deadline aanbieding")}</th>
              <th className="px-3 py-2">{tr("Laatste contact")}</th>
              <th className="px-3 py-2 text-right">{tr("Aanbiedingen")}</th>
              <th className="px-3 py-2">{tr("Notities")}</th>
            </tr>
          </thead>
          <tbody>
            {bidders.rows.map((b) => (
              <CandidateRow key={b.id} b={b} bids={bids.filter((x) => x.bidder_id === b.id).length} last={data.lastContact[b.contact_id]} fmt={fmt} update={bidders.update} goBids={goBids} />
            ))}
            {bidders.rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-ink/40">{tr("Nog geen kandidaten. Voeg de partijen toe die jullie gaan benaderen.")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CandidateRow({
  b,
  bids,
  last,
  fmt,
  update,
  goBids,
}: {
  b: Bidder;
  bids: number;
  last?: string;
  fmt: (d?: string | null) => string;
  update: (id: string, patch: Partial<Bidder>) => Promise<boolean>;
  goBids: () => void;
}) {
  const tr = useT();
  const [notes, setNotes] = useState(b.notes ?? "");
  const today = new Date().toISOString().slice(0, 10);
  const late = b.deadline && b.deadline < today && !["aanbieding_ontvangen", "in_evaluatie", "geselecteerd", "afgewezen", "teruggetrokken"].includes(b.stage);
  return (
    <tr className="border-t border-ivory-line align-top">
      <td className="px-3 py-2">
        <p className="font-medium text-ink">{b.contacts?.name}</p>
        {b.contacts?.contact_name && <p className="text-xs text-ink/40">{b.contacts.contact_name}</p>}
      </td>
      <td className="px-3 py-2">
        <select className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${opt(BIDDER_STAGES, b.stage)?.color}`} value={b.stage} onChange={(e) => update(b.id, { stage: e.target.value })}>
          {BIDDER_STAGES.map((s) => (
            <option key={s.value} value={s.value}>{tr(s.label)}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2">
        <input type="date" className="rounded border border-ivory-line bg-ivory-card px-1.5 py-0.5 text-xs" value={b.invited_at ?? ""} onChange={(e) => update(b.id, { invited_at: e.target.value || null })} />
      </td>
      <td className="px-3 py-2">
        <input type="date" className={`rounded border px-1.5 py-0.5 text-xs ${late ? "border-brick text-brick" : "border-ivory-line bg-ivory-card"}`} value={b.deadline ?? ""} onChange={(e) => update(b.id, { deadline: e.target.value || null })} />
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-xs text-ink/50">{fmt(last)}</td>
      <td className="px-3 py-2 text-right">
        <button onClick={goBids} className="text-sm font-medium text-ink underline decoration-ink/20 hover:decoration-ink">{bids}</button>
      </td>
      <td className="px-3 py-2">
        <input className="w-full min-w-[160px] rounded border border-ivory-line bg-ivory-card px-2 py-1 text-xs" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== (b.notes ?? "") && update(b.id, { notes: notes.trim() || null })} />
      </td>
    </tr>
  );
}
