import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PACKAGES, isMedicalPackage } from "@/lib/procurement/classify";
import { parseStambestand } from "@/lib/procurement/parseStambestand";

export const maxDuration = 60;

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// Importeert een stamlijst (Excel uit Documenten) in de inkoopmodule van een project.
// Bestaande artikelen behouden hun pakket, status, leverancier en prijs; alleen de
// omschrijving, aantallen en technische eisen worden bijgewerkt. Ruimteregels worden vervangen.
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const { data: viewer } = await supabase.from("profiles").select("global_role").eq("id", user.id).single();
  if (viewer?.global_role !== "master") {
    return NextResponse.json({ error: "Alleen Master mag de stamlijst importeren." }, { status: 403 });
  }

  const { projectId, documentId } = await request.json();
  if (!projectId || !documentId) return NextResponse.json({ error: "Project en document zijn verplicht." }, { status: 400 });

  const { data: doc } = await supabase.from("documents").select("name, storage_path, project_id").eq("id", documentId).single();
  if (!doc || doc.project_id !== projectId) return NextResponse.json({ error: "Document niet gevonden in dit project." }, { status: 404 });

  const { data: file, error: dlError } = await supabase.storage.from("documents").download(doc.storage_path);
  if (dlError || !file) return NextResponse.json({ error: "Downloaden mislukt: " + (dlError?.message ?? "onbekend") }, { status: 500 });

  let parsed;
  try {
    parsed = await parseStambestand(await file.arrayBuffer());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  // 1. Pakketten: ontbrekende aanmaken, bestaande ongemoeid laten.
  const { error: pkgError } = await supabase.from("proc_packages").upsert(
    PACKAGES.map((p) => ({ project_id: projectId, key: p.key, name: p.name, description: p.description, sort: p.sort, medical: p.medical })),
    { onConflict: "project_id,key", ignoreDuplicates: true }
  );
  if (pkgError) return NextResponse.json({ error: "Pakketten aanmaken mislukt: " + pkgError.message }, { status: 500 });

  const { data: pkgs } = await supabase.from("proc_packages").select("id, key").eq("project_id", projectId);
  const pkgId = new Map((pkgs ?? []).map((p) => [p.key, p.id]));

  // 2. Artikelen: nieuwe met indeling, bestaande alleen beschrijvend bijwerken.
  const { data: existing } = await supabase.from("proc_items").select("item_code").eq("project_id", projectId).range(0, 9999);
  const known = new Set((existing ?? []).map((e) => e.item_code));
  const describe = (it: (typeof parsed.items)[number]) => ({
    project_id: projectId,
    item_code: it.item_code,
    description: it.description,
    family: it.family,
    total_qty: it.total_qty,
    dept_count: it.dept_count,
    room_count: it.room_count,
    elec_load: it.elec_load,
    elec_req: it.elec_req,
    heat_dissip: it.heat_dissip,
    mech_req: it.mech_req,
    str_load: it.str_load,
    scope_note: it.scope_note,
  });

  const newItems = parsed.items.filter((it) => !known.has(it.item_code)).map((it) => ({
    ...describe(it),
    package_id: pkgId.get(it.pkg) ?? null,
    flagged: it.flagged,
    medical_device: isMedicalPackage(it.pkg),
  }));
  const updItems = parsed.items.filter((it) => known.has(it.item_code)).map(describe);

  for (const part of chunks(newItems, 200)) {
    const { error } = await supabase.from("proc_items").insert(part);
    if (error) return NextResponse.json({ error: "Artikelen toevoegen mislukt: " + error.message }, { status: 500 });
  }
  for (const part of chunks(updItems, 200)) {
    const { error } = await supabase.from("proc_items").upsert(part, { onConflict: "project_id,item_code" });
    if (error) return NextResponse.json({ error: "Artikelen bijwerken mislukt: " + error.message }, { status: 500 });
  }

  const { data: allItems } = await supabase.from("proc_items").select("id, item_code").eq("project_id", projectId).range(0, 9999);
  const itemId = new Map((allItems ?? []).map((i) => [i.item_code, i.id]));
  const inList = new Set(parsed.items.map((i) => i.item_code));
  const removed = (allItems ?? []).filter((i) => !inList.has(i.item_code)).length;

  // 3. Ruimteregels vervangen.
  const { error: delError } = await supabase.from("proc_room_lines").delete().eq("project_id", projectId);
  if (delError) return NextResponse.json({ error: "Oude ruimteregels verwijderen mislukt: " + delError.message }, { status: 500 });

  const rows = parsed.lines.map((l) => ({
    project_id: projectId,
    item_id: itemId.get(l.item_code)!,
    level: l.level,
    department: l.department,
    room_name: l.room_name,
    room_number: l.room_number,
    qty: l.qty,
  }));
  for (const part of chunks(rows, 500)) {
    const { error } = await supabase.from("proc_room_lines").insert(part);
    if (error) return NextResponse.json({ error: "Ruimteregels toevoegen mislukt: " + error.message }, { status: 500 });
  }

  return NextResponse.json({
    sheet: parsed.sheet,
    document: doc.name,
    items: parsed.items.length,
    newItems: newItems.length,
    updatedItems: updItems.length,
    flagged: newItems.filter((i) => i.flagged).length,
    lines: rows.length,
    notInListAnymore: removed,
  });
}
