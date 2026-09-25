"use client";

import { createClient } from "@/lib/supabase/client";
import DeleteButton from "@/components/DeleteButton";
import AssignDocumentForm from "@/components/AssignDocumentForm";
import { useLang, useT } from "@/lib/i18n/client";
import { DATE_LOCALE } from "@/lib/i18n/translate";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentRow({
  doc,
  projects,
}: {
  doc: any;
  projects?: { id: string; name: string }[];
}) {
  const supabase = createClient();
  const tr = useT();
  const dateLocale = DATE_LOCALE[useLang()];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ivory-line px-3 py-2.5">
      <div className="min-w-0">
        {doc.url ? (
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            download={doc.name}
            className="block truncate text-sm font-medium text-ink hover:underline"
          >
            {doc.name}
          </a>
        ) : (
          <p className="truncate text-sm font-medium text-ink">{doc.name}</p>
        )}
        <p className="text-xs text-ink/40">
          {doc.profiles?.full_name ?? tr("Onbekend")} ·{" "}
          {new Date(doc.created_at).toLocaleDateString(dateLocale)}
          {doc.size ? ` · ${formatSize(doc.size)}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {!doc.project_id && projects && projects.length > 0 && (
          <AssignDocumentForm
            documentId={doc.id}
            storagePath={doc.storage_path}
            projects={projects}
          />
        )}
        <DeleteButton
          table="documents"
          id={doc.id}
          confirmText={tr("{naam} verwijderen? Dit kan niet ongedaan worden gemaakt.", { naam: doc.name })}
          beforeDelete={async () => {
            await supabase.storage.from("documents").remove([doc.storage_path]);
          }}
        />
      </div>
    </div>
  );
}
