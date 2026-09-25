-- ============================================================
-- MIGRATIE 015: Goedkeuringen (registratie medische hulpmiddelen) op inkoopartikelen
--   - regelgevingscategorie per artikel (geen / klasse I, IIa, IIb, III / IVD / nagaan)
--   - registratiestatus, instantie, nummer, datums
--   - voorstel voor bestaande artikelen (reg_confirmed = false: nog te bevestigen)
--   - bestelslot: medisch hulpmiddel kan pas "besteld" als de goedkeuring rond is
-- LET OP: de klassen zijn voorstellen op basis van de omschrijving, geen juridisch oordeel.
-- ============================================================
begin;

alter table public.proc_items
  add column if not exists reg_category text not null default 'nagaan'
    check (reg_category in ('geen', 'klasse_1', 'klasse_2a', 'klasse_2b', 'klasse_3', 'ivd', 'nagaan')),
  add column if not exists reg_confirmed boolean not null default false,
  add column if not exists reg_status text not null default 'nog_starten'
    check (reg_status in ('niet_nodig', 'nog_starten', 'dossier_opvragen', 'ingediend', 'goedgekeurd', 'afgewezen')),
  add column if not exists manufacturer text,
  add column if not exists reg_authority text,
  add column if not exists reg_number text,
  add column if not exists reg_submitted_at date,
  add column if not exists reg_approved_at date,
  add column if not exists reg_expiry date,
  add column if not exists reg_notes text;

-- Voorstel-functie (zelfde logica als lib/procurement/classify.ts -> suggestRegCategory)
create or replace function public.proc_suggest_reg_category(p_medical boolean, p_desc text)
returns text as $$
  select case
    when not p_medical then 'geen'
    -- Eerst het producttype (deel vóór de eerste komma): meubilair/stellingen/eenvoudige hulpmiddelen
    when split_part(p_desc, ',', 1) ~* '^\s*(CABINET|CABINETRY|SHELVING|SHELF|RACK|WORKBENCH|HOOD|LOCKER|DESK|COUNTER|SINK|BASIN|CASE WORK|LADDER|HAMPER|DISPENSER|TABLE|PASS THROUGH)\M' then 'geen'
    when split_part(p_desc, ',', 1) ~* '^\s*(STOOL|STAND|TROLLEY|TROLLY|CART|BED|BEDS|STRETCHER|WHEELCHAIR|COUCH|WALKER|CRUTCH|SCALE|BOWL|STEP|STAIRS|BARS|MIRROR|PULLEY SYSTEM|ERGOMETER|TREADMILL|BICYCLE|CHAIR)\M' then 'klasse_1'
    when p_desc ~* '(ANALYZ|ANALYS|COAGULOMETER|BLOOD GAS|HEMATOLOGY|HAEMATOLOGY|URINALYSIS|ELISA|IMMUNOASSAY)' then 'ivd'
    when p_desc ~* '(VENTILATOR|DEFIBRILLATOR|INFUSION|SYRINGE|ANAESTHE|ANESTHE|X-RAY|RADIOGRAPH|FLUOROSCOP|C-ARM|MAMMOGRA|INCUBATOR, INFANT|INFANT INCUBATOR|INCUBATOR, TRANSPORT|NEONATAL|INFANT WARMER|PHOTOTHERAPY|ELECTROSURGICAL|DIATHERMY|DIALYSIS MACHINE|HAEMODIALYSIS|HEMODIALYSIS|BIPAP|CPAP|RESUSCITATOR)' then 'klasse_2b'
    when p_desc ~* '(MONITOR|PHYSIOLOGIC|ULTRASOUND|SCANNER|ECG|ELECTROCARDIOGRAPH|OXIMETER|FETAL|CARDIOTOCOGRAPH|STERILIZER|STERILISER|WASHER|DISINFECTOR|SUCTION|PENDANT|BEDHEAD|FLOWMETER|CONSOLE WALL|DENTAL|ELECTROTHERAPY|TENS|SLIT LAMP|TONOMETER|REFRACTOMETER|OPERATING TABLE|SURGICAL|THEATRE|ENDOSCOP|NASOPHARYNGOSCOPE|AUDIOMETER|OTO ACOUSTIC|THERMOMETER|WARMING|COMPRESSION UNIT|ENTONOX|OXYGEN|DIALYSIS PANEL|ENT TREATMENT|AMALGAMATOR)' then 'klasse_2a'
    when p_desc ~* '(CABINET|SHELVING|SHELF|RACK|WORKBENCH|HOOD|REFRIGERATOR|FREEZER|LOCKER|DESK|COUNTER|SINK|BASIN|CASE WORK|SEALER|INSPECTION LAMP|DRILL|OSCILLOSCOPE|MULTIMETER|SOLDER|TOOL|TABLE, WORK|WORK TABLE|PASS THROUGH|LADDER|LINEN|SPRAY GUN|HAMPER|DISPENSER)' then 'geen'
    when p_desc ~* '(BED|STRETCHER|WHEELCHAIR|COUCH|STOOL|TROLLEY|CART|EXAMINATION|LIGHT|STETHOSCOPE|SPHYGMOMANOMETER|OPHTHALMOSCOPE|OTOSCOPE|RETINOSCOPE|TRIAL LENS|HOIST|LIFT|SCALE|WEIGHING|STAND|WALKER|CRUTCH|TREADMILL|BICYCLE|PARALLEL BARS|DIAGNOSTIC STATION|CAST CUTTER|BOWL|MAYO)' then 'klasse_1'
    else 'nagaan'
  end;
$$ language sql immutable;

-- Bestaande artikelen: voorstel invullen (alleen waar nog niets bevestigd is)
update public.proc_items
set reg_category = public.proc_suggest_reg_category(medical_device, description),
    reg_confirmed = not medical_device
where not reg_confirmed;

update public.proc_items set reg_status = 'niet_nodig' where reg_category = 'geen';

-- Consistentie + bestelslot
create or replace function public.proc_items_reg_guard()
returns trigger as $$
begin
  -- Nieuw artikel (bv. via import): automatisch voorstel voor de categorie
  if tg_op = 'INSERT' and not new.reg_confirmed then
    new.reg_category := public.proc_suggest_reg_category(new.medical_device, new.description);
    new.reg_confirmed := not new.medical_device;
  end if;

  new.medical_device := new.reg_category <> 'geen';

  if new.reg_category = 'geen' then
    new.reg_status := 'niet_nodig';
  elsif new.reg_status = 'niet_nodig' then
    new.reg_status := 'nog_starten';
  end if;

  if new.status in ('besteld', 'geleverd', 'geinstalleerd')
     and new.reg_category <> 'geen'
     and new.reg_status <> 'goedgekeurd' then
    raise exception using
      errcode = 'P0001',
      message = 'BESTELSLOT: goedkeuring voor dit medisch hulpmiddel is nog niet rond (' || new.item_code || ')';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists proc_items_reg_guard on public.proc_items;
create trigger proc_items_reg_guard before insert or update on public.proc_items
for each row execute procedure public.proc_items_reg_guard();

create index if not exists proc_items_reg_idx on public.proc_items(project_id, reg_category, reg_status);

commit;
