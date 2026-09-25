"use client";

import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n/client";
import { DONE_ITEM_STATUSES, ITEM_STATUSES, colorOf, labelOf } from "@/lib/procurement/labels";
import type { DeptSummary, Item, Pkg } from "@/lib/procurement/labels";
import type { ProcActions } from "./ProcurementDashboard";

export default function ProcDepartments({
  items,
  pkgById,
  departments,
  actions,
}: {
  items: Item[];
  pkgById: Map<string, Pkg>;
  departments: DeptSummary[];
  actions: ProcActions;
}) {
  const tr = useT();
  const [open, setOpen] = useState<string | null>(departments[0]?.department ?? null);
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const stats = departments.map((d) => {
    const ids = Object.keys(d.qtyByItem);
    const done = ids.filter((id) => DONE_ITEM_STATUSES.has(itemById.get(id)?.status ?? "")).length;
    return { ...d, articles: ids.length, qty: ids.reduce((s, id) => s + d.qtyByItem[id], 0), done };
  });
  const current = stats.find((d) => d.department === open);

  const currentRows = current
    ? Object.entries(current.qtyByItem)
        .map(([id, qty]) => ({ item: itemById.get(id)!, qty }))
        .filter((r) => r.item)
        .sort((a, b) => {
          const pa = a.item.package_id ? pkgById.get(a.item.package_id)?.sort ?? 999 : 999;
          const pb = b.item.package_id ? pkgById.get(b.item.package_id)?.sort ?? 999 : 999;
          return pa - pb || a.item.description.localeCompare(b.item.description);
        })
    : [];

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <div className="space-y-1.5">
        {stats.map((d) => (
          <button
            key={d.department}
            onClick={() => setOpen(d.department)}
            className={`block w-full rounded-lg border px-3 py-2 text-left transition ${
              open === d.department ? "border-gold bg-gold-soft" : "border-ivory-line bg-ivory-card hover:border-gold"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink">{d.department}</span>
              <span className="text-xs text-ink/40">{d.done}/{d.articles}</span>
            </div>
            <p className="text-xs text-ink/40">
              {tr("{n} artikelen", { n: d.articles })} · {tr("{n} stuks", { n: d.qty })} · {tr("{n} ruimtes", { n: d.rooms })}
            </p>
          </button>
        ))}
      </div>

      {current && (
        <div className="rounded-xl border border-ivory-line bg-ivory-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ivory-line p-4">
            <div>
              <h2 className="font-display text-xl text-ink">{current.department}</h2>
              <p className="text-xs text-ink/40">
                {tr("{n} artikelen", { n: current.articles })} · {tr("{n} stuks", { n: current.qty })} · {tr("{n} ruimtes", { n: current.rooms })}
              </p>
            </div>
            <button
              onClick={() => actions.openItems({ department: current.department })}
              className="rounded-lg border border-ivory-line px-3 py-1.5 text-xs font-medium text-ink/70 hover:border-gold"
            >
              {tr("Open in Artikelen →")}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-ivory text-xs uppercase tracking-wide text-ink/50">
                <tr>
                  <th className="px-3 py-2">{tr("Pakket")}</th>
                  <th className="px-3 py-2">{tr("Code")}</th>
                  <th className="px-3 py-2">{tr("Omschrijving")}</th>
                  <th className="px-3 py-2 text-right">{tr("Stuks")}</th>
                  <th className="px-3 py-2">{tr("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map(({ item, qty }) => (
                  <tr key={item.id} className="border-t border-ivory-line">
                    <td className="px-3 py-1.5 text-xs text-ink/50">{item.package_id ? tr(pkgById.get(item.package_id)?.name ?? "") : "—"}</td>
                    <td className="whitespace-nowrap px-3 py-1.5 text-xs text-ink/50">{item.item_code}</td>
                    <td className="px-3 py-1.5 text-ink/80">{item.description}</td>
                    <td className="px-3 py-1.5 text-right font-medium text-ink">{qty}</td>
                    <td className="px-3 py-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorOf(ITEM_STATUSES, item.status)}`}>
                        {tr(labelOf(ITEM_STATUSES, item.status))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
