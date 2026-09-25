"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Kleine helper voor een lijst rijen uit één tabel: direct tonen, opslaan, bij fout terugdraaien.
export function useRows<T extends { id: string }>(table: string, initial: T[], onError: (msg: string) => void, select = "*") {
  const supabase = createClient();
  const [rows, setRows] = useState<T[]>(initial);

  async function add(values: Record<string, any>): Promise<T | null> {
    const { data, error } = await supabase.from(table).insert(values).select(select).single();
    if (error || !data) {
      onError(error?.message ?? "onbekende fout");
      return null;
    }
    setRows((r) => [...r, data as unknown as T]);
    return data as unknown as T;
  }

  async function update(id: string, patch: Partial<T>): Promise<boolean> {
    const before = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from(table).update(patch as any).eq("id", id);
    if (error) {
      setRows(before);
      onError(error.message);
      return false;
    }
    return true;
  }

  async function remove(id: string): Promise<boolean> {
    const { error, count } = await supabase.from(table).delete({ count: "exact" }).eq("id", id);
    if (error || !count) {
      onError(error?.message ?? "geen rechten");
      return false;
    }
    setRows((r) => r.filter((x) => x.id !== id));
    return true;
  }

  // Invoegen of bijwerken op een unieke combinatie (bv. bid_id + package_id).
  async function upsert(values: Record<string, any>, onConflict: string): Promise<boolean> {
    const { data, error } = await supabase.from(table).upsert(values, { onConflict }).select(select).single();
    if (error || !data) {
      onError(error?.message ?? "onbekende fout");
      return false;
    }
    const row = data as unknown as T;
    setRows((r) => (r.some((x) => x.id === row.id) ? r.map((x) => (x.id === row.id ? row : x)) : [...r, row]));
    return true;
  }

  return { rows, setRows, add, update, remove, upsert };
}
