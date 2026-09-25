"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLang, useT } from "@/lib/i18n/client";
import { DATE_LOCALE } from "@/lib/i18n/translate";
import { CONTACT_CATEGORIES, COMM_SELECT, PARTY_ROLES, PARTY_STATUSES, iconOf } from "@/lib/parties/labels";
import type { ActionTask, CommEntry, Contact, ProjectParty } from "@/lib/parties/labels";
import CommForm from "@/components/communication/CommForm";

const input = "rounded-lg border border-ivory-line bg-ivory-card px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none";
const lbl = "mb-1 block text-xs font-medium text-ink/50";

export type ContactWithProjects = Contact & { project_contacts: { project_id: string; party_role: string; projects: { id: string; name: string } | null }[] };

const colorOf = (list: { value: string; color?: string }[], v: string) => list.find((x) => x.value === v)?.color ?? "bg-ink/5 text-ink/60";
const labelOf = (list: { value: string; label: string }[], v: string) => list.find((x) => x.value === v)?.label ?? v;

export default function PartiesView({
  projectId,
  parties: initialParties,
  contacts: initialContacts,
  lastContact,
  openActions,
  profiles,
  canManage,
  isMaster,
}: {
  projectId: string | null; // null = algemene Relaties-pagina (zonder project)
  parties: ProjectParty[];
  contacts: ContactWithProjects[];
  lastContact: Record<string, string>;
  openActions: Record<string, number>;
  profiles: { id: string; full_name: string }[];
  canManage: boolean;
  isMaster: boolean;
}) {
  const tr = useT();
  const supabase = createClient();
  const router = useRouter();
  const locale = DATE_LOCALE[useLang()];
  const [parties, setParties] = useState(initialParties);
  const [contacts, setContacts] = useState(initialContacts);
  const [tab, setTab] = useState<"project" | "all">(projectId ? "project" : "all");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [panel, setPanel] = useState<string | null>(null); // contact_id
  const [adding, setAdding] = useState<"existing" | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }) : "—");
  const inProject = useMemo(() => new Set(parties.map((p) => p.contact_id)), [parties]);

  function fail(msg: string) {
    setError(msg);
    setTimeout(() => setError(null), 6000);
  }

  async function updateParty(id: string, patch: Partial<ProjectParty>) {
    setParties((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const { error: e } = await supabase.from("project_contacts").update(patch).eq("id", id);
    if (e) fail(tr("Opslaan mislukt: ") + e.message);
  }

  async function updateContact(id: string, patch: Partial<Contact>) {
    setContacts((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setParties((list) => list.map((p) => (p.contact_id === id ? { ...p, contacts: { ...p.contacts, ...patch } } : p)));
    const { error: e } = await supabase.from("contacts").update(patch).eq("id", id);
    if (e) fail(tr("Opslaan mislukt: ") + e.message);
  }

  async function addToProject(contactId: string, party_role: string) {
    if (!projectId) return;
    const { data, error: e } = await supabase
      .from("project_contacts")
      .insert({ project_id: projectId, contact_id: contactId, party_role, status: "actief" })
      .select("*, contacts(*)")
      .single();
    if (e || !data) return fail(tr("Toevoegen mislukt: ") + (e?.message ?? ""));
    setParties((list) => [...list, data as ProjectParty]);
    setAdding(null);
    router.refresh();
  }

  async function createContact(c: Partial<Contact>, party_role: string) {
    const { data, error: e } = await supabase.from("contacts").insert(c).select("*").single();
    if (e || !data) return fail(tr("Aanmaken mislukt: ") + (e?.message ?? ""));
    setContacts((list) => [...list, { ...(data as Contact), project_contacts: [] }].sort((a, b) => a.name.localeCompare(b.name)));
    if (projectId) await addToProject(data.id, party_role);
    else setAdding(null);
  }

  async function removeFromProject(p: ProjectParty) {
    if (!window.confirm(tr("{naam} loskoppelen van dit project? De relatie zelf blijft bestaan.", { naam: p.contacts.name }))) return;
    const { error: e, count } = await supabase.from("project_contacts").delete({ count: "exact" }).eq("id", p.id);
    if (e || !count) return fail(tr("Verwijderen mislukt: ") + (e?.message ?? tr("geen rechten")));
    setParties((list) => list.filter((x) => x.id !== p.id));
    setPanel(null);
  }

  const q = search.trim().toLowerCase();
  const matches = (c: Contact) => !q || `${c.name} ${c.type ?? ""} ${c.contact_name ?? ""} ${c.contact_email ?? ""} ${c.country ?? ""}`.toLowerCase().includes(q);
  const projectRows = parties
    .filter((p) => matches(p.contacts) && (!roleFilter || p.party_role === roleFilter))
    .sort((a, b) => PARTY_ROLES.findIndex((r) => r.value === a.party_role) - PARTY_ROLES.findIndex((r) => r.value === b.party_role) || a.contacts.name.localeCompare(b.contacts.name));
  const contactRows = contacts.filter((c) => matches(c) && (!roleFilter || c.category === roleFilter));

  const panelParty = parties.find((p) => p.contact_id === panel) ?? null;
  const panelContact = contacts.find((c) => c.id === panel) ?? panelParty?.contacts ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {projectId && (
          <div className="flex gap-1 rounded-xl border border-ivory-line bg-ivory-card p-1 shadow-sm">
            {(["project", "all"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setRoleFilter(""); }}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium ${tab === t ? "bg-ink text-ivory" : "text-ink/60 hover:bg-ivory"}`}
              >
                {t === "project" ? `${tr("In dit project")} (${parties.length})` : `${tr("Alle contacten")} (${contacts.length})`}
              </button>
            ))}
          </div>
        )}
        <input className={`${input} min-w-[200px] flex-1`} placeholder={tr("Zoek op naam, contactpersoon, e-mail of land...")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={input} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">{tab === "project" ? tr("Alle rollen") : tr("Alle soorten")}</option>
          {(tab === "project" ? PARTY_ROLES : CONTACT_CATEGORIES).map((r) => (
            <option key={r.value} value={r.value}>{tr(r.label)}</option>
          ))}
        </select>
        {projectId && tab === "project" && (
          <button onClick={() => setAdding(adding === "existing" ? null : "existing")} className="rounded-lg border border-ivory-line bg-ivory-card px-3 py-1.5 text-sm font-medium text-ink hover:border-gold">
            {tr("+ Bestaande relatie")}
          </button>
        )}
        {canManage && (
          <button onClick={() => setAdding(adding === "new" ? null : "new")} className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-ivory hover:bg-ink-soft">
            {tr("+ Nieuwe partij")}
          </button>
        )}
      </div>

      {error && <p className="rounded-lg bg-brick-soft px-3 py-2 text-sm text-brick">{error}</p>}

      {adding === "existing" && projectId && (
        <AddExisting contacts={contacts.filter((c) => !inProject.has(c.id))} onAdd={addToProject} onCancel={() => setAdding(null)} />
      )}
      {adding === "new" && <NewContact withRole={!!projectId} onCreate={createContact} onCancel={() => setAdding(null)} />}

      {tab === "project" && projectId ? (
        <div className="overflow-x-auto rounded-xl border border-ivory-line bg-ivory-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ivory-line bg-ivory text-xs uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-3 py-2">{tr("Partij")}</th>
                <th className="px-3 py-2">{tr("Rol")}</th>
                <th className="px-3 py-2">{tr("Contactpersoon")}</th>
                <th className="px-3 py-2">{tr("Status")}</th>
                <th className="px-3 py-2">{tr("Laatste contact")}</th>
                <th className="px-3 py-2 text-right">{tr("Open acties")}</th>
              </tr>
            </thead>
            <tbody>
              {projectRows.map((p) => (
                <tr key={p.id} onClick={() => setPanel(p.contact_id)} className={`cursor-pointer border-t border-ivory-line hover:bg-ivory ${panel === p.contact_id ? "bg-gold-soft" : ""}`}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-ink">{p.contacts.name}</p>
                    {(p.role || p.contacts.type) && <p className="text-xs text-ink/40">{p.role || p.contacts.type}</p>}
                  </td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <select className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${colorOf(PARTY_ROLES, p.party_role)}`} value={p.party_role} onChange={(e) => updateParty(p.id, { party_role: e.target.value })}>
                      {PARTY_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{tr(r.label)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-xs text-ink/60">
                    {p.contacts.contact_name ?? "—"}
                    {p.contacts.contact_email && <span className="block text-ink/40">{p.contacts.contact_email}</span>}
                  </td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <select className={`rounded-full border-0 px-2 py-0.5 text-xs font-medium ${colorOf(PARTY_STATUSES, p.status)}`} value={p.status} onChange={(e) => updateParty(p.id, { status: e.target.value })}>
                      {PARTY_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{tr(s.label)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-ink/50">{fmt(lastContact[p.contact_id])}</td>
                  <td className="px-3 py-2 text-right">
                    {openActions[p.contact_id] ? <span className="rounded-full bg-amber-soft px-2 py-0.5 text-xs font-medium text-amber">{openActions[p.contact_id]}</span> : <span className="text-xs text-ink/30">—</span>}
                  </td>
                </tr>
              ))}
              {projectRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink/40">{tr("Geen partijen gevonden.")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ivory-line bg-ivory-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ivory-line bg-ivory text-xs uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-3 py-2">{tr("Naam")}</th>
                <th className="px-3 py-2">{tr("Soort")}</th>
                <th className="px-3 py-2">{tr("Contactpersoon")}</th>
                <th className="px-3 py-2">{tr("Telefoon")}</th>
                <th className="px-3 py-2">{tr("Land")}</th>
                <th className="px-3 py-2">{tr("Projecten")}</th>
              </tr>
            </thead>
            <tbody>
              {contactRows.map((c) => (
                <tr key={c.id} onClick={() => setPanel(c.id)} className={`cursor-pointer border-t border-ivory-line hover:bg-ivory ${panel === c.id ? "bg-gold-soft" : ""}`}>
                  <td className="px-3 py-2">
                    <p className="font-medium text-ink">{c.name}</p>
                    {c.type && <p className="text-xs text-ink/40">{c.type}</p>}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink/60">{tr(labelOf(CONTACT_CATEGORIES, c.category))}</td>
                  <td className="px-3 py-2 text-xs text-ink/60">
                    {c.contact_name ?? "—"}
                    {c.contact_email && <span className="block text-ink/40">{c.contact_email}</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-ink/60">{c.contact_phone ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-ink/60">{c.country ?? "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {c.project_contacts.map((pc) => (
                        <span key={pc.project_id} className="rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-medium text-gold">{pc.projects?.name}</span>
                      ))}
                      {projectId && !inProject.has(c.id) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); addToProject(c.id, c.category === "leverancier" ? "kandidaat" : ["opdrachtgever", "adviseur", "partner", "instantie", "financier"].includes(c.category) ? c.category : "overig"); }}
                          className="rounded-full border border-ivory-line px-2 py-0.5 text-[11px] text-ink/60 hover:border-gold"
                        >
                          {tr("+ aan dit project")}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {contactRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-ink/40">{tr("Geen contacten gevonden.")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {panelContact && (
        <PartyPanel
          key={panelContact.id}
          projectId={projectId}
          contact={panelContact}
          party={panelParty}
          profiles={profiles}
          canManage={canManage}
          isMaster={isMaster}
          fmt={fmt}
          onClose={() => setPanel(null)}
          onUpdateContact={(patch) => updateContact(panelContact.id, patch)}
          onUpdateParty={(patch) => panelParty && updateParty(panelParty.id, patch)}
          onRemove={() => panelParty && removeFromProject(panelParty)}
        />
      )}
    </div>
  );
}

function AddExisting({ contacts, onAdd, onCancel }: { contacts: Contact[]; onAdd: (id: string, role: string) => void; onCancel: () => void }) {
  const tr = useT();
  const [id, setId] = useState("");
  const [role, setRole] = useState("kandidaat");
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl border border-gold bg-gold-soft p-3">
      <label className="min-w-[240px] flex-1">
        <span className={lbl}>{tr("Relatie")}</span>
        <select className={`${input} w-full`} value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">{tr("Kies een relatie...")}</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}{c.type ? ` (${c.type})` : ""}</option>
          ))}
        </select>
      </label>
      <label>
        <span className={lbl}>{tr("Rol in dit project")}</span>
        <select className={input} value={role} onChange={(e) => setRole(e.target.value)}>
          {PARTY_ROLES.map((r) => (
            <option key={r.value} value={r.value}>{tr(r.label)}</option>
          ))}
        </select>
      </label>
      <button disabled={!id} onClick={() => onAdd(id, role)} className="rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-ivory disabled:opacity-50">{tr("Toevoegen")}</button>
      <button onClick={onCancel} className="px-2 py-1.5 text-sm text-ink/60">{tr("Annuleren")}</button>
    </div>
  );
}

function NewContact({ withRole, onCreate, onCancel }: { withRole: boolean; onCreate: (c: Partial<Contact>, role: string) => void; onCancel: () => void }) {
  const tr = useT();
  const [f, setF] = useState({ name: "", category: "leverancier", type: "", contact_name: "", contact_email: "", contact_phone: "", country: "", website: "" });
  const [role, setRole] = useState("kandidaat");
  const field = (k: keyof typeof f, label: string, type = "text") => (
    <label>
      <span className={lbl}>{label}</span>
      <input type={type} className={`${input} w-full`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.name.trim()) return;
        const clean = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim() || null])) as any;
        clean.category = f.category;
        onCreate(clean, role);
      }}
      className="space-y-3 rounded-xl border border-gold bg-gold-soft p-4"
    >
      <div className="grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2">{field("name", tr("Naam (bedrijf of persoon)"))}</div>
        <label>
          <span className={lbl}>{tr("Soort")}</span>
          <select className={`${input} w-full`} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {CONTACT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{tr(c.label)}</option>
            ))}
          </select>
        </label>
        {withRole ? (
          <label>
            <span className={lbl}>{tr("Rol in dit project")}</span>
            <select className={`${input} w-full`} value={role} onChange={(e) => setRole(e.target.value)}>
              {PARTY_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{tr(r.label)}</option>
              ))}
            </select>
          </label>
        ) : (
          field("type", tr("Omschrijving / sector"))
        )}
        {field("contact_name", tr("Contactpersoon"))}
        {field("contact_email", tr("E-mail"), "email")}
        {field("contact_phone", tr("Telefoon"))}
        {field("country", tr("Land"))}
      </div>
      <div className="flex gap-2">
        <button type="submit" className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-soft">{tr("Aanmaken")}</button>
        <button type="button" onClick={onCancel} className="px-3 py-2 text-sm text-ink/60">{tr("Annuleren")}</button>
      </div>
    </form>
  );
}

function PartyPanel({
  projectId,
  contact,
  party,
  profiles,
  canManage,
  isMaster,
  fmt,
  onClose,
  onUpdateContact,
  onUpdateParty,
  onRemove,
}: {
  projectId: string | null;
  contact: Contact;
  party: ProjectParty | null;
  profiles: { id: string; full_name: string }[];
  canManage: boolean;
  isMaster: boolean;
  fmt: (d?: string) => string;
  onClose: () => void;
  onUpdateContact: (patch: Partial<Contact>) => void;
  onUpdateParty: (patch: Partial<ProjectParty>) => void;
  onRemove: () => void;
}) {
  const tr = useT();
  const supabase = createClient();
  const [log, setLog] = useState<CommEntry[] | null>(null);
  const [tasks, setTasks] = useState<ActionTask[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({
    contact_name: contact.contact_name ?? "",
    contact_email: contact.contact_email ?? "",
    contact_phone: contact.contact_phone ?? "",
    website: contact.website ?? "",
    country: contact.country ?? "",
    notes: contact.notes ?? "",
  });
  const [roleText, setRoleText] = useState(party?.role ?? "");
  const [partyNotes, setPartyNotes] = useState(party?.notes ?? "");

  useEffect(() => {
    let qLog = supabase.from("communication_log").select(COMM_SELECT).eq("party_id", contact.id).order("contact_date", { ascending: false }).limit(50);
    let qTasks = supabase.from("tasks").select("*, contacts(name), profiles(full_name)").eq("contact_id", contact.id).neq("status", "klaar");
    if (projectId) { qLog = qLog.eq("project_id", projectId); qTasks = qTasks.eq("project_id", projectId); }
    qLog.then(({ data }) => setLog((data ?? []) as any));
    qTasks.then(({ data }) => setTasks((data ?? []) as any));
  }, [contact.id]);

  const blur = (k: keyof typeof f) => {
    const v = f[k].trim() || null;
    if (v !== ((contact as any)[k] ?? null)) onUpdateContact({ [k]: v } as any);
  };

  const phoneDigits = (contact.contact_phone ?? "").replace(/[^0-9]/g, "");

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/30" onClick={onClose}>
      <aside onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-xl overflow-y-auto bg-ivory p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="font-display text-xl text-ink">{contact.name}</h2>
            <p className="text-xs text-ink/50">{tr(labelOf(CONTACT_CATEGORIES, contact.category))}{contact.type ? ` · ${contact.type}` : ""}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-ink/5 px-2.5 py-1 text-ink/50 hover:bg-ink/10">✕</button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {contact.contact_email && <a href={`mailto:${contact.contact_email}`} className="rounded-md bg-ivory-card px-2.5 py-1 text-xs font-medium text-ink/70 hover:bg-ivory-line">✉ {tr("Mail")}</a>}
          {phoneDigits && <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noopener noreferrer" className="rounded-md bg-ivory-card px-2.5 py-1 text-xs font-medium text-ink/70 hover:bg-ivory-line">✆ WhatsApp</a>}
          {phoneDigits && <a href={`tel:${contact.contact_phone}`} className="rounded-md bg-ivory-card px-2.5 py-1 text-xs font-medium text-ink/70 hover:bg-ivory-line">☏ {tr("Bellen")}</a>}
          {projectId && party && (
            <button onClick={() => setShowForm((v) => !v)} className="rounded-md bg-ink px-2.5 py-1 text-xs font-medium text-ivory hover:bg-ink-soft">
              {showForm ? tr("Sluiten") : tr("+ Contactmoment")}
            </button>
          )}
        </div>

        {showForm && projectId && (
          <div className="mb-4">
            <CommForm
              projectId={projectId}
              parties={[{ id: contact.id, name: contact.name }]}
              profiles={profiles}
              defaultPartyId={contact.id}
              onSaved={(entry) => { setLog((l) => [entry, ...(l ?? [])]); setShowForm(false); }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {party && (
          <section className="mb-4 space-y-2 rounded-xl border border-ivory-line bg-ivory-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">{tr("In dit project")}</h3>
            <div className="grid grid-cols-2 gap-2">
              <label>
                <span className={lbl}>{tr("Rol")}</span>
                <select className={`${input} w-full`} value={party.party_role} onChange={(e) => onUpdateParty({ party_role: e.target.value })}>
                  {PARTY_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{tr(r.label)}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className={lbl}>{tr("Status")}</span>
                <select className={`${input} w-full`} value={party.status} onChange={(e) => onUpdateParty({ status: e.target.value })}>
                  {PARTY_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{tr(s.label)}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block">
              <span className={lbl}>{tr("Omschrijving rol")}</span>
              <input className={`${input} w-full`} value={roleText} onChange={(e) => setRoleText(e.target.value)} onBlur={() => roleText !== (party.role ?? "") && onUpdateParty({ role: roleText.trim() || null })} />
            </label>
            <label className="block">
              <span className={lbl}>{tr("Notities (dit project)")}</span>
              <textarea rows={2} className={`${input} w-full`} value={partyNotes} onChange={(e) => setPartyNotes(e.target.value)} onBlur={() => partyNotes !== (party.notes ?? "") && onUpdateParty({ notes: partyNotes.trim() || null })} />
            </label>
            {isMaster && (
              <button onClick={onRemove} className="text-xs font-medium text-brick hover:underline">{tr("Loskoppelen van dit project")}</button>
            )}
          </section>
        )}

        <section className="mb-4 space-y-2 rounded-xl border border-ivory-line bg-ivory-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">{tr("Gegevens")}</h3>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["contact_name", tr("Contactpersoon")],
                ["contact_email", tr("E-mail")],
                ["contact_phone", tr("Telefoon")],
                ["country", tr("Land")],
                ["website", tr("Website")],
              ] as [keyof typeof f, string][]
            ).map(([k, label]) => (
              <label key={k}>
                <span className={lbl}>{label}</span>
                <input disabled={!canManage} className={`${input} w-full disabled:opacity-70`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} onBlur={() => blur(k)} />
              </label>
            ))}
            <label>
              <span className={lbl}>{tr("Soort")}</span>
              <select disabled={!canManage} className={`${input} w-full disabled:opacity-70`} value={contact.category} onChange={(e) => onUpdateContact({ category: e.target.value })}>
                {CONTACT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{tr(c.label)}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block">
            <span className={lbl}>{tr("Notities")}</span>
            <textarea disabled={!canManage} rows={2} className={`${input} w-full disabled:opacity-70`} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} onBlur={() => blur("notes")} />
          </label>
        </section>

        {tasks.length > 0 && (
          <section className="mb-4 rounded-xl border border-amber/40 bg-ivory-card p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">{tr("Openstaande acties")} ({tasks.length})</h3>
            <ul className="space-y-1">
              {tasks.map((t) => (
                <li key={t.id} className="flex justify-between gap-2 text-sm">
                  <span className="text-ink">{t.waiting && <span className="mr-1 text-amber">⏳</span>}{t.title}</span>
                  <span className="shrink-0 text-xs text-ink/40">{t.due_date ? fmt(t.due_date) : ""}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-ivory-line bg-ivory-card p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">{tr("Communicatie")}</h3>
          {log === null ? (
            <p className="text-sm text-ink/40">{tr("Bezig...")}</p>
          ) : log.length === 0 ? (
            <p className="text-sm text-ink/40">{tr("Nog geen communicatie vastgelegd.")}</p>
          ) : (
            <ol className="space-y-3 border-l border-ivory-line pl-3">
              {log.map((e) => (
                <li key={e.id}>
                  <p className="text-xs text-ink/40">{iconOf(e.channel)} {fmt(e.contact_date)}{e.contact_person ? ` · ${e.contact_person}` : ""}{e.logger?.full_name ? ` · ${e.logger.full_name}` : ""}</p>
                  {e.subject && <p className="text-sm font-medium text-ink">{e.subject}</p>}
                  <p className="whitespace-pre-wrap text-sm text-ink/70">{e.summary}</p>
                  {e.follow_up && <p className={`mt-0.5 text-xs ${e.tasks?.status === "klaar" ? "text-teal" : "text-amber"}`}>→ {e.follow_up}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </aside>
    </div>
  );
}
