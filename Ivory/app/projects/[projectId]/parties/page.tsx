import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import PartiesView from "@/components/parties/PartiesView";

export const dynamic = "force-dynamic";

export default async function PartiesPage({ params }: { params: { projectId: string } }) {
  const supabase = createClient();
  const tr = getT();
  const projectId = params.projectId;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: parties }, { data: contacts }, { data: log }, { data: openTasks }, { data: profiles }, { data: viewer }] = await Promise.all([
    supabase.from("project_contacts").select("*, contacts(*)").eq("project_id", projectId),
    supabase.from("contacts").select("*, project_contacts(project_id, party_role, projects(id, name))").order("name"),
    supabase.from("communication_log").select("party_id, contact_date").eq("project_id", projectId).not("party_id", "is", null),
    supabase.from("tasks").select("contact_id").eq("project_id", projectId).neq("status", "klaar").not("contact_id", "is", null),
    supabase.from("profiles").select("id, full_name").order("full_name"),
    supabase.from("profiles").select("global_role").eq("id", user?.id ?? "").single(),
  ]);

  const lastContact: Record<string, string> = {};
  for (const l of log ?? []) if (!lastContact[l.party_id] || l.contact_date > lastContact[l.party_id]) lastContact[l.party_id] = l.contact_date;
  const openActions: Record<string, number> = {};
  for (const t of openTasks ?? []) openActions[t.contact_id] = (openActions[t.contact_id] ?? 0) + 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">{tr("Partijen")}</h1>
        <p className="text-sm text-ink/50">{tr("Wie is betrokken bij dit project, in welke rol, en wanneer hadden we voor het laatst contact")}</p>
      </div>
      <PartiesView
        projectId={projectId}
        parties={(parties ?? []) as any}
        contacts={(contacts ?? []) as any}
        lastContact={lastContact}
        openActions={openActions}
        profiles={profiles ?? []}
        canManage={viewer?.global_role === "master" || viewer?.global_role === "main"}
        isMaster={viewer?.global_role === "master"}
      />
    </div>
  );
}
