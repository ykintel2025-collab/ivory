"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";

type Project = { id: string; name: string };

export default function ProjectSwitcher({
  projects,
  currentProjectId,
}: {
  projects: Project[];
  currentProjectId?: string;
}) {
  const router = useRouter();
  const tr = useT();

  return (
    <select
      value={currentProjectId ?? ""}
      onChange={(e) => {
        const id = e.target.value;
        if (id) router.push(`/projects/${id}/dashboard`);
      }}
      className="w-full truncate rounded-lg border border-ivory/20 bg-ink-soft px-2 py-1.5 text-sm text-ivory focus:border-gold focus:outline-none"
    >
      {!currentProjectId && <option value="">{tr("Kies een project...")}</option>}
      {projects.map((p) => (
        <option key={p.id} value={p.id} className="text-ink">
          {p.name}
        </option>
      ))}
    </select>
  );
}
