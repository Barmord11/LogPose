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
  inList?: boolean
}

export interface Genre {
  id: string
  label: string
  badge: string
  badgeVariant: 'orange' | 'cyan' | 'navy' | 'light'
  image: string
}

/* ─── Genres ─────────────────────────────────────────────── */
export const genres: Genre[] = [
  { id: 'shonen',       label: 'Shonen',       badge: 'HIGH ENERGY',      badgeVariant: 'orange', image: '/images/genre-shonen.jpg' },
  { id: 'seinen',       label: 'Seinen',       badge: 'MATURE THEMES',    badgeVariant: 'navy',   image: '/images/genre-seinen.jpg' },
  { id: 'isekai',       label: 'Isekai',       badge: 'NEW WORLDS',       badgeVariant: 'cyan',   image: '/images/genre-isekai.jpg' },
  { id: 'slice-life',   label: 'Slice of Life',badge: 'PEACEFUL MOMENTS', badgeVariant: 'light',  image: '/images/genre-slice-of-life.jpg' },
  { id: 'mystery',      label: 'Mystery',      badge: 'HIDDEN TRUTHS',    badgeVariant: 'navy',   image: '/images/genre-mystery.jpg' },
  { id: 'fantasy',      label: 'Fantasy',      badge: 'EPIC SAGAS',       badgeVariant: 'orange', image: '/images/genre-fantasy.jpg' },
]

/* ─── Animes ─────────────────────────────────────────────── */
export const animes: Anime[] = [
  {
    id: 1,
    title: 'Grand Blue Horizon',
    cover: '/images/anime-grand-blue.jpg',
    genres: ['ACTION', 'ADVENTURE', 'FANTASY'],
    rank: 14,
    score: 8.92,
    episodes: 24,
    status: 'AIRING',
    type: 'TV Series',
    synopsis: `In a world where the vast oceans hold secrets of a forgotten civilization, a young navigator discovers the LogPose, a mystical compass that doesn't point north, but towards the next island of adventure. Legend speaks of an island where the sun never sets, guarded by ancient maritime spirits and elusive sea kings.

Our protagonist, driven by the echoes of their ancestor's diary, assembles a crew of misfits to traverse the Treacherous Currents. This journey isn't just about reaching a destination; it's about the bonds forged in the spray of the salt water, and the resilience of the human spirit against the boundless blue. Experience the Japanese ocean aesthetic brought to life through breathtaking visuals and a soaring orchestral score.`,
    characters: [
      { id: 1, name: 'Kaito Kai',   role: 'Protagonist', image: '/images/char-kaito.jpg' },
      { id: 2, name: 'Marina Sol',  role: 'Navigator',   image: '/images/char-marina.jpg' },
      { id: 3, name: 'Oa',          role: 'Strategist',  image: '/images/char-oa.jpg' },
    ],
    liked: 84,
    disliked: 16,
    inList: true,
  },
  {
    id: 2,
    title: 'Tidal Drifters',
    cover: '/images/anime-tidal-drifters.jpg',
    genres: ['DRAMA', 'SLICE OF LIFE', 'ROMANCE'],
    rank: 27,
    score: 8.45,
    episodes: 12,
    status: 'COMPLETED',
    type: 'TV Series',
    synopsis: 'A heartfelt story about a group of drifters navigating oceanic routes, finding belonging in the most unexpected places and forming bonds that transcend the tides.',
    characters: [],
    liked: 91,
    disliked: 9,
    inList: true,
  },
  {
    id: 3,
    title: 'Iron Sails',
    cover: '/images/anime-iron-sails.jpg',
    genres: ['MECHA', 'ACTION', 'SCI-FI'],
    rank: 42,
    score: 8.21,
    episodes: 26,
    status: 'AIRING',
    type: 'TV Series',
    synopsis: 'A young engineer discovers ancient iron-based technology that could change the balance of power across the Seven Seas forever.',
    characters: [],
    liked: 78,
    disliked: 22,
    inList: true,
  },
  {
    id: 4,
    title: 'Azure Port Chronicles',
    cover: '/images/anime-azure-port.jpg',
    genres: ['ADVENTURE', 'MYSTERY', 'FANTASY'],
    rank: 19,
    score: 8.71,
    episodes: 38,
    status: 'AIRING',
    type: 'TV Series',
    synopsis: 'An ancient port city holds the key to unlocking a mystery spanning centuries — and one young journalist is determined to uncover the truth beneath its shimmering azure waters.',
    characters: [],
    liked: 88,
    disliked: 12,
    inList: true,
  },
  {
    id: 5,
    title: "Kōkai no Kiroku: The Mariner's Legacy",
    cover: '/images/detail-hero.jpg',
    genres: ['ACTION', 'ADVENTURE', 'FANTASY'],
    rank: 5,
    score: 9.14,
    episodes: 48,
    status: 'AIRING',
    type: 'TV Series',
    synopsis: `In a world where the vast oceans hold secrets of a forgotten civilization, a young navigator discovers the LogPose, a mystical compass that doesn't point north, but towards the next island of adventure. Legend speaks of an island where the sun never sets, guarded by ancient maritime spirits and elusive sea kings.

Our protagonist, driven by the echoes of their ancestor's diary, assembles a crew of misfits to traverse the Treacherous Currents. This journey isn't just about reaching a destination; it's about the bonds forged in the spray of the salt water, and the resilience of the human spirit against the boundless blue. Experience the Japanese ocean aesthetic brought to life through breathtaking visuals and a soaring orchestral score.`,
    characters: [
      { id: 1, name: 'Kaito Kai',   role: 'Protagonist', image: '/images/char-kaito.jpg' },
      { id: 2, name: 'Marina Sol',  role: 'Navigator',   image: '/images/char-marina.jpg' },
      { id: 3, name: 'Oa',          role: 'Strategist',  image: '/images/char-oa.jpg' },
    ],
    liked: 94,
    disliked: 6,
    inList: false,
  },
]

export const recentSearches = ['One Piece', 'Solo Leveling', 'Berserk']

export const filterChips = [
  'Latest Manga', 'Staff Picks',
  'Top Rated',    'Newest Anime',
  'Completed Series', 'Hidden Gems',
]
