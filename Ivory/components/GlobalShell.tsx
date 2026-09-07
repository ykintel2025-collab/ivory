"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import NewProjectForm from "@/components/NewProjectForm";
import ProjectSwitcher from "@/components/ProjectSwitcher";

const NAV = [
  { href: "/projects", label: "Dashboard", icon: "◇" },
  { href: "/documents", label: "Documenten", icon: "▦" },
  { href: "/contacts", label: "Relaties", icon: "◎" },
];

export default function GlobalShell({
  children,
  projects,
}: {
  children: React.ReactNode;
  projects?: { id: string; name: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-ivory">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-ink px-4 py-6 md:flex md:flex-col">
        <div className="mb-8 flex items-center gap-2 px-2">
          <Image
            src="/logo-crest.png"
            alt="Ivory Global Care"
            width={32}
            height={32}
            className="h-8 w-8 rounded-full"
          />
          <span className="font-display text-base text-ivory">Ivory Basecamp</span>
        </div>
        <nav className="flex-1 space-y-1">
          <NewProjectForm variant="nav" />
          {NAV.map((item) => {
            const active = pathname === item.href;
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
        {projects && projects.length > 0 && (
          <div className="mb-2">
            <p className="mb-1 px-1 text-xs font-medium text-ivory/40">
              Ga naar project
            </p>
            <ProjectSwitcher projects={projects} />
          </div>
        )}
        <button
          onClick={handleLogout}
          className="mt-2 rounded-lg px-3 py-2 text-left text-sm text-ivory/50 hover:bg-ink-soft hover:text-ivory"
        >
          Uitloggen
        </button>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-20 flex items-center justify-between bg-ink px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Image
            src="/logo-crest.png"
            alt="Ivory Global Care"
            width={28}
            height={28}
            className="h-7 w-7 rounded-full"
          />
          <span className="font-display text-sm text-ivory">Ivory Basecamp</span>
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
          <nav className="space-y-1">
            <NewProjectForm variant="nav" />
            {NAV.map((item) => {
              const active = pathname === item.href;
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
            {projects && projects.length > 0 && (
              <div className="pt-2">
                <p className="mb-1 px-1 text-xs font-medium text-ivory/40">
                  Ga naar project
                </p>
                <ProjectSwitcher projects={projects} />
              </div>
            )}
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
