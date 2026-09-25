import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import TenderView from "@/components/tender/TenderView";
import type { PackageInfo } from "@/lib/tender/labels";

export const dynamic = "force-dynamic";

export default async function TenderPage({ params }: { params: { projectId: string } }) {
  const supabase = createClient();
  const tr = getT();
  const projectId = params.projectId;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: bidders },
    { data: bids },
    { data: coverage },
    { data: criteria },
    { data: scores },
    { data: offers },
    { data: packages },
    { data: items },
    { data: contacts },
    { data: projectContacts },
    { data: documents },
    { data: log },
    { data: viewer },
  ] = await Promise.all([
    supabase.from("proc_bidders").select("*, contacts(name, contact_name, contact_email)").eq("project_id", projectId).order("created_at"),
    supabase.from("proc_bids").select("*").eq("project_id", projectId).order("created_at"),
    supabase.from("proc_bid_coverage").select("*").eq("project_id", projectId),
    supabase.from("proc_criteria").select("*").eq("project_id", projectId).order("sort"),
    supabase.from("proc_bid_scores").select("*").eq("project_id", projectId),
    supabase.from("proc_offers").select("*").eq("project_id", projectId).order("created_at"),
    supabase.from("proc_packages").select("id, name, sort").eq("project_id", projectId).order("sort"),
    supabase.from("proc_items").select("package_id, total_qty").eq("project_id", projectId).range(0, 4999),
    supabase.from("contacts").select("id, name, category").order("name"),
    supabase.from("project_contacts").select("contact_id").eq("project_id", projectId),
    supabase.from("documents").select("id, name").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("communication_log").select("party_id, contact_date").eq("project_id", projectId).not("party_id", "is", null),
    supabase.from("profiles").select("global_role").eq("id", user?.id ?? "").single(),
  ]);

  const pkgInfo: PackageInfo[] = (packages ?? [])
    .map((p) => {
      const its = (items ?? []).filter((i) => i.package_id === p.id);
      return { id: p.id, name: p.name, sort: p.sort, items: its.length, qty: its.reduce((s, i) => s + (i.total_qty ?? 0), 0) };
    })
    .filter((p) => p.items > 0);

  const lastContact: Record<string, string> = {};
  for (const l of log ?? []) if (!lastContact[l.party_id] || l.contact_date > lastContact[l.party_id]) lastContact[l.party_id] = l.contact_date;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">{tr("Tender")}</h1>
        <p className="text-sm text-ink/50">
          {tr("Partijen benaderen, aanbiedingen vergelijken en voorstellen aan de opdrachtgever voorleggen")}
        </p>
      </div>
      <TenderView
        projectId={projectId}
        packages={pkgInfo}
        contacts={contacts ?? []}
        projectContactIds={(projectContacts ?? []).map((p) => p.contact_id)}
        documents={documents ?? []}
        lastContact={lastContact}
        isMaster={viewer?.global_role === "master"}
        bidders={(bidders ?? []) as any}
        bids={bids ?? []}
        coverage={coverage ?? []}
        criteria={criteria ?? []}
        scores={scores ?? []}
        offers={offers ?? []}
      />
    </div>
  );
}
