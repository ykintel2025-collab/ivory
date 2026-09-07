import { createClient } from "@/lib/supabase/server";
import GlobalShell from "@/components/GlobalShell";
import ToggleApprovedButton from "@/components/ToggleApprovedButton";
import AssignUserToProjectForm from "@/components/AssignUserToProjectForm";
import DeleteButton from "@/components/DeleteButton";

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

export default async function GlobalSettingsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profiles }, { data: allMemberships }, { data: myProjects }] =
    await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase
        .from("project_members")
        .select("id, user_id, project_id, access_level, allowed_sections, role, projects(id, name)"),
      supabase
        .from("project_members")
        .select("projects(id, name)")
        .eq("user_id", user?.id ?? ""),
    ]);

  const projectOptions = (myProjects ?? [])
    .map((m: any) => m.projects)
    .filter(Boolean);

  const membershipsByUser = new Map<string, any[]>();
  for (const m of allMemberships ?? []) {
    const list = membershipsByUser.get(m.user_id) ?? [];
    list.push(m);
    membershipsByUser.set(m.user_id, list);
  }

  return (
    <GlobalShell projects={projectOptions}>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl text-ink">Instellingen</h1>
          <p className="text-sm text-ink/50">
            Gebruikersbeheer en toegang tot al je projecten, centraal
          </p>
        </div>

        <div className="rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
          <h2 className="mb-1 font-display text-lg text-ink">Gebruikers</h2>
          <p className="mb-4 text-xs text-ink/40">
            "Geblokkeerd" ontneemt iemand toegang tot alles, ongeacht bij
            hoeveel projecten diegene staat. Nieuwe gebruikers maak je aan
            via Supabase → Authentication → Users.
          </p>
          <div className="space-y-3">
            {(profiles ?? []).map((p: any) => {
              const memberships = membershipsByUser.get(p.id) ?? [];
              const alreadyOnProjectIds = new Set(memberships.map((m) => m.project_id));
              const availableProjects = projectOptions.filter(
                (pr: any) => !alreadyOnProjectIds.has(pr.id)
              );
              return (
                <div
                  key={p.id}
                  className="rounded-lg border border-ivory-line p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-ink">
                        {p.full_name}
                        {p.id === user?.id && (
                          <span className="ml-2 text-xs text-ink/40">(jij)</span>
                        )}
                      </p>
                      <p className="text-xs text-ink/40">{p.role}</p>
                    </div>
                    <ToggleApprovedButton userId={p.id} approved={p.approved} />
                  </div>

                  <div className="mt-2 space-y-1.5">
                    {memberships.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-md bg-ivory px-2.5 py-1.5 text-xs"
                      >
                        <div>
                          <span className="font-medium text-ink">
                            {m.projects?.name}
                          </span>
                          <span className="ml-2 text-ink/40">
                            {m.role === "eigenaar"
                              ? "Eigenaar"
                              : m.access_level === "volledig"
                              ? "Volledige toegang"
                              : `Beperkt: ${
                                  (m.allowed_sections ?? [])
                                    .map((s: string) => SECTION_LABELS[s] ?? s)
                                    .join(", ") || "geen onderdelen"
                                }`}
                          </span>
                        </div>
                        {m.role !== "eigenaar" && (
                          <DeleteButton
                            table="project_members"
                            id={m.id}
                            confirmText={`${p.full_name} loskoppelen van ${m.projects?.name}?`}
                          />
                        )}
                      </div>
                    ))}
                    {memberships.length === 0 && (
                      <p className="text-xs text-ink/30">Nog aan geen enkel project gekoppeld.</p>
                    )}
                  </div>

                  <AssignUserToProjectForm
                    userId={p.id}
                    availableProjects={availableProjects}
                  />
                </div>
              );
            })}
            {(profiles ?? []).length === 0 && (
              <p className="text-sm text-ink/40">Geen gebruikers gevonden.</p>
            )}
          </div>
        </div>
      </div>
    </GlobalShell>
  );
}
