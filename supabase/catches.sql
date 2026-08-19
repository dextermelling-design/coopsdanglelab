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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catches',
  'catches',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "catches_media_read" on storage.objects;
create policy "catches_media_read"
  on storage.objects for select
  using (bucket_id = 'catches');

drop policy if exists "catches_media_insert" on storage.objects;
create policy "catches_media_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'catches'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "catches_media_delete" on storage.objects;
create policy "catches_media_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'catches'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.admins a where a.user_id = auth.uid())
    )
  );

-- After this succeeds, run a second query with YOUR login email so you can delete posts:
-- insert into public.admins (user_id)
-- select id from auth.users
-- where lower(email) = lower('you@email.com')
-- on conflict (user_id) do nothing;
