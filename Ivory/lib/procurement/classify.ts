// Automatische indeling van stamlijst-artikelen in inkooppakketten.
// Volgorde: specifieke artikelcode-prefixen, dan trefwoorden in de omschrijving, dan een terugval per prefix.
// Alles wat via de terugval is ingedeeld, wordt gemarkeerd (flagged) om te controleren.

export type PackageDef = { key: string; name: string; description: string; medical: boolean; sort: number };

export const PACKAGES: PackageDef[] = [
  { key: "imaging", name: "Beeldvorming", description: "Röntgen, echografie, CT, mobiele röntgen en toebehoren", medical: true, sort: 10 },
  { key: "monitoring", name: "Patiëntbewaking & life support", description: "Monitoren, beademing, defibrillatoren, infuuspompen, anesthesie", medical: true, sort: 20 },
  { key: "gases", name: "Medische gassen & plafondvoorzieningen", description: "Bedhead-units, pendanten, flowmeters, dialysepanelen", medical: true, sort: 30 },
  { key: "diagnostics", name: "Diagnostiek (oog & KNO)", description: "Oogheelkunde, KNO, audiologie en diagnostische wandstations", medical: true, sort: 35 },
  { key: "or", name: "OK & behandelverlichting", description: "OK-lampen, OK-tafels, onderzoekslampen", medical: true, sort: 40 },
  { key: "lab", name: "Laboratorium", description: "Analyzers, centrifuges, microscopen, zuurkasten, labmeubilair", medical: true, sort: 50 },
  { key: "cssd", name: "CSSD / sterilisatie", description: "Sterilisatoren, washer-disinfectors, sealers, CSSD-wagens", medical: true, sort: 60 },
  { key: "cold", name: "Medische koeling", description: "Koelkasten en vriezers voor apotheek, lab en bloed", medical: true, sort: 65 },
  { key: "beds", name: "Bedden & patiëntvervoer", description: "Bedden, brancards, rolstoelen, tilliften", medical: true, sort: 70 },
  { key: "medfurn", name: "Medisch meubilair & trolleys", description: "Behandeltafels, krukken, trolleys, medisch klein-inventaris", medical: true, sort: 80 },
  { key: "casework", name: "Kast- en werkbladsystemen", description: "Kastmodules, apotheekkasten, stellingen en rekken", medical: false, sort: 90 },
  { key: "office", name: "Kantoor- & algemeen meubilair", description: "Stoelen, bureaus, tafels, lockers, banken", medical: false, sort: 100 },
  { key: "sanitary", name: "Sanitair", description: "Wastafels, spoelbakken, uitstortgootstenen, baden", medical: false, sort: 110 },
  { key: "wall", name: "Wandaccessoires & afval", description: "Dispensers, afvalbakken, haken, grepen, spiegels", medical: false, sort: 120 },
  { key: "ict", name: "ICT & audiovisueel", description: "Werkplekken, printers, televisies, schermen", medical: false, sort: 130 },
  { key: "facility", name: "Facilitair & schoonmaak", description: "Schoonmaakmachines, wasserij, keuken", medical: false, sort: 140 },
  { key: "dental", name: "Tandheelkunde", description: "Tandartsunits, compressoren, afzuiging", medical: true, sort: 150 },
  { key: "rehab", name: "Revalidatie & fysiotherapie", description: "Fysiotherapiebanken, elektrotherapie, oefenapparatuur", medical: true, sort: 160 },
  { key: "morgue", name: "Mortuarium", description: "Koelcellen, lijkbrancards, sectietafels", medical: false, sort: 170 },
  { key: "workshop", name: "Technische werkplaats", description: "Meetapparatuur en gereedschap voor de medische techniek", medical: false, sort: 180 },
];

type Rule = { pkg: string; prefix?: string[]; words?: string[] };

// Sterke regels: code-prefixen die eenduidig zijn.
const PREFIX_RULES: Rule[] = [
  { pkg: "imaging", prefix: ["RD"] },
  { pkg: "lab", prefix: ["LA", "LF"] },
  { pkg: "cssd", prefix: ["ST"] },
  { pkg: "gases", prefix: ["BH", "UM"] },
  { pkg: "dental", prefix: ["DE"] },
  { pkg: "rehab", prefix: ["PT"] },
  { pkg: "morgue", prefix: ["MO"] },
  { pkg: "workshop", prefix: ["WS"] },
  { pkg: "wall", prefix: ["MW"] },
  { pkg: "casework", prefix: ["CM", "AC"] },
];

// Trefwoorden in de omschrijving (eerste treffer wint, volgorde telt).
const WORD_RULES: Rule[] = [
  { pkg: "imaging", words: ["X-RAY", "RADIOGRAPH", "ULTRASOUND", "SCANNER", "MAMMOGRA", "FLUOROSCOP", "C-ARM", "DENSITOMETER", "VIEW CONSOLE", "LEAD APRON", "IMAGING"] },
  { pkg: "diagnostics", words: ["RETINOSCOPE", "SLIT LAMP", "TONOMETER", "REFRACTOMETER", "KERATOMETER", "TRIAL LENS", "OPHTHALM", "ENT TREATMENT", "NASOPHARYNGOSCOPE", "OTO ACOUSTIC", "OTOSCOPE", "AUDIOMETER", "DIAGNOSTIC STATION", "PERIMETER", "FUNDUS"] },
  { pkg: "cold", words: ["REFRIGERATOR", "FREEZER", "BLOOD BANK", "PLASMA"] },
  { pkg: "monitoring", words: ["MONITOR", "PHYSIOLOGIC", "VENTILATOR", "DEFIBRILLATOR", "INFUSION", "SYRINGE PUMP", "PUMP", "ANAESTHE", "ANESTHE", "SUCTION", "ELECTROCARDIOGRAPH", "ECG", "OXIMETER", "INCUBATOR, INFANT", "INCUBATOR", "INFANT WARMER", "WARMER", "PHOTOTHERAPY", "CTG", "CARDIOTOCOGRAPH", "DIALYSIS MACHINE", "HAEMODIALYSIS", "HEMODIALYSIS", "NEBULIZER", "ELECTROSURGICAL", "DIATHERMY", "SPHYGMOMANOMETER", "BLOOD PRESSURE", "STETHOSCOPE", "LARYNGOSCOPE", "ENDOSCOP", "DOPPLER", "SPIROMETER", "BIPAP", "CPAP", "RESUSCITATOR", "WARMING", "COMPRESSION UNIT", "THERMOMETER", "ENTONOX"] },
  { pkg: "gases", words: ["PENDANT", "BEDHEAD", "CONSOLE WALL", "FLOWMETER", "OXYGEN", "MEDICAL GAS", "VACUUM REGULATOR", "DIALYSIS PANEL"] },
  { pkg: "or", words: ["THEATRE", "OPERATING TABLE", "OPERATING LIGHT", "SURGICAL LIGHT", "LIGHT, SURGICAL", "LIGHT, EXAMINATION", "EXAMINATION LIGHT", "LIGHT, OPERATING", "LIGHT"] },
  { pkg: "lab", words: ["ANALYZER", "ANALYSER", "CENTRIFUGE", "MICROSCOPE", "HOOD", "LABORATORY", "LAB UNIT", "WATER BATH", "INCUBATOR, LAB", "PIPETTE", "COAGULOMETER", "BIOSAFETY", "SHAKER", "MIXER"] },
  { pkg: "cssd", words: ["STERILIZER", "STERILISER", "WASHER", "DISINFECTOR", "SEALER", "AUTO-READER", "INSPECTION LAMP", "ULTRASONIC CLEANER", "PREP-PACK"] },
  { pkg: "beds", words: ["BED,", "BED ", "STRETCHER", "WHEELCHAIR", "HOIST", "PATIENT LIFT", "CRIB", "COT", "BASSINET", "TRANSFER"] },
  { pkg: "ict", words: ["WORKSTATION", "WORSTATION", "COMPUTER", "PRINTER", "TELEVISION", "MONITOR, LCD", "SCREEN, LCD", "NURSE CALL", "TELEPHONE", "PROJECTOR", "BARCODE", "SCANNER, BARCODE"] },
  { pkg: "sanitary", words: ["SINK", "BASIN", "HOPPER", "BATH", "SHOWER", "WATER CLOSET", "WC", "URINAL", "TAP", "MIXER TAP", "BIDET"] },
  { pkg: "wall", words: ["DISPENSER", "BIN", "HOOK", "BARS", "GRAB BAR", "HAMPER", "MIRROR", "WASTE", "CLOCK", "HOLDER", "SHARPS", "BOARD", "NOTICE", "TRAY, LETTER"] },
  { pkg: "facility", words: ["SCRUBBING", "POLISHING", "VACUUM CLEANER", "LAUNDRY", "WASHING MACHINE", "DRYER", "IRONER", "KITCHEN", "DISHWASHER", "COOKER", "OVEN", "MICROWAVE", "WATER COOLER"] },
  { pkg: "casework", words: ["CASE WORK", "CASEWORK", "CABINETRY", "CABINET MODULE", "CABINET", "SHELVING", "SHELF", "RACK", "COUNTER", "STORAGE"] },
  { pkg: "medfurn", words: ["TROLLEY", "CART", "STOOL", "COUCH", "EXAMINATION", "IV POLE", "IV STAND", "INFUSION STAND", "BOWL", "STEP", "SCREEN", "TRACK", "SCALE", "WEIGHING", "TABLE, OVERBED", "OVERBED", "BEDSIDE", "FOOTSTOOL", "BUCKET", "MAYO", "CAST CUTTER"] },
  { pkg: "office", words: ["CHAIR", "DESK", "TABLE", "LOCKER", "BENCH", "SOFA", "SEATING", "BOOKCASE", "FILING", "WARDROBE"] },
];

// Terugval per prefix als geen regel past (altijd gemarkeerd).
const FALLBACK: Record<string, string> = {
  ME: "medfurn", DA: "wall", FG: "office", ID: "office", US: "sanitary", FH: "medfurn", IT: "ict",
};

export function familyOf(description: string): string {
  return description.split(",")[0].trim().toUpperCase();
}

function hasWord(desc: string, w: string): boolean {
  if (w.endsWith(",") || w.endsWith(" ")) return desc.includes(w) || desc.startsWith(w.trim());
  return new RegExp("(^|[^A-Z])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(desc);
}

export function classify(code: string, description: string): { pkg: string; flagged: boolean } {
  const c = code.trim().toUpperCase();
  const d = description.trim().toUpperCase();
  const p2 = c.slice(0, 2);

  for (const r of PREFIX_RULES) if (r.prefix!.includes(p2)) return { pkg: r.pkg, flagged: false };

  const fam = familyOf(d);
  // Eerst op de productfamilie (eerste deel van de omschrijving), daarna op de hele omschrijving.
  for (const target of [fam, d]) {
    for (const r of WORD_RULES) for (const w of r.words!) if (hasWord(target, w)) return { pkg: r.pkg, flagged: false };
  }

  return { pkg: FALLBACK[p2] ?? "medfurn", flagged: true };
}

export function isMedicalPackage(key: string): boolean {
  return PACKAGES.find((p) => p.key === key)?.medical ?? false;
}
