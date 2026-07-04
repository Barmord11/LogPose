import { supabase } from '../lib/supabaseClient'

/**
 * The heart/Favorite flag for a live (API-backed) series — stored in
 * our own Supabase table (anime_favorites), separate from anime_tracker
 * (a series can be favorited without being tracked, or vice versa).
 * Series are identified by AniList id (from the official AniList GraphQL API).
 *
 * The mock catalogue's heart button still uses the local AppContext
 * reducer — reusing it for live series isn't safe, since real AniList ids
 * can collide with the mock catalogue's own numeric ids.
 */

/** Whether the signed-in user has favorited a series. */
export async function isFavorite(anilistId: number): Promise<boolean> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) return false

  const { data, error } = await supabase
    .from('anime_favorites')
    .select('id')
    .eq('anilist_id', anilistId)
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (error) throw error
  return data !== null
}

export interface AddFavoriteInput {
  anilistId: number
  title: string
  imageUrl: string | null
}

/**
 * Adds a series to the signed-in user's favorites. Caches title/image
 * on the row (same reasoning as anime_tracker) so the Favorites panel
 * can render without an extra AniList round trip per entry.
 */
export async function addFavorite(input: AddFavoriteInput): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Not signed in')

  const { error } = await supabase
    .from('anime_favorites')
    .upsert(
      { user_id: userData.user.id, anilist_id: input.anilistId, title: input.title, image_url: input.imageUrl },
      { onConflict: 'user_id,anilist_id' },
    )

  if (error) throw error
}

/** Removes a series from the signed-in user's favorites. */
export async function removeFavorite(anilistId: number): Promise<void> {
  const { error } = await supabase.from('anime_favorites').delete().eq('anilist_id', anilistId)
  if (error) throw error
}

/** Toggles the favorite flag for a series, returning the new state. */
export async function toggleFavorite(currentlyFavorite: boolean, input: AddFavoriteInput): Promise<boolean> {
  if (currentlyFavorite) {
    await removeFavorite(input.anilistId)
    return false
  }
  await addFavorite(input)
  return true
}

export interface FavoriteRow {
  anilistId: number
  title: string
  imageUrl: string | null
}

/** Lists every series the signed-in user has favorited. RLS already scopes this to auth.uid(). */
export async function listFavorites(): Promise<FavoriteRow[]> {
  const { data, error } = await supabase.from('anime_favorites').select('anilist_id, title, image_url')
  if (error) throw error
  return ((data ?? []) as { anilist_id: number; title: string; image_url: string | null }[]).map(row => ({
    anilistId: row.anilist_id,
    title: row.title,
    imageUrl: row.image_url,
  }))
}
