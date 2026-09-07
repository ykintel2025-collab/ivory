-- ============================================================
-- MIGRATIE: globale classificaties (los van per-project rechten).
--
--   master  = jij. Ziet/doet alles, inclusief classificaties beheren.
--   main    = ziet/werkt overal (alle projecten, alle onderdelen),
--             maar kan classificaties niet wijzigen.
--   user    = standaard. Toegang precies zoals nu al werkt: per
--             project apart toegevoegd, met eigen rechten.
-- ============================================================

alter table profiles add column if not exists global_role text not null default 'user'
  check (global_role in ('master','main','user'));

-- Master en Main krijgen automatisch toegang tot ALLE projecten,
-- ook nieuwe projecten in de toekomst -- zonder dat ze apart
-- toegevoegd hoeven te worden.
create or replace function public.is_project_member(p_project_id uuid)
returns boolean as $$
  select
    exists (
      select 1 from profiles
      where id = auth.uid() and approved = true and global_role in ('master','main')
    )
    or exists (
      select 1 from project_members pm
      join profiles p on p.id = pm.user_id
      where pm.project_id = p_project_id
        and pm.user_id = auth.uid()
        and p.approved = true
    );
$$ language sql stable security definer set search_path = public;

create or replace function public.has_section_access(p_project_id uuid, p_section text)
returns boolean as $$
  select
    exists (
      select 1 from profiles
      where id = auth.uid() and approved = true and global_role in ('master','main')
    )
    or exists (
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

-- Beveiliging: classificatie ("global_role") en actief/geblokkeerd
-- ("approved") kunnen alleen door een Master worden gewijzigd, ook
-- niet door mensen zelf voor hun eigen account. Dit geldt ongeacht
-- via welke weg het verzoek binnenkomt.
create or replace function public.protect_profile_admin_fields()
returns trigger as $$
declare
  v_is_master boolean;
begin
  select (global_role = 'master') into v_is_master
  from profiles where id = auth.uid();

  if not coalesce(v_is_master, false) then
    new.global_role := old.global_role;
    new.approved := old.approved;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists protect_admin_fields on profiles;
create trigger protect_admin_fields
before update on profiles
for each row execute procedure public.protect_profile_admin_fields();

-- ============================================================
-- Zet hieronder jezelf op 'master'. Vervang de e-mail door die van
-- jou zoals die in Supabase -> Authentication -> Users staat.
-- ============================================================
update profiles set global_role = 'master'
where id = (select id from auth.users where email = 'ibrahim@ivory.nl');

-- Optioneel: zet Jan meteen op 'main'. Vervang het e-mailadres.
-- update profiles set global_role = 'main'
-- where id = (select id from auth.users where email = 'JAN-EMAIL-HIER');
