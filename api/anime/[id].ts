import type { VercelRequest, VercelResponse } from '@vercel/node'
import { JikanLookupError, fetchAnimeInfo } from '../_lib/jikan.js'
import { ConsumetLookupError, fetchWatchEpisodes } from '../_lib/consumet.js'

/**
 * GET /api/anime/:id  (id = a MyAnimeList id)
 *
 * Returns Jikan's details for the series plus its AnimeKai episode
 * list, merged into one payload:
 * { id, title, image, genres, description, status, format, score,
 *   characters, totalEpisodes, episodes: [{ id, number, title, image, url }] }
 *
 * The two sources are independent: Jikan (details) is required — if
 * it fails, this 404s/502s. Consumet (watch links) is best-effort —
 * if AnimeKai is down or the scraper fails, we still return the full
 * details with `episodes: []` rather than failing the whole request.
 * That's the whole point of splitting them: a flaky scraper should
 * never take down the details page.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const rawId = req.query.id
  const malId = Array.isArray(rawId) ? rawId[0] : rawId

  if (!malId) {
    res.status(400).json({ error: 'Missing required "id" path parameter' })
    return
  }

  let anime
  try {
    anime = await fetchAnimeInfo(malId)
  } catch (err) {
    if (err instanceof JikanLookupError) {
      res.status(404).json({ error: err.message })
      return
    }
    console.error(err)
    res.status(502).json({ error: 'Failed to fetch anime info from Jikan' })
    return
  }

  let episodes: Awaited<ReturnType<typeof fetchWatchEpisodes>> = []
  try {
    episodes = await fetchWatchEpisodes(malId)
  } catch (err) {
    // Best-effort: AnimeKai/Consumet being down means no watch links
    // today, not a broken details page.
    if (!(err instanceof ConsumetLookupError)) console.error(err)
  }

  res.status(200).json({ ...anime, episodes })
}
