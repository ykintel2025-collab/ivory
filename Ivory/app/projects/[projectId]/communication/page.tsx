import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import CommunicationView from "@/components/communication/CommunicationView";
import { COMM_SELECT } from "@/lib/parties/labels";

export const dynamic = "force-dynamic";

export default async function CommunicationPage({ params }: { params: { projectId: string } }) {
  const supabase = createClient();
  const tr = getT();
  const projectId = params.projectId;

  const [{ data: entries }, { data: actions }, { data: parties }, { data: profiles }] = await Promise.all([
    supabase
      .from("communication_log")
      .select(COMM_SELECT)
      .eq("project_id", projectId)
      .order("contact_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("tasks")
      .select("*, contacts(name), profiles(full_name)")
      .eq("project_id", projectId)
      .neq("status", "klaar")
      .or("source.eq.communicatie,contact_id.not.is.null,waiting.eq.true")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("project_contacts").select("contact_id, contacts(name)").eq("project_id", projectId),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ]);

  const partyOptions = (parties ?? [])
    .map((p: any) => ({ id: p.contact_id, name: p.contacts?.name ?? "—" }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">{tr("Communicatie")}</h1>
        <p className="text-sm text-ink/50">
          {tr("Alle contactmomenten met partijen op één plek; afspraken worden automatisch taken")}
        </p>
      </div>
      <CommunicationView
        projectId={projectId}
        entries={(entries ?? []) as any}
        actions={(actions ?? []) as any}
        parties={partyOptions}
        profiles={profiles ?? []}
      />
    </div>
  );
}
