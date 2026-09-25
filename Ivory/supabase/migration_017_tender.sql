-- ============================================================
-- MIGRATIE 017: Tender / Aanbiedingen (hoofdaannemer zoeken)
--   proc_bidders       kandidaten die benaderd worden (partij + fase)
--   proc_bids          aanbiedingen per kandidaat (meerdere versies mogelijk)
--   proc_bid_coverage  dekking per categorie (inkooppakket) per aanbieding
--   proc_criteria      eigen evaluatiecriteria met weging
--   proc_bid_scores    score per aanbieding per criterium (0-10)
--   proc_offers        voorstellen aan de opdrachtgever (op basis van een aanbieding)
-- Beveiliging zoals Inkoop: onderdeel 'procurement', tweestaps, alleen Master verwijdert, logboek.
-- ============================================================
begin;

create table if not exists public.proc_bidders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  stage text not null default 'benaderd'
    check (stage in ('benaderd', 'info_verstuurd', 'rfq_verstuurd', 'vragenronde', 'aanbieding_ontvangen', 'in_evaluatie', 'geselecteerd', 'afgewezen', 'teruggetrokken')),
  invited_at date,
  deadline date,
  received_at date,
  notes text,
  created_at timestamptz not null default now(),
  unique (project_id, contact_id)
);

create table if not exists public.proc_bids (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  bidder_id uuid not null references public.proc_bidders(id) on delete cascade,
  label text not null default 'Aanbieding 1',
  received_at date,
  total_amount numeric,
  currency text not null default 'EUR',
  valid_until date,
  lead_time_weeks int,
  warranty_months int,
  incl_installation boolean not null default false,
  incl_training boolean not null default false,
  incl_registration boolean not null default false,
  incl_maintenance boolean not null default false,
  service_terms text,
  payment_terms text,
  document_id uuid references public.documents(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.proc_bid_coverage (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  bid_id uuid not null references public.proc_bids(id) on delete cascade,
  package_id uuid not null references public.proc_packages(id) on delete cascade,
  coverage text not null default 'onbekend' check (coverage in ('volledig', 'gedeeltelijk', 'niet', 'onbekend')),
  amount numeric,
  brands text,
  notes text,
  unique (bid_id, package_id)
);

create table if not exists public.proc_criteria (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text,
  weight numeric not null default 10 check (weight >= 0),
  sort int not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.proc_bid_scores (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  bid_id uuid not null references public.proc_bids(id) on delete cascade,
  criterion_id uuid not null references public.proc_criteria(id) on delete cascade,
  score numeric check (score >= 0 and score <= 10),
  note text,
  unique (bid_id, criterion_id)
);

create table if not exists public.proc_offers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  description text,
  bid_id uuid references public.proc_bids(id) on delete set null,
  status text not null default 'concept' check (status in ('concept', 'verstuurd', 'in_beraad', 'gekozen', 'afgewezen')),
  sent_at date,
  decided_at date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists proc_bids_bidder_idx on public.proc_bids(bidder_id);
create index if not exists proc_bid_coverage_bid_idx on public.proc_bid_coverage(bid_id);
create index if not exists proc_bid_scores_bid_idx on public.proc_bid_scores(bid_id);

do $$
declare t text;
begin
  foreach t in array array['proc_bidders', 'proc_bids', 'proc_bid_coverage', 'proc_criteria', 'proc_bid_scores', 'proc_offers'] loop
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
