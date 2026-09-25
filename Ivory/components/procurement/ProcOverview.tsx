"use client";

import { useT } from "@/lib/i18n/client";
import { DONE_ITEM_STATUSES, ITEM_STATUSES, PACKAGE_STATUSES, colorOf, labelOf } from "@/lib/procurement/labels";
import type { DeptSummary, Item, Pkg, Supplier } from "@/lib/procurement/labels";
import type { ProcActions } from "./ProcurementDashboard";

function Stat({ label, value, sub, onClick, tone }: { label: string; value: string | number; sub?: string; onClick?: () => void; tone?: "warn" | "ok" }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-xl border border-ivory-line border-l-4 bg-ivory-card p-4 text-left shadow-sm transition ${
        tone === "warn" ? "border-l-amber" : tone === "ok" ? "border-l-teal" : "border-l-ink/20"
      } ${onClick ? "hover:border-gold" : ""}`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</p>
      <p className="mt-1 font-display text-2xl text-ink">{value}</p>
      {sub && <p className="text-xs text-ink/40">{sub}</p>}
    </button>
  );
}

export default function ProcOverview({
  items,
  packages,
  suppliers,
  departments,
  actions,
}: {
  items: Item[];
  packages: Pkg[];
  suppliers: Supplier[];
  departments: DeptSummary[];
  actions: ProcActions;
}) {
  const tr = useT();
  const totalQty = items.reduce((s, i) => s + i.total_qty, 0);
  const done = items.filter((i) => DONE_ITEM_STATUSES.has(i.status)).length;
  const flagged = items.filter((i) => i.flagged).length;
  const noPackage = items.filter((i) => !i.package_id).length;
  const withSupplier = items.filter((i) => i.supplier).length;
  const medical = items.filter((i) => i.reg_category !== "geen").length;
  const approved = items.filter((i) => i.reg_category !== "geen" && i.reg_status === "goedgekeurd").length;
  const pct = (n: number) => (items.length ? Math.round((n / items.length) * 100) : 0);

  const byStatus = ITEM_STATUSES.map((s) => ({ ...s, n: items.filter((i) => i.status === s.value).length }));

  const pkgRows = packages
    .map((p) => {
      const its = items.filter((i) => i.package_id === p.id);
      return {
        p,
        count: its.length,
        qty: its.reduce((s, i) => s + i.total_qty, 0),
        done: its.filter((i) => DONE_ITEM_STATUSES.has(i.status)).length,
        suppliers: suppliers.filter((s) => s.package_id === p.id).length,
      };
    })
    .filter((r) => r.count > 0);

  if (!items.length) {
    return <p className="text-sm text-ink/40">{tr("Nog geen stamlijst geïmporteerd.")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Stat label={tr("Artikelen")} value={items.length} sub={tr("{n} stuks", { n: totalQty })} onClick={() => actions.openItems({})} />
        <Stat label={tr("Pakketten")} value={pkgRows.length} sub={tr("{n} afdelingen", { n: departments.length })} />
        <Stat label={tr("Ingekocht")} value={`${pct(done)}%`} sub={tr("{n} gegund of verder", { n: done })} tone={done ? "ok" : undefined} />
        <Stat label={tr("Met leverancier")} value={withSupplier} sub={`${pct(withSupplier)}%`} />
        <Stat label={tr("Goedkeuring nodig")} value={medical} sub={tr("{n} goedgekeurd", { n: approved })} onClick={actions.goApprovals} tone={medical && approved === medical ? "ok" : undefined} />
        <Stat
          label={tr("Te controleren")}
          value={flagged + noPackage}
          sub={tr("indeling onzeker")}
          tone={flagged + noPackage ? "warn" : "ok"}
          onClick={flagged + noPackage ? () => actions.openItems({ flaggedOnly: true }) : undefined}
        />
      </div>

      <div className="rounded-xl border border-ivory-line bg-ivory-card p-5 shadow-sm">
        <h2 className="mb-3 font-display text-lg text-ink">{tr("Status van alle artikelen")}</h2>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-ivory">
          {byStatus.filter((s) => s.n).map((s) => (
            <div key={s.value} title={`${tr(s.label)}: ${s.n}`} className={s.color.split(" ")[0]} style={{ width: `${(s.n / items.length) * 100}%` }} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {byStatus.map((s) => (
            <button
              key={s.value}
              onClick={() => actions.openItems({ status: s.value })}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.color} hover:opacity-80`}
            >
              {tr(s.label)} · {s.n}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ivory-line bg-ivory-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ivory-line bg-ivory text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3">{tr("Pakket")}</th>
              <th className="px-4 py-3">{tr("Status")}</th>
              <th className="px-4 py-3 text-right">{tr("Artikelen")}</th>
              <th className="px-4 py-3 text-right">{tr("Stuks")}</th>
              <th className="px-4 py-3 text-right">{tr("Leveranciers")}</th>
              <th className="px-4 py-3">{tr("Voortgang")}</th>
            </tr>
          </thead>
          <tbody>
            {pkgRows.map((r) => (
              <tr key={r.p.id} onClick={() => actions.openPackage(r.p.id)} className="cursor-pointer border-b border-ivory-line hover:bg-ivory">
                <td className="px-4 py-2.5 font-medium text-ink">
                  {tr(r.p.name)}
                  {r.p.medical && <span className="ml-2 text-xs text-ink/40">{tr("medisch")}</span>}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorOf(PACKAGE_STATUSES, r.p.status)}`}>
                    {tr(labelOf(PACKAGE_STATUSES, r.p.status))}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-ink/70">{r.count}</td>
                <td className="px-4 py-2.5 text-right text-ink/70">{r.qty}</td>
                <td className="px-4 py-2.5 text-right text-ink/70">{r.suppliers}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-ivory">
                      <div className="h-1.5 rounded-full bg-teal" style={{ width: `${r.count ? (r.done / r.count) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs text-ink/40">{r.done}/{r.count}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
