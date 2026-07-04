# LogPose — Find Your Way

An anime tracker with a nautical theme. Create an account, search real
anime via the official [AniList](https://anilist.co) GraphQL API, track
a series as **Watched** or **Plan to Watch**, update your episode
progress, and cast your own Anchor Up/Down vote — then jump straight to
AnimeKai to actually watch it. LogPose never hosts or embeds video;
every "Watch" button is an outbound link opened in a new tab.

## Architecture

- **Frontend** — React + Vite + TypeScript (this repo's root)
- **Auth + database** — [Supabase](https://supabase.com): Postgres +
  built-in Auth (email/password). The frontend talks to Supabase
  directly via `@supabase/supabase-js`, secured by Row Level Security
  (a signed-in user can only ever see/edit their own rows).
- **Anime data** — two independent sources, both wrapped by small
  Vercel serverless functions under `api/` so they run server-side:
  - [AniList](https://anilist.co/graphiql) (`api/_lib/anilist.ts`) — the
    official, free, key-free GraphQL API at `https://graphql.anilist.co`.
    This is LogPose's **details and search** source: title, image,
    banner art, genres, synopsis, status, format, score, characters,
    episode count — all in a single POST request per query.
  - [Consumet](https://github.com/consumet/consumets.wiki)
    (`api/_lib/consumet.ts`, `@consumet/extensions`) — used for exactly
    one thing: resolving **per-episode watch links on AnimeKai**. This
    is HTML scraping under the hood, so it's treated as best-effort —
    see "Why two sources" below.
- **Hosting** — [Vercel](https://vercel.com): one `vercel deploy` ships
  the static frontend and the `api/` functions together. There is no
  separate backend server to run or keep alive.

### Why two sources

LogPose previously used [Jikan](https://jikan.moe) (a REST API over
MyAnimeList data) for details and search. Jikan's rate limit — roughly
60 requests/minute *and* a much stricter ~3 requests/second burst cap —
meant that ordinary use (a details page firing off its info + character
calls, plus Home's trending and continue-watching calls) tripped 429s
constantly and made the app feel broken. AniList's GraphQL API has no
API key, a far more forgiving ~90 req/min per-IP limit, and returns
details + the character list in one round trip instead of two, so
LogPose moved to it for the reliable half of the app.

Consumet's own HTML-scraping providers are dependent on third-party
sites' live structure — they throw Cloudflare timeouts, DNS failures,
and break whenever a site changes or goes down. That's an acceptable
risk for a "nice to have" watch link, but not for the core
details/search experience, so that job stays separate:

1. **Details + search — AniList.** Official, key-free, generous rate
   limit, no scraping. If this fails, the details page shows an error —
   but in practice it's the reliable half.
2. **Watch link — Consumet, on AnimeKai.** Kept because per-episode
   watch links aren't something AniList provides at all. `api/anime/[id].ts`
   fetches this *separately* from the AniList call and treats a failure
   as "no watch link right now" rather than failing the whole request —
   one flaky scraper should never take down the details page.

Series are identified by **AniList id** (`anilist_id`) everywhere in
the app and the database. Consumet's own AniList meta-provider
(`META.Anilist`) accepts that same id directly, so no id crosswalk
between the two sources is needed.

### LogPose's own community rating

The Anchor Up/Down rating on a series' details page is **not**
AniList's score — it's LogPose's own, stored in `public.anime_ratings`
(one vote per signed-in user per series). The "AniList Score" stat chip
still shows AniList's own average separately, for reference (normalized
from AniList's 0-100 scale down to 0-10 to match). A `security definer`
Postgres function (`anime_rating_summary`) returns the aggregate
up/down counts for a series without exposing which way any individual
user voted — RLS on the table itself only ever lets a user read/change
their own row.

## One-time setup

1. **Create a Supabase project** at supabase.com.
2. **Run the schema** — open the SQL editor in your project and paste
   in the contents of [`supabase/schema.sql`](./supabase/schema.sql).
   This creates:
   - `profiles` (captain name, auto-populated on signup)
   - `anime_tracker` (per-user series tracking, keyed by `anilist_id`),
     with Row Level Security policies and a trigger that clamps
     `episodes_watched` into `[0, total_episodes]` and auto-flips
     `status` to `'Watched'` once it reaches the total
   - `anime_ratings` (per-user Anchor Up/Down vote, keyed by
     `anilist_id`) plus the `anime_rating_summary(p_anilist_id)` RPC
     function used to read back aggregate counts
   - `anime_favorites` (per-user heart/favorite flag, keyed by
     `anilist_id`), same RLS pattern as `anime_ratings`
   > If you already ran an older version of this schema (with `mal_id`
   > columns, from LogPose's earlier Jikan/MyAnimeList era), the script
   > now renames those columns to `anilist_id` for you automatically.
   > **Important:** that's a column rename, not a data migration — a
   > MyAnimeList id and an AniList id are different numbering systems
   > for the same anime, so any rows created while the app used Jikan
   > will point at the wrong (or a nonexistent) series afterward. If
   > those rows were only ever test data, the simplest fix is to clear
   > them out post-migration: `truncate public.anime_tracker,
   > public.anime_ratings, public.anime_favorites;`. If you have real
   > data to preserve, look up each row's correct AniList id by title
   > and `update` it by hand instead of truncating.
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
  real AniList/Consumet/Supabase data; opening it from Home or My List
  (`source="mock"`, the default) shows the built-in demo catalogue.
  Same layout either way.
- **Own ratings, not imported ones** — the Anchor Up/Down score is
  calculated from LogPose users' own votes, not scraped or copied from
  AniList. Each user gets exactly one vote per series; voting the same
  direction again removes it.
- **A flaky watch-link scraper never breaks the details page** —
  details (AniList) and the watch link (Consumet) are fetched and
  error-handled independently server-side.

## Structure

```
api/
  _lib/anilist.ts        AniList GraphQL wrapper — details, search,
                          trending (see "Why two sources"), with a
                          5-minute in-memory response cache
  _lib/consumet.ts        Consumet wrapper — watch links only, best-effort
  anime/[id].ts            GET /api/anime/:id — merges the two sources
  anime/search.ts          GET /api/anime/search?q=... — AniList only
  anime/trending.ts        GET /api/anime/trending — AniList trending list
  tests/                   vitest coverage for the above (mocked fetch/Consumet)

supabase/
  schema.sql            profiles + anime_tracker + anime_ratings +
                         anime_favorites (all keyed by anilist_id), RLS
                         policies, the progress-clamping/auto-complete
                         trigger, and the rating summary RPC function

src/
  lib/supabaseClient.ts  createClient() from VITE_SUPABASE_* env vars
  context/
    AuthContext.tsx      wraps supabase.auth (register/login/logout/session)
    AppContext.tsx       legacy local state for the mock catalogue (below)
  services/
    animeApi.ts          fetch wrapper for the api/anime/* functions
    tracker.ts           supabase-js CRUD for anime_tracker (RLS-scoped),
                         including getTrackerList() for My List/Home
    ratings.ts           supabase-js CRUD + RPC for anime_ratings
    favorites.ts          supabase-js CRUD for anime_favorites (RLS-scoped)
  pages/
    LoginPage / RegisterPage   Supabase Auth UI
    AnimeDetailPage             the one details page — renders mock or
                                live data depending on the `source` prop
                                (see "One details page" above)
    SearchPage                  debounced (500ms) live AniList search
                                for 2+ character queries; empty query
                                still shows the mock catalogue
    HomePage / MyListPage / ProfilePage
                                mock-data screens, now also rendering
                                live/API-backed data (see "Live/mock
                                feature parity" below)
```

## Live/mock feature parity

The mock catalogue (`src/data/animes.ts` + the local `AppContext`
reducer) still exists as the original demo experience on Home and My
List, but every account-level feature now also works for real AniList
series added via Search:

- **My List** reads live tracked series directly from `anime_tracker`
  (via `services/tracker.ts`'s `getTrackerList()`) and renders them
  alongside the mock catalogue in the Watched / Plan to Watch tabs, with
  their own remove action.
- **Favorites** work for live series too, via a new `anime_favorites`
  table (same RLS-scoped, one-row-per-user pattern as `anime_ratings`).
  The heart button on a live series' details page and My List's
  Favorites panel both read/write it.
- **Home** shows two live sections when there's data for them: "Continue
  Your Voyage" (your own in-progress live series, from `anime_tracker`)
  and "Trending Now" (AniList's currently-airing trending list, via
  `api/anime/trending.ts`). Both are additive and best-effort — if
  either has nothing to show or the fetch fails, that section just
  doesn't render, so the mock-driven Home page never breaks.
- **Live search is debounced and self-correcting**: typing fires exactly
  one request per pause (500ms), and any in-flight request superseded by
  newer input is cancelled via `AbortController`, so a slow stale
  response can never overwrite fresher results.
- **AniList responses are cached in-memory for 5 minutes** inside
  `api/_lib/anilist.ts` (search, details, and trending all share this),
  keyed by the exact query+variables pair, absorbing bursts like Home
  calling trending and continue-watching back to back. This only helps
  within a single warm serverless instance — a persistent cache (e.g.
  Vercel KV) would be the next step if that's not enough under real
  traffic.
- **Search and Home cards for live series carry the same actions as
  the mock catalogue**: favorite (heart), Anchor Up/Down, and
  Watched/Plan to Watch, all Supabase-backed (`services/tracker.ts`,
  `services/ratings.ts`, `services/favorites.ts`) and fetched per-card
  on mount. Each card also shows a total-episode-count badge. Because
  every one of these controls is keyed only by the series' numeric id
  (now `anilistId` end to end), they work identically for AniList
  series with zero extra wiring — the same code path that ran against
  the mock catalogue and Jikan ids now runs against real AniList ids.
- **Drag-to-add on touch devices** (`components/DragToAdd.tsx`):
  dragging a browsable card (Search's results, Home's Popular/Trending
  grids) up or down reveals two colour-coded drop zones — teal "Plan
  to Watch", orange "Watched" — releasing over one adds the series to
  that list. This exists alongside, not instead of, the small (+)
  button; it's a bigger, easier target for phones. No-op on desktop —
  a plain click still just opens the details page.

Genuinely still mock-only: the "Popular This Week" grid and "Newly
Released" bento on Home, and the genre/filter browsing on Search's empty
state, since those are demo content rather than user data.

There's also a `/server` folder and a handful of `*.stale*` files in
this repo that are leftovers from earlier scaffolding and a filesystem
quirk in the build environment — both are gitignored and safe to
delete by hand; they were never part of the shipped app.
