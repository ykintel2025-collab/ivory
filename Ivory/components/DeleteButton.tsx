"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGlobalRole } from "@/lib/useGlobalRole";
import { useT } from "@/lib/i18n/client";

export default function DeleteButton({
  table,
  id,
  confirmText,
  beforeDelete,
}: {
  table: string;
  id: string;
  confirmText?: string;
  beforeDelete?: () => Promise<void>;
}) {
  const supabase = createClient();
  const tr = useT();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { isMaster } = useGlobalRole();

  async function handleDelete() {
    if (!window.confirm(confirmText ?? tr("Weet je zeker dat je dit wilt verwijderen?"))) return;
    setBusy(true);
    if (beforeDelete) {
      await beforeDelete();
    }
    await supabase.from(table).delete().eq("id", id);
    setBusy(false);
    router.refresh();
  }

  if (!isMaster) return null;

  return (
    <button
      onClick={handleDelete}
      disabled={busy}
      title={tr("Verwijderen")}
      className="shrink-0 rounded-md p-1.5 text-ink/30 transition hover:bg-brick-soft hover:text-brick disabled:opacity-50"
    >
      ✕
    </button>
  );
}
