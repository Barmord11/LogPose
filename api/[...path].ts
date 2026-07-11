import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  AnilistLookupError,
  fetchAnimeInfo,
  fetchPopular,
  fetchTrending,
  fetchRandomAnime,
  searchAnime,
  searchByGenre,
} from './_lib/anilist.js'
import { ConsumetLookupError, fetchWatchEpisodes } from './_lib/consumet.js'
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
 * request now lands on this one file - Vercel's dynamic catch-all
 * filename convention ([...path].ts placed at the api/ root matches
 * any path under /api/) - which reads the path segments out of
 * req.query.path and dispatches internally. That's a fixed cost of
 * exactly one Function no matter how many routes live below it, and it
 * needs no vercel.json rewrites - the filename alone is what tells
 * Vercel to route every /api/* request here.
 *
 * The actual per-route logic didn't move. It always lived in
 * _lib/anilist.ts and _lib/consumet.ts (already excluded from the
 * Function count by their own "_" prefix) - this file is just the
 * router that used to be six separate entry-point files, each doing
 * little more than picking query params apart and calling into _lib.
 *
 * Route table (unchanged from before - src/services/animeApi.ts's
 * fetch URLs don't need to change):
 *   GET /api/anime/popular
 *   GET /api/anime/trending
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

  const rawPath = req.query.path
  const segments = Array.isArray(rawPath) ? rawPath : rawPath ? [rawPath] : []

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

  let episodes: Awaited<ReturnType<typeof fetchWatchEpisodes>> = []
  try {
    episodes = await fetchWatchEpisodes(anilistId)
  } catch (err) {
    // Best-effort: AnimeKai/Consumet being down means no watch links
    // today, not a broken details page.
    if (!(err instanceof ConsumetLookupError)) console.error(err)
  }

  // Same details for every visitor and rarely changes - longer TTL
  // than the browsing lists since a series' own info page is worth
  // keeping warm at the edge for a while.
  setPublicCache(res, 600, 3600)
  res.status(200).json({ ...anime, episodes })
}
