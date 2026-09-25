import type { Photo as P } from '@/lib/sets'

// Pre-generated AVIF/WebP from scripts/sync-drive.mjs, blurred placeholder underneath.
export function Photo({ p, alt, sizes, priority, className }: { p: P; alt: string; sizes: string; priority?: boolean; className?: string }) {
  const srcSet = (ext: string) => p.widths.map((w) => `/photos/${p.id}/${w}.${ext} ${w}w`).join(', ')
  return (
    <picture className={`photo ${className ?? ''}`} style={{ backgroundImage: `url(${p.blur})`, aspectRatio: `${p.w} / ${p.h}` }}>
      <source type="image/avif" srcSet={srcSet('avif')} sizes={sizes} />
      <img
        src={`/photos/${p.id}/${p.widths[0]}.webp`}
        srcSet={srcSet('webp')}
        sizes={sizes}
        width={p.w}
        height={p.h}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
      />
    </picture>
  )
}
