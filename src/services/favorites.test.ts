import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuthGetUser = vi.fn()
let queryResult: { data?: unknown; error?: unknown }

function makeQueryBuilder() {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.upsert = vi.fn(chain)
  builder.delete = vi.fn(chain)
  builder.maybeSingle = vi.fn(() => Promise.resolve(queryResult))
  // Real supabase-js query builders are themselves thenable, so a bare
  // `await supabase.from(...).delete().eq(...)`, `.upsert(...)`, or
  // `.select(...)` (no maybeSingle) resolves directly - mirror that here.
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

const { isFavorite, addFavorite, removeFavorite, toggleFavorite, listFavorites } = await import('./favorites')

beforeEach(() => {
  vi.clearAllMocks()
  queryResult = { data: null, error: null }
  mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
})

describe('isFavorite', () => {
  it('returns false when nobody is signed in', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: null })
    expect(await isFavorite(21)).toBe(false)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns false when the series is not favorited', async () => {
    queryResult = { data: null, error: null }
    expect(await isFavorite(21)).toBe(false)
  })

  it('returns true when a row exists', async () => {
    queryResult = { data: { id: 1 }, error: null }
    expect(await isFavorite(21)).toBe(true)
  })

  it('throws when supabase returns an error', async () => {
    queryResult = { data: null, error: new Error('RLS denied') }
    await expect(isFavorite(21)).rejects.toThrow('RLS denied')
  })
})

const SAMPLE_INPUT = { anilistId: 21, title: 'One Piece', imageUrl: 'img.jpg' }

describe('addFavorite', () => {
  it('throws when nobody is signed in', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(addFavorite(SAMPLE_INPUT)).rejects.toThrow('Not signed in')
  })

  it('upserts the favorite (with cached title/image) for the signed-in user', async () => {
    queryResult = { error: null }
    await expect(addFavorite(SAMPLE_INPUT)).resolves.toBeUndefined()
    expect(mockFrom).toHaveBeenCalledWith('anime_favorites')
  })

  it('throws when supabase returns an error', async () => {
    queryResult = { error: new Error('boom') }
    await expect(addFavorite(SAMPLE_INPUT)).rejects.toThrow('boom')
  })
})

describe('removeFavorite', () => {
  it('resolves without throwing when the delete succeeds', async () => {
    queryResult = { error: null }
    await expect(removeFavorite(21)).resolves.toBeUndefined()
  })

  it('throws when the delete fails', async () => {
    queryResult = { error: new Error('denied') }
    await expect(removeFavorite(21)).rejects.toThrow('denied')
  })
})

describe('toggleFavorite', () => {
  it('removes and returns false when currently favorited', async () => {
    queryResult = { error: null }
    expect(await toggleFavorite(true, SAMPLE_INPUT)).toBe(false)
  })

  it('adds and returns true when not currently favorited', async () => {
    queryResult = { error: null }
    expect(await toggleFavorite(false, SAMPLE_INPUT)).toBe(true)
  })
})

describe('listFavorites', () => {
  it('returns an empty array when nothing is favorited', async () => {
    queryResult = { data: [], error: null }
    expect(await listFavorites()).toEqual([])
  })

  it('maps rows to camelCase fields', async () => {
    queryResult = {
      data: [
        { anilist_id: 21, title: 'One Piece', image_url: 'a.jpg' },
        { anilist_id: 42, title: 'Naruto', image_url: null },
      ],
      error: null,
    }
    expect(await listFavorites()).toEqual([
      { anilistId: 21, title: 'One Piece', imageUrl: 'a.jpg' },
      { anilistId: 42, title: 'Naruto', imageUrl: null },
    ])
  })

  it('handles a null data payload as an empty list', async () => {
    queryResult = { data: null, error: null }
    expect(await listFavorites()).toEqual([])
  })

  it('throws when supabase returns an error', async () => {
    queryResult = { data: null, error: new Error('RLS denied') }
    await expect(listFavorites()).rejects.toThrow('RLS denied')
  })
})
