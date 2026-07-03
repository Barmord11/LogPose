import type { VercelRequest, VercelResponse } from '@vercel/node'
import { ConsumetLookupError, fetchAnimeInfo } from '../_lib/consumet.js'

/**
 * GET /api/anime/:id
 * Returns one series' stripped-down Consumet payload:
 * { id, title, image, totalEpisodes, episodes: [{ id, number, title, image, url }] }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const rawId = req.query.id
  const anilistId = Array.isArray(rawId) ? rawId[0] : rawId

  if (!anilistId) {
    res.status(400).json({ error: 'Missing required "id" path parameter' })
    return
  }

  try {
    const anime = await fetchAnimeInfo(anilistId)
    res.status(200).json(anime)
  } catch (err) {
    if (err instanceof ConsumetLookupError) {
      res.status(404).json({ error: err.message })
      return
    }
    console.error(err)
    res.status(502).json({ error: 'Failed to fetch anime info from Consumet' })
  }
}
