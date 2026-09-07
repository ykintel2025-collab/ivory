import { createClient } from "@/lib/supabase/server";
import EditModal from "@/components/EditModal";
import ManagePhasesForm from "@/components/ManagePhasesForm";
import AddProjectMemberForm from "@/components/AddProjectMemberForm";
import DeleteButton from "@/components/DeleteButton";
import DeleteProjectButton from "@/components/DeleteProjectButton";

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
        <h1 className="font-display text-2xl text-ink">Instellingen</h1>
        <p className="text-sm text-ink/50">{project?.name}</p>
      </div>

      {/* Projectgegevens */}
      <div className="rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Projectgegevens</h2>
          <EditModal
            table="projects"
            id={projectId}
            title="Projectgegevens bewerken"
            initialValues={{
              name: project?.name,
              client: project?.client,
              location: project?.location,
              status: project?.status,
            }}
            fields={[
              { key: "name", label: "Projectnaam", type: "text" },
              { key: "client", label: "Opdrachtgever", type: "text" },
              { key: "location", label: "Locatie", type: "text" },
              {
                key: "status",
                label: "Status",
                type: "select",
                options: [
                  { value: "actief", label: "Actief" },
                  { value: "gepauzeerd", label: "Gepauzeerd" },
                  { value: "afgerond", label: "Afgerond" },
                ],
              },
            ]}
          />
        </div>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-ink/40">Naam</dt>
            <dd className="text-ink">{project?.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink/40">Status</dt>
            <dd className="text-ink">{project?.status}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink/40">Opdrachtgever</dt>
            <dd className="text-ink">{project?.client || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink/40">Locatie</dt>
            <dd className="text-ink">{project?.location || "—"}</dd>
          </div>
        </dl>
      </div>

      {/* Fasen */}
      <ManagePhasesForm projectId={projectId} phases={phases ?? []} />

      {/* Team & rechten */}
      <div className="rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Team & rechten</h2>
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
                      Eigenaar
                    </span>
                  )}
                </p>
                <p className="text-xs text-ink/40">
                  {m.access_level === "volledig"
                    ? "Volledige toegang"
                    : `Beperkt: ${
                        (m.allowed_sections ?? [])
                          .map((s: string) => SECTION_LABELS[s] ?? s)
                          .join(", ") || "geen onderdelen gekozen"
                      }`}
                </p>
              </div>
              {m.role !== "eigenaar" && (
                <DeleteButton
                  table="project_members"
                  id={m.id}
                  confirmText={`${m.profiles?.full_name} uit dit project verwijderen?`}
                />
              )}
            </div>
          ))}
          {(projectMembers ?? []).length === 0 && (
            <p className="text-sm text-ink/40">Nog geen teamleden.</p>
          )}
        </div>
        <AddProjectMemberForm
          projectId={projectId}
          availableProfiles={availableProfiles as any}
        />
      </div>

      {/* Gevarenzone */}
      <div className="rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
        <h2 className="mb-3 font-display text-lg text-ink/60">Gevarenzone</h2>
        <DeleteProjectButton
          projectId={projectId}
          projectName={project?.name ?? ""}
        />
      </div>
    </div>
  );
}
