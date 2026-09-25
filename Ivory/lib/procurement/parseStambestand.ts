import ExcelJS from "exceljs";
import { classify, familyOf } from "./classify";

export type RoomLine = {
  level: string | null;
  department: string | null;
  room_name: string | null;
  room_number: string | null;
  item_code: string;
  qty: number;
};

export type ParsedItem = {
  item_code: string;
  description: string;
  family: string;
  total_qty: number;
  dept_count: number;
  room_count: number;
  elec_load: string | null;
  elec_req: string | null;
  heat_dissip: string | null;
  mech_req: string | null;
  str_load: string | null;
  scope_note: string | null;
  pkg: string;
  flagged: boolean;
};

const HEADERS = {
  level: ["LEVEL"],
  department: ["DEPARTMENT"],
  room_name: ["ROOM NAME"],
  room_number: ["ROOM NUMBER"],
  item_code: ["ITEM CODE"],
  description: ["ITEM DESCRIPTION"],
  qty: ["QTY.", "QTY", "QUANTITY"],
  elec_load: ["ELEC. LOAD"],
  elec_req: ["ELEC. REQ."],
  heat_dissip: ["HEAT DISSIP."],
  mech_req: ["MECH. REQ."],
  str_load: ["STR. LOAD"],
  scope: ["IVORY SCOPE"],
};

function cellText(v: any): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") v = v.result ?? v.text ?? (v.richText ? v.richText.map((r: any) => r.text).join("") : null);
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

// Leest de stamlijst (Room Equipment List) en geeft unieke artikelen + ruimteregels terug.
export async function parseStambestand(buffer: ArrayBuffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);

  for (const ws of wb.worksheets) {
    const header = (ws.getRow(1).values as any[]).map((v) => (cellText(v) ?? "").toUpperCase());
    const col: Record<string, number> = {};
    for (const [key, names] of Object.entries(HEADERS)) {
      const idx = header.findIndex((h) => names.includes(h));
      if (idx > 0) col[key] = idx;
    }
    if (!col.item_code || !col.description || !col.qty) continue;

    const lines: RoomLine[] = [];
    const items = new Map<string, ParsedItem & { depts: Set<string>; rooms: Set<string>; notes: Set<string> }>();

    ws.eachRow((row, i) => {
      if (i === 1) return;
      const v = row.values as any[];
      const code = cellText(v[col.item_code]);
      if (!code) return; // subtotaal- of lege regel
      const desc = cellText(v[col.description]) ?? "";
      const qty = Number(cellText(v[col.qty]) ?? 0) || 0;
      const dept = col.department ? cellText(v[col.department]) : null;
      const roomNo = col.room_number ? cellText(v[col.room_number]) : null;
      const scope = col.scope ? cellText(v[col.scope]) : null;

      lines.push({
        level: col.level ? cellText(v[col.level]) : null,
        department: dept,
        room_name: col.room_name ? cellText(v[col.room_name]) : null,
        room_number: roomNo,
        item_code: code,
        qty,
      });

      let it = items.get(code);
      if (!it) {
        const c = classify(code, desc);
        it = {
          item_code: code,
          description: desc,
          family: familyOf(desc),
          total_qty: 0,
          dept_count: 0,
          room_count: 0,
          elec_load: col.elec_load ? cellText(v[col.elec_load]) : null,
          elec_req: col.elec_req ? cellText(v[col.elec_req]) : null,
          heat_dissip: col.heat_dissip ? cellText(v[col.heat_dissip]) : null,
          mech_req: col.mech_req ? cellText(v[col.mech_req]) : null,
          str_load: col.str_load ? cellText(v[col.str_load]) : null,
          scope_note: null,
          pkg: c.pkg,
          flagged: c.flagged,
          depts: new Set(),
          rooms: new Set(),
          notes: new Set(),
        };
        items.set(code, it);
      }
      it.total_qty += qty;
      if (dept) it.depts.add(dept);
      if (roomNo) it.rooms.add(roomNo);
      if (scope && scope !== "Ja") it.notes.add(scope.replace(/^Ja\s*[—-]\s*/, ""));
    });

    const parsed: ParsedItem[] = [...items.values()].map(({ depts, rooms, notes, ...rest }) => ({
      ...rest,
      dept_count: depts.size,
      room_count: rooms.size,
      scope_note: notes.size ? [...notes].join("; ") : null,
    }));

    return { sheet: ws.name, items: parsed, lines };
  }

  throw new Error("Geen stamlijst gevonden: kolommen 'Item Code', 'Item Description' en 'Qty.' ontbreken.");
}
