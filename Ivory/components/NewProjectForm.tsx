"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGlobalRole } from "@/lib/useGlobalRole";

export default function NewProjectForm({
  variant = "button",
}: {
  variant?: "button" | "sidebar" | "nav";
}) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isMaster } = useGlobalRole();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Niet ingelogd.");
      setLoading(false);
      return;
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { data: project, error: insertError } = await supabase
      .rpc("create_project", {
        p_name: name,
        p_client: client,
        p_location: location,
        p_slug: `${slug}-${Date.now().toString(36)}`,
      })
      .select()
      .single();

    if (insertError || !project) {
      setError("Aanmaken mislukt: " + insertError?.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setOpen(false);
    router.push(`/projects/${(project as any).id}/dashboard`);
    router.refresh();
  }

  const triggerClass =
    variant === "sidebar"
      ? "flex items-center gap-2 rounded-lg border border-gold/40 px-3 py-2 text-left text-sm font-medium text-gold hover:bg-ink-soft"
      : variant === "nav"
      ? "flex w-full items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2 text-left text-sm font-medium text-gold hover:bg-ink-soft"
      : "rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-soft";

  if (!isMaster) return null;

  return (
    <>
      <button onClick={() => setOpen(true)} className={triggerClass}>
        {variant === "nav" ? (
          <>
            <span className="w-4 text-center text-xs">+</span>
            Nieuw project
          </>
        ) : (
          "+ Nieuw project"
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => setOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleCreate}
            className="w-full max-w-md space-y-3 rounded-xl border border-ivory-line bg-ivory-card p-5 shadow-lg"
          >
            <h2 className="font-display text-lg text-ink">Nieuw project</h2>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">
                Projectnaam
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
                placeholder="bijv. Shajar Hospital"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">
                Opdrachtgever
              </label>
              <input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">
                Locatie
              </label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-ivory-line bg-ivory-card px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-brick-soft px-3 py-2 text-xs text-brick">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-ivory hover:bg-ink-soft disabled:opacity-60"
              >
                {loading ? "Bezig..." : "Aanmaken"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-2 text-sm text-ink/60 hover:bg-ivory"
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
