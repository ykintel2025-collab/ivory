import { createClient } from "@/lib/supabase/server";
import DeleteButton from "@/components/DeleteButton";
import AddNewContactForm from "@/components/AddNewContactForm";
import AssignContactForm from "@/components/AssignContactForm";
import AddCommunicationLogForm from "@/components/AddCommunicationLogForm";
import EditModal from "@/components/EditModal";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/i18n/server";
import { DATE_LOCALE } from "@/lib/i18n/translate";

export const dynamic = "force-dynamic";

export default async function PartiesPage({
  params,
}: {
  params: { projectId: string };
}) {
  const supabase = createClient();
  const tr = getT();
  const dateLocale = DATE_LOCALE[getLang()];
  const projectId = params.projectId;

  const [
    { data: projectContacts },
    { data: blockers },
    { data: logs },
    { data: allContacts },
  ] = await Promise.all([
    supabase
      .from("project_contacts")
      .select("*, contacts(id, name, type, contact_name, contact_email, contact_phone)")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("external_blockers")
      .select("*, contacts(name)")
      .eq("project_id", projectId)
      .order("status"),
    supabase
      .from("communication_log")
      .select("*, contacts(name), profiles(full_name)")
      .eq("project_id", projectId)
      .order("contact_date", { ascending: false })
      .limit(10),
    supabase.from("contacts").select("id, name, type").order("name"),
  ]);

  const assignedContactIds = new Set(
    (projectContacts ?? []).map((pc: any) => pc.contact_id)
  );
  const availableContacts = (allContacts ?? []).filter(
    (c: any) => !assignedContactIds.has(c.id)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-ink">
          {tr("Partijen & Communicatie")}
        </h1>
        <p className="text-sm text-ink/50">
          {tr("Dossiers, communicatielog en openstaande externe blokkades")}
        </p>
      </div>

      {/* Wachten-op-extern-bord */}
      <div className="rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
        <h2 className="mb-4 font-display text-lg text-ink">
          {tr("Wachten op extern")}
        </h2>
        <div className="space-y-2">
          {(blockers ?? [])
            .filter((b: any) => b.status === "open")
            .map((b: any) => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-lg border border-ivory-line px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{b.title}</p>
                  <p className="text-xs text-ink/40">
                    {tr("Wacht op")}: {b.contacts?.name ?? tr("onbekend")}
                    {b.reference && ` · ${b.reference}`}
                  </p>
                </div>
                <span className="rounded-full bg-brick-soft px-2.5 py-0.5 text-xs font-medium text-brick">
                  {tr("Open")}
                </span>
              </div>
            ))}
          {(blockers ?? []).filter((b: any) => b.status === "open").length ===
            0 && (
            <p className="text-sm text-ink/40">
              {tr("Geen openstaande externe blokkades.")}
            </p>
          )}
        </div>
      </div>

      {/* Partijen */}
      <div className="rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg text-ink">
            {tr("Partijen in dit project")}
          </h2>
          <div className="flex flex-wrap gap-2">
            <AssignContactForm
              projectId={projectId}
              availableContacts={availableContacts as any}
            />
            <AddNewContactForm projectId={projectId} />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(projectContacts ?? []).map((pc: any) => (
            <div
              key={pc.id}
              className="relative rounded-lg border border-ivory-line p-3"
            >
              <div className="absolute right-2 top-2 flex items-center gap-1">
                <EditModal
                  table="project_contacts"
                  id={pc.id}
                  title={tr("{naam} — rol in dit project", { naam: pc.contacts?.name ?? "" })}
                  initialValues={{
                    role: pc.role,
                    status: pc.status,
                    notes: pc.notes,
                  }}
                  fields={[
                    { key: "role", label: tr("Rol in dit project"), type: "text" },
                    {
                      key: "status",
                      label: tr("Status"),
                      type: "select",
                      options: [
                        { value: "actief", label: tr("Actief") },
                        { value: "in gesprek", label: tr("In gesprek") },
                        { value: "inactief", label: tr("Inactief") },
                      ],
                    },
                    { key: "notes", label: tr("Notities"), type: "textarea" },
                  ]}
                />
                <DeleteButton
                  table="project_contacts"
                  id={pc.id}
                  confirmText={tr("{naam} loskoppelen van dit project? De relatie zelf blijft bestaan.", { naam: pc.contacts?.name ?? "" })}
                />
              </div>
              <div className="mb-1 flex items-center gap-2 pr-12">
                <p className="text-sm font-medium text-ink">
                  {pc.contacts?.name}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    pc.status === "actief"
                      ? "bg-teal-soft text-teal"
                      : pc.status === "in gesprek"
                      ? "bg-amber-soft text-amber"
                      : "bg-ink/5 text-ink/50"
                  }`}
                >
                  {tr(pc.status)}
                </span>
              </div>
              <p className="text-xs text-ink/50">
                {pc.role || pc.contacts?.type || tr("Geen rol opgegeven")}
              </p>
              {pc.contacts?.contact_name && (
                <p className="mt-1 text-xs text-ink/40">
                  {pc.contacts.contact_name}
                  {pc.contacts?.contact_email && ` · ${pc.contacts.contact_email}`}
                </p>
              )}
              {(pc.contacts?.contact_email || pc.contacts?.contact_phone) && (
                <div className="mt-2 flex gap-2">
                  {pc.contacts?.contact_email && (
                    <a
                      href={`mailto:${pc.contacts.contact_email}`}
                      className="rounded-md bg-ivory px-2 py-1 text-xs font-medium text-ink/70 hover:bg-ivory-line"
                    >
                      ✉ Mail
                    </a>
                  )}
                  {pc.contacts?.contact_phone && (
                    <a
                      href={`https://wa.me/${pc.contacts.contact_phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md bg-ivory px-2 py-1 text-xs font-medium text-ink/70 hover:bg-ivory-line"
                    >
                      💬 WhatsApp
                    </a>
                  )}
                </div>
              )}
              {pc.notes && (
                <p className="mt-2 text-xs text-ink/50">{pc.notes}</p>
              )}
            </div>
          ))}
          {(projectContacts ?? []).length === 0 && (
            <p className="text-sm text-ink/40">
              {tr("Nog geen partijen aan dit project gekoppeld.")}
            </p>
          )}
        </div>
      </div>

      {/* Communicatielog */}
      <div className="rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">
            {tr("Recente communicatie")}
          </h2>
        </div>
        <div className="mb-4">
          <AddCommunicationLogForm
            projectId={projectId}
            contacts={(projectContacts ?? []).map((pc: any) => ({
              contact_id: pc.contact_id,
              name: pc.contacts?.name ?? tr("Onbekend"),
            }))}
          />
        </div>
        <div className="space-y-3">
          {(logs ?? []).map((log: any) => (
            <div
              key={log.id}
              className="border-b border-ivory-line pb-3 last:border-0"
            >
              <div className="mb-1 flex items-center justify-between text-xs text-ink/40">
                <span>{log.contacts?.name ?? tr("Onbekende partij")}</span>
                <span>
                  {new Date(log.contact_date).toLocaleDateString(dateLocale)}
                </span>
              </div>
              <p className="text-sm text-ink/80">{log.summary}</p>
              {log.follow_up && (
                <p className="mt-1 text-xs text-ink/50">
                  {tr("Vervolgactie")}: {log.follow_up}
                </p>
              )}
            </div>
          ))}
          {(logs ?? []).length === 0 && (
            <p className="text-sm text-ink/40">{tr("Nog geen communicatie gelogd.")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
