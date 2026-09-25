-- ============================================================
-- MIGRATIE 014: Inkoop (stamlijst -> artikelen -> inkooppakketten)
--   proc_packages    inkooppakketten per project (leveranciersselectie)
--   proc_items       unieke artikelen (artikelcode) met totaal aantal, specs en inkoopstatus
--   proc_room_lines  originele stamlijstregels: artikel x ruimte (levering/installatie)
--   proc_suppliers   leveranciers per pakket (longlist -> gunning)
-- Beveiliging zoals de rest van Ivory: onderdeel 'procurement', tweestaps verplicht,
-- alleen Master verwijdert, alles in audit.log.
-- ============================================================
begin;

create table if not exists public.proc_packages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  sort int not null default 100,
  status text not null default 'concept'
    check (status in ('concept', 'longlist', 'rfq', 'offertes', 'evaluatie', 'gegund', 'besteld', 'geleverd')),
  medical boolean not null default false,
  owner_id uuid references public.profiles(id) on delete set null,
  deadline date,
  notes text,
  created_at timestamptz not null default now(),
  unique (project_id, key)
);

create table if not exists public.proc_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  package_id uuid references public.proc_packages(id) on delete set null,
  item_code text not null,
  description text not null,
  family text,
  total_qty int not null default 0,
  dept_count int not null default 0,
  room_count int not null default 0,
  elec_load text,
  elec_req text,
  heat_dissip text,
  mech_req text,
  str_load text,
  scope_note text,
  medical_device boolean not null default false,
  flagged boolean not null default false,
  status text not null default 'te_specificeren'
    check (status in ('te_specificeren', 'gespecificeerd', 'in_rfq', 'offerte', 'gegund', 'besteld', 'geleverd', 'geinstalleerd')),
  supplier text,
  brand_model text,
  unit_price numeric,
  currency text not null default 'EUR',
  lead_time_weeks int,
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (project_id, item_code)
);

create table if not exists public.proc_room_lines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  item_id uuid not null references public.proc_items(id) on delete cascade,
  level text,
  department text,
  room_name text,
  room_number text,
  qty int not null default 0,
  delivered boolean not null default false,
  installed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.proc_suppliers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  package_id uuid not null references public.proc_packages(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  name text not null,
  stage text not null default 'longlist'
    check (stage in ('longlist', 'shortlist', 'rfq_verstuurd', 'offerte_ontvangen', 'afgewezen', 'gegund')),
  quote_amount numeric,
  currency text not null default 'EUR',
  quote_date date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists proc_items_project_idx on public.proc_items(project_id);
create index if not exists proc_items_package_idx on public.proc_items(package_id);
create index if not exists proc_room_lines_item_idx on public.proc_room_lines(item_id);
create index if not exists proc_room_lines_project_dept_idx on public.proc_room_lines(project_id, department);
create index if not exists proc_suppliers_package_idx on public.proc_suppliers(package_id);

-- updated_at bijhouden op artikelen
create or replace function public.proc_touch_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists proc_items_touch on public.proc_items;
create trigger proc_items_touch before update on public.proc_items
for each row execute procedure public.proc_touch_updated_at();

-- ===== Beveiliging =====
do $$
declare t text;
begin
  foreach t in array array['proc_packages', 'proc_items', 'proc_room_lines', 'proc_suppliers'] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "Toegang o.b.v. rechten" on public.%I', t);
    execute format('create policy "Toegang o.b.v. rechten" on public.%I for all using (public.has_section_access(project_id, %L)) with check (public.has_section_access(project_id, %L))', t, 'procurement', 'procurement');

    execute format('drop policy if exists "Alleen Master verwijdert" on public.%I', t);
    execute format('create policy "Alleen Master verwijdert" on public.%I as restrictive for delete using (public.is_master())', t);

    execute format('drop policy if exists "Tweestapsverificatie verplicht" on public.%I', t);
    execute format('create policy "Tweestapsverificatie verplicht" on public.%I as restrictive for all using (public.is_aal2()) with check (public.is_aal2())', t);

    execute format('drop trigger if exists zz_audit on public.%I', t);
    execute format('create trigger zz_audit after insert or update or delete on public.%I for each row execute procedure audit.log_change()', t);
  end loop;
end $$;

commit;
