"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLang, useT } from "@/lib/i18n/client";
import { DATE_LOCALE } from "@/lib/i18n/translate";
import { CHANNELS, DIRECTIONS, iconOf } from "@/lib/parties/labels";
import type { ActionTask, CommEntry } from "@/lib/parties/labels";
import CommForm from "./CommForm";

const input = "rounded-lg border border-ivory-line bg-ivory-card px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none";

export default function CommunicationView({
  projectId,
  entries: initialEntries,
  actions: initialActions,
  parties,
  profiles,
}: {
  projectId: string;
  entries: CommEntry[];
  actions: ActionTask[];
  parties: { id: string; name: string }[];
  profiles: { id: string; full_name: string }[];
}) {
  const supabase = createClient();
  const tr = useT();
  const locale = DATE_LOCALE[useLang()];
  const [entries, setEntries] = useState(initialEntries);
  const [actions, setActions] = useState(initialActions);
  const [showForm, setShowForm] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState({ search: "", party: "", channel: "", from: "", to: "" });

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }) : "—");
  const today = new Date().toISOString().slice(0, 10);

  async function saved(entry: CommEntry) {
    setEntries((list) => [entry, ...list].sort((a, b) => (b.contact_date + b.created_at).localeCompare(a.contact_date + a.created_at)));
    setShowForm(false);
    if (entry.task_id) {
      const { data } = await supabase.from("tasks").select("*, contacts(name), profiles(full_name)").eq("id", entry.task_id).single();
      if (data) setActions((list) => [data as ActionTask, ...list]);
    }
  }

  async function completeTask(id: string) {
    const { error } = await supabase.from("tasks").update({ status: "klaar" }).eq("id", id);
    if (!error) setActions((list) => list.filter((a) => a.id !== id));
  }

  async function toggleWaiting(a: ActionTask) {
    const { error } = await supabase.from("tasks").update({ waiting: !a.waiting }).eq("id", a.id);
    if (!error) setActions((list) => list.map((x) => (x.id === a.id ? { ...x, waiting: !a.waiting } : x)));
  }

  const recent = entries.slice(0, 6);
  const rows = useMemo(() => {
    const q = filter.search.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter.party && e.party_id !== filter.party) return false;
      if (filter.channel && e.channel !== filter.channel) return false;
      if (filter.from && e.contact_date < filter.from) return false;
      if (filter.to && e.contact_date > filter.to) return false;
      if (q && !`${e.subject ?? ""} ${e.summary} ${e.contacts?.name ?? ""} ${e.contact_person ?? ""} ${e.follow_up ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, filter]);

  const waitingActions = actions.filter((a) => a.waiting);
  const ownActions = actions.filter((a) => !a.waiting);

  return (
    <div className="space-y-6">
      {/* Bovenaan: laatste communicatie + nieuw contactmoment */}
      <div className="rounded-xl border border-ivory-line bg-ivory-card p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg text-ink">{tr("Laatste communicatie")}</h2>
          <button onClick={() => setShowForm((v) => !v)} className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-ivory hover:bg-ink-soft">
            {showForm ? tr("Sluiten") : tr("+ Contactmoment vastleggen")}
          </button>
        </div>
        {showForm && (
          <div className="mb-4">
            <CommForm projectId={projectId} parties={parties} profiles={profiles} onSaved={saved} onCancel={() => setShowForm(false)} />
          </div>
        )}
        {recent.length === 0 ? (
          <p className="text-sm text-ink/40">{tr("Nog geen communicatie vastgelegd.")}</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {recent.map((e) => (
              <button
                key={e.id}
                onClick={() => setOpenId(e.id)}
                className="rounded-lg border border-ivory-line p-3 text-left transition hover:border-gold"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-ink/40">
                  <span>{iconOf(e.channel)} {fmt(e.contact_date)} · {tr(DIRECTIONS.find((d) => d.value === e.direction)?.label ?? "")}</span>
                  {e.task_id && e.tasks?.status !== "klaar" && <span className="rounded-full bg-amber-soft px-1.5 text-amber">{tr("actie open")}</span>}
                </div>
                <p className="mt-1 truncate text-sm font-medium text-ink">{e.contacts?.name ?? tr("Intern")}</p>
                <p className="truncate text-sm text-ink/70">{e.subject || e.summary}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Openstaande acties */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ActionList title={tr("Openstaande acties (wij)")} items={ownActions} fmt={fmt} today={today} onDone={completeTask} onToggleWaiting={toggleWaiting} empty={tr("Geen openstaande acties.")} />
        <ActionList title={tr("Wacht op extern")} items={waitingActions} fmt={fmt} today={today} onDone={completeTask} onToggleWaiting={toggleWaiting} empty={tr("Nergens op aan het wachten.")} waiting />
      </div>

      {/* Volledig logboek */}
      <div className="rounded-xl border border-ivory-line bg-ivory-card shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-ivory-line p-3">
          <h2 className="mr-2 font-display text-lg text-ink">{tr("Communicatielogboek")}</h2>
          <input className={`${input} min-w-[180px] flex-1`} placeholder={tr("Zoeken...")} value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })} />
          <select className={input} value={filter.party} onChange={(e) => setFilter({ ...filter, party: e.target.value })}>
            <option value="">{tr("Alle partijen")}</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select className={input} value={filter.channel} onChange={(e) => setFilter({ ...filter, channel: e.target.value })}>
            <option value="">{tr("Alle kanalen")}</option>
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.icon} {tr(c.label)}</option>
            ))}
          </select>
          <input type="date" className={input} value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} title={tr("Vanaf")} />
          <input type="date" className={input} value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} title={tr("Tot en met")} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-ivory text-xs uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-3 py-2">{tr("Datum")}</th>
                <th className="px-3 py-2">{tr("Kanaal")}</th>
                <th className="px-3 py-2">{tr("Partij")}</th>
                <th className="px-3 py-2">{tr("Onderwerp")}</th>
                <th className="px-3 py-2">{tr("Vervolgactie")}</th>
                <th className="px-3 py-2">{tr("Door")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <FragmentRow key={e.id} e={e} open={openId === e.id} onToggle={() => setOpenId(openId === e.id ? null : e.id)} fmt={fmt} />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink/40">{tr("Geen communicatie gevonden.")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FragmentRow({ e, open, onToggle, fmt }: { e: CommEntry; open: boolean; onToggle: () => void; fmt: (d: string | null) => string }) {
  const tr = useT();
  return (
    <>
      <tr onClick={onToggle} className={`cursor-pointer border-t border-ivory-line align-top ${open ? "bg-ivory" : "hover:bg-ivory/60"}`}>
        <td className="whitespace-nowrap px-3 py-2 text-ink/60">{fmt(e.contact_date)}</td>
        <td className="whitespace-nowrap px-3 py-2 text-ink/60">
          {iconOf(e.channel)} {tr(CHANNELS.find((c) => c.value === e.channel)?.label ?? "")}
          <span className="ml-1 text-xs text-ink/40">({tr(DIRECTIONS.find((d) => d.value === e.direction)?.label ?? "")})</span>
        </td>
        <td className="px-3 py-2 font-medium text-ink">
          {e.contacts?.name ?? tr("Intern")}
          {e.contact_person && <span className="block text-xs font-normal text-ink/40">{e.contact_person}</span>}
        </td>
        <td className="px-3 py-2 text-ink/80">{e.subject || <span className="text-ink/50">{e.summary.slice(0, 80)}</span>}</td>
        <td className="px-3 py-2 text-xs">
          {e.follow_up ? (
            <span className={e.tasks?.status === "klaar" ? "text-teal" : "text-amber"}>
              {e.tasks?.status === "klaar" ? "✓ " : "● "}
              {e.follow_up}
            </span>
          ) : (
            <span className="text-ink/30">—</span>
          )}
        </td>
        <td className="px-3 py-2 text-xs text-ink/50">{e.logger?.full_name ?? "—"}</td>
      </tr>
      {open && (
        <tr className="bg-ivory">
          <td colSpan={6} className="px-4 pb-4 pt-1">
            <p className="whitespace-pre-wrap text-sm text-ink/80">{e.summary}</p>
            {e.follow_up && (
              <p className="mt-2 text-xs text-ink/50">
                {tr("Vervolgactie")}: {e.follow_up}
                {e.follow_up_due && ` · ${tr("deadline")} ${fmt(e.follow_up_due)}`}
                {e.waiting && ` · ${tr("wacht op partij")}`}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function ActionList({
  title,
  items,
  fmt,
  today,
  onDone,
  onToggleWaiting,
  empty,
  waiting,
}: {
  title: string;
  items: ActionTask[];
  fmt: (d: string | null) => string;
  today: string;
  onDone: (id: string) => void;
  onToggleWaiting: (a: ActionTask) => void;
  empty: string;
  waiting?: boolean;
}) {
  const tr = useT();
  const sorted = [...items].sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
  return (
    <div className={`rounded-xl border bg-ivory-card p-4 shadow-sm ${waiting ? "border-amber/40" : "border-ivory-line"}`}>
      <h3 className="mb-2 font-display text-base text-ink">
        {title} <span className="text-sm text-ink/40">({items.length})</span>
      </h3>
      {sorted.length === 0 ? (
        <p className="text-sm text-ink/40">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {sorted.map((a) => {
            const late = a.due_date && a.due_date < today;
            return (
              <li key={a.id} className="flex items-start gap-2 rounded-lg border border-ivory-line px-2.5 py-2">
                <button
                  onClick={() => onDone(a.id)}
                  title={tr("Markeer als klaar")}
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-ink/20 text-[10px] text-transparent hover:border-teal hover:text-teal"
                >
                  ✓
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{a.title}</p>
                  <p className="text-xs text-ink/40">
                    {a.contacts?.name ?? tr("Intern")}
                    {a.profiles?.full_name && ` · ${a.profiles.full_name}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {a.due_date && <p className={`text-xs font-medium ${late ? "text-brick" : "text-ink/50"}`}>{late ? tr("te laat") + " · " : ""}{fmt(a.due_date)}</p>}
                  <button onClick={() => onToggleWaiting(a)} className="text-[11px] text-ink/40 underline hover:text-ink">
                    {a.waiting ? tr("naar eigen acties") : tr("wacht op partij")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
