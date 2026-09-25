import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import ProcurementDashboard from "@/components/procurement/ProcurementDashboard";
import type { DeptSummary } from "@/lib/procurement/labels";

export const dynamic = "force-dynamic";

export default async function ProcurementPage({ params }: { params: { projectId: string } }) {
  const supabase = createClient();
  const tr = getT();
  const projectId = params.projectId;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: packages }, { data: items }, { data: suppliers }, { data: documents }, { data: viewer }] = await Promise.all([
    supabase.from("proc_packages").select("*").eq("project_id", projectId).order("sort"),
    supabase.from("proc_items").select("*").eq("project_id", projectId).order("item_code").range(0, 4999),
    supabase.from("proc_suppliers").select("*").eq("project_id", projectId).order("created_at"),
    supabase.from("documents").select("id, name, created_at").eq("project_id", projectId).ilike("name", "%.xls%").order("created_at", { ascending: false }),
    supabase.from("profiles").select("global_role").eq("id", user?.id ?? "").single(),
  ]);

  // Ruimteregels in blokken van 1000 ophalen en samenvatten per afdeling.
  const depts = new Map<string, { qtyByItem: Record<string, number>; rooms: Set<string>; lines: number }>();
  for (let from = 0; ; from += 1000) {
    const { data: lines } = await supabase
      .from("proc_room_lines")
      .select("item_id, department, room_number, qty")
      .eq("project_id", projectId)
      .range(from, from + 999);
    for (const l of lines ?? []) {
      const key = l.department ?? "—";
      const d = depts.get(key) ?? { qtyByItem: {}, rooms: new Set<string>(), lines: 0 };
      d.qtyByItem[l.item_id] = (d.qtyByItem[l.item_id] ?? 0) + (l.qty ?? 0);
      if (l.room_number) d.rooms.add(l.room_number);
      d.lines++;
      depts.set(key, d);
    }
    if (!lines || lines.length < 1000) break;
  }
  const deptSummaries: DeptSummary[] = [...depts.entries()]
    .map(([department, d]) => ({ department, qtyByItem: d.qtyByItem, rooms: d.rooms.size, lines: d.lines }))
    .sort((a, b) => b.lines - a.lines);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">{tr("Inkoop")}</h1>
        <p className="text-sm text-ink/50">
          {tr("Van stamlijst naar leveranciers: artikelen gebundeld in inkooppakketten, per afdeling en per ruimte te volgen")}
        </p>
      </div>
      <ProcurementDashboard
        projectId={projectId}
        packages={packages ?? []}
        items={items ?? []}
        suppliers={suppliers ?? []}
        departments={deptSummaries}
        documents={documents ?? []}
        isMaster={viewer?.global_role === "master"}
      />
    </div>
  );
}
