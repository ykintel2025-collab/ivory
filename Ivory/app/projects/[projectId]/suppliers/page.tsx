import { createClient } from "@/lib/supabase/server";
import AddEquipmentForm from "@/components/AddEquipmentForm";
import DeleteButton from "@/components/DeleteButton";
import EditModal from "@/components/EditModal";
import { getT } from "@/lib/i18n/server";
import { getLang } from "@/lib/i18n/server";
import { DATE_LOCALE } from "@/lib/i18n/translate";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({
  params,
}: {
  params: { projectId: string };
}) {
  const supabase = createClient();
  const tr = getT();
  const dateLocale = DATE_LOCALE[getLang()];
  const { data: items } = await supabase
    .from("equipment_items")
    .select("*")
    .eq("project_id", params.projectId)
    .order("department", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">
          {tr("Apparatuur en leveranciers")}
        </h1>
        <p className="text-sm text-ink/50">{tr("Kernitems per afdeling")}</p>
      </div>

      <AddEquipmentForm projectId={params.projectId} />

      <div className="overflow-x-auto rounded-xl border border-ivory-line bg-ivory-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ivory-line bg-ivory text-xs uppercase tracking-wide text-ink/50">
            <tr>
              <th className="px-4 py-3">{tr("Code")}</th>
              <th className="px-4 py-3">{tr("Omschrijving")}</th>
              <th className="px-4 py-3">{tr("Afdeling")}</th>
              <th className="px-4 py-3">{tr("Leverancier")}</th>
              <th className="px-4 py-3">{tr("Model")}</th>
              <th className="px-4 py-3">{tr("Certificering")}</th>
              <th className="px-4 py-3">{tr("Prijsindicatie")}</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((item) => (
              <tr key={item.id} className="border-b border-ivory-line">
                <td className="px-4 py-3 text-xs text-ink/40">
                  {item.line_code ?? "—"}
                </td>
                <td className="px-4 py-3 font-medium text-ink">
                  {item.description}
                </td>
                <td className="px-4 py-3 text-ink/70">
                  {item.department ?? "—"}
                </td>
                <td className="px-4 py-3 text-ink/70">
                  {item.supplier ?? "—"}
                </td>
                <td className="px-4 py-3 text-ink/70">{item.model ?? "—"}</td>
                <td className="px-4 py-3 text-ink/70">
                  {item.certification_status ?? "—"}
                </td>
                <td className="px-4 py-3 text-ink/70">
                  {item.price_estimate
                    ? `${item.currency ?? "EUR"} ${item.price_estimate.toLocaleString(
                        dateLocale
                      )}`
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <EditModal
                      table="equipment_items"
                      id={item.id}
                      title={tr("Apparatuur bewerken")}
                      initialValues={{
                        line_code: item.line_code,
                        description: item.description,
                        department: item.department,
                        supplier: item.supplier,
                        model: item.model,
                        certification_status: item.certification_status,
                        price_estimate: item.price_estimate,
                      }}
                      fields={[
                        { key: "line_code", label: tr("Code"), type: "text" },
                        { key: "description", label: tr("Omschrijving"), type: "text" },
                        { key: "department", label: tr("Afdeling"), type: "text" },
                        { key: "supplier", label: tr("Leverancier"), type: "text" },
                        { key: "model", label: tr("Model"), type: "text" },
                        { key: "certification_status", label: tr("Certificering"), type: "text" },
                        { key: "price_estimate", label: tr("Prijsindicatie (EUR)"), type: "number" },
                      ]}
                    />
                    <DeleteButton table="equipment_items" id={item.id} />
                  </div>
                </td>
              </tr>
            ))}
            {(items ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-ink/40">
                  {tr("Nog geen apparatuur toegevoegd.")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
