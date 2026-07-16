# LogPose — Find Your Way

An anime tracker with a nautical theme. Create an account, search real
anime via the official [AniList](https://anilist.co) GraphQL API, track
a series as **Watched** or **Plan to Watch**, update your episode
progress, and cast your own Anchor Up/Down vote — then jump straight to
your chosen streaming source (AniKoto by default — see "Watch link
sources" below) to actually watch it. LogPose never hosts or embeds
video; every "Watch" button is an outbound link opened in a new tab.

## Architecture

- **Frontend** — React + Vite + TypeScript (this repo's root)
- **Auth + database** — [Supabase](https://supabase.com): Postgres +
  built-in Auth (email/password). The frontend talks to Supabase
  directly via `@supabase/supabase-js`, secured by Row Level Security
  (a signed-in user can only ever see/edit their own rows).
- **Anime data** — [AniList](https://anilist.co/graphiql)
  (`api/_lib/anilist.ts`), the official, free, key-free GraphQL API at
  `https://graphql.anilist.co`, wrapped by a small Vercel serverless
  function under `api/` so it runs server-side. This is LogPose's only
  server-side source: title, image, banner art, genres, synopsis,
  status, format, score, characters, episode count — all in a single
  POST request per query. The outbound "Watch Now" link isn't fetched
  from anywhere — it's built entirely client-side from the series title
  against the user's chosen streaming source (see "Watch link sources"
  below).
- **Hosting** — [Vercel](https://vercel.com): one `vercel deploy` ships
  the static frontend and the `api/` functions together. There is no
  separate backend server to run or keep alive. Every `/api/anime/*`
  route is served by a single catch-all function, `api/[...path].ts`
  (see "Structure" below) — Vercel's Hobby plan caps a deployment at 12
  Serverless Functions, so rather than one file per route, one file
  routes internally to all of them.

### Why AniList

LogPose previously used [Jikan](https://jikan.moe) (a REST API over
MyAnimeList data) for details and search. Jikan's rate limit — roughly
60 requests/minute *and* a much stricter ~3 requests/second burst cap —
meant that ordinary use (a details page firing off its info + character
calls, plus Home's trending and continue-watching calls) tripped 429s
constantly and made the app feel broken. AniList's GraphQL API has no
API key, a far more forgiving ~90 req/min per-IP limit, and returns
details + the character list in one round trip instead of two, so
LogPose moved to it.

Series are identified by **AniList id** (`anilist_id`) everywhere in
the app and the database.

### Watch link sources

LogPose never hosts or scrapes episodes — every "Watch Now" button is a
plain outbound title-search link to a third-party streaming site's own
search page (e.g. `https://anikototv.to/filter?keyword=One+Piece`),
built entirely client-side in `src/context/SourceContext.tsx`. There's
no per-episode lookup and nothing that can fail server-side — the link
is available as soon as a series' title is known.

`WATCH_SOURCES` in `SourceContext.tsx` currently lists two sources
(AniKoto, the default, and AniChi), both sharing the same
`/filter?keyword=<title>` URL shape. A signed-in user's choice is saved
to `localStorage` (not synced across devices) and surfaced as "Pick
Source" under Profile → Quick Navigation. Adding another source that
follows the same URL pattern is a one-line addition to that list.

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
3. **Set your env vars** — create a `.env.local` file in the repo root
   with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, both from
   Project Settings → API. `.env.local` (like every `.env*` file) is
   gitignored, so this stays local to your machine.
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

- **No video hosting** — every "Watch Now" button opens an outbound
  title-search link to the user's chosen streaming source (AniKoto by
  default), built client-side via `target="_blank"` — see "Watch link
  sources" above.
- **Restricted lists** — a tracked series can only be `'Watched'` or
  `'Plan to Watch'`. There is no "Watching" status anywhere in the
  schema, the API, or the UI.
- **Isolated progress tracking** — the `episodes_watched` +/- counter
  on the details page is the only place that value is edited. My List
  and Home never touch it.
- **One details page** — there is exactly one details screen
  (`AnimeDetailPage`). Opening it from Search (`source="live"`) fetches
  real AniList/Supabase data; opening it from Home or My List
  (`source="mock"`, the default) shows the built-in demo catalogue.
  Same layout either way.
- **Own ratings, not imported ones** — the Anchor Up/Down score is
  calculated from LogPose users' own votes, not scraped or copied from
  AniList. Each user gets exactly one vote per series; voting the same
  direction again removes it.

## Structure

```
api/
  _lib/anilist.ts        AniList GraphQL wrapper — details, search,
                          trending, popular, and genre browsing (see
                          "Why AniList"), with a 5-minute in-memory
                          response cache
  [...path].ts             single catch-all Serverless Function for every
                          /api/anime/* route (one Function total, to stay
                          under Vercel's Hobby-plan 12-Function cap) —
                          reads the path segments from req.query.path and
                          dispatches internally:
                            GET /api/anime/:id        AniList details only
                            GET /api/anime/search?q=...   AniList only
                            GET /api/anime/trending    AniList trending list
                            GET /api/anime/popular     AniList all-time popular
                            GET /api/anime/genre?g=... AniList by genre
  _tests/                  vitest coverage for the above (mocked fetch)

  Both _lib/ and _tests/ are prefixed with "_" so Vercel excludes them
  from the Function count entirely (only [...path].ts itself compiles
  down to a Function) — see the "Hosting" bullet above.

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
    SearchPage                  debounced (500ms) live AniList search for
                                2+ character queries; genre bento and the
                                empty-query default view are both live
                                AniList data too (the popular/genre
                                routes in api/[...path].ts)
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
- **Home's hero and "Popular This Week" grid are real AniList data**
  (the `popular` route in `api/[...path].ts` — all-time most popular,
  not airing-only), replacing the old hardcoded mock catalogue there.
  The hero also fetches full details (`fetchAnimeInfo`) for its
  synopsis; its outbound Watch Now link is built client-side the same
  way as every other card (see "Watch link sources"). The "Director's
  Choice" bento tile
  uses the #2 popular pick for the same reason — no fictional series
  presented as real data. Home also shows two more live sections when
  there's data for them: a Favorites section (series you've saved for
  quick access to their watch link, sourced from `anime_favorites` —
  this replaced an earlier "Continue Your Voyage" section built on
  in-progress tracker rows) and "Trending Now" (AniList's
  currently-airing trending list, via the `trending` route). All of
  these are additive and best-effort — if any has nothing to show or
  its fetch fails, that section just shows a friendly fallback instead
  of breaking the page.
- **Search's default (no query, no genre) view and its genre bento are
  also real AniList data** (the `popular` and `genre` routes in
  `api/[...path].ts` respectively — genre lookups use each genre card's
  `anilistGenres` field in `src/data/animes.ts`, since AniList's
  proper-case genre names don't match the mock catalogue's all-caps
  `matchTags`). The old "Narrow Your Compass" filter chips (Top Rated,
  Airing Now, etc.) were mock-catalogue-only predicates with no AniList
  equivalent in the card-sized search-result shape, so they were
  removed rather than left half-functional.
- **Live search is debounced and self-correcting**: typing fires exactly
  one request per pause (500ms), and any in-flight request superseded by
  newer input is cancelled via `AbortController`, so a slow stale
  response can never overwrite fresher results.
- **AniList responses are cached in-memory for 5 minutes** inside
  `api/_lib/anilist.ts` (search, details, trending, popular, and genre
  browsing all share this), keyed by the exact query+variables pair,
  absorbing bursts like Home calling trending and continue-watching
  back to back. This only helps within a single warm serverless
  instance — a persistent cache (e.g. Vercel KV) would be the next step
  if that's not enough under real traffic.
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

Genuinely still mock-only: the "New Dubs" promo tile on Home's "Newly
Released" bento (pure decoration, not a data section) and the mock
catalogue itself (`src/data/animes.ts`), which still powers the demo
Watched/Plan-to-Watch experience on Home and My List alongside live
tracked series.

There's also a `/server` folder and a handful of `*.stale*` files in
this repo that are leftovers from earlier scaffolding and a filesystem
quirk in the build environment — both are gitignored and safe to
delete by hand; they were never part of the shipped app.
