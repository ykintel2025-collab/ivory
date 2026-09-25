"use client";

import { useState } from "react";
import { useLang, useT } from "@/lib/i18n/client";
import { DATE_LOCALE } from "@/lib/i18n/translate";
import { COVERAGE, coveragePct, opt } from "@/lib/tender/labels";
import type { Bid, Bidder, Coverage } from "@/lib/tender/labels";
import type { useRows } from "@/lib/useRows";
import type { TenderData } from "./TenderView";

const input = "rounded-lg border border-ivory-line bg-ivory-card px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none";
const lbl = "mb-1 block text-xs font-medium text-ink/50";
const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(/\./g, "").replace(",", ".")));

export default function TenderBids({
  data,
  bidders,
  bids,
  coverage,
  bidderName,
}: {
  data: TenderData;
  bidders: Bidder[];
  bids: ReturnType<typeof useRows<Bid>>;
  coverage: ReturnType<typeof useRows<Coverage>>;
  bidderName: (id: string) => string;
}) {
  const tr = useT();
  const locale = DATE_LOCALE[useLang()];
  const [openId, setOpenId] = useState<string | null>(null);
  const [bidderId, setBidderId] = useState("");
  const money = (n: number | null, cur = "EUR") => (n == null ? "—" : `${cur} ${n.toLocaleString(locale, { maximumFractionDigits: 0 })}`);

  async function addBid() {
    if (!bidderId) return;
    const count = bids.rows.filter((b) => b.bidder_id === bidderId).length;
    const row = await bids.add({
      project_id: data.projectId,
      bidder_id: bidderId,
      label: `${tr("Aanbieding")} ${count + 1}`,
      received_at: new Date().toISOString().slice(0, 10),
    });
    if (row) {
      setOpenId(row.id);
      setBidderId("");
    }
  }

  if (!bidders.length) {
    return <p className="text-sm text-ink/40">{tr("Voeg eerst kandidaten toe op het tabblad Kandidaten.")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-ivory-line bg-ivory-card p-3 shadow-sm">
        <label className="min-w-[240px] flex-1">
          <span className={lbl}>{tr("Nieuwe aanbieding vastleggen van")}</span>
          <select className={`${input} w-full`} value={bidderId} onChange={(e) => setBidderId(e.target.value)}>
            <option value="">{tr("Kies een kandidaat...")}</option>
            {bidders.map((b) => (
              <option key={b.id} value={b.id}>{b.contacts?.name}</option>
            ))}
          </select>
        </label>
        <button onClick={addBid} disabled={!bidderId} className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-ivory hover:bg-ink-soft disabled:opacity-50">
          {tr("+ Aanbieding")}
        </button>
      </div>

      {bids.rows.length === 0 && <p className="text-sm text-ink/40">{tr("Nog geen aanbiedingen vastgelegd.")}</p>}

      <div className="space-y-3">
        {bids.rows.map((b) => {
          const open = openId === b.id;
          const pct = coveragePct(b.id, coverage.rows, data.packages);
          return (
            <div key={b.id} className="rounded-xl border border-ivory-line bg-ivory-card shadow-sm">
              <button onClick={() => setOpenId(open ? null : b.id)} className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left">
                <div>
                  <p className="font-display text-lg text-ink">{bidderName(b.bidder_id)} <span className="text-sm text-ink/40">· {b.label}</span></p>
                  <p className="text-xs text-ink/50">
                    {money(b.total_amount, b.currency)} · {tr("dekking")} {pct}% · {b.warranty_months != null ? tr("{n} mnd garantie", { n: b.warranty_months }) : tr("garantie onbekend")} · {b.lead_time_weeks != null ? tr("{n} wk levertijd", { n: b.lead_time_weeks }) : tr("levertijd onbekend")}
                  </p>
                </div>
                <span className="text-ink/40">{open ? "▾" : "▸"}</span>
              </button>
              {open && <BidDetail data={data} bid={b} bids={bids} coverage={coverage} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BidDetail({
  data,
  bid,
  bids,
  coverage,
}: {
  data: TenderData;
  bid: Bid;
  bids: ReturnType<typeof useRows<Bid>>;
  coverage: ReturnType<typeof useRows<Coverage>>;
}) {
  const tr = useT();
  const [f, setF] = useState({
    label: bid.label,
    total_amount: bid.total_amount?.toString() ?? "",
    currency: bid.currency,
    lead_time_weeks: bid.lead_time_weeks?.toString() ?? "",
    warranty_months: bid.warranty_months?.toString() ?? "",
    service_terms: bid.service_terms ?? "",
    payment_terms: bid.payment_terms ?? "",
    notes: bid.notes ?? "",
  });
  const save = (k: keyof typeof f) => {
    let v: any = f[k].trim() === "" ? null : f[k].trim();
    if (["total_amount"].includes(k)) v = num(f[k]);
    if (["lead_time_weeks", "warranty_months"].includes(k)) v = f[k].trim() === "" ? null : parseInt(f[k], 10);
    if (typeof v === "number" && isNaN(v)) return;
    if (v !== ((bid as any)[k] ?? null)) bids.update(bid.id, { [k]: v } as any);
  };
  const text = (k: keyof typeof f, label: string, extra: any = {}) => (
    <label>
      <span className={lbl}>{label}</span>
      <input className={`${input} w-full`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} onBlur={() => save(k)} {...extra} />
    </label>
  );
  const date = (k: "received_at" | "valid_until", label: string) => (
    <label>
      <span className={lbl}>{label}</span>
      <input type="date" className={`${input} w-full`} value={bid[k] ?? ""} onChange={(e) => bids.update(bid.id, { [k]: e.target.value || null } as any)} />
    </label>
  );
  const incl = (k: "incl_installation" | "incl_training" | "incl_registration" | "incl_maintenance", label: string) => (
    <label className="flex items-center gap-1.5 text-sm text-ink/80">
      <input type="checkbox" checked={bid[k]} onChange={(e) => bids.update(bid.id, { [k]: e.target.checked } as any)} />
      {label}
    </label>
  );

  return (
    <div className="space-y-4 border-t border-ivory-line p-4">
      <div className="grid gap-3 md:grid-cols-4">
        {text("label", tr("Naam aanbieding"))}
        {text("total_amount", tr("Totaalbedrag"), { inputMode: "decimal" })}
        {text("currency", tr("Valuta"))}
        {date("received_at", tr("Ontvangen op"))}
        {date("valid_until", tr("Geldig tot"))}
        {text("lead_time_weeks", tr("Levertijd (weken)"), { inputMode: "numeric" })}
        {text("warranty_months", tr("Garantie (maanden)"), { inputMode: "numeric" })}
        <label>
          <span className={lbl}>{tr("Document (aanbieding)")}</span>
          <select className={`${input} w-full`} value={bid.document_id ?? ""} onChange={(e) => bids.update(bid.id, { document_id: e.target.value || null })}>
            <option value="">{tr("— geen —")}</option>
            {data.documents.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-4 rounded-lg bg-ivory p-3">
        <span className="text-xs font-medium text-ink/50">{tr("Inbegrepen")}:</span>
        {incl("incl_installation", tr("Installatie"))}
        {incl("incl_training", tr("Training"))}
        {incl("incl_registration", tr("Registratie VAE"))}
        {incl("incl_maintenance", tr("Onderhoud / service"))}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {text("service_terms", tr("Service & garantievoorwaarden"))}
        {text("payment_terms", tr("Betalingsvoorwaarden"))}
        {text("notes", tr("Notities"))}
      </div>

      <div>
        <h4 className="mb-2 text-sm font-medium text-ink">{tr("Dekking per categorie")}</h4>
        <div className="overflow-x-auto rounded-lg border border-ivory-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-ivory text-xs uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-3 py-2">{tr("Categorie")}</th>
                <th className="px-3 py-2 text-right">{tr("Artikelen")}</th>
                <th className="px-3 py-2">{tr("Dekking")}</th>
                <th className="px-3 py-2">{tr("Bedrag")}</th>
                <th className="px-3 py-2">{tr("Merken / opmerkingen")}</th>
              </tr>
            </thead>
            <tbody>
              {data.packages.map((p) => (
                <CoverageRow key={p.id} projectId={data.projectId} bidId={bid.id} pkg={p} row={coverage.rows.find((c) => c.bid_id === bid.id && c.package_id === p.id)} coverage={coverage} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CoverageRow({
  projectId,
  bidId,
  pkg,
  row,
  coverage,
}: {
  projectId: string;
  bidId: string;
  pkg: { id: string; name: string; items: number; qty: number };
  row?: Coverage;
  coverage: ReturnType<typeof useRows<Coverage>>;
}) {
  const tr = useT();
  const [amount, setAmount] = useState(row?.amount?.toString() ?? "");
  const [brands, setBrands] = useState(row?.brands ?? "");
  const save = (patch: Partial<Coverage>) =>
    coverage.upsert({ project_id: projectId, bid_id: bidId, package_id: pkg.id, coverage: row?.coverage ?? "onbekend", amount: row?.amount ?? null, brands: row?.brands ?? null, ...patch }, "bid_id,package_id");

  return (
    <tr className="border-t border-ivory-line">
      <td className="px-3 py-1.5 text-ink/80">{tr(pkg.name)}</td>
      <td className="px-3 py-1.5 text-right text-xs text-ink/50">{pkg.items}</td>
      <td className="px-3 py-1.5">
        <select className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${opt(COVERAGE, row?.coverage ?? "onbekend")?.color}`} value={row?.coverage ?? "onbekend"} onChange={(e) => save({ coverage: e.target.value })}>
          {COVERAGE.map((c) => (
            <option key={c.value} value={c.value}>{tr(c.label)}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-1.5">
        <input className="w-28 rounded border border-ivory-line bg-ivory-card px-2 py-0.5 text-xs" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} onBlur={() => num(amount) !== (row?.amount ?? null) && save({ amount: num(amount) })} />
      </td>
      <td className="px-3 py-1.5">
        <input className="w-full min-w-[160px] rounded border border-ivory-line bg-ivory-card px-2 py-0.5 text-xs" value={brands} onChange={(e) => setBrands(e.target.value)} onBlur={() => brands !== (row?.brands ?? "") && save({ brands: brands.trim() || null })} />
      </td>
    </tr>
  );
}
