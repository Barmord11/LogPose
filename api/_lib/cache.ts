import type { VercelResponse } from '@vercel/node'

/**
 * Sets Cache-Control so Vercel's Edge Network can serve this response
 * to every visitor requesting the same URL, not just re-use it within
 * one warm serverless instance the way the in-memory cache in
 * anilist.ts does. That in-memory cache only helps a handful of calls
 * hitting the same warm lambda in quick succession — it's wiped every
 * time Vercel spins up a fresh instance (common for low/sporadic
 * traffic), so most real visitors were still paying the full AniList
 * round trip. This is the much bigger win: once any one visitor
 * "warms" a URL, every other visitor gets it back instantly from the
 * edge until it expires.
 *
 * Only call this on a successful (200) response — an error should
 * never get cached and re-served to the next visitor as if it were
 * real data.
 *
 * @param maxAgeSec               How long a cached copy is served as fully fresh.
 * @param staleWhileRevalidateSec How much longer a stale copy can still be served
 *                                instantly while a fresh one is fetched in the
 *                                background, instead of every visitor blocking on it.
 */
export function setPublicCache(res: VercelResponse, maxAgeSec: number, staleWhileRevalidateSec: number): void {
  res.setHeader('Cache-Control', `public, s-maxage=${maxAgeSec}, stale-while-revalidate=${staleWhileRevalidateSec}`)
}

/** Explicitly opts a response out of any caching — for endpoints that are supposed to give a different answer on every call (e.g. the random "surprise me" pick). */
export function setNoStore(res: VercelResponse): void {
  res.setHeader('Cache-Control', 'no-store')
}
