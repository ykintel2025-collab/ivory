-- ============================================================
-- MIGRATIE 018: schakelaar voor verplichte tweestapsverificatie.
--
-- De Master kan in Instellingen tweestapsverificatie (tijdelijk)
-- uitzetten en weer aanzetten. Dit werkt op beide lagen tegelijk:
--   * database: is_aal2() geeft ook "waar" als de schakelaar uit staat,
--     zodat de beveiligingsregels "Tweestapsverificatie verplicht"
--     gegevens vrijgeven met alleen een wachtwoord;
--   * app: de middleware stuurt niet meer door naar het instellen of
--     invoeren van de code (leest twofa_required()).
-- Alleen een Master (actief) kan de schakelaar omzetten; elke wijziging
-- komt in audit.log.
-- Plak in SQL Editor van het Ivory-project -> Run.
-- ============================================================
begin;

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.app_settings enable row level security;

insert into public.app_settings (key, value) values ('twofa_required', 'true'::jsonb)
on conflict (key) do nothing;

drop policy if exists "Instellingen lezen" on public.app_settings;
create policy "Instellingen lezen" on public.app_settings for select to authenticated using (true);
revoke insert, update, delete, truncate on public.app_settings from anon, authenticated;

drop trigger if exists zz_audit on public.app_settings;
create trigger zz_audit after insert or update or delete on public.app_settings
  for each row execute procedure audit.log_change();

-- Staat verplichte tweestapsverificatie aan? (standaard: ja)
create or replace function public.twofa_required()
returns boolean as $$
  select coalesce((select (value #>> '{}')::boolean from public.app_settings where key = 'twofa_required'), true);
$$ language sql stable security definer set search_path = public;
revoke all on function public.twofa_required() from public;
grant execute on function public.twofa_required() to anon, authenticated;

-- Bestaande functie, nu met schakelaar.
create or replace function public.is_aal2()
returns boolean as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2' or not public.twofa_required();
$$ language sql stable;

-- Omzetten: alleen een actieve Master.
create or replace function public.set_twofa_required(p_on boolean)
returns void as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and global_role = 'master' and approved) then
    raise exception 'Alleen een Master kan tweestapsverificatie aan- of uitzetten';
  end if;
  update public.app_settings set value = to_jsonb(p_on), updated_at = now(), updated_by = auth.uid()
  where key = 'twofa_required';
end;
$$ language plpgsql security definer set search_path = public;
revoke all on function public.set_twofa_required(boolean) from public, anon;
grant execute on function public.set_twofa_required(boolean) to authenticated;

commit;

select 'Schakelaar tweestapsverificatie geïnstalleerd (staat AAN)' as resultaat;
