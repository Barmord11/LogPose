# LogPose — Find Your Way

An anime tracker with a nautical theme. Create an account, search real
anime via MyAnimeList (through Jikan), track a series as **Watched**
or **Plan to Watch**, update your episode progress, and cast your own
Anchor Up/Down vote — then jump straight to AnimeKai to actually watch
it. LogPose never hosts or embeds video; every "Watch" button is an
outbound link opened in a new tab.

## Architecture

- **Frontend** — React + Vite + TypeScript (this repo's root)
- **Auth + database** — [Supabase](https://supabase.com): Postgres +
  built-in Auth (email/password). The frontend talks to Supabase
  directly via `@supabase/supabase-js`, secured by Row Level Security
  (a signed-in user can only ever see/edit their own rows).
- **Anime data** — two independent sources, both wrapped by small
  Vercel serverless functions under `api/` so they run server-side:
  - [Jikan](https://jikan.moe) (`api/_lib/jikan.ts`) — a free, key-free,
    CORS-friendly REST API over MyAnimeList data. This is LogPose's
    **details and search** source: title, image, genres, synopsis,
    status, format, score, characters, episode count.
  - [Consumet](https://github.com/consumet/consumets.wiki)
    (`api/_lib/consumet.ts`, `@consumet/extensions`) — used for exactly
    one thing: resolving **per-episode watch links on AnimeKai**. This
    is HTML scraping under the hood, so it's treated as best-effort —
    see "Why two sources" below.
- **Hosting** — [Vercel](https://vercel.com): one `vercel deploy` ships
  the static frontend and the `api/` functions together. There is no
  separate backend server to run or keep alive.

### Why two sources

LogPose originally used Consumet's Anilist meta-provider for both
details *and* watch links. In practice, Consumet's providers are HTML
scrapers dependent on third-party sites' live structure — they throw
Cloudflare timeouts, DNS failures, and break whenever a site changes
or goes down. That's an acceptable risk for a "nice to have" watch
link, but not for the core details/search experience.

So LogPose now splits the two jobs:

1. **Details + search — Jikan.** Stable, official MyAnimeList data,
   no scraping, no API key. If this fails, the details page shows an
   error — but in practice it's the reliable half.
2. **Watch link — Consumet, on AnimeKai.** Kept because per-episode
   watch links aren't something Jikan/MyAnimeList provides at all.
   `api/anime/[id].ts` fetches this *separately* from the Jikan call
   and treats a failure as "no watch link right now" rather than
   failing the whole request — one flaky scraper should never take
   down the details page again.

Series are identified by **MyAnimeList id** (`mal_id`, from Jikan)
everywhere in the app and the database — not an Anilist id. Consumet's
MyAnimeList meta-provider (`META.Myanimelist`) accepts that same id
directly, so no id crosswalk between services is needed.

### LogPose's own community rating

The Anchor Up/Down rating on a series' details page is **not**
MyAnimeList's score — it's LogPose's own, stored in
`public.anime_ratings` (one vote per signed-in user per series). The
"MAL Score" stat chip still shows MyAnimeList's own average separately,
for reference. A `security definer` Postgres function
(`anime_rating_summary`) returns the aggregate up/down counts for a
series without exposing which way any individual user voted — RLS on
the table itself only ever lets a user read/change their own row.

## One-time setup

1. **Create a Supabase project** at supabase.com.
2. **Run the schema** — open the SQL editor in your project and paste
   in the contents of [`supabase/schema.sql`](./supabase/schema.sql).
   This creates:
   - `profiles` (captain name, auto-populated on signup)
   - `anime_tracker` (per-user series tracking, keyed by `mal_id`),
     with Row Level Security policies and a trigger that clamps
     `episodes_watched` into `[0, total_episodes]` and auto-flips
     `status` to `'Watched'` once it reaches the total
   - `anime_ratings` (per-user Anchor Up/Down vote, keyed by `mal_id`)
     plus the `anime_rating_summary(mal_id)` RPC function used to read
     back aggregate counts
   > If you already ran an older version of this schema (with
   > `anilist_id` columns instead of `mal_id`), `create table if not
   > exists` won't rename anything for you — run
   > `alter table public.anime_tracker rename column anilist_id to mal_id;`
   > (and the same for `anime_ratings`) by hand first.
3. **Copy your env vars** — `cp .env.example .env.local` and fill in
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from
   Project Settings → API.
4. `npm install`

## Scripts

```bash
npm run dev      # start the Vite dev server (frontend only)
npm run build    # typecheck + production build
npm test         # vitest — tests across api/, src/services, src/pages
npm run lint     # oxlint
```

For local development that also exercises the `api/` serverless
functions (so live search and the details page actually work), run
`npx vercel dev` instead of `npm run dev` — it serves the frontend and
the `/api/anime/*` functions together on one port, the same way they
run in production.

## Business rules

- **No video hosting** — every episode's "Watch" action opens the
  external AnimeKai `url` Consumet returns, via `target="_blank"`. If
  Consumet has no link for an episode (or is down entirely), the tile
  is disabled rather than linking nowhere.
- **Restricted lists** — a tracked series can only be `'Watched'` or
  `'Plan to Watch'`. There is no "Watching" status anywhere in the
  schema, the API, or the UI.
- **Isolated progress tracking** — the `episodes_watched` +/- counter
  on the details page is the only place that value is edited. My List
  and Home never touch it.
- **One details page** — there is exactly one details screen
  (`AnimeDetailPage`). Opening it from Search (`source="live"`) fetches
  real Jikan/Consumet/Supabase data; opening it from Home or My List
  (`source="mock"`, the default) shows the built-in demo catalogue.
  Same layout either way.
- **Own ratings, not imported ones** — the Anchor Up/Down score is
  calculated from LogPose users' own votes, not scraped or copied from
  MyAnimeList. Each user gets exactly one vote per series; voting the
  same direction again removes it.
- **A flaky watch-link scraper never breaks the details page** —
  details (Jikan) and the watch link (Consumet) are fetched and error-
  handled independently server-side.

## Structure

```
api/
  _lib/jikan.ts         Jikan wrapper — details + search (see "Why two sources")
  _lib/consumet.ts       Consumet wrapper — watch links only, best-effort
  anime/[id].ts           GET /api/anime/:id — merges the two sources
  anime/search.ts         GET /api/anime/search?q=... — Jikan only
  tests/                  vitest coverage for the above (mocked fetch/Consumet)

supabase/
  schema.sql            profiles + anime_tracker + anime_ratings (both
                         keyed by mal_id), RLS policies, the progress-
                         clamping/auto-complete trigger, and the rating
                         summary RPC function

src/
  lib/supabaseClient.ts  createClient() from VITE_SUPABASE_* env vars
  context/
    AuthContext.tsx      wraps supabase.auth (register/login/logout/session)
    AppContext.tsx       legacy local state for the mock catalogue (below)
  services/
    animeApi.ts          fetch wrapper for the api/anime/* functions
    tracker.ts           supabase-js CRUD for anime_tracker (RLS-scoped)
    ratings.ts           supabase-js CRUD + RPC for anime_ratings
  pages/
    LoginPage / RegisterPage   Supabase Auth UI
    AnimeDetailPage             the one details page — renders mock or
                                live data depending on the `source` prop
                                (see "One details page" above)
    SearchPage                  2+ character queries hit live MyAnimeList
                                search; empty query still shows the mock
                                catalogue
    HomePage / MyListPage / ProfilePage
                                original mock-data screens (see below)
```

## Known follow-ups

The original request scoped live data to the details page plus search;
this mock-data screen hasn't been migrated yet:

- **HomePage** and **MyListPage** still read from the hardcoded
  `src/data/animes.ts` catalogue and the old `AppContext`/`localStorage`
  reducer, not from `anime_tracker`. A series added to your list from
  the live Search → details flow won't currently show up in My List.
- Migrating Home/My List to query `anime_tracker` directly (dropping
  the mock catalogue and the local reducer entirely) would unify this
  into one consistent data source.
- The heart/Favorite button isn't available for live series yet — it's
  still backed by the local `AppContext` reducer, which isn't safe to
  reuse for real MyAnimeList ids (numeric id collisions with the mock
  catalogue). Would need its own Supabase column, same pattern as
  `anime_ratings`.
- Jikan is rate-limited (~60 requests/minute, shared across everyone
  using this deployment, since calls go through our own serverless
  function). Fine for light use; a small server-side cache in front of
  `api/_lib/jikan.ts` would be the next step if that limit becomes an
  issue under real traffic.

There's also a `/server` folder and a handful of `*.stale*` files in
this repo that are leftovers from earlier scaffolding and a filesystem
quirk in the build environment — both are gitignored and safe to
delete by hand; they were never part of the shipped app.
