"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/client";

const SECTIONS = [
  { value: "", label: "Algemeen (niet gekoppeld)" },
  { value: "risks", label: "Risico's" },
  { value: "tasks", label: "Taken" },
  { value: "scope", label: "Scope" },
  { value: "tracker", label: "Registraties" },
  { value: "suppliers", label: "Apparatuur" },
  { value: "parties", label: "Partijen" },
];

type Project = { id: string; name: string };

export default function UploadDocumentForm({
  projectId,
  projects,
}: {
  projectId?: string;
  projects?: Project[];
}) {
  const supabase = createClient();
  const tr = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [section, setSection] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showProjectPicker = !projectId && projects && projects.length > 0;

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const folder = selectedProjectId || "unassigned";
    const path = `${folder}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(path, file);

    if (uploadError) {
      setError(tr("Upload mislukt: ") + uploadError.message);
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("documents").insert({
      project_id: selectedProjectId || null,
      name: file.name,
      storage_path: path,
      section: selectedProjectId ? section || null : null,
      size: file.size,
      uploaded_by: user?.id ?? null,
    });

    setLoading(false);
    if (insertError) {
      setError(tr("Opslaan mislukt: ") + insertError.message);
      return;
    }

    setFile(null);
    setSection("");
    setSelectedProjectId(projectId ?? "");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-soft"
      >
        {tr("+ Document uploaden")}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleUpload}
      className="space-y-3 rounded-xl border border-ivory-line bg-ivory-card p-5 shadow-sm"
    >
      <h2 className="font-display text-lg text-ink">{tr("Document uploaden")}</h2>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">
          {tr("Bestand")}
        </label>
        <input
          required
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-ivory file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink"
        />
      </div>

      {showProjectPicker && (
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            {tr("Project (optioneel — later ook toe te wijzen)")}
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          >
            <option value="">{tr("Nog niet toewijzen")}</option>
            {projects!.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedProjectId && (
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            {tr("Koppelen aan onderdeel (optioneel)")}
          </label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
          >
            {SECTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {tr(s.label)}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-brick-soft px-3 py-2 text-xs text-brick">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !file}
          className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-soft disabled:opacity-60"
        >
          {loading ? tr("Bezig met uploaden...") : tr("Uploaden")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-4 py-2 text-sm text-ink/60 hover:bg-ivory"
        >
          {tr("Annuleren")}
        </button>
      </div>
    </form>
  );
}
