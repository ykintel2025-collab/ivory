"use client";

import { useT } from "@/lib/i18n/client";

const STYLES: Record<string, string> = {
  hoog: "bg-brick-soft text-brick",
  midden: "bg-amber-soft text-amber",
  laag: "bg-teal-soft text-teal",
  open: "bg-brick-soft text-brick",
  opgelost: "bg-teal-soft text-teal",
  te_doen: "bg-ink/5 text-ink/70",
  mee_bezig: "bg-amber-soft text-amber",
  klaar: "bg-teal-soft text-teal",
  urgent: "bg-brick-soft text-brick",
  in_scope: "bg-teal-soft text-teal",
  buiten_scope: "bg-ink/5 text-ink/40",
};

const LABELS: Record<string, string> = {
  te_doen: "Te doen",
  mee_bezig: "Mee bezig",
  klaar: "Klaar",
  niet_gestart: "Niet gestart",
  in_aanvraag: "In aanvraag",
  ingediend: "Ingediend",
  goedgekeurd: "Goedgekeurd",
  afgewezen: "Afgewezen",
};

export default function Badge({ value }: { value: string }) {
  const tr = useT();
  const style = STYLES[value] ?? "bg-ink/5 text-ink/70";
  const label = LABELS[value] ?? value.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style}`}
    >
      {tr(label)}
    </span>
  );
}
