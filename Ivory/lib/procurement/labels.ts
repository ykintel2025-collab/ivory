// Statussen van de inkoopmodule. Waarde = opslag in de database, label = Nederlandse tekst (vertaald via tr()).

export const PACKAGE_STATUSES = [
  { value: "concept", label: "Concept", color: "bg-ink/5 text-ink/60" },
  { value: "longlist", label: "Longlist", color: "bg-amber-soft text-amber" },
  { value: "rfq", label: "Offerteaanvraag", color: "bg-amber-soft text-amber" },
  { value: "offertes", label: "Offertes ontvangen", color: "bg-gold-soft text-gold" },
  { value: "evaluatie", label: "Evaluatie", color: "bg-gold-soft text-gold" },
  { value: "gegund", label: "Gegund", color: "bg-teal-soft text-teal" },
  { value: "besteld", label: "Besteld", color: "bg-teal-soft text-teal" },
  { value: "geleverd", label: "Geleverd", color: "bg-teal-soft text-teal" },
];

export const ITEM_STATUSES = [
  { value: "te_specificeren", label: "Te specificeren", color: "bg-ink/5 text-ink/60" },
  { value: "gespecificeerd", label: "Gespecificeerd", color: "bg-amber-soft text-amber" },
  { value: "in_rfq", label: "In offerteaanvraag", color: "bg-amber-soft text-amber" },
  { value: "offerte", label: "Offerte ontvangen", color: "bg-gold-soft text-gold" },
  { value: "gegund", label: "Gegund", color: "bg-teal-soft text-teal" },
  { value: "besteld", label: "Besteld", color: "bg-teal-soft text-teal" },
  { value: "geleverd", label: "Geleverd", color: "bg-teal-soft text-teal" },
  { value: "geinstalleerd", label: "Geïnstalleerd", color: "bg-teal-soft text-teal" },
];

export const SUPPLIER_STAGES = [
  { value: "longlist", label: "Longlist", color: "bg-ink/5 text-ink/60" },
  { value: "shortlist", label: "Shortlist", color: "bg-amber-soft text-amber" },
  { value: "rfq_verstuurd", label: "Offerte aangevraagd", color: "bg-amber-soft text-amber" },
  { value: "offerte_ontvangen", label: "Offerte ontvangen", color: "bg-gold-soft text-gold" },
  { value: "afgewezen", label: "Afgewezen", color: "bg-brick-soft text-brick" },
  { value: "gegund", label: "Gegund", color: "bg-teal-soft text-teal" },
];

export function labelOf(list: { value: string; label: string }[], value: string | null | undefined): string {
  return list.find((s) => s.value === value)?.label ?? value ?? "—";
}

export function colorOf(list: { value: string; color: string }[], value: string | null | undefined): string {
  return list.find((s) => s.value === value)?.color ?? "bg-ink/5 text-ink/60";
}

// Voortgang: vanaf "gegund" telt een artikel als ingekocht.
export const DONE_ITEM_STATUSES = new Set(["gegund", "besteld", "geleverd", "geinstalleerd"]);

export type Pkg = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  sort: number;
  status: string;
  medical: boolean;
  deadline: string | null;
  notes: string | null;
};

export type Item = {
  id: string;
  package_id: string | null;
  item_code: string;
  description: string;
  family: string | null;
  total_qty: number;
  dept_count: number;
  room_count: number;
  elec_load: string | null;
  elec_req: string | null;
  heat_dissip: string | null;
  mech_req: string | null;
  str_load: string | null;
  scope_note: string | null;
  medical_device: boolean;
  flagged: boolean;
  status: string;
  supplier: string | null;
  brand_model: string | null;
  unit_price: number | null;
  currency: string;
  lead_time_weeks: number | null;
  notes: string | null;
};

export type Supplier = {
  id: string;
  package_id: string;
  name: string;
  stage: string;
  quote_amount: number | null;
  currency: string;
  quote_date: string | null;
  notes: string | null;
};

// Per afdeling: { afdeling: { item_id: aantal } } en aantal ruimtes.
export type DeptSummary = { department: string; qtyByItem: Record<string, number>; rooms: number; lines: number };
