"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useT } from "@/lib/i18n/client";
import { useLang } from "@/lib/i18n/client";
import { DATE_LOCALE } from "@/lib/i18n/translate";

type MyTask = {
  id: string;
  title: string;
  due_date: string | null;
  urgency: string | null;
  project_id: string | null;
  project_name: string;
};

export default function MyTasksList({ tasks }: { tasks: MyTask[] }) {
  const supabase = createClient();
  const tr = useT();
  const dateLocale = DATE_LOCALE[useLang()];
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function markDone(id: string) {
    setBusyId(id);
    await supabase.from("tasks").update({ status: "klaar" }).eq("id", id);
    setBusyId(null);
    router.refresh();
  }

  if (tasks.length === 0) {
    return (
      <p className="text-sm text-ink/40">
        {tr("Nog geen taken aan jou toegewezen. Wijs jezelf toe bij het aanmaken of bewerken van een taak.")}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {tasks.map((t) => (
        <li
          key={t.id}
          className="flex items-center gap-3 rounded-lg border border-ivory-line px-3 py-2.5"
        >
          <button
            onClick={() => markDone(t.id)}
            disabled={busyId === t.id}
            title={tr("Markeer als klaar")}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-ink/20 text-transparent transition hover:border-teal hover:text-teal disabled:opacity-50"
          >
            ✓
          </button>
          <div className="min-w-0 flex-1">
            {t.project_id ? (
              <Link
                href={`/projects/${t.project_id}/tasks`}
                className="block truncate text-sm text-ink hover:underline"
              >
                {t.title}
              </Link>
            ) : (
              <p className="truncate text-sm text-ink">{t.title}</p>
            )}
            <p className="text-xs text-ink/40">{t.project_name}</p>
          </div>
          {t.urgency === "urgent" && (
            <span className="shrink-0 rounded-full bg-brick-soft px-2 py-0.5 text-xs font-medium text-brick">
              {tr("Urgent")}
            </span>
          )}
          {t.due_date && (
            <span className="shrink-0 text-xs font-medium text-ink/50">
              {new Date(t.due_date).toLocaleDateString(dateLocale)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
