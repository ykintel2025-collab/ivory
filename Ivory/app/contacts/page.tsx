import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import DeleteButton from "@/components/DeleteButton";
import EditModal from "@/components/EditModal";
import GlobalShell from "@/components/GlobalShell";
import AddGlobalContactForm from "@/components/AddGlobalContactForm";
import { getMyProjects } from "@/lib/getMyProjects";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const supabase = createClient();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*, project_contacts(project_id, role, projects(id, name))")
    .order("name");

  const projects = await getMyProjects();

  return (
    <GlobalShell projects={projects}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl text-ink">
            Relaties
          </h1>
          <p className="text-sm text-ink/50">
            Alle partijen, algemeen — wijs ze per project toe vanuit de
            Partijen-pagina van dat project.
          </p>
        </div>

        <AddGlobalContactForm />

        <div className="space-y-3">
          {(contacts ?? []).map((c: any) => (
            <div
              key={c.id}
              className="relative rounded-xl border border-ivory-line bg-ivory-card p-5 shadow-sm"
            >
              <div className="absolute right-4 top-4 flex items-center gap-1">
                <EditModal
                  table="contacts"
                  id={c.id}
                  title="Relatie bewerken"
                  initialValues={{
                    name: c.name,
                    type: c.type,
                    contact_name: c.contact_name,
                    contact_email: c.contact_email,
                    contact_phone: c.contact_phone,
                    notes: c.notes,
                  }}
                  fields={[
                    { key: "name", label: "Naam", type: "text" },
                    { key: "type", label: "Type / rol algemeen", type: "text" },
                    { key: "contact_name", label: "Contactpersoon", type: "text" },
                    { key: "contact_email", label: "E-mail", type: "text" },
                    { key: "contact_phone", label: "Telefoon", type: "text" },
                    { key: "notes", label: "Notities", type: "textarea" },
                  ]}
                />
                <DeleteButton
                  table="contacts"
                  id={c.id}
                  confirmText={`${c.name} volledig verwijderen? Dit verwijdert ook de koppeling met alle projecten.`}
                />
              </div>
              <div className="pr-16">
                <p className="font-display text-lg text-ink">{c.name}</p>
                {c.type && <p className="text-xs text-ink/50">{c.type}</p>}
                {c.contact_name && (
                  <p className="mt-1 text-xs text-ink/40">
                    {c.contact_name}
                    {c.contact_email && ` · ${c.contact_email}`}
                    {c.contact_phone && ` · ${c.contact_phone}`}
                  </p>
                )}
                {c.notes && <p className="mt-2 text-xs text-ink/50">{c.notes}</p>}

                {c.project_contacts?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.project_contacts.map((pc: any) => (
                      <Link
                        key={pc.project_id}
                        href={`/projects/${pc.project_id}/parties`}
                        className="rounded-full bg-gold-soft px-2.5 py-1 text-xs font-medium text-gold hover:opacity-80"
                      >
                        {pc.projects?.name}
                        {pc.role ? ` — ${pc.role}` : ""}
                      </Link>
                    ))}
                  </div>
                )}
                {(!c.project_contacts || c.project_contacts.length === 0) && (
                  <p className="mt-3 text-xs text-ink/30">
                    Nog aan geen enkel project gekoppeld.
                  </p>
                )}
              </div>
            </div>
          ))}
          {(contacts ?? []).length === 0 && (
            <p className="text-sm text-ink/40">
              Nog geen relaties. Voeg er een toe via de Partijen-pagina van een
              project.
            </p>
          )}
        </div>
      </div>
    </GlobalShell>
  );
}
