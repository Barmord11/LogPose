import { supabase } from '../lib/supabaseClient'

/**
 * LogPose's own Anchor Up/Down community rating — stored in our own
 * Supabase table (anime_ratings), independent of whatever score
 * AniList reports. One vote per signed-in user per series.
 * Series are identified by AniList id (from the official AniList GraphQL API).
 */
export type RatingValue = 'up' | 'down'

export interface RatingSummary {
  upCount: number
  downCount: number
}

/** The signed-in user's own vote for a series, or null if they haven't voted. */
export async function getMyRating(anilistId: number): Promise<RatingValue | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) return null

  const { data, error } = await supabase
    .from('anime_ratings')
    .select('rating')
    .eq('anilist_id', anilistId)
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (error) throw error
  return (data?.rating as RatingValue | undefined) ?? null
}

/** Sets (or changes) the signed-in user's vote for a series. */
export async function setRating(anilistId: number, rating: RatingValue): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Not signed in')

  const { error } = await supabase
    .from('anime_ratings')
    .upsert(
      { user_id: userData.user.id, anilist_id: anilistId, rating },
      { onConflict: 'user_id,anilist_id' },
    )

  if (error) throw error
}

/** Removes the signed-in user's vote for a series (clicking the same direction again). */
export async function clearRating(anilistId: number): Promise<void> {
  const { error } = await supabase.from('anime_ratings').delete().eq('anilist_id', anilistId)
  if (error) throw error
}

/**
 * Aggregate up/down counts for a series, across every user — read via
 * a security-definer RPC function so individual users' votes stay
 * private (RLS only lets each user select their own row directly).
 */
export async function getRatingSummary(anilistId: number): Promise<RatingSummary> {
  const { data, error } = await supabase.rpc('anime_rating_summary', { p_anilist_id: anilistId })
  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  return {
    upCount: Number(row?.up_count ?? 0),
    downCount: Number(row?.down_count ?? 0),
  }
}
