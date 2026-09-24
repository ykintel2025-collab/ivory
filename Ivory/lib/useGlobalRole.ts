"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Globale classificatie van de ingelogde gebruiker ("master" | "main" | "user").
// Alleen voor het tonen/verbergen van knoppen; de echte afscherming zit in de database (RLS).
let cached: Promise<string | null> | null = null;
let listening = false;

function loadRole(): Promise<string | null> {
  const supabase = createClient();
  if (!listening) {
    listening = true;
    supabase.auth.onAuthStateChange(() => {
      cached = null;
    });
  }
  return supabase.auth.getUser().then(async ({ data }) => {
    if (!data.user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("global_role, approved")
      .eq("id", data.user.id)
      .single();
    return profile?.approved ? profile.global_role ?? null : null;
  });
}

export function useGlobalRole() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!cached) cached = loadRole();
    let active = true;
    cached.then((r) => active && setRole(r));
    return () => {
      active = false;
    };
  }, []);

  return {
    role,
    isMaster: role === "master",
    isMasterOrMain: role === "master" || role === "main",
  };
}
