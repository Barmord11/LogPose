import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  AnilistLookupError,
  fetchAnimeInfo,
  fetchPopular,
  fetchTrending,
  fetchNewReleases,
  fetchRandomAnime,
  searchAnime,
  searchByGenre,
} from './_lib/anilist.js'
import { setPublicCache, setNoStore } from './_lib/cache.js'

/**
 * Single catch-all Serverless Function for every /api/* route.
 *
 * Why one file: Vercel's Hobby plan caps a deployment at 12 Serverless
 * Functions, and it counts every .ts/.js file directly under api/
 * (outside a folder or filename prefixed with "_", which Vercel never
 * turns into a Function - see api/_lib and api/_tests) as one Function.
 * This project only ever had 6 real routes, but rather than keep
 * counting files against that cap as routes are added, every /api/*
 * request now lands on this one file, which dispatches internally.
 *
 * This file is intentionally named router.ts (no [...] in the
 * filename) and is wired up via the explicit "rewrites" entry in
 * vercel.json, NOT Vercel's zero-config dynamic catch-all filename
 * convention ([...path].ts). That convention is the officially
 * documented way to do this and works for plenty of projects, but in
 * this project's actual deployment it only ever matched a single path
 * segment (GET /api/anime worked, GET /api/anime/popular 404'd at
 * Vercel's platform level before ever reaching this function) -
 * verified directly against the live deployment, including with
 * cache-busting query strings to rule out a caching fluke. Rather than
 * keep depending on that filename-inferred routing behavior, the
 * rewrite in vercel.json forwards every /api/* request here
 * explicitly, and the path segments are parsed straight out of
 * req.url below instead of out of a dynamic-segment query param -
 * removing the dependency on Vercel correctly inferring "catch-all"
 * from this file's name.
 *
 * The actual per-route logic didn't move. It always lived in
 * _lib/anilist.ts (already excluded from the Function count by its own
 * "_" prefix) - this file is just the router that used to be six
 * separate entry-point files, each doing little more than picking
 * query params apart and calling into _lib.
 *
 * Route table (unchanged from before - src/services/animeApi.ts's
 * fetch URLs don't need to change):
 *   GET /api/anime/popular
 *   GET /api/anime/trending
 *   GET /api/anime/new-releases
 *   GET /api/anime/random
 *   GET /api/anime/search?q=...
 *   GET /api/anime/genre?g=Action,Adventure
 *   GET /api/anime/:id           (an AniList id, e.g. /api/anime/21)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // req.url is the ORIGINAL client-requested path (e.g.
  // "/api/anime/popular?foo=bar") - a vercel.json rewrite forwards the
  // request to this function without changing what the function sees
  // here, same as every other reverse-proxy rewrite. Parsed with the
  // WHATWG URL API (a dummy base is required for a relative input)
  // rather than req.query, since req.query only carries the dynamic
  // segment(s) Vercel itself infers from the filename - see the
  // file-level comment above for why that inference isn't reliable
  // here.
  const pathname = new URL(req.url ?? '', 'http://placeholder').pathname
  const segments = pathname.split('/').filter(Boolean).slice(1) // drop the leading "api" segment

  // Every current route lives under /api/anime/<something> - anything
  // else 404s, the same as an unmatched file would have before.
  if (segments[0] !== 'anime' || segments.length !== 2) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const segment = segments[1]

  switch (segment) {
    case 'popular':
      await handlePopular(res)
      return
    case 'trending':
      await handleTrending(res)
      return
    case 'new-releases':
      await handleNewReleases(res)
      return
    case 'random':
      await handleRandom(res)
      return
    case 'search':
      await handleSearch(req, res)
      return
    case 'genre':
      await handleGenre(req, res)
      return
    default:
      // Anything else in that position is treated as an AniList id -
      // same fallback the old dynamic api/anime/[id].ts route gave
      // any segment that didn't match one of the literal route names
      // above (Vercel always prefers a static/named file match over a
      // dynamic one, so this precedence isn't new behavior).
      await handleById(res, segment)
      return
  }
}

async function handlePopular(res: VercelResponse) {
  try {
    const results = await fetchPopular(10)
    // Identical for every visitor and changes rarely - safe to cache
    // at the edge for everyone, not just repeat callers.
    setPublicCache(res, 300, 1800)
    res.status(200).json({ results })
  } catch (err) {
    if (err instanceof AnilistLookupError) {
      res.status(502).json({ error: err.message })
      return
    }
    console.error(err)
    res.status(502).json({ error: 'Failed to fetch popular anime' })
  }
}

async function handleTrending(res: VercelResponse) {
  try {
    const results = await fetchTrending(10)
    setPublicCache(res, 300, 1800)
    res.status(200).json({ results })
  } catch (err) {
    if (err instanceof AnilistLookupError) {
      res.status(502).json({ error: err.message })
      return
    }
    console.error(err)
    res.status(502).json({ error: 'Failed to fetch trending anime' })
  }
}

async function handleNewReleases(res: VercelResponse) {
  try {
    const results = await fetchNewReleases(10)
    setPublicCache(res, 300, 1800)
    res.status(200).json({ results })
  } catch (err) {
    if (err instanceof AnilistLookupError) {
      res.status(502).json({ error: err.message })
      return
    }
    console.error(err)
    res.status(502).json({ error: 'Failed to fetch newly released anime' })
  }
}

async function handleRandom(res: VercelResponse) {
  try {
    const result = await fetchRandomAnime()
    // The whole point of this endpoint is a different answer every
    // time - must never be cached/reused for a later visitor (or even
    // a later call from the same visitor).
    setNoStore(res)
    res.status(200).json({ result })
  } catch (err) {
    if (err instanceof AnilistLookupError) {
      res.status(502).json({ error: err.message })
      return
    }
    console.error(err)
    res.status(502).json({ error: 'Failed to fetch a random anime' })
  }
}

async function handleSearch(req: VercelRequest, res: VercelResponse) {
  const rawQuery = req.query.q
  const query = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery

  if (!query || !query.trim()) {
    res.status(400).json({ error: 'Missing required "q" query parameter' })
    return
  }

  try {
    const results = await searchAnime(query.trim())
    setPublicCache(res, 120, 600)
    res.status(200).json({ results })
  } catch (err) {
    if (err instanceof AnilistLookupError) {
      res.status(502).json({ error: err.message })
      return
    }
    console.error(err)
    res.status(502).json({ error: 'Failed to search AniList' })
  }
}

async function handleGenre(req: VercelRequest, res: VercelResponse) {
  const rawGenres = req.query.g
  const genresParam = Array.isArray(rawGenres) ? rawGenres[0] : rawGenres
  const genres = (genresParam ?? '').split(',').map(g => g.trim()).filter(Boolean)

  if (genres.length === 0) {
    res.status(400).json({ error: 'Missing required "g" query parameter (comma-separated genre names)' })
    return
  }

  try {
    const results = await searchByGenre(genres)
    setPublicCache(res, 300, 1800)
    res.status(200).json({ results })
  } catch (err) {
    if (err instanceof AnilistLookupError) {
      res.status(502).json({ error: err.message })
      return
    }
    console.error(err)
    res.status(502).json({ error: 'Failed to fetch anime by genre' })
  }
}

async function handleById(res: VercelResponse, anilistId: string) {
  if (!anilistId) {
    res.status(400).json({ error: 'Missing required "id" path parameter' })
    return
  }

  let anime
  try {
    anime = await fetchAnimeInfo(anilistId)
  } catch (err) {
    if (err instanceof AnilistLookupError) {
      res.status(404).json({ error: err.message })
      return
    }
    console.error(err)
    res.status(502).json({ error: 'Failed to fetch anime info from AniList' })
    return
  }

  // Same details for every visitor and rarely changes - longer TTL
  // than the browsing lists since a series' own info page is worth
  // keeping warm at the edge for a while.
  setPublicCache(res, 600, 3600)
  res.status(200).json(anime)
}
