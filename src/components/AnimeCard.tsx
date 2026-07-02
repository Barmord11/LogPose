/** Universal anime poster card — used in MyListPage grid and anywhere an anime grid appears.
 *  Uses .anime-card, .anime-card__poster, .anime-card__overlay, .anime-card__title CSS classes.
 */
interface AnimeCardProps {
  title: string
  cover: string
  onClick: () => void
}

export default function AnimeCard({ title, cover, onClick }: AnimeCardProps) {
  return (
    <div className="anime-card" onClick={onClick}>
      <div className="anime-card__poster">
        {/* Poster image */}
        <img className="anime-card__img" src={cover} alt={title} />

        {/* Hover overlay */}
        <div className="anime-card__overlay">
          {/* Top: add to list */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn-glass"
              style={{ width: '30px', height: '30px', padding: 0 }}
              onClick={e => e.stopPropagation()}
              aria-label="Add to list"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#fff' }}>add</span>
            </button>
          </div>

          {/* Bottom: play + react */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                className="btn-sunset"
                style={{ width: '40px', height: '40px', padding: 0, borderRadius: '9999px' }}
                onClick={onClick}
                aria-label="Watch now"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '22px', fontVariationSettings: "'FILL' 1" }}
                >
                  play_arrow
                </span>
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
              {['thumb_up', 'thumb_down'].map(icon => (
                <button
                  key={icon}
                  onClick={e => e.stopPropagation()}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
                  aria-label={icon === 'thumb_up' ? 'Like' : 'Dislike'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{icon}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <h3 className="anime-card__title">{title}</h3>
    </div>
  )
}
