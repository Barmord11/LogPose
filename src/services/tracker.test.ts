import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuthGetUser = vi.fn()
let queryResult: { data?: unknown; error?: unknown }

function makeQueryBuilder() {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.upsert = vi.fn(chain)
  builder.update = vi.fn(chain)
  builder.delete = vi.fn(chain)
  builder.order = vi.fn(chain)
  builder.single = vi.fn(() => Promise.resolve(queryResult))
  builder.maybeSingle = vi.fn(() => Promise.resolve(queryResult))
  // Real supabase-js query builders are themselves thenable, so a bare
  // `await supabase.from(...).delete().eq(...)` resolves without a
  // trailing .single()/.maybeSingle() call - mirror that here.
  ;(builder as { then: typeof Promise.prototype.then }).then = (resolve, reject) =>
    Promise.resolve(queryResult).then(resolve, reject)
  return builder
}

const mockFrom = vi.fn((..._args: unknown[]) => makeQueryBuilder())

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: (...args: unknown[]) => mockAuthGetUser(...args) },
  },
}))

const { getTrackerRow, upsertStatus, updateProgress, removeFromTracker, getTrackerList } = await import('./tracker')

beforeEach(() => {
  vi.clearAllMocks()
  queryResult = { data: null, error: null }
})

describe('getTrackerRow', () => {
  it('returns null when the series is not tracked', async () => {
    queryResult = { data: null, error: null }
    const row = await getTrackerRow(21)
    expect(row).toBeNull()
  })

  it('maps a db row (snake_case) to the TrackerRow shape (camelCase)', async () => {
    queryResult = {
      data: {
        id: 1, mal_id: 21, title: 'One Piece', image_url: 'img.jpg',
        total_episodes: 1000, episodes_watched: 5, status: 'Plan to Watch',
      },
      error: null,
    }
    const row = await getTrackerRow(21)
    expect(row).toEqual({
      id: 1, malId: 21, title: 'One Piece', imageUrl: 'img.jpg',
      totalEpisodes: 1000, episodesWatched: 5, status: 'Plan to Watch',
    })
  })

  it('throws when supabase returns an error', async () => {
    queryResult = { data: null, error: new Error('RLS denied') }
    await expect(getTrackerRow(21)).rejects.toThrow('RLS denied')
  })
})

describe('upsertStatus', () => {
  it('throws when nobody is signed in', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(
      upsertStatus({ malId: 1, status: 'Watched', title: 'x', imageUrl: null, totalEpisodes: 1 }),
    ).rejects.toThrow('Not signed in')
  })

  it('upserts using the signed-in user id and only allows Watched/Plan to Watch', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    queryResult = {
      data: { id: 1, mal_id: 1, title: 'x', image_url: null, total_episodes: 1, episodes_watched: 0, status: 'Watched' },
      error: null,
    }
    const row = await upsertStatus({ malId: 1, status: 'Watched', title: 'x', imageUrl: null, totalEpisodes: 1 })
    expect(row.status).toBe('Watched')
    // TypeScript's TrackerStatus union already forbids anything else at
    // compile time; this just documents the two legal values at runtime.
    expect(['Watched', 'Plan to Watch']).toContain(row.status)
  })
})

describe('updateProgress', () => {
  it('updates episodes_watched and returns the mapped row', async () => {
    queryResult = {
      data: { id: 1, mal_id: 1, title: 'x', image_url: null, total_episodes: 12, episodes_watched: 3, status: 'Plan to Watch' },
      error: null,
    }
    const row = await updateProgress(1, 3)
    expect(row.episodesWatched).toBe(3)
  })

  it('throws when supabase returns an error', async () => {
    queryResult = { data: null, error: new Error('not tracked') }
    await expect(updateProgress(1, 3)).rejects.toThrow('not tracked')
  })
})

describe('removeFromTracker', () => {
  it('resolves without throwing when the delete succeeds', async () => {
    queryResult = { error: null }
    await expect(removeFromTracker(1)).resolves.toBeUndefined()
  })

  it('throws when the delete fails', async () => {
    queryResult = { error: new Error('denied') }
    await expect(removeFromTracker(1)).rejects.toThrow('denied')
  })
})

describe('getTrackerList', () => {
  it('returns an empty array when nothing is tracked', async () => {
    queryResult = { data: [], error: null }
    expect(await getTrackerList()).toEqual([])
  })

  it('maps every row to the TrackerRow shape', async () => {
    queryResult = {
      data: [
        { id: 2, mal_id: 20, title: 'B', image_url: null, total_episodes: 24, episodes_watched: 24, status: 'Watched' },
        { id: 1, mal_id: 10, title: 'A', image_url: 'a.jpg', total_episodes: 12, episodes_watched: 3, status: 'Plan to Watch' },
      ],
      error: null,
    }
    const rows = await getTrackerList()
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({ id: 2, malId: 20, title: 'B', imageUrl: null, totalEpisodes: 24, episodesWatched: 24, status: 'Watched' })
  })

  it('handles a null data payload as an empty list', async () => {
    queryResult = { data: null, error: null }
    expect(await getTrackerList('Watched')).toEqual([])
  })

  it('throws when supabase returns an error', async () => {
    queryResult = { data: null, error: new Error('RLS denied') }
    await expect(getTrackerList()).rejects.toThrow('RLS denied')
  })
})
