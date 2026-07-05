/**
 * CardSkeleton — a loading placeholder shaped exactly like a real
 * .search-card (poster + two text lines), meant to sit inside an
 * .anime-grid alongside real cards while data is still loading.
 *
 * Used instead of a plain "Loading…" sentence specifically so the
 * page's overall layout (column count, width) looks correct from the
 * very first paint - a short centered line of text doesn't fill a
 * wide desktop grid the way the real content will, so on a slow
 * connection (or a local dev server's first, slower request) a
 * text-only loading state can visually read as a much narrower/
 * simpler page than the one that's about to render.
 */
export default function CardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ aspectRatio: '3/4', borderRadius: '14px', marginBottom: '10px', background: 'var(--surface-container)' }} />
      <div style={{ height: '12px', width: '80%', borderRadius: '6px', background: 'var(--surface-container)', marginBottom: '6px' }} />
      <div style={{ height: '10px', width: '50%', borderRadius: '6px', background: 'var(--surface-container)' }} />
    </div>
  )
}
