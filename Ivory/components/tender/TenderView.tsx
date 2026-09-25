"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import { useRows } from "@/lib/useRows";
import type { Bid, Bidder, Coverage, Criterion, Offer, PackageInfo, Score } from "@/lib/tender/labels";
import TenderCandidates from "./TenderCandidates";
import TenderBids from "./TenderBids";
import TenderCompare from "./TenderCompare";
import TenderOffers from "./TenderOffers";

export type TenderData = {
  projectId: string;
  packages: PackageInfo[];
  contacts: { id: string; name: string; category: string }[];
  projectContactIds: string[];
  documents: { id: string; name: string }[];
  lastContact: Record<string, string>;
  isMaster: boolean;
};

const TABS = [
  { key: "kandidaten", label: "Kandidaten" },
  { key: "aanbiedingen", label: "Aanbiedingen" },
  { key: "vergelijking", label: "Vergelijking" },
  { key: "voorstellen", label: "Voorstellen aan opdrachtgever" },
] as const;

export default function TenderView(props: TenderData & {
  bidders: Bidder[];
  bids: Bid[];
  coverage: Coverage[];
  criteria: Criterion[];
  scores: Score[];
  offers: Offer[];
}) {
  const tr = useT();
  const [error, setError] = useState<string | null>(null);
  const fail = (msg: string) => {
    setError(tr("Opslaan mislukt: ") + msg);
    setTimeout(() => setError(null), 6000);
  };

  const bidders = useRows<Bidder>("proc_bidders", props.bidders, fail, "*, contacts(name, contact_name, contact_email)");
  const bids = useRows<Bid>("proc_bids", props.bids, fail);
  const coverage = useRows<Coverage>("proc_bid_coverage", props.coverage, fail);
  const criteria = useRows<Criterion>("proc_criteria", props.criteria, fail);
  const scores = useRows<Score>("proc_bid_scores", props.scores, fail);
  const offers = useRows<Offer>("proc_offers", props.offers, fail);

  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>(props.bidders.length ? (props.bids.length ? "vergelijking" : "aanbiedingen") : "kandidaten");
  const bidderName = (bidderId: string) => bidders.rows.find((b) => b.id === bidderId)?.contacts?.name ?? "—";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1 rounded-xl border border-ivory-line bg-ivory-card p-1 shadow-sm">
        {TABS.map((t) => {
          const n = t.key === "kandidaten" ? bidders.rows.length : t.key === "aanbiedingen" ? bids.rows.length : t.key === "voorstellen" ? offers.rows.length : null;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === t.key ? "bg-ink text-ivory" : "text-ink/60 hover:bg-ivory hover:text-ink"}`}
            >
              {tr(t.label)}{n != null ? ` (${n})` : ""}
            </button>
          );
        })}
      </div>

      {error && <p className="rounded-lg bg-brick-soft px-3 py-2 text-sm text-brick">{error}</p>}

      {tab === "kandidaten" && <TenderCandidates data={props} bidders={bidders} bids={bids.rows} goBids={() => setTab("aanbiedingen")} />}
      {tab === "aanbiedingen" && <TenderBids data={props} bidders={bidders.rows} bids={bids} coverage={coverage} bidderName={bidderName} />}
      {tab === "vergelijking" && (
        <TenderCompare data={props} bids={bids.rows} coverage={coverage.rows} criteria={criteria} scores={scores} bidderName={bidderName} />
      )}
      {tab === "voorstellen" && <TenderOffers data={props} bids={bids.rows} bidders={bidders} offers={offers} bidderName={bidderName} />}
    </div>
  );
}
