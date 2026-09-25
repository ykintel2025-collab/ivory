-- ============================================================
-- MIGRATIE 016: Partijen & Communicatie herzien
--   contacts          + categorie (soort partij), website, land
--   project_contacts  + party_role (rol in dit project)
--   communication_log + kanaal, richting, onderwerp, contactpersoon, vervolgactie -> taak
--   tasks             + gekoppelde partij, "wacht op partij", bron
-- Een vervolgactie bij een contactmoment wordt automatisch een taak (zelfde project,
-- eigenaar, deadline, gekoppeld aan de partij). "Wachten op extern" = taak met waiting = true.
-- ============================================================
begin;

alter table public.contacts
  add column if not exists category text not null default 'overig'
    check (category in ('opdrachtgever', 'leverancier', 'adviseur', 'partner', 'instantie', 'financier', 'overig')),
  add column if not exists website text,
  add column if not exists country text;

alter table public.project_contacts
  add column if not exists party_role text not null default 'overig'
    check (party_role in ('opdrachtgever', 'kandidaat', 'hoofdaannemer', 'subleverancier', 'adviseur', 'partner', 'instantie', 'financier', 'overig'));

alter table public.tasks
  add column if not exists contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists waiting boolean not null default false,
  add column if not exists source text not null default 'handmatig' check (source in ('handmatig', 'communicatie'));

alter table public.communication_log
  add column if not exists channel text not null default 'overig'
    check (channel in ('email', 'telefoon', 'overleg', 'videocall', 'whatsapp', 'brief', 'overig')),
  add column if not exists direction text not null default 'uit' check (direction in ('in', 'uit', 'intern')),
  add column if not exists subject text,
  add column if not exists contact_person text,
  add column if not exists follow_up_owner uuid references public.profiles(id) on delete set null,
  add column if not exists follow_up_due date,
  add column if not exists waiting boolean not null default false,
  add column if not exists task_id uuid references public.tasks(id) on delete set null;

create index if not exists communication_log_project_date_idx on public.communication_log(project_id, contact_date desc);
create index if not exists communication_log_party_idx on public.communication_log(party_id);
create index if not exists tasks_contact_idx on public.tasks(contact_id);

-- Bestaande partijen: categorie en projectrol afleiden uit de omschrijving
update public.contacts set category = case
  when type ilike '%opdrachtgever%' then 'opdrachtgever'
  when type ilike '%leverancier%' then 'leverancier'
  when type ilike '%verzeker%' or type ilike '%financ%' or type ilike '%bank%' then 'financier'
  when type ilike '%exportondersteuning%' or type ilike '%overheid%' or type ilike '%ministerie%' or type ilike '%instantie%' then 'instantie'
  when type ilike '%adviseur%' or type ilike '%projectleider%' or type ilike '%consult%' then 'adviseur'
  when type ilike '%partner%' then 'partner'
  else 'overig' end
where category = 'overig';

update public.project_contacts pc set party_role = case c.category
  when 'opdrachtgever' then 'opdrachtgever'
  when 'leverancier' then 'kandidaat'
  when 'adviseur' then 'adviseur'
  when 'partner' then 'partner'
  when 'instantie' then 'instantie'
  when 'financier' then 'financier'
  else 'overig' end
from public.contacts c
where c.id = pc.contact_id and pc.party_role = 'overig';

-- Vervolgactie -> taak (vóór het opslaan van het contactmoment)
create or replace function public.communication_follow_up_task()
returns trigger as $$
declare
  v_party text;
  v_task uuid;
begin
  if new.logged_by is null then
    new.logged_by := auth.uid();
  end if;

  if coalesce(btrim(new.follow_up), '') <> '' and new.task_id is null then
    if not public.has_section_access(new.project_id, 'parties') then
      raise exception 'Geen toegang tot communicatie in dit project';
    end if;
    select name into v_party from public.contacts where id = new.party_id;
    insert into public.tasks (project_id, title, description, status, owner_id, due_date, urgency, contact_id, waiting, source)
    values (
      new.project_id,
      left(btrim(new.follow_up), 200),
      'Uit ' || coalesce(new.channel, 'contact') || ' met ' || coalesce(v_party, 'onbekende partij')
        || ' op ' || to_char(coalesce(new.contact_date, current_date), 'DD-MM-YYYY')
        || coalesce(': ' || nullif(btrim(new.subject), ''), ''),
      'te_doen',
      new.follow_up_owner,
      new.follow_up_due,
      'normaal',
      new.party_id,
      new.waiting,
      'communicatie'
    )
    returning id into v_task;
    new.task_id := v_task;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists communication_follow_up_task on public.communication_log;
create trigger communication_follow_up_task before insert on public.communication_log
for each row execute procedure public.communication_follow_up_task();

commit;
