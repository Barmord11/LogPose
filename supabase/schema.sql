/* ============================================================
   LogPose — Supabase (Postgres) schema
   ------------------------------------------------------------
   Run this once in the Supabase SQL editor (or via `supabase db push`)
   against a fresh project. Safe to re-run — every object creation is
   guarded so this can be reapplied without erroring.

   Auth accounts (email, password, sessions) are handled entirely by
   Supabase Auth (the built-in `auth.users` table) — we never store
   passwords ourselves. This script only adds:

     1. public.profiles       — the "Captain's Log" display name for
                                 each account (populated automatically
                                 on signup via a trigger).
     2. public.anime_tracker  — per-user tracking state for a single
                                 series, keyed by its MyAnimeList id
                                 (from the Jikan API).
     3. public.anime_ratings  — per-user Anchor Up/Down vote for a
                                 series, plus a function to read back
                                 the aggregate without exposing who
                                 voted which way.
     4. public.anime_favorites — per-user heart/favorite flag for a
                                 series, keyed by mal_id — same shape
                                 and RLS pattern as anime_ratings, since
                                 the old heart button (AppContext's
                                 local reducer) isn't safe to reuse for
                                 real MyAnimeList ids.

   Series are identified by MyAnimeList id (mal_id from Jikan), not an
   Anilist id — LogPose's details/search moved to Jikan, a stable,
   key-free official-data API, after Consumet's scrapers (used for the
   old Anilist-based lookup) proved too unreliable (Cloudflare
   timeouts, dead mirrors). Consumet is still used for the Watch
   button, resolved separately and best-effort — see api/_lib/consumet.ts.

   All tables have Row Level Security enabled, so a signed-in user
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
  -- MyAnimeList id, as returned by the Jikan API.
  mal_id            integer not null,

  -- Cached UI data so list/detail views don't need a Jikan round
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
  constraint uq_tracker_user_anime unique (user_id, mal_id),

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

-- ---------------------------------------------------------
-- 3. anime_ratings
-- ---------------------------------------------------------
-- LogPose's own Anchor Up/Down community rating, independent of
-- whatever score MyAnimeList reports. Each signed-in user gets
-- exactly one vote per series; clicking the same direction again
-- removes it (handled client-side by deleting the row).
create table if not exists public.anime_ratings (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  mal_id        integer not null,
  rating        text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint uq_rating_user_anime unique (user_id, mal_id),
  constraint ck_rating_value check (rating in ('up', 'down'))
);

create index if not exists ix_ratings_mal_id on public.anime_ratings (mal_id);

alter table public.anime_ratings enable row level security;

-- A user can only see/change their OWN vote — nobody can browse who
-- voted which way on a given series through the table directly.
drop policy if exists "ratings_select_own" on public.anime_ratings;
create policy "ratings_select_own"
  on public.anime_ratings for select
  using (auth.uid() = user_id);

drop policy if exists "ratings_insert_own" on public.anime_ratings;
create policy "ratings_insert_own"
  on public.anime_ratings for insert
  with check (auth.uid() = user_id);

drop policy if exists "ratings_update_own" on public.anime_ratings;
create policy "ratings_update_own"
  on public.anime_ratings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "ratings_delete_own" on public.anime_ratings;
create policy "ratings_delete_own"
  on public.anime_ratings for delete
  using (auth.uid() = user_id);

create or replace function public.touch_rating_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_rating_updated_at on public.anime_ratings;
create trigger trg_touch_rating_updated_at
  before update on public.anime_ratings
  for each row execute function public.touch_rating_updated_at();

-- Aggregate counts for a series, callable by any signed-in user via
-- supabase.rpc('anime_rating_summary', { p_mal_id }). Runs as the
-- function owner (security definer), so it can count across every
-- user's row while the table's own RLS still blocks anyone from
-- reading someone else's individual vote directly.
create or replace function public.anime_rating_summary(p_mal_id integer)
returns table (up_count bigint, down_count bigint)
language sql
security definer
set search_path = public
stable
as $$
  select
    count(*) filter (where rating = 'up')   as up_count,
    count(*) filter (where rating = 'down') as down_count
  from public.anime_ratings
  where mal_id = p_mal_id;
$$;

grant execute on function public.anime_rating_summary(integer) to authenticated;

-- ---------------------------------------------------------
-- 4. anime_favorites
-- ---------------------------------------------------------
-- The heart/favorite flag for a live (API-backed) series. Separate
-- table from anime_tracker on purpose: a series can be favorited
-- without being tracked (or vice versa), exactly like the original
-- mock-catalogue behaviour in AppContext.
create table if not exists public.anime_favorites (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  mal_id        integer not null,

  -- Cached UI data, same reasoning as anime_tracker: lets the
  -- Favorites panel render a title + poster without an extra Jikan
  -- round trip per favorited series.
  title         text not null,
  image_url     text,

  created_at    timestamptz not null default now(),

  constraint uq_favorite_user_anime unique (user_id, mal_id)
);

create index if not exists ix_favorites_user_id on public.anime_favorites (user_id);

alter table public.anime_favorites enable row level security;

drop policy if exists "favorites_select_own" on public.anime_favorites;
create policy "favorites_select_own"
  on public.anime_favorites for select
  using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.anime_favorites;
create policy "favorites_insert_own"
  on public.anime_favorites for insert
  with check (auth.uid() = user_id);

-- addFavorite() upserts on (user_id, mal_id) so a stale client (e.g. a
-- second signed-in tab that hasn't refetched yet) hitting the ON
-- CONFLICT DO UPDATE path doesn't get silently blocked by RLS. Without
-- this, that upsert has select/insert/delete but no update policy —
-- the ratings table already has all four for the same reason.
drop policy if exists "favorites_update_own" on public.anime_favorites;
create policy "favorites_update_own"
  on public.anime_favorites for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on public.anime_favorites;
create policy "favorites_delete_own"
  on public.anime_favorites for delete
  using (auth.uid() = user_id);
