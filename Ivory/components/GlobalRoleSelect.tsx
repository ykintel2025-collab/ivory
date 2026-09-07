"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LABELS: Record<string, string> = {
  master: "Master",
  main: "Main user",
  user: "Standaard",
};

export default function GlobalRoleSelect({
  userId,
  currentRole,
  disabled,
}: {
  userId: string;
  currentRole: string;
  disabled?: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleChange(value: string) {
    setLoading(true);
    await supabase.from("profiles").update({ global_role: value }).eq("id", userId);
    setLoading(false);
    router.refresh();
  }

  if (disabled) {
    return (
      <span className="rounded-full bg-ink/5 px-2.5 py-1 text-xs font-medium text-ink/60">
        {LABELS[currentRole] ?? currentRole}
      </span>
    );
  }

  return (
    <select
      value={currentRole}
      disabled={loading}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-full border border-gold/40 bg-gold-soft px-2 py-1 text-xs font-medium text-gold focus:outline-none disabled:opacity-50"
    >
      <option value="user">Standaard</option>
      <option value="main">Main user</option>
      <option value="master">Master</option>
    </select>
  );
}
