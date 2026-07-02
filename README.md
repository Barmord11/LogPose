# LogPose — Find Your Way

An anime list website with a nautical theme. Browse a catalogue, track watched episodes, keep Watched / Plan-to-Watch / Favorites lists, and jump straight to external watch links.

## Features

- **Home** — featured hero, popular grid, newly-released bento with live Captain's Log stats
- **Search** — live text search (title, alt title, genre), clickable genre cards, working filter chips, result counts, clear-filters
- **My List** — Watched / Plan to Watch / Favorites tabs with per-series episode progress bars
- **Detail** — overview, characters, per-episode tracker (mark all / clear all), anchor up/down rating, favorite
- **Profile** — live stats (episodes, series, plan, favorites) and navigator level computed from real state
- **Watch links** — every card and detail page routes to the series' external `watchUrl`
- State persists to `localStorage`; no backend required

## Responsive layout

- **Mobile (<768px)**: sticky glass header + bottom nav with compass FAB (opens a random anime)
- **Desktop (≥768px)**: fixed sidebar nav + top bar with global search; mobile chrome hidden via CSS

Global design tokens and shared component classes live in `src/index.css`; layout/breakpoint rules in `src/responsive.css`; page-specific styling stays inside each page component.

## Scripts

```bash
npm run dev      # start dev server
npm run build    # typecheck + production build
npm test         # vitest unit tests (state reducer + data integrity)
npm run lint     # oxlint
```

## Structure

```
src/
  context/     AppContext (provider + hooks), reducer.ts (pure logic + tests)
  components/  Shared UI: nav bars, PlayButton, AddDropdown, AnchorRating, StatusBadge…
  pages/       Home, Search, MyList, AnimeDetail, Profile
  data/        Anime catalogue, genres, filter chips (+ integrity tests)
```
