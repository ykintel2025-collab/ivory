import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import ProcApprovals from "@/components/procurement/ProcApprovals";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage({ params }: { params: { projectId: string } }) {
  const supabase = createClient();
  const tr = getT();
  const projectId = params.projectId;

  const [{ data: items }, { data: packages }] = await Promise.all([
    supabase.from("proc_items").select("*").eq("project_id", projectId).order("item_code").range(0, 4999),
    supabase.from("proc_packages").select("*").eq("project_id", projectId).order("sort"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">{tr("Goedkeuringen")}</h1>
        <p className="text-sm text-ink/50">
          {tr("Registratie van medische hulpmiddelen bij de bevoegde instantie, per artikel uit de inkooplijst")}
        </p>
      </div>
      {(items ?? []).length === 0 ? (
        <p className="text-sm text-ink/40">
          {tr("Nog geen artikelen. Importeer eerst de stamlijst via")}{" "}
          <Link href={`/projects/${projectId}/procurement`} className="font-medium text-ink underline">
            {tr("Inkoop")}
          </Link>
          .
        </p>
      ) : (
        <ProcApprovals items={items as any} packages={packages ?? []} />
      )}
    </div>
  );
}
