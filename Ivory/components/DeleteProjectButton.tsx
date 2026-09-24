"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGlobalRole } from "@/lib/useGlobalRole";

export default function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isMaster } = useGlobalRole();

  async function handleDelete() {
    setLoading(true);
    setError(null);
    const { error: deleteError } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    setLoading(false);
    if (deleteError) {
      setError("Verwijderen mislukt: " + deleteError.message);
      return;
    }
    router.push("/projects");
    router.refresh();
  }

  if (!isMaster) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-brick hover:underline"
      >
        Project verwijderen
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-brick/30 bg-brick-soft p-5">
      <h3 className="font-display text-base text-brick">
        Project definitief verwijderen
      </h3>
      <p className="mt-1 text-sm text-brick/80">
        Dit verwijdert <strong>{projectName}</strong> inclusief alle risico's,
        taken, scope, documenten en partij-koppelingen. Dit kan niet ongedaan
        worden gemaakt.
      </p>
      <p className="mt-3 text-xs font-medium text-brick/70">
        Typ de projectnaam ("{projectName}") om te bevestigen:
      </p>
      <input
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className="mt-1 w-full max-w-sm rounded-lg border border-brick/30 bg-white px-3 py-2 text-sm text-ink focus:border-brick focus:outline-none"
      />
      {error && <p className="mt-2 text-xs text-brick">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleDelete}
          disabled={confirmText !== projectName || loading}
          className="rounded-lg bg-brick px-4 py-2 text-sm font-medium text-white hover:bg-brick/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Bezig..." : "Definitief verwijderen"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setConfirmText("");
          }}
          className="rounded-lg px-4 py-2 text-sm text-ink/60 hover:bg-ivory"
        >
          Annuleren
        </button>
      </div>
    </div>
  );
}
