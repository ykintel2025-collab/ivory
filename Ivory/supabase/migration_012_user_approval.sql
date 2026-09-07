-- ============================================================
-- MIGRATIE: gebruikers kunnen actief/geblokkeerd gezet worden.
-- Dit werkt als centrale schakelaar -- geblokkeerd betekent geen
-- toegang tot ENIG project, ongeacht bij hoeveel projecten iemand
-- al is toegevoegd.
-- ============================================================

alter table profiles add column if not exists approved boolean not null default true;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean as $$
  select exists (
    select 1 from project_members pm
    join profiles p on p.id = pm.user_id
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and p.approved = true
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.has_section_access(p_project_id uuid, p_section text)
returns boolean as $$
  select exists (
    select 1 from project_members pm
    join profiles p on p.id = pm.user_id
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
      and p.approved = true
      and (
        pm.access_level = 'volledig'
        or (pm.access_level = 'beperkt' and p_section = any(pm.allowed_sections))
      )
  );
$$ language sql stable security definer set search_path = public;
