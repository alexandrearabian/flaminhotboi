import type { Photo as P } from '@/lib/sets'

// How wide a set page's main photo shows; also what its photos are fetched ahead at (WarmUp).
export const GALLERY_SIZES = '(min-width: 768px) 60vw, 84vw'

export const srcSet = (p: P, ext: string) => p.widths.map((w) => `/photos/${p.id}/${w}.${ext} ${w}w`).join(', ')

// Pre-generated AVIF/WebP from scripts/sync-drive.mjs, blurred placeholder underneath.
export function Photo({ p, alt, sizes, priority, className }: { p: P; alt: string; sizes: string; priority?: boolean; className?: string }) {
  return (
    <picture className={`photo ${className ?? ''}`} style={{ backgroundImage: `url(${p.blur})`, aspectRatio: `${p.w} / ${p.h}` }}>
      <source type="image/avif" srcSet={srcSet(p, 'avif')} sizes={sizes} />
      <img
        src={`/photos/${p.id}/${p.widths[0]}.webp`}
        srcSet={srcSet(p, 'webp')}
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
