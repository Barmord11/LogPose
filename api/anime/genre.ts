import type { VercelRequest, VercelResponse } from '@vercel/node'
import { AnilistLookupError, searchByGenre } from '../_lib/anilist.js'

/**
 * GET /api/anime/genre?g=Action,Adventure
 * Popularity-ranked AniList series matching any of the given genres
 * (comma-separated, OR semantics), stripped to card-sized data:
 * [{ id, title, image, releaseDate, totalEpisodes }]
 *
 * Feeds Search's genre bento — clicking "Isekai" etc. now queries
 * AniList for real matching series instead of filtering the small
 * hardcoded mock catalogue.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const rawGenres = req.query.g
  const genresParam = Array.isArray(rawGenres) ? rawGenres[0] : rawGenres
  const genres = (genresParam ?? '').split(',').map(g => g.trim()).filter(Boolean)

  if (genres.length === 0) {
    res.status(400).json({ error: 'Missing required "g" query parameter (comma-separated genre names)' })
    return
  }

  try {
    const results = await searchByGenre(genres)
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
