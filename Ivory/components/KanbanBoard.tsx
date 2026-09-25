"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Badge from "@/components/Badge";
import DeleteButton from "@/components/DeleteButton";
import EditModal from "@/components/EditModal";
import { useT } from "@/lib/i18n/client";
import { useLang } from "@/lib/i18n/client";
import { DATE_LOCALE } from "@/lib/i18n/translate";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "te_doen" | "mee_bezig" | "klaar";
  urgency: string | null;
  due_date: string | null;
  owner_id: string | null;
  phase_id: number | null;
  phases: { number: number; name: string } | null;
  profiles: { full_name: string } | null;
  blocked_by_id: string | null;
};

type Member = { user_id: string; full_name: string };
type Phase = { id: number; number: number; name: string };

const COLUMNS: { key: Task["status"]; label: string }[] = [
  { key: "te_doen", label: "Te doen" },
  { key: "mee_bezig", label: "Mee bezig" },
  { key: "klaar", label: "Klaar" },
];

export default function KanbanBoard({
  tasks,
  members = [],
  phases = [],
  projectId,
}: {
  tasks: Task[];
  members?: Member[];
  phases?: Phase[];
  projectId: string;
}) {
  const supabase = createClient();
  const tr = useT();
  const dateLocale = DATE_LOCALE[useLang()];
  const router = useRouter();
  const [updating, setUpdating] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  async function moveTask(id: string, status: Task["status"]) {
    setUpdating(id);
    setMoveError(null);
    const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
    setUpdating(null);
    if (error) {
      setMoveError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {moveError && (
        <p className="rounded-lg bg-brick-soft px-3 py-2 text-sm text-brick">
          {tr("Verplaatsen mislukt")}: {moveError}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.key);
        return (
          <div
            key={col.key}
            className="rounded-xl border border-ivory-line bg-ivory-card p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg text-ink">{tr(col.label)}</h2>
              <span className="text-xs text-ink/40">{colTasks.length}</span>
            </div>
            <div className="space-y-3">
              {colTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-lg border border-ivory-line p-3 shadow-sm"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-ink">
                      {task.title}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      {task.urgency === "urgent" && <Badge value="urgent" />}
                      <EditModal
                        table="tasks"
                        id={task.id}
                        title={tr("Taak bewerken")}
                        initialValues={{
                          title: task.title,
                          description: task.description,
                          urgency: task.urgency,
                          due_date: task.due_date,
                          owner_id: task.owner_id,
                          phase_id: task.phase_id ? String(task.phase_id) : "",
                        }}
                        fields={[
                          { key: "title", label: tr("Titel"), type: "text" },
                          { key: "description", label: tr("Omschrijving"), type: "textarea" },
                          {
                            key: "urgency",
                            label: tr("Urgentie"),
                            type: "select",
                            options: [
                              { value: "normaal", label: tr("Normaal") },
                              { value: "hoog", label: tr("Hoog") },
                              { value: "urgent", label: tr("Urgent") },
                            ],
                          },
                          { key: "due_date", label: tr("Deadline"), type: "date" },
                          {
                            key: "owner_id",
                            label: tr("Toegewezen aan"),
                            type: "select",
                            options: [
                              { value: "", label: tr("Niemand") },
                              ...members.map((m) => ({
                                value: m.user_id,
                                label: m.full_name,
                              })),
                            ],
                          },
                          {
                            key: "phase_id",
                            label: tr("Fase"),
                            type: "select",
                            numeric: true,
                            options: phases.map((p) => ({
                              value: String(p.id),
                              label: `${tr("Fase")} ${p.number} — ${tr(p.name)}`,
                            })),
                          },
                        ]}
                      />
                      <DeleteButton table="tasks" id={task.id} />
                    </div>
                  </div>
                  {task.description && (
                    <p className="mb-2 text-xs text-ink/50">
                      {task.description}
                    </p>
                  )}
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-ink/40">
                    {task.phases && <span>{tr("Fase")} {task.phases.number}</span>}
                    {task.profiles?.full_name && (
                      <span>· {task.profiles.full_name}</span>
                    )}
                    {task.due_date && (
                      <span>
                        · {new Date(task.due_date).toLocaleDateString(dateLocale)}
                      </span>
                    )}
                    {task.blocked_by_id && (
                      <span className="text-brick">· {tr("Geblokkeerd")}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {COLUMNS.filter((c) => c.key !== task.status).map((c) => (
                      <button
                        key={c.key}
                        disabled={updating === task.id}
                        onClick={() => moveTask(task.id, c.key)}
                        className="rounded-md bg-ivory px-2 py-1 text-xs font-medium text-ink/70 hover:bg-ivory-line disabled:opacity-50"
                      >
                        → {tr(c.label)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {colTasks.length === 0 && (
                <p className="text-xs text-ink/30">{tr("Geen taken")}</p>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
