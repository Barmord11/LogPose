# LogPose — Find Your Way

An anime tracker with a nautical theme. Create an account, search real
anime via Anilist (through Consumet), track a series as **Watched** or
**Plan to Watch**, and update your episode progress — then jump straight
to AnimeKai to actually watch it. LogPose never hosts or embeds video;
every "Watch" button is an outbound link opened in a new tab.

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

### Two Consumet jobs, kept conceptually separate

`api/_lib/consumet.ts` does exactly two things with Consumet's Anilist
meta-provider, both from the same underlying call:

1. **Details** — real Anilist metadata (title, image, genres, synopsis,
   status, format, score, characters, episode count). This is what the
   details page shows.
2. **Watch link** — a per-episode external URL on **AnimeKai**, the
   site Consumet's Anilist meta-provider resolves streaming sources
   through (Consumet's default is HiAnime if no provider is passed;
   LogPose passes AnimeKai explicitly). Anilist itself has no video and
   no per-episode links, so this can only ever come from a partner site
   like AnimeKai — never from Anilist directly.

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
npm test         # vitest — tests across api/, src/services, src/pages
npm run lint     # oxlint
```

For local development that also exercises the `api/` serverless
functions (so live Anilist search and the details page actually work),
run `npx vercel dev` instead of `npm run dev` — it serves the frontend
and the `/api/anime/*` functions together on one port, the same way
they run in production.

## Business rules

- **No video hosting** — every episode's "Watch" action opens the
  external AnimeKai `url` Consumet returns, via `target="_blank"`. If
  Consumet has no link for an episode, the button is disabled rather
  than linking nowhere.
- **Restricted lists** — a tracked series can only be `'Watched'` or
  `'Plan to Watch'`. There is no "Watching" status anywhere in the
  schema, the API, or the UI.
- **Isolated progress tracking** — the `episodes_watched` +/- counter
  on the details page is the only place that value is edited. My List
  and Home never touch it.
- **One details page** — there is exactly one details screen
  (`AnimeDetailPage`). Opening it from Search (`source="live"`) fetches
  real Consumet/Supabase data; opening it from Home or My List
  (`source="mock"`, the default) shows the built-in demo catalogue.
  Same layout either way.

## Structure

```
api/
  _lib/consumet.ts     Consumet wrapper — see "Two Consumet jobs" above
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
    tracker.ts            supabase-js CRUD for anime_tracker (RLS-scoped)
  pages/
    LoginPage / RegisterPage   Supabase Auth UI
    AnimeDetailPage             the one details page — renders mock or
                                live data depending on the `source` prop
                                (see "One details page" above)
    SearchPage                  2+ character queries hit live Anilist search;
                                empty query still shows the mock catalogue
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
- Rating (Anchor Up/Down) and Favorite aren't available for live
  series yet — they're backed by the local `AppContext` reducer, which
  isn't safe to reuse for real Anilist ids (numeric id collisions with
  the mock catalogue). Would need their own Supabase columns.

There's also a `/server` folder and a handful of `*.stale*` files in
this repo that are leftovers from earlier scaffolding and a filesystem
quirk in the build environment — both are gitignored and safe to
delete by hand; they were never part of the shipped app.
