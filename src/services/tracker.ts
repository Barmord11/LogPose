import { supabase } from '../lib/supabaseClient'

/**
 * LogPose restricts every tracked series to exactly one of these two
 * statuses. There is intentionally no "Watching" status — enforced
 * here by the type system and in the database by a CHECK constraint
 * (see supabase/schema.sql).
 */
export type TrackerStatus = 'Watched' | 'Plan to Watch'

export interface TrackerRow {
  id: number
  /** MyAnimeList id (from the Jikan API). */
  malId: number
  title: string
  imageUrl: string | null
  totalEpisodes: number
  episodesWatched: number
  status: TrackerStatus
}

interface TrackerDbRow {
  id: number
  mal_id: number
  title: string
  image_url: string | null
  total_episodes: number
  episodes_watched: number
  status: TrackerStatus
}

function mapRow(row: TrackerDbRow): TrackerRow {
  return {
    id: row.id,
    malId: row.mal_id,
    title: row.title,
    imageUrl: row.image_url,
    totalEpisodes: row.total_episodes,
    episodesWatched: row.episodes_watched,
    status: row.status,
  }
}

/** Fetches the signed-in user's tracker row for one series, or null if it isn't tracked yet. */
export async function getTrackerRow(malId: number): Promise<TrackerRow | null> {
  const { data, error } = await supabase
    .from('anime_tracker')
    .select('*')
    .eq('mal_id', malId)
    .maybeSingle()

  if (error) throw error
  return data ? mapRow(data as TrackerDbRow) : null
}

export interface UpsertStatusInput {
  malId: number
  status: TrackerStatus
  title: string
  imageUrl: string | null
  totalEpisodes: number
}

/**
 * Sets the list status for a series, creating the tracker row on first
 * use (RLS requires user_id = auth.uid(), so the caller must be signed in).
 */
export async function upsertStatus(input: UpsertStatusInput): Promise<TrackerRow> {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('Not signed in')

  const { data, error } = await supabase
    .from('anime_tracker')
    .upsert(
      {
        user_id: userData.user.id,
        mal_id: input.malId,
        status: input.status,
        title: input.title,
        image_url: input.imageUrl,
        total_episodes: input.totalEpisodes,
      },
      { onConflict: 'user_id,mal_id' },
    )
    .select()
    .single()

  if (error) throw error
  return mapRow(data as TrackerDbRow)
}

/**
 * Updates episodes_watched on an already-tracked series. The
 * `enforce_tracker_progress` database trigger clamps the value into
 * [0, totalEpisodes] and flips status to 'Watched' once the counter
 * reaches the total — this is the single source of truth for that
 * rule. Client code (AnimeDetailPage) additionally clamps before
 * calling this, purely so the +/- buttons can disable immediately.
 */
export async function updateProgress(malId: number, episodesWatched: number): Promise<TrackerRow> {
  const { data, error } = await supabase
    .from('anime_tracker')
    .update({ episodes_watched: episodesWatched })
    .eq('mal_id', malId)
    .select()
    .single()

  if (error) throw error
  return mapRow(data as TrackerDbRow)
}

/** Removes a series from the signed-in user's tracker entirely. */
export async function removeFromTracker(malId: number): Promise<void> {
  const { error } = await supabase.from('anime_tracker').delete().eq('mal_id', malId)
  if (error) throw error
}

/**
 * Fetches every tracked (live/API) series for the signed-in user, most
 * recently added first, optionally filtered to one status. RLS already
 * scopes this to `auth.uid()` — no explicit user_id filter needed here.
 *
 * This is what lets My List show series added from the live Search →
 * details flow, instead of only the hardcoded mock catalogue.
 */
export async function getTrackerList(status?: TrackerStatus): Promise<TrackerRow[]> {
  let query = supabase.from('anime_tracker').select('*').order('id', { ascending: false })
  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return ((data ?? []) as TrackerDbRow[]).map(mapRow)
}
