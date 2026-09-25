import { createClient } from "@/lib/supabase/server";
import GlobalShell from "@/components/GlobalShell";
import PartiesView from "@/components/parties/PartiesView";
import { getMyProjects } from "@/lib/getMyProjects";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const supabase = createClient();
  const tr = getT();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: contacts }, { data: log }, { data: profiles }, { data: viewer }, projects] = await Promise.all([
    supabase.from("contacts").select("*, project_contacts(project_id, party_role, projects(id, name))").order("name"),
    supabase.from("communication_log").select("party_id, contact_date").not("party_id", "is", null),
    supabase.from("profiles").select("id, full_name").order("full_name"),
    supabase.from("profiles").select("global_role").eq("id", user?.id ?? "").single(),
    getMyProjects(),
  ]);

  const lastContact: Record<string, string> = {};
  for (const l of log ?? []) if (!lastContact[l.party_id] || l.contact_date > lastContact[l.party_id]) lastContact[l.party_id] = l.contact_date;

  return (
    <GlobalShell projects={projects}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl text-ink">{tr("Relaties")}</h1>
          <p className="text-sm text-ink/50">
            {tr("Alle contacten, over alle projecten heen. Koppel ze aan een project via Partijen in dat project.")}
          </p>
        </div>
        <PartiesView
          projectId={null}
          parties={[]}
          contacts={(contacts ?? []) as any}
          lastContact={lastContact}
          openActions={{}}
          profiles={profiles ?? []}
          canManage={viewer?.global_role === "master" || viewer?.global_role === "main"}
          isMaster={viewer?.global_role === "master"}
        />
      </div>
    </GlobalShell>
  );
}
