import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { projectId: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: project }, { data: membership }, { data: memberships }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name")
        .eq("id", params.projectId)
        .single(),
      supabase
        .from("project_members")
        .select("access_level, allowed_sections")
        .eq("project_id", params.projectId)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("project_members")
        .select("projects(id, name)")
        .eq("user_id", user.id),
    ]);

  // RLS zorgt dat dit leeg blijft als de gebruiker geen lid is van dit project
  if (!project) redirect("/projects");

  const projectOptions = (memberships ?? [])
    .map((m: any) => m.projects)
    .filter(Boolean);

  return (
    <AppShell
      projectId={params.projectId}
      projectName={project.name}
      projects={projectOptions}
      accessLevel={membership?.access_level ?? "volledig"}
      allowedSections={membership?.allowed_sections ?? []}
    >
      {children}
    </AppShell>
  );
}
