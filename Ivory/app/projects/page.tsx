import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import StatCard from "@/components/StatCard";
import MyTasksList from "@/components/MyTasksList";
import GlobalShell from "@/components/GlobalShell";
import QuickAddTaskForm from "@/components/QuickAddTaskForm";
import UploadDocumentForm from "@/components/UploadDocumentForm";
import DocumentRow from "@/components/DocumentRow";
import QuickDeleteProjectButton from "@/components/QuickDeleteProjectButton";
import { getMyProjects } from "@/lib/getMyProjects";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: memberships },
    { data: openHighRisks },
    { data: openBlockers },
    { data: openTasks },
    { data: registrations },
    { data: myTasksRaw },
    { data: recentDocuments },
    { data: allProfiles },
  ] = await Promise.all([
    supabase
      .from("project_members")
      .select("project_id, role, projects(id, name, client, location, status)")
      .eq("user_id", user?.id ?? ""),
    supabase
      .from("risks")
      .select("*, projects(name)")
      .eq("status", "open")
      .eq("rating", "hoog"),
    supabase
      .from("external_blockers")
      .select("*, projects(name), contacts(name)")
      .eq("status", "open"),
    supabase
      .from("tasks")
      .select("*, projects(name)")
      .neq("status", "klaar")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("registrations")
      .select("*, projects(name)")
      .neq("registration_status", "goedgekeurd")
      .not("expected_completion", "is", null)
      .order("expected_completion", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, title, due_date, urgency, project_id, projects(name)")
      .eq("owner_id", user?.id ?? "")
      .neq("status", "klaar")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("documents")
      .select("*, projects(name), profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ]);

  const recentDocsWithUrls = await Promise.all(
    (recentDocuments ?? []).map(async (d: any) => {
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(d.storage_path, 3600);
      return { ...d, url: signed?.signedUrl ?? null };
    })
  );

  const projects = await getMyProjects();

  const projectIds = projects.map((p: any) => p.id);
  const [{ data: allRisksForCards }, { data: allTasksForCards }] = await Promise.all([
    supabase.from("risks").select("project_id, rating, status").in("project_id", projectIds.length ? projectIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase.from("tasks").select("project_id, status").in("project_id", projectIds.length ? projectIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  const projectStats = new Map<string, { highRisks: number; doneTasks: number; totalTasks: number }>();
  for (const p of projects) {
    projectStats.set(p.id, { highRisks: 0, doneTasks: 0, totalTasks: 0 });
  }
  for (const r of allRisksForCards ?? []) {
    if (r.rating === "hoog" && r.status === "open") {
      const s = projectStats.get(r.project_id);
      if (s) s.highRisks++;
    }
  }
  for (const t of allTasksForCards ?? []) {
    const s = projectStats.get(t.project_id);
    if (s) {
      s.totalTasks++;
      if (t.status === "klaar") s.doneTasks++;
    }
  }

  const upcomingDeadlines = [
    ...(openTasks ?? [])
      .filter((t: any) => t.due_date)
      .map((t: any) => ({
        label: t.title,
        date: t.due_date,
        type: "Taak",
        project: t.projects?.name,
        href: `/projects/${t.project_id}/tasks`,
      })),
    ...(registrations ?? []).map((r: any) => ({
      label: r.item_name,
      date: r.expected_completion,
      type: "Registratie",
      project: r.projects?.name,
      href: `/projects/${r.project_id}/tracker`,
    })),
  ]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const myTasks = (myTasksRaw ?? []).map((t: any) => ({
    id: t.id,
    title: t.title,
    due_date: t.due_date,
    urgency: t.urgency,
    project_id: t.project_id,
    project_name: t.projects?.name ?? "Los (geen project)",
  }));

  const ownerOptions = (allProfiles ?? []).map((p: any) => ({ id: p.id, full_name: p.full_name }));
  const projectOptions = projects.map((p: any) => ({ id: p.id, name: p.name }));

  return (
    <GlobalShell projects={projectOptions}>
      <div className="space-y-10">
        <div>
          <h1 className="font-display text-3xl text-ink">Dashboard</h1>
          <p className="text-sm text-ink/50">
            Overzicht over al je projecten heen
          </p>
        </div>

        {/* Globaal overzicht — klein, alleen als indicator */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Mijn open taken" value={myTasks.length} href="#mijn-taken" />
          <StatCard label="Openstaande taken" value={(openTasks ?? []).length} href="#mijn-taken" />
          <StatCard
            label="Wacht op extern"
            value={(openBlockers ?? []).length}
            tone={(openBlockers ?? []).length > 0 ? "danger" : "success"}
            href="#wachten-op-extern"
          />
          <StatCard label="Actieve projecten" value={projects.length} href="#projecten" />
        </div>

        {/* Taken — hoofdfocus */}
        <div id="mijn-taken" className="scroll-mt-6 space-y-3">
          <div className="rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
            <h2 className="mb-4 font-display text-lg text-ink">Mijn taken</h2>
            <MyTasksList tasks={myTasks} />
          </div>
          <QuickAddTaskForm projects={projectOptions} profiles={ownerOptions} />
        </div>

        {/* Documenten — prominent, met upload */}
        <div className="rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg text-ink">Documenten</h2>
            <div className="flex items-center gap-3">
              <Link href="/documents" className="text-xs font-medium text-ink/50 hover:underline">
                Alle documenten →
              </Link>
            </div>
          </div>
          <UploadDocumentForm projects={projectOptions} />
          <div className="mt-3 space-y-2">
            {(recentDocsWithUrls ?? []).map((doc: any) => (
              <DocumentRow key={doc.id} doc={doc} projects={projectOptions} />
            ))}
            {(recentDocsWithUrls ?? []).length === 0 && (
              <p className="text-sm text-ink/40">Nog geen documenten geüpload.</p>
            )}
          </div>
        </div>

        {/* Deadlines */}
        <div className="rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
          <h2 className="mb-4 font-display text-lg text-ink">Eerstvolgende deadlines</h2>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-ink/40">Geen deadlines gevonden.</p>
          ) : (
            <ul className="space-y-3">
              {upcomingDeadlines.map((d, i) => (
                <li key={i}>
                  <Link href={d.href} className="flex items-center justify-between rounded-lg text-sm transition hover:text-gold">
                    <div>
                      <p className="font-medium text-ink">{d.label}</p>
                      <p className="text-xs text-ink/40">{d.type} · {d.project}</p>
                    </div>
                    <span className="text-xs font-medium text-ink/50">
                      {new Date(d.date).toLocaleDateString("nl-NL")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {(openBlockers ?? []).length > 0 && (
          <div id="wachten-op-extern" className="scroll-mt-6 rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm">
            <h2 className="mb-4 font-display text-lg text-ink">Wachten op extern</h2>
            <div className="space-y-2">
              {(openBlockers ?? []).map((b: any) => (
                <Link
                  key={b.id}
                  href={`/projects/${b.project_id}/parties`}
                  className="flex items-center justify-between rounded-lg border border-ivory-line px-3 py-2 transition hover:border-gold"
                >
                  <div>
                    <p className="text-sm text-ink/80">{b.title}</p>
                    <p className="text-xs text-ink/40">
                      {b.projects?.name} · wacht op {b.contacts?.name ?? "onbekend"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Projecten — risico/voortgang alleen als klein indicatorpuntje */}
        <div id="projecten" className="scroll-mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Jouw projecten</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {projects.map((p: any) => {
              const stats = projectStats.get(p.id) ?? { highRisks: 0, doneTasks: 0, totalTasks: 0 };
              const progressPct = stats.totalTasks
                ? Math.round((stats.doneTasks / stats.totalTasks) * 100)
                : 0;
              return (
                <div key={p.id} className="relative">
                  <Link
                    href={`/projects/${p.id}/dashboard`}
                    className="block rounded-xl border border-ivory-line bg-ivory-card p-6 shadow-sm transition hover:border-gold"
                  >
                    <div className="mb-1 flex items-center justify-between pr-6">
                      <p className="font-display text-lg text-ink">{p.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === "actief"
                            ? "bg-teal-soft text-teal"
                            : p.status === "gepauzeerd"
                            ? "bg-amber-soft text-amber"
                            : "bg-ink/5 text-ink/50"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    {p.client && <p className="text-xs text-ink/50">{p.client}</p>}
                    {p.location && <p className="text-xs text-ink/40">{p.location}</p>}

                    <div className="mt-4 flex items-center gap-4">
                      <span
                        title={stats.highRisks > 0 ? `${stats.highRisks} hoog risico` : "Geen hoge risico's"}
                        className={`h-2 w-2 shrink-0 rounded-full ${stats.highRisks > 0 ? "bg-brick" : "bg-teal"}`}
                      />
                      <div className="flex flex-1 items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ivory">
                          <div className="h-1.5 rounded-full bg-gold" style={{ width: `${progressPct}%` }} />
                        </div>
                        <span className="text-xs text-ink/40">{progressPct}%</span>
                      </div>
                    </div>
                  </Link>
                  <div className="absolute right-4 top-4">
                    <QuickDeleteProjectButton projectId={p.id} projectName={p.name} />
                  </div>
                </div>
              );
            })}
            {projects.length === 0 && (
              <p className="text-sm text-ink/40">Nog geen projecten. Maak je eerste project aan.</p>
            )}
          </div>
        </div>
      </div>
    </GlobalShell>
  );
}
