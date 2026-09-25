import { createClient } from "@/lib/supabase/server";
import UploadDocumentForm from "@/components/UploadDocumentForm";
import DocumentRow from "@/components/DocumentRow";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const SECTION_LABELS: Record<string, string> = {
  risks: "Risico's",
  tasks: "Taken",
  scope: "Scope",
  tracker: "Registraties",
  suppliers: "Apparatuur",
  parties: "Partijen",
};

export default async function DocumentsPage({
  params,
}: {
  params: { projectId: string };
}) {
  const supabase = createClient();
  const tr = getT();
  const projectId = params.projectId;

  const { data: documents } = await supabase
    .from("documents")
    .select("*, profiles(full_name)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  // Signed URLs genereren (bucket is privé)
  const docsWithUrls = await Promise.all(
    (documents ?? []).map(async (d) => {
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(d.storage_path, 3600);
      return { ...d, url: signed?.signedUrl ?? null };
    })
  );

  const groups: Record<string, typeof docsWithUrls> = { "": [] };
  for (const key of Object.keys(SECTION_LABELS)) groups[key] = [];
  for (const doc of docsWithUrls) {
    const key = doc.section && SECTION_LABELS[doc.section] ? doc.section : "";
    groups[key].push(doc);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">{tr("Documenten")}</h1>
        <p className="text-sm text-ink/50">
          {tr("Bestanden voor dit project, algemeen of gekoppeld aan een onderdeel")}
        </p>
      </div>

      <UploadDocumentForm projectId={projectId} />

      {[""].concat(Object.keys(SECTION_LABELS)).map((key) => {
        const docs = groups[key];
        if (!docs || docs.length === 0) return null;
        return (
          <div
            key={key || "algemeen"}
            className="rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm"
          >
            <h2 className="mb-4 font-display text-lg text-ink">
              {key ? tr(SECTION_LABELS[key]) : tr("Algemeen")}
            </h2>
            <div className="space-y-2">
              {docs.map((doc) => (
                <DocumentRow key={doc.id} doc={doc} />
              ))}
            </div>
          </div>
        );
      })}

      {docsWithUrls.length === 0 && (
        <p className="text-sm text-ink/40">{tr("Nog geen documenten geüpload.")}</p>
      )}
    </div>
  );
}
