"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";
import { REG_CATEGORIES, REG_STATUSES, colorOf, labelOf } from "@/lib/procurement/labels";
import type { Item, Pkg } from "@/lib/procurement/labels";

const input = "rounded-lg border border-ivory-line bg-ivory-card px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none";

type Filter = { search: string; category: string; status: string; packageId: string; toConfirm: boolean; showNone: boolean };

export default function ProcApprovals({ items: initial, packages }: { items: Item[]; packages: Pkg[] }) {
  const supabase = createClient();
  const tr = useT();
  const [items, setItems] = useState<Item[]>(initial);
  const [filter, setFilter] = useState<Filter>({ search: "", category: "", status: "", packageId: "", toConfirm: false, showNone: false });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pkgName = useMemo(() => new Map(packages.map((p) => [p.id, p.name])), [packages]);

  async function update(ids: string[], patch: Partial<Item>) {
    const before = items;
    const set = new Set(ids);
    setItems((list) => list.map((i) => (set.has(i.id) ? { ...i, ...patch } : i)));
    const { data, error: e } = await supabase.from("proc_items").update(patch).in("id", ids).select();
    if (e) {
      setItems(before);
      setError(tr("Opslaan mislukt: ") + e.message);
      setTimeout(() => setError(null), 6000);
      return false;
    }
    // De database past reg_status/medical_device aan; neem de opgeslagen waarden over.
    const saved = new Map((data ?? []).map((d: any) => [d.id, d]));
    setItems((list) => list.map((i) => (saved.has(i.id) ? { ...i, ...saved.get(i.id) } : i)));
    return true;
  }

  const relevant = items.filter((i) => i.reg_category !== "geen" || !i.reg_confirmed);
  const count = (f: (i: Item) => boolean) => items.filter((i) => i.reg_category !== "geen" && f(i)).length;
  const stats = [
    { key: "all", label: "Goedkeuring nodig", n: count(() => true), set: { status: "", toConfirm: false } },
    { key: "confirm", label: "Klasse te bevestigen", n: relevant.filter((i) => !i.reg_confirmed).length, set: { status: "", toConfirm: true }, warn: true },
    { key: "start", label: "Nog starten", n: count((i) => i.reg_status === "nog_starten"), set: { status: "nog_starten", toConfirm: false } },
    { key: "busy", label: "Dossier opvragen bij fabrikant", n: count((i) => i.reg_status === "dossier_opvragen"), set: { status: "dossier_opvragen", toConfirm: false } },
    { key: "sub", label: "Ingediend", n: count((i) => i.reg_status === "ingediend"), set: { status: "ingediend", toConfirm: false } },
    { key: "ok", label: "Goedgekeurd", n: count((i) => i.reg_status === "goedgekeurd"), set: { status: "goedgekeurd", toConfirm: false }, ok: true },
  ];

  const rows = useMemo(() => {
    const q = filter.search.trim().toUpperCase();
    return items.filter((i) => {
      if (i.reg_category === "geen" && i.reg_confirmed && !filter.showNone) return false;
      if (filter.category && i.reg_category !== filter.category) return false;
      if (filter.status && i.reg_status !== filter.status) return false;
      if (filter.packageId && i.package_id !== filter.packageId) return false;
      if (filter.toConfirm && i.reg_confirmed) return false;
      if (q && !`${i.item_code} ${i.description} ${i.manufacturer ?? ""} ${i.brand_model ?? ""} ${i.reg_number ?? ""}`.toUpperCase().includes(q)) return false;
      return true;
    });
  }, [items, filter]);

  const setF = (p: Partial<Filter>) => setFilter({ ...filter, ...p });
  const sel = [...selected];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gold/40 bg-gold-soft p-4 text-sm text-ink">
        {tr("De klassen zijn een voorstel op basis van de omschrijving, geen juridisch oordeel. Laat ze bevestigen door je regulatory adviseur of lokale agent. Een medisch hulpmiddel kan pas op \"Besteld\" als de goedkeuring rond is.")}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <button
            key={s.key}
            onClick={() => setF({ ...s.set, category: "" })}
            className={`rounded-xl border border-ivory-line border-l-4 bg-ivory-card p-3 text-left shadow-sm hover:border-gold ${
              s.warn && s.n ? "border-l-amber" : s.ok ? "border-l-teal" : "border-l-ink/20"
            }`}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink/50">{tr(s.label)}</p>
            <p className="mt-1 font-display text-2xl text-ink">{s.n}</p>
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-brick-soft px-3 py-2 text-sm text-brick">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-ivory-line bg-ivory-card p-3 shadow-sm">
        <input className={`${input} min-w-[200px] flex-1`} placeholder={tr("Zoek op code, omschrijving, fabrikant of registratienummer...")} value={filter.search} onChange={(e) => setF({ search: e.target.value })} />
        <select className={input} value={filter.category} onChange={(e) => setF({ category: e.target.value })}>
          <option value="">{tr("Alle klassen")}</option>
          {REG_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{tr(c.label)}</option>
          ))}
        </select>
        <select className={input} value={filter.status} onChange={(e) => setF({ status: e.target.value })}>
          <option value="">{tr("Alle statussen")}</option>
          {REG_STATUSES.filter((s) => s.value !== "niet_nodig").map((s) => (
            <option key={s.value} value={s.value}>{tr(s.label)}</option>
          ))}
        </select>
        <select className={input} value={filter.packageId} onChange={(e) => setF({ packageId: e.target.value })}>
          <option value="">{tr("Alle pakketten")}</option>
          {packages.filter((p) => items.some((i) => i.package_id === p.id && (i.reg_category !== "geen" || !i.reg_confirmed))).map((p) => (
            <option key={p.id} value={p.id}>{tr(p.name)}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-ink/70">
          <input type="checkbox" checked={filter.toConfirm} onChange={(e) => setF({ toConfirm: e.target.checked })} />
          {tr("Alleen te bevestigen")}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-ink/70">
          <input type="checkbox" checked={filter.showNone} onChange={(e) => setF({ showNone: e.target.checked })} />
          {tr("Toon ook niet-medisch")}
        </label>
        <span className="ml-auto text-xs text-ink/40">{tr("{n} van {totaal}", { n: rows.length, totaal: relevant.length })}</span>
      </div>

      {sel.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gold bg-gold-soft p-3 text-sm">
          <span className="font-medium text-ink">{tr("{n} geselecteerd", { n: sel.length })}</span>
          <button
            onClick={async () => (await update(sel, { reg_confirmed: true })) && setSelected(new Set())}
            className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-ivory hover:bg-ink-soft"
          >
            {tr("Voorstel bevestigen")}
          </button>
          <select className={input} value="" onChange={async (e) => e.target.value && (await update(sel, { reg_category: e.target.value, reg_confirmed: true })) && setSelected(new Set())}>
            <option value="">{tr("Klasse instellen...")}</option>
            {REG_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{tr(c.label)}</option>
            ))}
          </select>
          <select className={input} value="" onChange={async (e) => e.target.value && (await update(sel, { reg_status: e.target.value })) && setSelected(new Set())}>
            <option value="">{tr("Status instellen...")}</option>
            {REG_STATUSES.filter((s) => s.value !== "niet_nodig").map((s) => (
              <option key={s.value} value={s.value}>{tr(s.label)}</option>
            ))}
          </select>
          <button onClick={() => setSelected(new Set())} className="text-xs text-ink/50 hover:text-ink">{tr("Selectie wissen")}</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-ivory-line bg-ivory-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ivory-line bg-ivory text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                  onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
                />
              </th>
              <th className="px-3 py-2">{tr("Code")}</th>
              <th className="px-3 py-2">{tr("Omschrijving")}</th>
              <th className="px-3 py-2 text-right">{tr("Stuks")}</th>
              <th className="px-3 py-2">{tr("Klasse")}</th>
              <th className="px-3 py-2">{tr("Goedkeuring")}</th>
              <th className="px-3 py-2">{tr("Fabrikant / model")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <ApprovalRow
                key={i.id}
                item={i}
                pkg={i.package_id ? pkgName.get(i.package_id) : undefined}
                checked={selected.has(i.id)}
                onCheck={() =>
                  setSelected((s) => {
                    const n = new Set(s);
                    n.has(i.id) ? n.delete(i.id) : n.add(i.id);
                    return n;
                  })
                }
                open={openId === i.id}
                onToggle={() => setOpenId(openId === i.id ? null : i.id)}
                update={update}
              />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-ink/40">{tr("Geen artikelen gevonden.")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApprovalRow({
  item,
  pkg,
  checked,
  onCheck,
  open,
  onToggle,
  update,
}: {
  item: Item;
  pkg?: string;
  checked: boolean;
  onCheck: () => void;
  open: boolean;
  onToggle: () => void;
  update: (ids: string[], patch: Partial<Item>) => Promise<boolean>;
}) {
  const tr = useT();
  const needs = item.reg_category !== "geen";
  return (
    <>
      <tr className={`border-b border-ivory-line align-top ${open ? "bg-ivory" : "hover:bg-ivory/60"}`}>
        <td className="px-3 py-2">
          <input type="checkbox" checked={checked} onChange={onCheck} />
        </td>
        <td className="whitespace-nowrap px-3 py-2 text-xs text-ink/50">
          <button onClick={onToggle} className="hover:text-ink">{open ? "▾" : "▸"} {item.item_code}</button>
        </td>
        <td className="cursor-pointer px-3 py-2" onClick={onToggle}>
          <p className="text-ink/80">{item.description}</p>
          {pkg && <p className="text-xs text-ink/40">{tr(pkg)}</p>}
        </td>
        <td className="px-3 py-2 text-right font-medium text-ink">{item.total_qty}</td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1">
            <select
              className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${colorOf(REG_CATEGORIES, item.reg_category)}`}
              value={item.reg_category}
              onChange={(e) => update([item.id], { reg_category: e.target.value, reg_confirmed: true })}
            >
              {REG_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{tr(c.label)}</option>
              ))}
            </select>
            {!item.reg_confirmed && (
              <button
                title={tr("Voorstel bevestigen")}
                onClick={() => update([item.id], { reg_confirmed: true })}
                className="rounded-full bg-amber-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber hover:opacity-80"
              >
                {tr("voorstel")} ✓
              </button>
            )}
          </div>
        </td>
        <td className="px-3 py-2">
          {needs ? (
            <select
              className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${colorOf(REG_STATUSES, item.reg_status)}`}
              value={item.reg_status}
              onChange={(e) => update([item.id], { reg_status: e.target.value })}
            >
              {REG_STATUSES.filter((s) => s.value !== "niet_nodig").map((s) => (
                <option key={s.value} value={s.value}>{tr(s.label)}</option>
              ))}
            </select>
          ) : (
            <span className="text-xs text-ink/40">{tr(labelOf(REG_STATUSES, "niet_nodig"))}</span>
          )}
        </td>
        <td className="px-3 py-2 text-xs text-ink/60">
          {[item.manufacturer, item.brand_model].filter(Boolean).join(" · ") || "—"}
          {item.reg_number && <p className="text-ink/40">{tr("Reg.nr.")} {item.reg_number}</p>}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-ivory-line bg-ivory">
          <td colSpan={7} className="px-4 pb-4 pt-1">
            <ApprovalDetail item={item} update={update} />
          </td>
        </tr>
      )}
    </>
  );
}

function ApprovalDetail({ item, update }: { item: Item; update: (ids: string[], patch: Partial<Item>) => Promise<boolean> }) {
  const tr = useT();
  const [f, setF] = useState({
    manufacturer: item.manufacturer ?? "",
    brand_model: item.brand_model ?? "",
    reg_authority: item.reg_authority ?? "",
    reg_number: item.reg_number ?? "",
    reg_notes: item.reg_notes ?? "",
  });

  const text = (key: keyof typeof f, label: string, placeholder = "") => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink/50">{label}</span>
      <input
        className={`${input} w-full`}
        placeholder={placeholder}
        value={f[key]}
        onChange={(e) => setF({ ...f, [key]: e.target.value })}
        onBlur={() => {
          const v = f[key].trim() || null;
          if (v !== ((item as any)[key] ?? null)) update([item.id], { [key]: v } as any);
        }}
      />
    </label>
  );

  const date = (key: "reg_submitted_at" | "reg_approved_at" | "reg_expiry", label: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink/50">{label}</span>
      <input type="date" className={`${input} w-full`} value={item[key] ?? ""} onChange={(e) => update([item.id], { [key]: e.target.value || null } as any)} />
    </label>
  );

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {text("manufacturer", tr("Fabrikant"))}
      {text("brand_model", tr("Merk / model"))}
      {text("reg_authority", tr("Instantie"), tr("bv. MOHAP / EDE"))}
      {text("reg_number", tr("Registratienummer"))}
      {date("reg_submitted_at", tr("Ingediend op"))}
      {date("reg_approved_at", tr("Goedgekeurd op"))}
      {date("reg_expiry", tr("Geldig tot"))}
      <div className="md:col-span-2">{text("reg_notes", tr("Notities goedkeuring"))}</div>
    </div>
  );
}
