"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import {
  DONE_ITEM_STATUSES,
  ITEM_STATUSES,
  PACKAGE_STATUSES,
  SUPPLIER_STAGES,
  colorOf,
  labelOf,
} from "@/lib/procurement/labels";
import type { Item, Pkg, Supplier } from "@/lib/procurement/labels";
import type { ProcActions } from "./ProcurementDashboard";

const input = "rounded-lg border border-ivory-line bg-ivory-card px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none";

export default function ProcPackages({
  items,
  packages,
  suppliers,
  openPackageId,
  setOpenPackageId,
  isMaster,
  actions,
}: {
  items: Item[];
  packages: Pkg[];
  suppliers: Supplier[];
  openPackageId: string | null;
  setOpenPackageId: (id: string | null) => void;
  isMaster: boolean;
  actions: ProcActions;
}) {
  const tr = useT();
  const visible = packages.filter((p) => items.some((i) => i.package_id === p.id) || p.id === openPackageId);
  const current = packages.find((p) => p.id === openPackageId) ?? null;

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <div className="space-y-2">
        {visible.map((p) => {
          const its = items.filter((i) => i.package_id === p.id);
          const done = its.filter((i) => DONE_ITEM_STATUSES.has(i.status)).length;
          const active = p.id === openPackageId;
          return (
            <button
              key={p.id}
              onClick={() => setOpenPackageId(p.id)}
              className={`block w-full rounded-xl border p-3 text-left shadow-sm transition ${
                active ? "border-gold bg-gold-soft" : "border-ivory-line bg-ivory-card hover:border-gold"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-ink">{tr(p.name)}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${colorOf(PACKAGE_STATUSES, p.status)}`}>
                  {tr(labelOf(PACKAGE_STATUSES, p.status))}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink/40">
                {tr("{n} artikelen", { n: its.length })} · {tr("{n} stuks", { n: its.reduce((s, i) => s + i.total_qty, 0) })} · {done}/{its.length} {tr("gegund")}
              </p>
            </button>
          );
        })}
      </div>

      {current ? (
        <PackageDetail
          key={current.id}
          pkg={current}
          items={items.filter((i) => i.package_id === current.id)}
          packages={packages}
          suppliers={suppliers.filter((s) => s.package_id === current.id)}
          isMaster={isMaster}
          actions={actions}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-ivory-line p-10 text-center text-sm text-ink/40">
          {tr("Kies links een pakket om de artikelen en leveranciers te beheren.")}
        </div>
      )}
    </div>
  );
}

function PackageDetail({
  pkg,
  items,
  packages,
  suppliers,
  isMaster,
  actions,
}: {
  pkg: Pkg;
  items: Item[];
  packages: Pkg[];
  suppliers: Supplier[];
  isMaster: boolean;
  actions: ProcActions;
}) {
  const tr = useT();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newSupplier, setNewSupplier] = useState("");
  const [notes, setNotes] = useState(pkg.notes ?? "");

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  async function moveSelected(packageId: string) {
    if (!packageId || !selected.size) return;
    if (await actions.updateItems([...selected], { package_id: packageId, flagged: false })) setSelected(new Set());
  }

  async function statusSelected(status: string) {
    if (!status || !selected.size) return;
    if (await actions.updateItems([...selected], { status })) setSelected(new Set());
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-ivory-line bg-ivory-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-ink">{tr(pkg.name)}</h2>
            {pkg.description && <p className="text-sm text-ink/50">{tr(pkg.description)}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-ink/50">{tr("Status")}</label>
            <select className={input} value={pkg.status} onChange={(e) => actions.updatePackage(pkg.id, { status: e.target.value })}>
              {PACKAGE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{tr(s.label)}</option>
              ))}
            </select>
            <label className="text-xs text-ink/50">{tr("Deadline")}</label>
            <input
              type="date"
              className={input}
              value={pkg.deadline ?? ""}
              onChange={(e) => actions.updatePackage(pkg.id, { deadline: e.target.value || null })}
            />
          </div>
        </div>
        <textarea
          className={`${input} mt-3 w-full`}
          rows={2}
          placeholder={tr("Notities bij dit pakket (eisen, afspraken, aandachtspunten)")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (pkg.notes ?? "") && actions.updatePackage(pkg.id, { notes })}
        />
      </div>

      {/* Leveranciers */}
      <div className="rounded-xl border border-ivory-line bg-ivory-card p-5 shadow-sm">
        <h3 className="mb-3 font-display text-lg text-ink">{tr("Leveranciers")}</h3>
        <div className="space-y-2">
          {suppliers.map((s) => (
            <SupplierRow key={s.id} s={s} isMaster={isMaster} actions={actions} />
          ))}
          {suppliers.length === 0 && <p className="text-sm text-ink/40">{tr("Nog geen leveranciers. Begin met een longlist.")}</p>}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (newSupplier.trim() && (await actions.addSupplier(pkg.id, newSupplier.trim()))) setNewSupplier("");
          }}
        >
          <input className={`${input} flex-1`} placeholder={tr("Naam leverancier")} value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} />
          <button type="submit" className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-ivory hover:bg-ink-soft">
            {tr("+ Leverancier")}
          </button>
        </form>
      </div>

      {/* Artikelen */}
      <div className="rounded-xl border border-ivory-line bg-ivory-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ivory-line p-4">
          <h3 className="font-display text-lg text-ink">{tr("Artikelen in dit pakket")} ({items.length})</h3>
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink/50">{tr("{n} geselecteerd", { n: selected.size })}</span>
              <select className={input} value="" onChange={(e) => moveSelected(e.target.value)}>
                <option value="">{tr("Verplaats naar pakket...")}</option>
                {packages.filter((p) => p.id !== pkg.id).map((p) => (
                  <option key={p.id} value={p.id}>{tr(p.name)}</option>
                ))}
              </select>
              <select className={input} value="" onChange={(e) => statusSelected(e.target.value)}>
                <option value="">{tr("Status wijzigen...")}</option>
                {ITEM_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{tr(s.label)}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ivory text-xs uppercase tracking-wide text-ink/50">
              <tr>
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.size === items.length && items.length > 0}
                    onChange={(e) => setSelected(e.target.checked ? new Set(items.map((i) => i.id)) : new Set())}
                  />
                </th>
                <th className="px-3 py-2">{tr("Code")}</th>
                <th className="px-3 py-2">{tr("Omschrijving")}</th>
                <th className="px-3 py-2 text-right">{tr("Stuks")}</th>
                <th className="px-3 py-2 text-right">{tr("Afd.")}</th>
                <th className="px-3 py-2">{tr("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-ivory-line align-top">
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-ink/50">
                    {i.item_code}
                    {i.flagged && <span title={tr("Automatische indeling onzeker")} className="ml-1 text-amber">⚑</span>}
                  </td>
                  <td className="px-3 py-2 text-ink/80">{i.description}</td>
                  <td className="px-3 py-2 text-right font-medium text-ink">{i.total_qty}</td>
                  <td className="px-3 py-2 text-right text-ink/50">{i.dept_count}</td>
                  <td className="px-3 py-2">
                    <select
                      className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${colorOf(ITEM_STATUSES, i.status)}`}
                      value={i.status}
                      onChange={(e) => actions.updateItem(i.id, { status: e.target.value })}
                    >
                      {ITEM_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{tr(s.label)}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SupplierRow({ s, isMaster, actions }: { s: Supplier; isMaster: boolean; actions: ProcActions }) {
  const tr = useT();
  const [amount, setAmount] = useState(s.quote_amount?.toString() ?? "");
  const [notes, setNotes] = useState(s.notes ?? "");

  return (
    <div className="grid items-center gap-2 rounded-lg border border-ivory-line p-2.5 md:grid-cols-[1.2fr_170px_130px_140px_1.5fr_auto]">
      <p className="text-sm font-medium text-ink">{s.name}</p>
      <select
        className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${colorOf(SUPPLIER_STAGES, s.stage)}`}
        value={s.stage}
        onChange={(e) => actions.updateSupplier(s.id, { stage: e.target.value })}
      >
        {SUPPLIER_STAGES.map((st) => (
          <option key={st.value} value={st.value}>{tr(st.label)}</option>
        ))}
      </select>
      <input
        className={input}
        inputMode="decimal"
        placeholder={tr("Offerte €")}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onBlur={() => {
          const v = amount.trim() === "" ? null : Number(amount.replace(/\./g, "").replace(",", "."));
          if (v !== s.quote_amount && (v === null || !isNaN(v))) actions.updateSupplier(s.id, { quote_amount: v });
        }}
      />
      <input
        type="date"
        className={input}
        value={s.quote_date ?? ""}
        onChange={(e) => actions.updateSupplier(s.id, { quote_date: e.target.value || null })}
      />
      <input
        className={input}
        placeholder={tr("Notities")}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => notes !== (s.notes ?? "") && actions.updateSupplier(s.id, { notes })}
      />
      {isMaster ? (
        <button
          title={tr("Verwijderen")}
          onClick={() => window.confirm(tr("{naam} verwijderen? Dit kan niet ongedaan worden gemaakt.", { naam: s.name })) && actions.deleteSupplier(s.id)}
          className="rounded-md p-1.5 text-ink/30 hover:bg-brick-soft hover:text-brick"
        >
          ✕
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}
