"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGlobalRole } from "@/lib/useGlobalRole";
import { useT } from "@/lib/i18n/client";

export default function QuickDeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const supabase = createClient();
  const tr = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { isMaster } = useGlobalRole();

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const typed = window.prompt(
      tr("Typ de projectnaam (\"{naam}\") om \"{naam}\" definitief te verwijderen, inclusief alle risico's, taken en documenten:", { naam: projectName })
    );
    if (typed !== projectName) return;

    setBusy(true);
    await supabase.from("projects").delete().eq("id", projectId);
    setBusy(false);
    router.refresh();
  }

  if (!isMaster) return null;

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      title={tr("Project verwijderen")}
      className="rounded-md p-1 text-ink/30 transition hover:bg-brick-soft hover:text-brick disabled:opacity-50"
    >
      ✕
    </button>
  );
}
