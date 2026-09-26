import type { Photo as P } from '@/lib/sets'

// How wide a set page's main photo shows; also what its photos are fetched ahead at (WarmUp).
// Size hints matter most on phones: 3 device pixels per CSS pixel turns an overstated width into
// the next file up (800 -> 1600 -> 2400px is ~19 -> 74 -> 192 KB).
export const GALLERY_SIZES = '(min-width: 768px) 58vw, 76vw'

export const srcSet = (p: P, ext: string) => p.widths.map((w) => `/photos/${p.id}/${w}.${ext} ${w}w`).join(', ')

// Pre-generated AVIF/WebP from scripts/sync-drive.mjs, blurred placeholder underneath.
// priority: fetch first and now; eager: fetch now (not when scrolled near).
export function Photo({ p, alt, sizes, priority, eager, className }: { p: P; alt: string; sizes: string; priority?: boolean; eager?: boolean; className?: string }) {
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
        loading={priority || eager ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
      />
    </picture>
  )
}
