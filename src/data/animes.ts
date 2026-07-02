/* ─── Data Models ─────────────────────────────────────────── */
export interface Character {
  id: number
  name: string
  role: string
  image: string
}

export interface Anime {
  id: number
  title: string
  cover: string
  genres: string[]
  rank: number
  score: number
  episodes: number
  status: 'AIRING' | 'COMPLETED' | 'UPCOMING'
  synopsis: string
  characters: Character[]
  liked: number
  disliked: number
  type: 'TV Series' | 'Movie' | 'OVA'
  watchUrl: string
  /** Japanese alternate title */
  altTitle?: string
}

export interface Genre {
  id: string
  label: string
  badge: string
  badgeVariant: 'orange' | 'cyan' | 'navy' | 'light'
  image: string
  description: string
  /** Anime.genres tags this genre card maps to when used as a filter */
  matchTags: string[]
}

/* ─── Genres ─────────────────────────────────────────────── */
export const genres: Genre[] = [
  { id: 'shonen',     label: 'Shonen',       badge: 'HIGH ENERGY',      badgeVariant: 'orange', image: '/images/genre-shonen.jpg',       description: 'Journey to distant horizons beyond imagination.', matchTags: ['ACTION', 'ADVENTURE'] },
  { id: 'seinen',     label: 'Seinen',       badge: 'MATURE THEMES',    badgeVariant: 'navy',   image: '/images/genre-seinen.jpg',       description: 'Complex narratives for the experienced voyager.', matchTags: ['DRAMA', 'MECHA'] },
  { id: 'isekai',     label: 'Isekai',       badge: 'NEW WORLDS',       badgeVariant: 'cyan',   image: '/images/genre-isekai.jpg',       description: 'Cross the horizon into worlds unknown.',           matchTags: ['FANTASY', 'SCI-FI'] },
  { id: 'slice-life', label: 'Slice of Life',badge: 'PEACEFUL MOMENTS', badgeVariant: 'light',  image: '/images/genre-slice-of-life.jpg',description: 'The beauty in the everyday currents of life.',     matchTags: ['SLICE OF LIFE', 'ROMANCE'] },
  { id: 'mystery',    label: 'Mystery',      badge: 'HIDDEN TRUTHS',    badgeVariant: 'navy',   image: '/images/genre-mystery.jpg',      description: 'Hidden truths lurk beneath the surface.',          matchTags: ['MYSTERY'] },
  { id: 'fantasy',    label: 'Fantasy',      badge: 'EPIC SAGAS',       badgeVariant: 'orange', image: '/images/genre-fantasy.jpg',      description: 'Legendary battles and kingdoms of wonder.',        matchTags: ['FANTASY'] },
]

/* ─── Animes ─────────────────────────────────────────────── */
export const animes: Anime[] = [
  {
    id: 1,
    title: 'Grand Blue Horizon',
    altTitle: 'Sōkai no Shiro',
    cover: '/images/anime-grand-blue.jpg',
    genres: ['ACTION', 'ADVENTURE', 'FANTASY'],
    rank: 14,
    score: 8.92,
    episodes: 24,
    status: 'AIRING',
    type: 'TV Series',
    watchUrl: 'https://watch.logpose.app/anime/1/ep/1',
    synopsis: `In a world where the vast oceans hold secrets of a forgotten civilization, a young navigator discovers the LogPose — a mystical compass that doesn't point north, but towards the next island of adventure. Legend speaks of an island where the sun never sets, guarded by ancient maritime spirits and elusive sea kings.

Our protagonist, driven by the echoes of their ancestor's diary, assembles a crew of misfits to traverse the Treacherous Currents. This journey isn't just about reaching a destination; it's about the bonds forged in the spray of the salt water, and the resilience of the human spirit against the boundless blue.`,
    characters: [
      { id: 1, name: 'Kaito Kai',   role: 'Protagonist', image: '/images/char-kaito.jpg' },
      { id: 2, name: 'Marina Sol',  role: 'Navigator',   image: '/images/char-marina.jpg' },
      { id: 3, name: 'Oa',          role: 'Strategist',  image: '/images/char-oa.jpg' },
    ],
    liked: 84,
    disliked: 16,
  },
  {
    id: 2,
    title: 'Tidal Drifters',
    altTitle: 'Nami no Tabibito',
    cover: '/images/anime-tidal-drifters.jpg',
    genres: ['DRAMA', 'SLICE OF LIFE', 'ROMANCE'],
    rank: 27,
    score: 8.45,
    episodes: 12,
    status: 'COMPLETED',
    type: 'TV Series',
    watchUrl: 'https://watch.logpose.app/anime/2/ep/1',
    synopsis: `A heartfelt story about a group of drifters navigating oceanic routes, finding belonging in the most unexpected places and forming bonds that transcend the tides.

When the monsoon season tears apart a fishing village's livelihood, five strangers with nothing in common are thrown together on a rickety vessel — and discover that the sea reveals the truest version of every soul aboard.`,
    characters: [
      { id: 2, name: 'Marina Sol',  role: 'Navigator',   image: '/images/char-marina.jpg' },
    ],
    liked: 91,
    disliked: 9,
  },
  {
    id: 3,
    title: 'Iron Sails',
    altTitle: 'Hagane no Hokake',
    cover: '/images/anime-iron-sails.jpg',
    genres: ['MECHA', 'ACTION', 'SCI-FI'],
    rank: 42,
    score: 8.21,
    episodes: 26,
    status: 'AIRING',
    type: 'TV Series',
    watchUrl: 'https://watch.logpose.app/anime/3/ep/1',
    synopsis: `A young engineer stumbles upon ancient iron-core technology buried deep beneath a shipwreck — a discovery that could rewrite maritime history and reshape the balance of power across the Seven Seas forever.

But the world's governing fleets will stop at nothing to bury the secret again. With only a converted salvage boat and a ragtag crew of outcasts, the race against the tides begins.`,
    characters: [
      { id: 3, name: 'Oa', role: 'Strategist', image: '/images/char-oa.jpg' },
    ],
    liked: 78,
    disliked: 22,
  },
  {
    id: 4,
    title: 'Azure Port Chronicles',
    altTitle: 'Sōten no Minato',
    cover: '/images/anime-azure-port.jpg',
    genres: ['ADVENTURE', 'MYSTERY', 'FANTASY'],
    rank: 19,
    score: 8.71,
    episodes: 38,
    status: 'AIRING',
    type: 'TV Series',
    watchUrl: 'https://watch.logpose.app/anime/4/ep/1',
    synopsis: `An ancient port city holds the key to unlocking a mystery spanning centuries — and one young journalist is determined to uncover the truth beneath its shimmering azure waters.

As she dives deeper, the line between legend and reality blurs, and the city's shadowy maritime guilds begin to take notice. Every tide brings her closer to a truth that was never meant to surface.`,
    characters: [
      { id: 1, name: 'Kaito Kai', role: 'Protagonist', image: '/images/char-kaito.jpg' },
    ],
    liked: 88,
    disliked: 12,
  },
  {
    id: 5,
    title: "Kōkai no Kiroku",
    altTitle: "The Mariner's Legacy",
    cover: '/images/detail-hero.jpg',
    genres: ['ACTION', 'ADVENTURE', 'FANTASY'],
    rank: 5,
    score: 9.14,
    episodes: 48,
    status: 'AIRING',
    type: 'TV Series',
    watchUrl: 'https://watch.logpose.app/anime/5/ep/1',
    synopsis: `The flagship title of the LogPose universe. A legendary mariner's logbook resurfaces after 300 years — and within it lies the coordinates to the mythical island of Maboroshi, said to grant the navigator who reaches it absolute mastery over the oceans.

Now, three rival fleets converge on the same heading, and only one crew carries the original compass: the Grand Line Voyagers. The fate of the oceans hangs on who turns the final page of the Mariner's Legacy.`,
    characters: [
      { id: 1, name: 'Kaito Kai',   role: 'Protagonist', image: '/images/char-kaito.jpg' },
      { id: 2, name: 'Marina Sol',  role: 'Navigator',   image: '/images/char-marina.jpg' },
      { id: 3, name: 'Oa',          role: 'Strategist',  image: '/images/char-oa.jpg' },
    ],
    liked: 94,
    disliked: 6,
  },
]

export const recentSearches = ['Grand Blue', 'Iron Sails', 'Kōkai']

/** Each chip is a real predicate over the catalogue — no dead filters. */
export const filterChips: { label: string; test: (a: Anime) => boolean }[] = [
  { label: 'Top Rated',        test: a => a.score >= 8.7 },
  { label: 'Airing Now',       test: a => a.status === 'AIRING' },
  { label: 'Completed',        test: a => a.status === 'COMPLETED' },
  { label: 'Short Series',     test: a => a.episodes <= 13 },
  { label: 'Epic Voyages',     test: a => a.episodes >= 24 },
  { label: 'Crowd Favorites',  test: a => a.liked >= 85 },
]
