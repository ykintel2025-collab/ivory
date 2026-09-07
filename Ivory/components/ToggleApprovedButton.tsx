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
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium ${approved ? "text-teal" : "text-brick"}`}>
        {approved ? "Actief" : "Geblokkeerd"}
      </span>
      <button
        role="switch"
        aria-checked={approved}
        onClick={handleToggle}
        disabled={busy}
        title={approved ? "Klik om te blokkeren" : "Klik om te activeren"}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
          approved ? "bg-teal" : "bg-ink/20"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
            approved ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
