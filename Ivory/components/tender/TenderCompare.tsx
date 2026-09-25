"use client";

import { useState } from "react";
import { useLang, useT } from "@/lib/i18n/client";
import { DATE_LOCALE } from "@/lib/i18n/translate";
import { EXAMPLE_CRITERIA, coveragePct, weightedScore } from "@/lib/tender/labels";
import type { Bid, Coverage, Criterion, Score } from "@/lib/tender/labels";
import type { useRows } from "@/lib/useRows";
import type { TenderData } from "./TenderView";

const input = "rounded-lg border border-ivory-line bg-ivory-card px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none";

export default function TenderCompare({
  data,
  bids,
  coverage,
  criteria,
  scores,
  bidderName,
}: {
  data: TenderData;
  bids: Bid[];
  coverage: Coverage[];
  criteria: ReturnType<typeof useRows<Criterion>>;
  scores: ReturnType<typeof useRows<Score>>;
  bidderName: (id: string) => string;
}) {
  const tr = useT();
  const locale = DATE_LOCALE[useLang()];
  const [newName, setNewName] = useState("");
  const crit = [...criteria.rows].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  const totalWeight = crit.reduce((s, c) => s + Number(c.weight), 0);
  const money = (n: number | null, cur = "EUR") => (n == null ? "—" : `${cur} ${n.toLocaleString(locale, { maximumFractionDigits: 0 })}`);
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }) : "—");

  const totals = bids.map((b) => weightedScore(b.id, scores.rows, crit));
  const best = Math.max(...totals.map((t) => t ?? -1));
  const lowest = Math.min(...bids.map((b) => b.total_amount ?? Infinity));

  async function addCriterion(name: string, weight = 10, description: string | null = null) {
    await criteria.add({ project_id: data.projectId, name, weight, description, sort: (crit.at(-1)?.sort ?? 0) + 10 });
  }

  async function loadExamples() {
    let sort = 10;
    for (const c of EXAMPLE_CRITERIA) {
      await criteria.add({ project_id: data.projectId, name: c.name, description: c.description, weight: c.weight, sort });
      sort += 10;
    }
  }

  const setScore = (bidId: string, criterionId: string, value: string) => {
    const v = value.trim() === "" ? null : Math.max(0, Math.min(10, Number(value.replace(",", "."))));
    if (v !== null && isNaN(v)) return;
    scores.upsert({ project_id: data.projectId, bid_id: bidId, criterion_id: criterionId, score: v }, "bid_id,criterion_id");
  };

  const check = (v: boolean) => (v ? <span className="text-teal">✓</span> : <span className="text-ink/30">✗</span>);

  return (
    <div className="space-y-5">
      {/* Criteria */}
      <div className="rounded-xl border border-ivory-line bg-ivory-card p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg text-ink">{tr("Evaluatiecriteria")}</h3>
          <span className={`text-xs ${totalWeight === 100 || !crit.length ? "text-ink/40" : "text-amber"}`}>
            {tr("Totale weging")}: {totalWeight}%{crit.length && totalWeight !== 100 ? ` · ${tr("tip: laat de weging optellen tot 100%")}` : ""}
          </span>
        </div>
        {crit.length === 0 && (
          <div className="mb-3 rounded-lg bg-ivory p-3 text-sm text-ink/60">
            {tr("Stel je eigen criteria op, of begin met een voorbeeldset die je daarna aanpast.")}{" "}
            <button onClick={loadExamples} className="font-medium text-ink underline">{tr("Voorbeeldset laden")}</button>
          </div>
        )}
        <div className="space-y-2">
          {crit.map((c) => (
            <CriterionRow key={c.id} c={c} update={criteria.update} remove={data.isMaster ? criteria.remove : undefined} />
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (newName.trim()) {
              await addCriterion(newName.trim());
              setNewName("");
            }
          }}
        >
          <input className={`${input} flex-1`} placeholder={tr("Nieuw criterium, bv. Lokale service in de VAE")} value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button type="submit" className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-ivory hover:bg-ink-soft">{tr("+ Criterium")}</button>
        </form>
      </div>

      {/* Vergelijking */}
      {bids.length === 0 ? (
        <p className="text-sm text-ink/40">{tr("Nog geen aanbiedingen om te vergelijken.")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ivory-line bg-ivory-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ivory-line bg-ivory">
              <tr>
                <th className="px-3 py-2 text-xs uppercase tracking-wide text-ink/50"></th>
                {bids.map((b, i) => (
                  <th key={b.id} className={`min-w-[170px] px-3 py-2 ${totals[i] != null && totals[i] === best ? "bg-teal-soft" : ""}`}>
                    <p className="font-display text-base text-ink">{bidderName(b.bidder_id)}</p>
                    <p className="text-xs font-normal text-ink/40">{b.label}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row label={tr("Totaalbedrag")}>
                {bids.map((b) => (
                  <td key={b.id} className={`px-3 py-2 font-medium ${b.total_amount != null && b.total_amount === lowest ? "text-teal" : "text-ink"}`}>{money(b.total_amount, b.currency)}</td>
                ))}
              </Row>
              <Row label={tr("Dekking stamlijst")}>
                {bids.map((b) => (
                  <td key={b.id} className="px-3 py-2 text-ink/80">{coveragePct(b.id, coverage, data.packages)}%</td>
                ))}
              </Row>
              <Row label={tr("Geldig tot")}>{bids.map((b) => <td key={b.id} className="px-3 py-2 text-ink/70">{fmt(b.valid_until)}</td>)}</Row>
              <Row label={tr("Levertijd")}>{bids.map((b) => <td key={b.id} className="px-3 py-2 text-ink/70">{b.lead_time_weeks != null ? tr("{n} wk", { n: b.lead_time_weeks }) : "—"}</td>)}</Row>
              <Row label={tr("Garantie")}>{bids.map((b) => <td key={b.id} className="px-3 py-2 text-ink/70">{b.warranty_months != null ? tr("{n} mnd", { n: b.warranty_months }) : "—"}</td>)}</Row>
              <Row label={tr("Installatie · Training · Registratie · Onderhoud")}>
                {bids.map((b) => (
                  <td key={b.id} className="space-x-2 px-3 py-2">{check(b.incl_installation)} {check(b.incl_training)} {check(b.incl_registration)} {check(b.incl_maintenance)}</td>
                ))}
              </Row>
              {crit.length > 0 && (
                <tr className="bg-ivory">
                  <td colSpan={bids.length + 1} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink/50">{tr("Scores (0-10)")}</td>
                </tr>
              )}
              {crit.map((c) => (
                <Row key={c.id} label={`${c.name} (${c.weight}%)`}>
                  {bids.map((b) => {
                    const s = scores.rows.find((x) => x.bid_id === b.id && x.criterion_id === c.id)?.score;
                    return (
                      <td key={b.id} className="px-3 py-1.5">
                        <input
                          key={`${b.id}-${c.id}-${s ?? ""}`}
                          defaultValue={s ?? ""}
                          inputMode="decimal"
                          className="w-16 rounded border border-ivory-line bg-ivory-card px-2 py-0.5 text-center text-sm"
                          onBlur={(e) => e.target.value !== String(s ?? "") && setScore(b.id, c.id, e.target.value)}
                        />
                      </td>
                    );
                  })}
                </Row>
              ))}
              {crit.length > 0 && (
                <tr className="border-t-2 border-ink/10">
                  <td className="px-3 py-2 font-medium text-ink">{tr("Gewogen totaalscore")}</td>
                  {bids.map((b, i) => (
                    <td key={b.id} className={`px-3 py-2 font-display text-xl ${totals[i] != null && totals[i] === best ? "text-teal" : "text-ink"}`}>
                      {totals[i] ?? "—"}
                      {totals[i] != null && <span className="text-xs text-ink/40"> / 10</span>}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-t border-ivory-line">
      <td className="whitespace-nowrap px-3 py-2 text-xs font-medium text-ink/60">{label}</td>
      {children}
    </tr>
  );
}

function CriterionRow({
  c,
  update,
  remove,
}: {
  c: Criterion;
  update: (id: string, patch: Partial<Criterion>) => Promise<boolean>;
  remove?: (id: string) => Promise<boolean>;
}) {
  const tr = useT();
  const [name, setName] = useState(c.name);
  const [desc, setDesc] = useState(c.description ?? "");
  const [weight, setWeight] = useState(String(c.weight));
  return (
    <div className="grid items-center gap-2 md:grid-cols-[1.2fr_2fr_90px_auto]">
      <input className={input} value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== c.name && update(c.id, { name: name.trim() })} />
      <input className={input} placeholder={tr("Toelichting")} value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={() => desc !== (c.description ?? "") && update(c.id, { description: desc.trim() || null })} />
      <div className="flex items-center gap-1">
        <input
          className={`${input} w-16 text-right`}
          inputMode="numeric"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onBlur={() => {
            const w = Number(weight);
            if (!isNaN(w) && w >= 0 && w !== Number(c.weight)) update(c.id, { weight: w });
          }}
        />
        <span className="text-xs text-ink/40">%</span>
      </div>
      {remove ? (
        <button onClick={() => window.confirm(tr("Criterium verwijderen? De scores op dit criterium vervallen ook.")) && remove(c.id)} className="rounded-md p-1.5 text-ink/30 hover:bg-brick-soft hover:text-brick" title={tr("Verwijderen")}>
          ✕
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
