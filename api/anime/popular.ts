import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AnilistLookupError, fetchPopular } from '../_lib/anilist.js'
import { setPublicCache } from '../_lib/cache.js'

/**
 * GET /api/anime/popular
 * All-time most popular series (AniList's Page query, sort:
 * POPULARITY_DESC, no status filter — unlike trending.ts, this is not
 * limited to currently-airing), stripped to the same card-sized shape
 * as search/trending: [{ id, title, image, releaseDate, totalEpisodes }]
 *
 * Feeds Home's hero + "Popular This Week" grid and Search's default
 * (no query/genre/chip active) browsing view, so both show real
 * AniList data instead of the hardcoded mock catalogue. Best-effort,
 * same as trending.ts — a hiccup here just means that section falls
 * back or hides rather than breaking the page.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

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
