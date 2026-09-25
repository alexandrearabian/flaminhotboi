'use client'
import { useEffect, useRef } from 'react'
import { Photo } from '@/components/Photo'
import { setGel } from '@/lib/gel'
import type { Photo as P } from '@/lib/sets'

export type Labels = { prev: string; next: string; close: string }

// One photo, full screen. A native <dialog>, so Esc, focus trapping and an inert page come free.
// Tap to close; swipe, the arrow keys or the buttons step through the rest of the group.
export function Lightbox({ photos, alt, index, onIndex, labels }: {
  photos: P[]
  alt: string
  index: number | null
  onIndex: (i: number | null) => void
  labels: Labels
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const down = useRef<number | null>(null)
  const n = photos.length

  useEffect(() => {
    const d = ref.current!
    if (index === null) { if (d.open) d.close(); return }
    if (!d.open) d.showModal()
    setGel(photos[index].gel)
  }, [index, photos])

  const step = (k: number) => index !== null && onIndex((index + k + n) % n)
  const p = index === null ? null : photos[index]

  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label={alt}
      onClose={() => onIndex(null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') step(1)
        else if (e.key === 'ArrowLeft') step(-1)
      }}
      onPointerDown={(e) => { down.current = (e.target as HTMLElement).closest('button') ? null : e.clientX }}
      onPointerUp={(e) => {
        if (down.current === null) return
        const dx = e.clientX - down.current
        down.current = null
        if (Math.abs(dx) > 50 && n > 1) step(dx < 0 ? 1 : -1)
        else if (Math.abs(dx) < 8) ref.current!.close()
      }}
    >
      {p && (
        <>
          <figure key={p.id} className="lightbox-photo" style={{ '--ar': p.w / p.h } as React.CSSProperties}>
            <Photo p={p} alt={alt} sizes="100vw" priority />
          </figure>
          <div className="lightbox-bar">
            {n > 1 && (
              <>
                <button type="button" className="glass" onClick={() => step(-1)} aria-label={labels.prev}>←</button>
                <span className="lightbox-count">{index! + 1} / {n}</span>
                <button type="button" className="glass" onClick={() => step(1)} aria-label={labels.next}>→</button>
              </>
            )}
            <button type="button" className="glass" onClick={() => ref.current!.close()} aria-label={labels.close}>✕</button>
          </div>
        </>
      )}
    </dialog>
  )
}
