"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang, useT } from "@/lib/i18n/client";
import { DATE_LOCALE } from "@/lib/i18n/translate";
import { OFFER_STATUSES, opt } from "@/lib/tender/labels";
import type { Bid, Bidder, Offer } from "@/lib/tender/labels";
import type { useRows } from "@/lib/useRows";
import type { TenderData } from "./TenderView";

const input = "rounded-lg border border-ivory-line bg-ivory-card px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none";
const lbl = "mb-1 block text-xs font-medium text-ink/50";

export default function TenderOffers({
  data,
  bids,
  bidders,
  offers,
  bidderName,
}: {
  data: TenderData;
  bids: Bid[];
  bidders: ReturnType<typeof useRows<Bidder>>;
  offers: ReturnType<typeof useRows<Offer>>;
  bidderName: (id: string) => string;
}) {
  const tr = useT();
  const supabase = createClient();
  const locale = DATE_LOCALE[useLang()];
  const [f, setF] = useState({ name: "", bid_id: "", description: "" });
  const [info, setInfo] = useState<string | null>(null);
  const money = (n: number | null | undefined, cur = "EUR") => (n == null ? "—" : `${cur} ${n.toLocaleString(locale, { maximumFractionDigits: 0 })}`);
  const letter = String.fromCharCode(65 + offers.rows.length);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const name = f.name.trim() || `${tr("Voorstel")} ${letter}`;
    const row = await offers.add({ project_id: data.projectId, name, bid_id: f.bid_id || null, description: f.description.trim() || null });
    if (row) setF({ name: "", bid_id: "", description: "" });
  }

  async function setStatus(o: Offer, status: string) {
    const patch: Partial<Offer> = { status };
    const today = new Date().toISOString().slice(0, 10);
    if (status === "verstuurd" && !o.sent_at) patch.sent_at = today;
    if ((status === "gekozen" || status === "afgewezen") && !o.decided_at) patch.decided_at = today;
    if (!(await offers.update(o.id, patch))) return;

    if (status === "gekozen" && o.bid_id) {
      const bid = bids.find((b) => b.id === o.bid_id);
      const bidder = bidders.rows.find((b) => b.id === bid?.bidder_id);
      if (bidder && window.confirm(tr("{naam} aanwijzen als hoofdaannemer van dit project?", { naam: bidder.contacts?.name ?? "" }))) {
        await bidders.update(bidder.id, { stage: "geselecteerd" });
        await supabase.from("project_contacts").update({ party_role: "hoofdaannemer", status: "actief" }).eq("project_id", data.projectId).eq("contact_id", bidder.contact_id);
        setInfo(tr("{naam} is nu hoofdaannemer. Je ziet dit terug bij Partijen.", { naam: bidder.contacts?.name ?? "" }));
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ivory-line bg-ivory-card p-4 text-sm text-ink/60 shadow-sm">
        {tr("Stel één of meer voorstellen samen op basis van de aanbiedingen en leg vast wat de opdrachtgever kiest. Kiest de opdrachtgever een voorstel, dan kun je de partij direct als hoofdaannemer aanwijzen.")}
      </div>

      {info && <p className="rounded-lg bg-teal-soft px-3 py-2 text-sm text-teal">{info}</p>}

      <form onSubmit={create} className="grid items-end gap-2 rounded-xl border border-ivory-line bg-ivory-card p-3 shadow-sm md:grid-cols-[1fr_1.4fr_2fr_auto]">
        <label>
          <span className={lbl}>{tr("Naam")}</span>
          <input className={`${input} w-full`} placeholder={`${tr("Voorstel")} ${letter}`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </label>
        <label>
          <span className={lbl}>{tr("Op basis van aanbieding")}</span>
          <select className={`${input} w-full`} value={f.bid_id} onChange={(e) => setF({ ...f, bid_id: e.target.value })}>
            <option value="">{tr("— kies —")}</option>
            {bids.map((b) => (
              <option key={b.id} value={b.id}>{bidderName(b.bidder_id)} · {b.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={lbl}>{tr("Omschrijving")}</span>
          <input className={`${input} w-full`} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </label>
        <button type="submit" className="rounded-lg bg-ink px-3 py-2 text-sm font-medium text-ivory hover:bg-ink-soft">{tr("+ Voorstel")}</button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {offers.rows.map((o) => {
          const bid = bids.find((b) => b.id === o.bid_id);
          return (
            <OfferCard key={o.id} o={o} bid={bid} bidder={bid ? bidderName(bid.bidder_id) : null} money={money} locale={locale} setStatus={setStatus} update={offers.update} />
          );
        })}
        {offers.rows.length === 0 && <p className="text-sm text-ink/40">{tr("Nog geen voorstellen.")}</p>}
      </div>
    </div>
  );
}

function OfferCard({
  o,
  bid,
  bidder,
  money,
  locale,
  setStatus,
  update,
}: {
  o: Offer;
  bid?: Bid;
  bidder: string | null;
  money: (n: number | null | undefined, cur?: string) => string;
  locale: string;
  setStatus: (o: Offer, s: string) => void;
  update: (id: string, patch: Partial<Offer>) => Promise<boolean>;
}) {
  const tr = useT();
  const [notes, setNotes] = useState(o.notes ?? "");
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }) : "—");
  return (
    <div className={`rounded-xl border bg-ivory-card p-4 shadow-sm ${o.status === "gekozen" ? "border-teal" : "border-ivory-line"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg text-ink">{o.name}</p>
          <p className="text-xs text-ink/50">{bidder ? `${bidder} · ${bid?.label}` : tr("Nog geen aanbieding gekoppeld")}</p>
        </div>
        <select className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${opt(OFFER_STATUSES, o.status)?.color}`} value={o.status} onChange={(e) => setStatus(o, e.target.value)}>
          {OFFER_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{tr(s.label)}</option>
          ))}
        </select>
      </div>
      {o.description && <p className="mt-2 text-sm text-ink/70">{o.description}</p>}
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-ink/40">{tr("Bedrag aanbieding")}</dt>
          <dd className="font-medium text-ink">{money(bid?.total_amount, bid?.currency)}</dd>
        </div>
        <div>
          <dt className="text-ink/40">{tr("Verstuurd")}</dt>
          <dd className="text-ink/80">{fmt(o.sent_at)}</dd>
        </div>
        <div>
          <dt className="text-ink/40">{tr("Besluit")}</dt>
          <dd className="text-ink/80">{fmt(o.decided_at)}</dd>
        </div>
      </dl>
      <textarea
        rows={2}
        className="mt-3 w-full rounded-lg border border-ivory-line bg-ivory-card px-2.5 py-1.5 text-sm"
        placeholder={tr("Reactie opdrachtgever / notities")}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => notes !== (o.notes ?? "") && update(o.id, { notes: notes.trim() || null })}
      />
    </div>
  );
}
