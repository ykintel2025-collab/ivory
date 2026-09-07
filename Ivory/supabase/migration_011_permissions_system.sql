-- ============================================================
-- MIGRATIE: rechtensysteem. Elk teamlid krijgt een toegangsniveau
-- ("volledig" of "beperkt"). Bij "beperkt" bepaalt de eigenaar
-- exact welke onderdelen zichtbaar zijn. Dit wordt afgedwongen op
-- databaseniveau, niet alleen in het scherm.
-- ============================================================

alter table project_members add column if not exists access_level text not null default 'volledig' check (access_level in ('volledig','beperkt'));
alter table project_members add column if not exists allowed_sections text[] not null default '{}';

create or replace function public.has_section_access(p_project_id uuid, p_section text)
returns boolean as $$
  select exists (
    select 1 from project_members
    where project_id = p_project_id
      and user_id = auth.uid()
      and (
        access_level = 'volledig'
        or (access_level = 'beperkt' and p_section = any(allowed_sections))
      )
  );
$$ language sql stable security definer set search_path = public;

-- Risico's
drop policy if exists "Leden volledige toegang" on risks;
drop policy if exists "Toegang o.b.v. rechten" on risks;
create policy "Toegang o.b.v. rechten" on risks
  for all using (has_section_access(project_id, 'risks'))
  with check (has_section_access(project_id, 'risks'));

-- Scope
drop policy if exists "Leden volledige toegang" on scope_items;
drop policy if exists "Toegang o.b.v. rechten" on scope_items;
create policy "Toegang o.b.v. rechten" on scope_items
  for all using (has_section_access(project_id, 'scope'))
  with check (has_section_access(project_id, 'scope'));

-- Registraties
drop policy if exists "Leden volledige toegang" on registrations;
drop policy if exists "Toegang o.b.v. rechten" on registrations;
create policy "Toegang o.b.v. rechten" on registrations
  for all using (has_section_access(project_id, 'tracker'))
  with check (has_section_access(project_id, 'tracker'));

-- Apparatuur
drop policy if exists "Leden volledige toegang" on equipment_items;
drop policy if exists "Toegang o.b.v. rechten" on equipment_items;
create policy "Toegang o.b.v. rechten" on equipment_items
  for all using (has_section_access(project_id, 'suppliers'))
  with check (has_section_access(project_id, 'suppliers'));

-- Taken (losse taken zonder project blijven voor iedereen open)
drop policy if exists "Toegang tot taken" on tasks;
create policy "Toegang tot taken" on tasks
  for all using (
    project_id is null or has_section_access(project_id, 'tasks')
  )
  with check (
    project_id is null or has_section_access(project_id, 'tasks')
  );

-- Documenten (niet-toegewezen documenten blijven voor iedereen open)
drop policy if exists "Toegang tot documenten" on documents;
create policy "Toegang tot documenten" on documents
  for all using (
    project_id is null or has_section_access(project_id, 'documents')
  )
  with check (
    project_id is null or has_section_access(project_id, 'documents')
  );

-- Partijen
drop policy if exists "Leden volledige toegang" on project_contacts;
drop policy if exists "Toegang o.b.v. rechten" on project_contacts;
create policy "Toegang o.b.v. rechten" on project_contacts
  for all using (has_section_access(project_id, 'parties'))
  with check (has_section_access(project_id, 'parties'));

drop policy if exists "Leden volledige toegang" on external_blockers;
drop policy if exists "Toegang o.b.v. rechten" on external_blockers;
create policy "Toegang o.b.v. rechten" on external_blockers
  for all using (has_section_access(project_id, 'parties'))
  with check (has_section_access(project_id, 'parties'));

drop policy if exists "Leden volledige toegang" on communication_log;
drop policy if exists "Toegang o.b.v. rechten" on communication_log;
create policy "Toegang o.b.v. rechten" on communication_log
  for all using (has_section_access(project_id, 'parties'))
  with check (has_section_access(project_id, 'parties'));

-- Budget
drop policy if exists "Leden volledige toegang" on budget_snapshot;
drop policy if exists "Toegang o.b.v. rechten" on budget_snapshot;
create policy "Toegang o.b.v. rechten" on budget_snapshot
  for all using (has_section_access(project_id, 'budget'))
  with check (has_section_access(project_id, 'budget'));

-- ============================================================
-- Alleen de eigenaar mag teamleden toevoegen/wijzigen/verwijderen
-- (voorkomt dat taken-toewijzing "stiekem" iemand toevoegt)
-- ============================================================

drop policy if exists "Ingelogde gebruikers voegen zichzelf toe" on project_members;
drop policy if exists "Eigenaar beheert leden" on project_members;
create policy "Eigenaar beheert leden" on project_members
  for insert
  with check (
    exists (
      select 1 from project_members pm
      where pm.project_id = project_members.project_id
        and pm.user_id = auth.uid()
        and pm.role = 'eigenaar'
    )
  );

drop policy if exists "Leden beheren projectleden" on project_members;
drop policy if exists "Eigenaar bewerkt leden" on project_members;
create policy "Eigenaar bewerkt leden" on project_members
  for update using (
    exists (
      select 1 from project_members pm
      where pm.project_id = project_members.project_id
        and pm.user_id = auth.uid()
        and pm.role = 'eigenaar'
    )
  );

drop policy if exists "Leden verwijderen projectleden" on project_members;
drop policy if exists "Eigenaar verwijdert leden" on project_members;
create policy "Eigenaar verwijdert leden" on project_members
  for delete using (
    exists (
      select 1 from project_members pm
      where pm.project_id = project_members.project_id
        and pm.user_id = auth.uid()
        and pm.role = 'eigenaar'
    )
  );
