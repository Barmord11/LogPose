/* ============================================================
   LogPose — Supabase (Postgres) schema
   ------------------------------------------------------------
   Run this once in the Supabase SQL editor (or via `supabase db push`)
   against a fresh project. Safe to re-run — every object creation is
   guarded so this can be reapplied without erroring.

   Auth accounts (email, password, sessions) are handled entirely by
   Supabase Auth (the built-in `auth.users` table) — we never store
   passwords ourselves. This script only adds:

     1. public.profiles      — the "Captain's Log" display name for
                                each account (populated automatically
                                on signup via a trigger).
     2. public.anime_tracker — per-user tracking state for a single
                                Anilist series, resolved through
                                Consumet's META.Anilist provider.

   Both tables have Row Level Security enabled, so a signed-in user
   can only ever see/edit their own rows — enforced by Postgres
   itself, not application code.
   ============================================================ */

-- ---------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  captain_name  text not null default 'Navigator',
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row the moment someone signs up. The
-- captain name comes from the `captain_name` field passed as
-- metadata to supabase.auth.signUp() on the Register page; falls
-- back to "Navigator" if it's missing.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, captain_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'captain_name', 'Navigator')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------
-- 2. anime_tracker
-- ---------------------------------------------------------
create table if not exists public.anime_tracker (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references auth.users (id) on delete cascade,
  -- Anilist series id, as returned by Consumet's META.Anilist provider.
  anilist_id        integer not null,

  -- Cached UI data so list/detail views don't need a Consumet round
  -- trip just to render a title + poster.
  title             text not null,
  image_url         text,
  total_episodes    integer not null default 0,

  episodes_watched  integer not null default 0,

  -- Business rule: only two statuses are ever allowed. There is
  -- intentionally no "Watching" status.
  status            text not null,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- A user cannot have two rows tracking the same series.
  constraint uq_tracker_user_anime unique (user_id, anilist_id),

  -- No "Watching" status — only these two values are legal.
  constraint ck_tracker_status check (status in ('Watched', 'Plan to Watch')),

  constraint ck_tracker_episodes_watched_nonneg check (episodes_watched >= 0),
  constraint ck_tracker_total_episodes_nonneg check (total_episodes >= 0),
  -- Progress can never exceed the series' known episode count.
  constraint ck_tracker_progress_bounded check (episodes_watched <= total_episodes)
);

create index if not exists ix_tracker_user_id on public.anime_tracker (user_id);

alter table public.anime_tracker enable row level security;

drop policy if exists "tracker_select_own" on public.anime_tracker;
create policy "tracker_select_own"
  on public.anime_tracker for select
  using (auth.uid() = user_id);

drop policy if exists "tracker_insert_own" on public.anime_tracker;
create policy "tracker_insert_own"
  on public.anime_tracker for insert
  with check (auth.uid() = user_id);

drop policy if exists "tracker_update_own" on public.anime_tracker;
create policy "tracker_update_own"
  on public.anime_tracker for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "tracker_delete_own" on public.anime_tracker;
create policy "tracker_delete_own"
  on public.anime_tracker for delete
  using (auth.uid() = user_id);

-- Enforced in the database so the rule holds no matter what writes the
-- row: clamp episodes_watched into [0, total_episodes], bump
-- updated_at, and flip status to 'Watched' the moment the counter
-- reaches the total (the "isolated progress tracking" rule from the
-- SeriesPage spec).
create or replace function public.enforce_tracker_progress()
returns trigger
language plpgsql
as $$
begin
  if new.episodes_watched < 0 then
    new.episodes_watched := 0;
  end if;

  if new.episodes_watched > new.total_episodes then
    new.episodes_watched := new.total_episodes;
  end if;

  if new.total_episodes > 0 and new.episodes_watched = new.total_episodes then
    new.status := 'Watched';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_enforce_tracker_progress on public.anime_tracker;
create trigger trg_enforce_tracker_progress
  before insert or update on public.anime_tracker
  for each row execute function public.enforce_tracker_progress();
