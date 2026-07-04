import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AnilistLookupError, fetchRandomAnime } from '../_lib/anilist.js'

/**
 * GET /api/anime/random
 * Picks one series at random from AniList's popular pool - feeds the
 * mobile "compass" surprise button (see src/components/BottomNav.tsx),
 * which previously opened a hardcoded mock series instead of a real,
 * live details page. Same card-sized shape as popular/trending/search:
 * { id, title, image, releaseDate, totalEpisodes }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const result = await fetchRandomAnime()
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
