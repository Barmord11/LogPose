import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuthGetUser = vi.fn()
const mockRpc = vi.fn()
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
  // `await supabase.from(...).delete().eq(...)` or `.upsert(...)`
  // resolves without a trailing .maybeSingle() call - mirror that here.
  ;(builder as { then: typeof Promise.prototype.then }).then = (resolve, reject) =>
    Promise.resolve(queryResult).then(resolve, reject)
  return builder
}

const mockFrom = vi.fn((..._args: unknown[]) => makeQueryBuilder())

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: (...args: unknown[]) => mockAuthGetUser(...args) },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

const { getMyRating, setRating, clearRating, getRatingSummary } = await import('./ratings')

beforeEach(() => {
  vi.clearAllMocks()
  queryResult = { data: null, error: null }
  mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
})

describe('getMyRating', () => {
  it('returns null when nobody is signed in', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: null })
    expect(await getMyRating(21)).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns null when the user has not voted', async () => {
    queryResult = { data: null, error: null }
    expect(await getMyRating(21)).toBeNull()
  })

  it("returns the user's stored vote", async () => {
    queryResult = { data: { rating: 'up' }, error: null }
    expect(await getMyRating(21)).toBe('up')
  })

  it('throws when supabase returns an error', async () => {
    queryResult = { data: null, error: new Error('RLS denied') }
    await expect(getMyRating(21)).rejects.toThrow('RLS denied')
  })
})

describe('setRating', () => {
  it('throws when nobody is signed in', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(setRating(21, 'up')).rejects.toThrow('Not signed in')
  })

  it('upserts the vote for the signed-in user', async () => {
    queryResult = { error: null }
    await expect(setRating(21, 'up')).resolves.toBeUndefined()
    expect(mockFrom).toHaveBeenCalledWith('anime_ratings')
  })

  it('throws when supabase returns an error', async () => {
    queryResult = { error: new Error('boom') }
    await expect(setRating(21, 'down')).rejects.toThrow('boom')
  })
})

describe('clearRating', () => {
  it('resolves without throwing when the delete succeeds', async () => {
    queryResult = { error: null }
    await expect(clearRating(21)).resolves.toBeUndefined()
  })

  it('throws when the delete fails', async () => {
    queryResult = { error: new Error('denied') }
    await expect(clearRating(21)).rejects.toThrow('denied')
  })
})

describe('getRatingSummary', () => {
  it('maps the RPC row to camelCase counts', async () => {
    mockRpc.mockResolvedValue({ data: [{ up_count: 12, down_count: 3 }], error: null })
    const summary = await getRatingSummary(21)
    expect(mockRpc).toHaveBeenCalledWith('anime_rating_summary', { p_mal_id: 21 })
    expect(summary).toEqual({ upCount: 12, downCount: 3 })
  })

  it('defaults to zero counts when there are no votes yet', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    expect(await getRatingSummary(21)).toEqual({ upCount: 0, downCount: 0 })
  })

  it('throws when the RPC call fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('rpc denied') })
    await expect(getRatingSummary(21)).rejects.toThrow('rpc denied')
  })
})
