import { createClient } from "@/lib/supabase/server";
import Badge from "@/components/Badge";
import AddRiskForm from "@/components/AddRiskForm";
import DeleteButton from "@/components/DeleteButton";
import EditModal from "@/components/EditModal";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const RATING_ORDER: Record<string, number> = { hoog: 0, midden: 1, laag: 2 };

export default async function RisksPage({
  params,
}: {
  params: { projectId: string };
}) {
  const supabase = createClient();
  const tr = getT();
  const projectId = params.projectId;

  const [{ data: risks }, { data: members }] = await Promise.all([
    supabase
      .from("risks")
      .select("*, profiles(full_name)")
      .eq("project_id", projectId)
      .order("status")
      .order("created_at", { ascending: false }),
    supabase
      .from("project_members")
      .select("user_id, profiles(full_name)")
      .eq("project_id", projectId),
  ]);

  const memberList = (members ?? []).map((m: any) => ({
    user_id: m.user_id,
    full_name: m.profiles?.full_name ?? tr("Onbekend"),
  }));

  const sorted = [...(risks ?? [])].sort(
    (a, b) => RATING_ORDER[a.rating] - RATING_ORDER[b.rating]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">{tr("Risicoregister")}</h1>
        <p className="text-sm text-ink/50">
          {tr("Alle geïdentificeerde risico's, beoordeling en mitigatie")}
        </p>
      </div>

      <AddRiskForm projectId={projectId} members={memberList} />

      <div className="overflow-x-auto rounded-xl border border-ivory-line bg-ivory-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ivory-line bg-ivory text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3">{tr("Risico")}</th>
              <th className="px-4 py-3">{tr("Score")}</th>
              <th className="px-4 py-3">{tr("Status")}</th>
              <th className="px-4 py-3">{tr("Mitigatie")}</th>
              <th className="px-4 py-3">{tr("Eigenaar")}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r: any) => (
              <tr key={r.id} className="border-b border-ivory-line align-top">
                <td className="px-4 py-3 font-medium text-ink">
                  {r.title}
                  {r.description && (
                    <p className="mt-1 text-xs font-normal text-ink/40">
                      {r.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge value={r.rating} />
                </td>
                <td className="px-4 py-3">
                  <Badge value={r.status} />
                </td>
                <td className="px-4 py-3 text-ink/70">{r.mitigation ?? "—"}</td>
                <td className="px-4 py-3 text-ink/50">
                  {r.profiles?.full_name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <EditModal
                      table="risks"
                      id={r.id}
                      title={tr("Risico bewerken")}
                      initialValues={{
                        title: r.title,
                        description: r.description,
                        rating: r.rating,
                        status: r.status,
                        mitigation: r.mitigation,
                        owner_id: r.owner_id,
                      }}
                      fields={[
                        { key: "title", label: tr("Titel"), type: "text" },
                        { key: "description", label: tr("Omschrijving"), type: "textarea" },
                        {
                          key: "rating",
                          label: tr("Score"),
                          type: "select",
                          options: [
                            { value: "hoog", label: tr("Hoog") },
                            { value: "midden", label: tr("Midden") },
                            { value: "laag", label: tr("Laag") },
                          ],
                        },
                        {
                          key: "status",
                          label: tr("Status"),
                          type: "select",
                          options: [
                            { value: "open", label: tr("Open") },
                            { value: "opgelost", label: tr("Opgelost") },
                          ],
                        },
                        { key: "mitigation", label: tr("Mitigatie"), type: "textarea" },
                        {
                          key: "owner_id",
                          label: tr("Eigenaar"),
                          type: "select",
                          options: [
                            { value: "", label: tr("Niemand") },
                            ...memberList.map((m) => ({
                              value: m.user_id,
                              label: m.full_name,
                            })),
                          ],
                        },
                      ]}
                    />
                    <DeleteButton table="risks" id={r.id} />
                  </div>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/40">
                  {tr("Nog geen risico's toegevoegd.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
