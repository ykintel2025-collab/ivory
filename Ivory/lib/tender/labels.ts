// Tender / aanbiedingen: vaste lijsten en typen. Waarde = database, label = Nederlands (vertaald via tr()).

export const BIDDER_STAGES = [
  { value: "benaderd", label: "Benaderd", color: "bg-ink/5 text-ink/60" },
  { value: "info_verstuurd", label: "Informatie verstuurd", color: "bg-ink/5 text-ink/70" },
  { value: "rfq_verstuurd", label: "Offerteaanvraag verstuurd", color: "bg-amber-soft text-amber" },
  { value: "vragenronde", label: "Vragenronde", color: "bg-amber-soft text-amber" },
  { value: "aanbieding_ontvangen", label: "Aanbieding ontvangen", color: "bg-gold-soft text-gold" },
  { value: "in_evaluatie", label: "In evaluatie", color: "bg-gold-soft text-gold" },
  { value: "geselecteerd", label: "Geselecteerd", color: "bg-teal-soft text-teal" },
  { value: "afgewezen", label: "Afgewezen", color: "bg-brick-soft text-brick" },
  { value: "teruggetrokken", label: "Teruggetrokken", color: "bg-ink/5 text-ink/40" },
];

export const COVERAGE = [
  { value: "volledig", label: "Volledig", color: "bg-teal-soft text-teal", factor: 1 },
  { value: "gedeeltelijk", label: "Gedeeltelijk", color: "bg-amber-soft text-amber", factor: 0.5 },
  { value: "niet", label: "Niet", color: "bg-brick-soft text-brick", factor: 0 },
  { value: "onbekend", label: "Onbekend", color: "bg-ink/5 text-ink/40", factor: 0 },
];

export const OFFER_STATUSES = [
  { value: "concept", label: "Concept", color: "bg-ink/5 text-ink/60" },
  { value: "verstuurd", label: "Verstuurd", color: "bg-amber-soft text-amber" },
  { value: "in_beraad", label: "In beraad bij opdrachtgever", color: "bg-gold-soft text-gold" },
  { value: "gekozen", label: "Gekozen", color: "bg-teal-soft text-teal" },
  { value: "afgewezen", label: "Afgewezen", color: "bg-brick-soft text-brick" },
];

// Voorbeeldcriteria om snel te beginnen (volledig aanpasbaar).
export const EXAMPLE_CRITERIA = [
  { name: "Prijs", description: "Totaalprijs en betalingsvoorwaarden", weight: 35 },
  { name: "Dekking stamlijst", description: "Welk deel van de categorieën volledig wordt geleverd", weight: 20 },
  { name: "Service & garantie", description: "Garantietermijn, onderhoud, lokale service in de VAE", weight: 15 },
  { name: "Kwaliteit / merken", description: "Aangeboden merken en modellen, certificering (CE/FDA)", weight: 15 },
  { name: "Levertijd", description: "Levertijd en planning van installatie", weight: 10 },
  { name: "Referenties", description: "Vergelijkbare ziekenhuisprojecten in de regio", weight: 5 },
];

export type Bidder = {
  id: string;
  contact_id: string;
  stage: string;
  invited_at: string | null;
  deadline: string | null;
  received_at: string | null;
  notes: string | null;
  contacts?: { name: string; contact_name: string | null; contact_email: string | null } | null;
};

export type Bid = {
  id: string;
  bidder_id: string;
  label: string;
  received_at: string | null;
  total_amount: number | null;
  currency: string;
  valid_until: string | null;
  lead_time_weeks: number | null;
  warranty_months: number | null;
  incl_installation: boolean;
  incl_training: boolean;
  incl_registration: boolean;
  incl_maintenance: boolean;
  service_terms: string | null;
  payment_terms: string | null;
  document_id: string | null;
  notes: string | null;
};

export type Coverage = { id: string; bid_id: string; package_id: string; coverage: string; amount: number | null; brands: string | null; notes: string | null };
export type Criterion = { id: string; name: string; description: string | null; weight: number; sort: number };
export type Score = { id: string; bid_id: string; criterion_id: string; score: number | null; note: string | null };
export type Offer = {
  id: string;
  name: string;
  description: string | null;
  bid_id: string | null;
  status: string;
  sent_at: string | null;
  decided_at: string | null;
  notes: string | null;
};
export type PackageInfo = { id: string; name: string; sort: number; items: number; qty: number };

export const opt = (list: { value: string; label: string; color?: string }[], v: string) => list.find((x) => x.value === v);

// Dekkingspercentage van een aanbieding, gewogen naar het aantal artikelen per categorie.
export function coveragePct(bidId: string, coverage: Coverage[], packages: PackageInfo[]): number {
  const total = packages.reduce((s, p) => s + p.items, 0);
  if (!total) return 0;
  let covered = 0;
  for (const p of packages) {
    const c = coverage.find((x) => x.bid_id === bidId && x.package_id === p.id);
    covered += p.items * (COVERAGE.find((x) => x.value === c?.coverage)?.factor ?? 0);
  }
  return Math.round((covered / total) * 100);
}

// Gewogen totaalscore (0-10) van een aanbieding over de criteria met een ingevulde score.
export function weightedScore(bidId: string, scores: Score[], criteria: Criterion[]): number | null {
  let sum = 0;
  let w = 0;
  for (const c of criteria) {
    const s = scores.find((x) => x.bid_id === bidId && x.criterion_id === c.id)?.score;
    if (s == null) continue;
    sum += s * c.weight;
    w += c.weight;
  }
  return w ? Math.round((sum / w) * 10) / 10 : null;
}
