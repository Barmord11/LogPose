import type { VercelRequest, VercelResponse } from '@vercel/node'
import { JikanLookupError, fetchTrending } from '../_lib/jikan.js'

/**
 * GET /api/anime/trending
 * Currently-airing series ranked by popularity (Jikan's /top/anime,
 * filter=airing), stripped to the same card-sized shape as search:
 * [{ id, title, image, releaseDate, totalEpisodes }]
 *
 * Feeds the Home page's "Trending Now" section. Kept as its own
 * best-effort endpoint (Home swallows failures and just hides the
 * section) so a Jikan hiccup here never breaks the rest of Home.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const results = await fetchTrending(10)
    res.status(200).json({ results })
  } catch (err) {
    if (err instanceof JikanLookupError) {
      res.status(502).json({ error: err.message })
      return
    }
    console.error(err)
    res.status(502).json({ error: 'Failed to fetch trending anime' })
  }
}
