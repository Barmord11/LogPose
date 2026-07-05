import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AnilistLookupError, fetchTrending } from '../_lib/anilist.js'
import { setPublicCache } from '../_lib/cache.js'

/**
 * GET /api/anime/trending
 * Currently-airing series ranked by trending score (AniList's Page
 * query, status: RELEASING, sort: TRENDING_DESC), stripped to the
 * same card-sized shape as search:
 * [{ id, title, image, releaseDate, totalEpisodes }]
 *
 * Feeds the Home page's "Trending Now" section. Kept as its own
 * best-effort endpoint (Home swallows failures and just hides the
 * section) so an AniList hiccup here never breaks the rest of Home.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const results = await fetchTrending(10)
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
    res.status(502).json({ error: 'Failed to fetch trending anime' })
  }
}
