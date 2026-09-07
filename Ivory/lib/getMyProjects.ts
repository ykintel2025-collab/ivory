import { createClient } from "@/lib/supabase/server";

export async function getMyProjects() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", user?.id ?? "")
    .single();

  const isMasterOrMain =
    viewerProfile?.global_role === "master" || viewerProfile?.global_role === "main";

  if (isMasterOrMain) {
    const { data: allProjects } = await supabase
      .from("projects")
      .select("id, name, client, location, status")
      .order("name");
    return allProjects ?? [];
  }

  const { data: memberships } = await supabase
    .from("project_members")
    .select("projects(id, name, client, location, status)")
    .eq("user_id", user?.id ?? "");

  return (memberships ?? []).map((m: any) => m.projects).filter(Boolean);
}
