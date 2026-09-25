"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";
import type { DeptSummary, Item, Pkg, Supplier } from "@/lib/procurement/labels";
import ProcOverview from "./ProcOverview";
import ProcPackages from "./ProcPackages";
import ProcItems from "./ProcItems";
import ProcDepartments from "./ProcDepartments";
import ProcImport from "./ProcImport";

export type ProcActions = {
  updateItem: (id: string, patch: Partial<Item>) => Promise<boolean>;
  updateItems: (ids: string[], patch: Partial<Item>) => Promise<boolean>;
  updatePackage: (id: string, patch: Partial<Pkg>) => Promise<boolean>;
  addSupplier: (packageId: string, name: string) => Promise<boolean>;
  updateSupplier: (id: string, patch: Partial<Supplier>) => Promise<boolean>;
  deleteSupplier: (id: string) => Promise<boolean>;
  openPackage: (id: string) => void;
  openItems: (filter: Partial<ItemFilter>) => void;
  goApprovals: () => void;
};

export type ItemFilter = { search: string; packageId: string; status: string; department: string; flaggedOnly: boolean };

const TABS = ["overzicht", "pakketten", "artikelen", "afdelingen", "import"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  overzicht: "Overzicht",
  pakketten: "Pakketten",
  artikelen: "Artikelen",
  afdelingen: "Per afdeling",
  import: "Stamlijst importeren",
};

export default function ProcurementDashboard(props: {
  projectId: string;
  packages: Pkg[];
  items: Item[];
  suppliers: Supplier[];
  departments: DeptSummary[];
  documents: { id: string; name: string; created_at: string }[];
  isMaster: boolean;
}) {
  const supabase = createClient();
  const tr = useT();
  const [items, setItems] = useState<Item[]>(props.items);
  const [packages, setPackages] = useState<Pkg[]>(props.packages);
  const [suppliers, setSuppliers] = useState<Supplier[]>(props.suppliers);
  const [tab, setTab] = useState<Tab>(props.items.length ? "overzicht" : "import");
  const [openPackageId, setOpenPackageId] = useState<string | null>(null);
  const [itemFilter, setItemFilter] = useState<ItemFilter>({ search: "", packageId: "", status: "", department: "", flaggedOnly: false });
  const [error, setError] = useState<string | null>(null);

  function fail(msg: string) {
    if (msg.includes("BESTELSLOT")) msg = tr("Bestellen kan pas als de goedkeuring voor dit medisch hulpmiddel rond is. Regel dat eerst via Goedkeuringen.");
    setError(msg);
    setTimeout(() => setError(null), 6000);
    return false;
  }

  // Artikelen bijwerken: eerst direct tonen, daarna de door de database aangevulde waarden
  // overnemen (goedkeuringsstatus volgt de klasse; het bestelslot kan een wijziging weigeren).
  async function saveItems(ids: string[], patch: Partial<Item>) {
    const before = items;
    const set = new Set(ids);
    setItems((list) => list.map((i) => (set.has(i.id) ? { ...i, ...patch } : i)));
    const { data, error } = await supabase.from("proc_items").update(patch).in("id", ids).select();
    if (error) { setItems(before); return fail(tr("Opslaan mislukt: ") + error.message); }
    const saved = new Map((data ?? []).map((d: any) => [d.id, d as Item]));
    setItems((list) => list.map((i) => saved.get(i.id) ?? i));
    return true;
  }

  const actions: ProcActions = {
    updateItem: (id, patch) => saveItems([id], patch),
    updateItems: (ids, patch) => saveItems(ids, patch),
    async updatePackage(id, patch) {
      const before = packages;
      setPackages((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
      const { error } = await supabase.from("proc_packages").update(patch).eq("id", id);
      if (error) { setPackages(before); return fail(tr("Opslaan mislukt: ") + error.message); }
      return true;
    },
    async addSupplier(packageId, name) {
      const { data, error } = await supabase
        .from("proc_suppliers")
        .insert({ project_id: props.projectId, package_id: packageId, name })
        .select()
        .single();
      if (error || !data) return fail(tr("Toevoegen mislukt: ") + (error?.message ?? ""));
      setSuppliers((list) => [...list, data as Supplier]);
      return true;
    },
    async updateSupplier(id, patch) {
      const before = suppliers;
      setSuppliers((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      const { error } = await supabase.from("proc_suppliers").update(patch).eq("id", id);
      if (error) { setSuppliers(before); return fail(tr("Opslaan mislukt: ") + error.message); }
      return true;
    },
    async deleteSupplier(id) {
      const { error, count } = await supabase.from("proc_suppliers").delete({ count: "exact" }).eq("id", id);
      if (error || !count) return fail(tr("Verwijderen mislukt: ") + (error?.message ?? tr("geen rechten")));
      setSuppliers((list) => list.filter((s) => s.id !== id));
      return true;
    },
    openPackage(id) {
      setOpenPackageId(id);
      setTab("pakketten");
    },
    goApprovals() {
      window.location.href = `/projects/${props.projectId}/approvals`;
    },
    openItems(filter) {
      setItemFilter((f) => ({ search: "", packageId: "", status: "", department: "", flaggedOnly: false, ...filter }));
      setTab("artikelen");
    },
  };

  const pkgById = useMemo(() => new Map(packages.map((p) => [p.id, p])), [packages]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 rounded-xl border border-ivory-line bg-ivory-card p-1 shadow-sm">
        {TABS.filter((t) => t !== "import" || props.isMaster || !items.length).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t ? "bg-ink text-ivory" : "text-ink/60 hover:bg-ivory hover:text-ink"
            }`}
          >
            {tr(TAB_LABELS[t])}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-brick-soft px-3 py-2 text-sm text-brick">{error}</p>}

      {tab === "overzicht" && <ProcOverview items={items} packages={packages} suppliers={suppliers} departments={props.departments} actions={actions} />}
      {tab === "pakketten" && (
        <ProcPackages
          items={items}
          packages={packages}
          suppliers={suppliers}
          openPackageId={openPackageId}
          setOpenPackageId={setOpenPackageId}
          isMaster={props.isMaster}
          actions={actions}
        />
      )}
      {tab === "artikelen" && (
        <ProcItems items={items} packages={packages} pkgById={pkgById} departments={props.departments} filter={itemFilter} setFilter={setItemFilter} actions={actions} />
      )}
      {tab === "afdelingen" && <ProcDepartments items={items} pkgById={pkgById} departments={props.departments} actions={actions} />}
      {tab === "import" && <ProcImport projectId={props.projectId} documents={props.documents} isMaster={props.isMaster} hasItems={items.length > 0} />}
    </div>
  );
}
