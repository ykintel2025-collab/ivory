"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import ProjectSwitcher from "@/components/ProjectSwitcher";

type NavItem = { href: string; label: string; icon: string; section: string | null };

function allNavItems(projectId: string): NavItem[] {
  return [
    { href: `/projects/${projectId}/dashboard`, label: "Dashboard", icon: "◇", section: null },
    { href: `/projects/${projectId}/risks`, label: "Risico's", icon: "▲", section: "risks" },
    { href: `/projects/${projectId}/tasks`, label: "Taken", icon: "☐", section: "tasks" },
    { href: `/projects/${projectId}/scope`, label: "Scope", icon: "▤", section: "scope" },
    { href: `/projects/${projectId}/tracker`, label: "Registraties", icon: "✚", section: "tracker" },
    { href: `/projects/${projectId}/suppliers`, label: "Apparatuur", icon: "⬡", section: "suppliers" },
    { href: `/projects/${projectId}/parties`, label: "Partijen", icon: "◎", section: "parties" },
    { href: `/projects/${projectId}/documents`, label: "Documenten", icon: "▦", section: "documents" },
    { href: `/projects/${projectId}/settings`, label: "Instellingen", icon: "⚙", section: null },
  ];
}

export default function AppShell({
  children,
  projectId,
  projectName,
  projects,
  accessLevel = "volledig",
  allowedSections = [],
}: {
  children: React.ReactNode;
  projectId: string;
  projectName?: string;
  projects?: { id: string; name: string }[];
  accessLevel?: string;
  allowedSections?: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = allNavItems(projectId).filter((item) => {
    if (accessLevel === "volledig") return true;
    if (item.section === null) return true; // Dashboard en Instellingen altijd zichtbaar
    return allowedSections.includes(item.section);
  });

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-ivory">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-ink px-4 py-6 md:flex md:flex-col">
        <Link href="/projects" className="mb-6 flex items-center gap-2 px-2">
          <Image
            src="/logo-crest.png"
            alt="Ivory Global Care"
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
          />
          <span className="font-display text-base text-ivory">Ivory</span>
        </Link>

        <div className="mb-6 px-2">
          {projects && projects.length > 0 ? (
            <ProjectSwitcher projects={projects} currentProjectId={projectId} />
          ) : (
            <p className="truncate font-display text-base text-ivory">
              {projectName ?? "Project"}
            </p>
          )}
        </div>

        <nav className="flex-1 space-y-1">
          {items.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border-gold bg-ink-soft text-ivory"
                    : "border-transparent text-ivory/60 hover:bg-ink-soft hover:text-ivory"
                }`}
              >
                <span className="w-4 text-center text-xs">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/projects"
          className="mb-1 rounded-lg px-3 py-2 text-left text-xs font-medium text-ivory/50 hover:bg-ink-soft hover:text-ivory"
        >
          ← Alle projecten / Relaties
        </Link>
        <Link
          href="/account/security"
          className="mb-1 rounded-lg px-3 py-2 text-left text-xs font-medium text-ivory/50 hover:bg-ink-soft hover:text-ivory"
        >
          Beveiliging
        </Link>
        <button
          onClick={handleLogout}
          className="rounded-lg px-3 py-2 text-left text-sm text-ivory/50 hover:bg-ink-soft hover:text-ivory"
        >
          Uitloggen
        </button>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-20 flex items-center justify-between bg-ink px-4 py-3 md:hidden">
        <div>
          <p className="font-display text-base text-ivory">
            {projectName ?? "Project"}
          </p>
          <Link href="/projects" className="text-xs text-ivory/50">
            ← Alle projecten
          </Link>
        </div>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-lg border border-ivory/20 px-3 py-1.5 text-sm text-ivory"
        >
          Menu
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 top-14 z-10 bg-ink p-4 md:hidden">
          {projects && projects.length > 0 && (
            <div className="mb-3">
              <ProjectSwitcher projects={projects} currentProjectId={projectId} />
            </div>
          )}
          <nav className="space-y-1">
            {items.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-lg border-l-2 px-3 py-3 text-sm font-medium ${
                    active
                      ? "border-gold bg-ink-soft text-ivory"
                      : "border-transparent text-ivory/60 hover:bg-ink-soft hover:text-ivory"
                  }`}
                >
                  <span className="w-4 text-center text-xs">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/account/security"
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-3 text-left text-sm text-ivory/50 hover:bg-ink-soft hover:text-ivory"
            >
              Beveiliging
            </Link>
            <button
              onClick={handleLogout}
              className="mt-2 w-full rounded-lg px-3 py-3 text-left text-sm text-ivory/50 hover:bg-ink-soft hover:text-ivory"
            >
              Uitloggen
            </button>
          </nav>
        </div>
      )}

      <main className="flex-1 px-4 py-6 pt-24 md:px-10 md:py-10 md:pt-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
