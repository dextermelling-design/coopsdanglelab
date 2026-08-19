-- Public catch photos. Run once in Supabase → SQL Editor → New query → Run.
-- The "destructive operations" warning can appear; this does not delete your favorites.

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.admins enable row level security;

drop policy if exists "admins_select_self" on public.admins;
create policy "admins_select_self"
  on public.admins for select
  using (auth.uid() = user_id);

create table if not exists public.catches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  water_id text,
  water_name text,
  species text not null,
  notes text not null default '',
  photo_path text not null,
  angler text not null default 'Angler',
  created_at timestamptz not null default now()
);

create index if not exists catches_created_at_idx on public.catches (created_at desc);
create index if not exists catches_water_id_idx on public.catches (water_id);

alter table public.catches enable row level security;

drop policy if exists "catches_select_all" on public.catches;
create policy "catches_select_all"
  on public.catches for select
  using (true);

drop policy if exists "catches_insert_own" on public.catches;
create policy "catches_insert_own"
  on public.catches for insert
  with check (auth.uid() = user_id);

drop policy if exists "catches_delete_own_or_admin" on public.catches;
create policy "catches_delete_own_or_admin"
  on public.catches for delete
  using (
    auth.uid() = user_id
    or exists (select 1 from public.admins a where a.user_id = auth.uid())
  );

grant select on table public.catches to anon, authenticated;
grant insert, delete on table public.catches to authenticated;
grant select on table public.admins to authenticated;

-- Stop here if this is all you are running. Photos also need supabase/catches-storage.sql
-- (bucket named "catches", public). Then make yourself admin with your login email.
