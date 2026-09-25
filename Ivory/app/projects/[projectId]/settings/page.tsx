import { createClient } from "@/lib/supabase/server";
import EditModal from "@/components/EditModal";
import ManagePhasesForm from "@/components/ManagePhasesForm";
import AddProjectMemberForm from "@/components/AddProjectMemberForm";
import DeleteButton from "@/components/DeleteButton";
import DeleteProjectButton from "@/components/DeleteProjectButton";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const SECTION_LABELS: Record<string, string> = {
  risks: "Risico's",
  tasks: "Taken",
  scope: "Scope",
  tracker: "Registraties",
  suppliers: "Apparatuur",
  parties: "Partijen",
  documents: "Documenten",
  budget: "Budget",
};

export default async function SettingsPage({
  params,
}: {
  params: { projectId: string };
}) {
  const supabase = createClient();
  const tr = getT();
  const projectId = params.projectId;

  const [
    { data: project },
    { data: phases },
    { data: projectMembers },
    { data: allProfiles },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, client, location, status")
      .eq("id", projectId)
      .single(),
    supabase.from("phases").select("*").eq("project_id", projectId).order("number"),
    supabase
      .from("project_members")
      .select("id, user_id, role, access_level, allowed_sections, profiles(full_name, hidden)")
      .eq("project_id", projectId),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ]);

  const memberUserIds = new Set((projectMembers ?? []).map((m: any) => m.user_id));
  const availableProfiles = (allProfiles ?? []).filter(
    (p: any) => !memberUserIds.has(p.id)
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-ink">{tr("Instellingen")}</h1>
        <p className="text-sm text-ink/50">{project?.name}</p>
      </div>

      {/* Projectgegevens */}
      <div className="rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">{tr("Projectgegevens")}</h2>
          <EditModal
            table="projects"
            id={projectId}
            title={tr("Projectgegevens bewerken")}
            initialValues={{
              name: project?.name,
              client: project?.client,
              location: project?.location,
              status: project?.status,
            }}
            fields={[
              { key: "name", label: tr("Projectnaam"), type: "text" },
              { key: "client", label: tr("Opdrachtgever"), type: "text" },
              { key: "location", label: tr("Locatie"), type: "text" },
              {
                key: "status",
                label: tr("Status"),
                type: "select",
                options: [
                  { value: "actief", label: tr("Actief") },
                  { value: "gepauzeerd", label: tr("Gepauzeerd") },
                  { value: "afgerond", label: tr("Afgerond") },
                ],
              },
            ]}
          />
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-ink/40">{tr("Naam")}</dt>
            <dd className="text-ink">{project?.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink/40">{tr("Status")}</dt>
            <dd className="text-ink">{project?.status ? tr(project.status) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink/40">{tr("Opdrachtgever")}</dt>
            <dd className="text-ink">{project?.client || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink/40">{tr("Locatie")}</dt>
            <dd className="text-ink">{project?.location || "—"}</dd>
          </div>
        </dl>
      </div>

      {/* Fasen */}
      <ManagePhasesForm projectId={projectId} phases={phases ?? []} />

      {/* Team & rechten */}
      <div className="rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">{tr("Team & rechten")}</h2>
        </div>
        <div className="mb-4 space-y-2">
          {(projectMembers ?? []).map((m: any) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-ivory-line px-3 py-2.5"
            >
              <div>
                <p className="text-sm font-medium text-ink">
                  {m.profiles?.full_name}
                  {m.role === "eigenaar" && (
                    <span className="ml-2 rounded-full bg-gold-soft px-2 py-0.5 text-xs font-medium text-gold">
                      {tr("Eigenaar")}
                    </span>
                  )}
                </p>
                <p className="text-xs text-ink/40">
                  {m.access_level === "volledig"
                    ? tr("Volledige toegang")
                    : `${tr("Beperkt")}: ${
                        (m.allowed_sections ?? [])
                          .map((s: string) => tr(SECTION_LABELS[s] ?? s))
                          .join(", ") || tr("geen onderdelen gekozen")
                      }`}
                </p>
              </div>
              {m.role !== "eigenaar" && (
                <DeleteButton
                  table="project_members"
                  id={m.id}
                  confirmText={tr("{naam} uit dit project verwijderen?", { naam: m.profiles?.full_name ?? "" })}
                />
              )}
            </div>
          ))}
          {(projectMembers ?? []).length === 0 && (
            <p className="text-sm text-ink/40">{tr("Nog geen teamleden.")}</p>
          )}
        </div>
        <AddProjectMemberForm
          projectId={projectId}
          availableProfiles={availableProfiles as any}
        />
      </div>

      {/* Gevarenzone */}
      <div className="rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
        <h2 className="mb-3 font-display text-lg text-ink/60">{tr("Gevarenzone")}</h2>
        <DeleteProjectButton
          projectId={projectId}
          projectName={project?.name ?? ""}
        />
      </div>
    </div>
  );
}
