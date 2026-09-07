"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ToggleApprovedButton({
  userId,
  approved,
}: {
  userId: string;
  approved: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleToggle() {
    setBusy(true);
    await supabase.from("profiles").update({ approved: !approved }).eq("id", userId);
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleToggle}
      disabled={busy}
      className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
        approved
          ? "bg-teal-soft text-teal hover:bg-brick-soft hover:text-brick"
          : "bg-brick-soft text-brick hover:bg-teal-soft hover:text-teal"
      }`}
      title={approved ? "Klik om te blokkeren" : "Klik om te activeren"}
    >
      {approved ? "Actief" : "Geblokkeerd"}
    </button>
  );
}
