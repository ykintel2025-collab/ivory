"use client";

import { useRouter } from "next/navigation";

type Project = { id: string; name: string };

export default function ProjectSwitcher({
  projects,
  currentProjectId,
}: {
  projects: Project[];
  currentProjectId?: string;
}) {
  const router = useRouter();

  return (
    <select
      value={currentProjectId ?? ""}
      onChange={(e) => {
        const id = e.target.value;
        if (id) router.push(`/projects/${id}/dashboard`);
      }}
      className="w-full truncate rounded-lg border border-ivory/20 bg-ink-soft px-2 py-1.5 text-sm text-ivory focus:border-gold focus:outline-none"
    >
      {!currentProjectId && <option value="">Kies een project...</option>}
      {projects.map((p) => (
        <option key={p.id} value={p.id} className="text-ink">
          {p.name}
        </option>
      ))}
    </select>
  );
}
