"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang, useT } from "@/lib/i18n/client";
import { DATE_LOCALE } from "@/lib/i18n/translate";
import { ITEM_STATUSES, colorOf } from "@/lib/procurement/labels";
import type { DeptSummary, Item, Pkg } from "@/lib/procurement/labels";
import type { ItemFilter, ProcActions } from "./ProcurementDashboard";

const input = "rounded-lg border border-ivory-line bg-ivory-card px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none";

export default function ProcItems({
  items,
  packages,
  pkgById,
  departments,
  filter,
  setFilter,
  actions,
}: {
  items: Item[];
  packages: Pkg[];
  pkgById: Map<string, Pkg>;
  departments: DeptSummary[];
  filter: ItemFilter;
  setFilter: (f: ItemFilter) => void;
  actions: ProcActions;
}) {
  const tr = useT();
  const [openId, setOpenId] = useState<string | null>(null);
  const set = (patch: Partial<ItemFilter>) => setFilter({ ...filter, ...patch });

  const deptQty = useMemo(() => {
    const d = departments.find((x) => x.department === filter.department);
    return d ? d.qtyByItem : null;
  }, [departments, filter.department]);

  const rows = useMemo(() => {
    const q = filter.search.trim().toUpperCase();
    return items.filter((i) => {
      if (filter.packageId === "__none" ? i.package_id : filter.packageId && i.package_id !== filter.packageId) return false;
      if (filter.status && i.status !== filter.status) return false;
      if (filter.flaggedOnly && !(i.flagged || !i.package_id)) return false;
      if (deptQty && !deptQty[i.id]) return false;
      if (q && !(i.item_code.toUpperCase().includes(q) || i.description.toUpperCase().includes(q) || (i.supplier ?? "").toUpperCase().includes(q))) return false;
      return true;
    });
  }, [items, filter, deptQty]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ivory-line bg-ivory-card p-3 shadow-sm">
        <input className={`${input} min-w-[220px] flex-1`} placeholder={tr("Zoek op code, omschrijving of leverancier...")} value={filter.search} onChange={(e) => set({ search: e.target.value })} />
        <select className={input} value={filter.packageId} onChange={(e) => set({ packageId: e.target.value })}>
          <option value="">{tr("Alle pakketten")}</option>
          <option value="__none">{tr("Zonder pakket")}</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>{tr(p.name)}</option>
          ))}
        </select>
        <select className={input} value={filter.status} onChange={(e) => set({ status: e.target.value })}>
          <option value="">{tr("Alle statussen")}</option>
          {ITEM_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{tr(s.label)}</option>
          ))}
        </select>
        <select className={input} value={filter.department} onChange={(e) => set({ department: e.target.value })}>
          <option value="">{tr("Alle afdelingen")}</option>
          {departments.map((d) => (
            <option key={d.department} value={d.department}>{d.department}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-ink/70">
          <input type="checkbox" checked={filter.flaggedOnly} onChange={(e) => set({ flaggedOnly: e.target.checked })} />
          {tr("Alleen te controleren")}
        </label>
        <span className="ml-auto text-xs text-ink/40">{tr("{n} van {totaal}", { n: rows.length, totaal: items.length })}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ivory-line bg-ivory-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ivory-line bg-ivory text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-3 py-2">{tr("Code")}</th>
              <th className="px-3 py-2">{tr("Omschrijving")}</th>
              <th className="px-3 py-2 text-right">{deptQty ? tr("Stuks (afd.)") : tr("Stuks")}</th>
              <th className="px-3 py-2">{tr("Pakket")}</th>
              <th className="px-3 py-2">{tr("Status")}</th>
              <th className="px-3 py-2">{tr("Leverancier")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <ItemRow
                key={i.id}
                item={i}
                qty={deptQty ? deptQty[i.id] : i.total_qty}
                packages={packages}
                pkg={i.package_id ? pkgById.get(i.package_id) : undefined}
                open={openId === i.id}
                onToggle={() => setOpenId(openId === i.id ? null : i.id)}
                actions={actions}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/40">{tr("Geen artikelen gevonden.")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  qty,
  packages,
  pkg,
  open,
  onToggle,
  actions,
}: {
  item: Item;
  qty: number;
  packages: Pkg[];
  pkg?: Pkg;
  open: boolean;
  onToggle: () => void;
  actions: ProcActions;
}) {
  const tr = useT();
  return (
    <>
      <tr className={`border-b border-ivory-line align-top ${open ? "bg-ivory" : "hover:bg-ivory/60"}`}>
        <td className="whitespace-nowrap px-3 py-2 text-xs text-ink/50">
          <button onClick={onToggle} className="hover:text-ink" title={tr("Details tonen")}>
            {open ? "▾" : "▸"} {item.item_code}
          </button>
          {(item.flagged || !item.package_id) && <span title={tr("Automatische indeling onzeker")} className="ml-1 text-amber">⚑</span>}
          {item.medical_device && <span title={tr("Medisch hulpmiddel")} className="ml-1 text-teal">✚</span>}
        </td>
        <td className="cursor-pointer px-3 py-2 text-ink/80" onClick={onToggle}>{item.description}</td>
        <td className="px-3 py-2 text-right font-medium text-ink">{qty}</td>
        <td className="px-3 py-2">
          <select
            className="max-w-[210px] rounded-lg border border-ivory-line bg-ivory-card px-2 py-1 text-xs text-ink"
            value={item.package_id ?? ""}
            onChange={(e) => actions.updateItem(item.id, { package_id: e.target.value || null, flagged: false })}
          >
            <option value="">{tr("— geen pakket —")}</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>{tr(p.name)}</option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2">
          <select
            className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${colorOf(ITEM_STATUSES, item.status)}`}
            value={item.status}
            onChange={(e) => actions.updateItem(item.id, { status: e.target.value })}
          >
            {ITEM_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{tr(s.label)}</option>
            ))}
          </select>
        </td>
        <td className="px-3 py-2 text-xs text-ink/60">{item.supplier ?? "—"}</td>
      </tr>
      {open && (
        <tr className="border-b border-ivory-line bg-ivory">
          <td colSpan={6} className="px-4 pb-4 pt-1">
            <ItemDetail item={item} pkg={pkg} actions={actions} />
          </td>
        </tr>
      )}
    </>
  );
}

function ItemDetail({ item, pkg, actions }: { item: Item; pkg?: Pkg; actions: ProcActions }) {
  const tr = useT();
  const locale = DATE_LOCALE[useLang()];
  const supabase = createClient();
  const [rooms, setRooms] = useState<any[] | null>(null);
  const [f, setF] = useState({
    supplier: item.supplier ?? "",
    brand_model: item.brand_model ?? "",
    unit_price: item.unit_price?.toString() ?? "",
    lead_time_weeks: item.lead_time_weeks?.toString() ?? "",
    notes: item.notes ?? "",
  });

  useEffect(() => {
    supabase
      .from("proc_room_lines")
      .select("level, department, room_name, room_number, qty")
      .eq("item_id", item.id)
      .order("department")
      .order("room_number")
      .then(({ data }) => setRooms(data ?? []));
  }, [item.id]);

  function save(key: keyof typeof f) {
    const raw = f[key].trim();
    let value: any = raw === "" ? null : raw;
    if (key === "unit_price" && value !== null) value = Number(raw.replace(/\./g, "").replace(",", "."));
    if (key === "lead_time_weeks" && value !== null) value = parseInt(raw, 10);
    if (typeof value === "number" && isNaN(value)) return;
    if (value === (item as any)[key]) return;
    actions.updateItem(item.id, { [key]: value } as any);
  }

  const specs = [
    [tr("Stroom (vermogen)"), item.elec_load],
    [tr("Stroom (aansluiting)"), item.elec_req],
    [tr("Warmteafgifte"), item.heat_dissip],
    [tr("Installatie (water/afvoer/gas)"), item.mech_req],
    [tr("Belasting constructie"), item.str_load],
    [tr("Afspraak scope"), item.scope_note],
  ].filter(([, v]) => v);

  const field = (key: keyof typeof f, label: string, props: any = {}) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink/50">{label}</span>
      <input
        className={`${input} w-full`}
        value={f[key]}
        onChange={(e) => setF({ ...f, [key]: e.target.value })}
        onBlur={() => save(key)}
        {...props}
      />
    </label>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {field("supplier", tr("Leverancier"))}
          {field("brand_model", tr("Merk / model"))}
          {field("unit_price", tr("Stukprijs (EUR)"), { inputMode: "decimal" })}
          {field("lead_time_weeks", tr("Levertijd (weken)"), { inputMode: "numeric" })}
        </div>
        {field("notes", tr("Notities"))}
        <div className="flex flex-wrap gap-2 text-xs">
          <label className="flex items-center gap-1.5 text-ink/70">
            <input type="checkbox" checked={item.medical_device} onChange={(e) => actions.updateItem(item.id, { medical_device: e.target.checked })} />
            {tr("Medisch hulpmiddel (registratie nodig)")}
          </label>
          {item.unit_price != null && (
            <span className="rounded-full bg-gold-soft px-2 py-0.5 font-medium text-gold">
              {tr("Totaal")}: € {(item.unit_price * item.total_qty).toLocaleString(locale, { maximumFractionDigits: 0 })}
            </span>
          )}
          {pkg && <span className="rounded-full bg-ink/5 px-2 py-0.5 text-ink/60">{tr(pkg.name)}</span>}
        </div>
        {specs.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg border border-ivory-line bg-ivory-card p-3 text-xs">
            {specs.map(([k, v]) => (
              <div key={k as string} className="contents">
                <dt className="text-ink/40">{k}</dt>
                <dd className="text-ink/80">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-ink/50">
          {tr("Ruimtes")} ({rooms?.length ?? "…"}) · {tr("{n} afdelingen", { n: item.dept_count })}
        </p>
        <div className="max-h-64 overflow-y-auto rounded-lg border border-ivory-line bg-ivory-card">
          <table className="w-full text-left text-xs">
            <tbody>
              {(rooms ?? []).map((r, idx) => (
                <tr key={idx} className="border-b border-ivory-line last:border-0">
                  <td className="px-2 py-1 text-ink/50">{r.department}</td>
                  <td className="px-2 py-1 text-ink/80">{r.room_name}</td>
                  <td className="px-2 py-1 text-ink/40">{r.room_number}</td>
                  <td className="px-2 py-1 text-right font-medium text-ink">{r.qty}</td>
                </tr>
              ))}
              {rooms === null && (
                <tr><td className="px-2 py-2 text-ink/40">{tr("Bezig...")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
