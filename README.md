# LogPose — Find Your Way

An anime tracker with a nautical theme. Create an account, search real
anime via Anilist (through Consumet), track a series as **Watched** or
**Plan to Watch**, and update your episode progress — then jump straight
to an external site to actually watch it. LogPose never hosts or embeds
video; every "Watch" button is an outbound link opened in a new tab.

## Architecture

- **Frontend** — React + Vite + TypeScript (this repo's root)
- **Auth + database** — [Supabase](https://supabase.com): Postgres +
  built-in Auth (email/password). The frontend talks to Supabase
  directly via `@supabase/supabase-js`, secured by Row Level Security
  (a signed-in user can only ever see/edit their own tracker rows).
- **Anime data** — [Consumet](https://github.com/consumet/consumets.wiki)
  (`@consumet/extensions`, Anilist provider), wrapped by two small
  Vercel serverless functions under `api/` — Consumet has to run
  server-side, so it can't be called straight from the browser.
- **Hosting** — [Vercel](https://vercel.com): one `vercel deploy` ships
  the static frontend and the `api/` functions together. There is no
  separate backend server to run or keep alive.

## One-time setup

1. **Create a Supabase project** at supabase.com.
2. **Run the schema** — open the SQL editor in your project and paste
   in the contents of [`supabase/schema.sql`](./supabase/schema.sql).
   This creates:
   - `profiles` (captain name, auto-populated on signup)
   - `anime_tracker` (per-user series tracking), with Row Level
     Security policies and a trigger that clamps `episodes_watched`
     into `[0, total_episodes]` and auto-flips `status` to `'Watched'`
     once it reaches the total
3. **Copy your env vars** — `cp .env.example .env.local` and fill in
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from
   Project Settings → API.
4. `npm install`

## Scripts

```bash
npm run dev      # start the Vite dev server (frontend only)
npm run build    # typecheck + production build
npm test         # vitest — 68 tests across api/, src/services, src/pages
npm run lint     # oxlint
```

For local development that also exercises the `api/` serverless
functions (so live Anilist search and the series page actually work),
run `npx vercel dev` instead of `npm run dev` — it serves the frontend
and the `/api/anime/*` functions together on one port, the same way
they run in production.

## Business rules

- **No video hosting** — every episode's "Watch" action opens the
  external `url` Consumet returns, via `target="_blank"`. If Consumet
  has no link for an episode, the button is disabled rather than
  linking nowhere.
- **Restricted lists** — a tracked series can only be `'Watched'` or
  `'Plan to Watch'`. There is no "Watching" status anywhere in the
  schema, the API, or the UI.
- **Isolated progress tracking** — the `episodes_watched` +/- counter
  exists only on the individual series page (`SeriesPage`); no other
  screen edits it.

## Structure

```
api/
  _lib/consumet.ts     Consumet wrapper: strips the payload to id/title/
                        image/totalEpisodes/episodes[] (each with its url)
  anime/[id].ts         GET /api/anime/:id
  anime/search.ts       GET /api/anime/search?q=...
  tests/                vitest coverage for the above (mocked Consumet)

supabase/
  schema.sql            profiles + anime_tracker, RLS policies, the
                         progress-clamping/auto-complete trigger

src/
  lib/supabaseClient.ts  createClient() from VITE_SUPABASE_* env vars
  context/
    AuthContext.tsx      wraps supabase.auth (register/login/logout/session)
    AppContext.tsx       legacy local state for the mock catalogue (below)
  services/
    animeApi.ts          fetch wrapper for the api/anime/* functions
    tracker.ts           supabase-js CRUD for anime_tracker (RLS-scoped)
  pages/
    LoginPage / RegisterPage   Supabase Auth UI
    SeriesPage                 the real, Consumet+Supabase-backed series
                                page — Step 3 of the original spec
    SearchPage                 2+ character queries hit live Anilist search;
                                empty query still shows the mock catalogue
    HomePage / MyListPage / ProfilePage / AnimeDetailPage
                                original mock-data screens (see below)
```

## Known follow-ups

The original request scoped live data to the series page plus search;
these mock-data screens haven't been migrated yet:

- **HomePage** and **MyListPage** still read from the hardcoded
  `src/data/animes.ts` catalogue and the old `AppContext`/`localStorage`
  reducer, not from `anime_tracker`. A series added to your list from
  the live Search → SeriesPage flow won't currently show up in My List.
- **AnimeDetailPage** (mock-data detail view, reached from Home) is
  separate from **SeriesPage** (live, reached from Search). They're
  intentionally two different components right now.
- Migrating Home/My List to query `anime_tracker` directly (dropping
  the mock catalogue and the local reducer entirely) would unify this
  into one consistent data source.

There's also a `/server` folder and a handful of `*.stale` files in
this repo that are leftovers from earlier scaffolding and a filesystem
quirk in the build environment — both are gitignored and safe to
delete by hand; they were never part of the shipped app.
