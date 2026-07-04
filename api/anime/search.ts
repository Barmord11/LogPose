import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AnilistLookupError, searchAnime } from '../_lib/anilist.js'

/**
 * GET /api/anime/search?q=<title>
 * Returns AniList search results, stripped to card-sized data:
 * [{ id, title, image, releaseDate, totalEpisodes }]
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const rawQuery = req.query.q
  const query = Array.isArray(rawQuery) ? rawQuery[0] : rawQuery

  if (!query || !query.trim()) {
    res.status(400).json({ error: 'Missing required "q" query parameter' })
    return
  }

  try {
    const results = await searchAnime(query.trim())
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
