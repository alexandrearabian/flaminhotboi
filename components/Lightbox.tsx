'use client'
import { useEffect, useRef } from 'react'
import { Photo } from '@/components/Photo'
import { setGel } from '@/lib/gel'
import type { Photo as P } from '@/lib/sets'

export type Labels = { prev: string; next: string; close: string }

const EASE = 'cubic-bezier(.32,.72,0,1)'
// The transform (origin top-left) that lays box `b` exactly over box `a`.
const onto = (a: DOMRect, b: DOMRect) =>
  `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})`
// Where a photo sits on the page, if it's on screen at all.
const onScreen = (el: HTMLElement | null | undefined) => {
  const r = el?.getBoundingClientRect()
  return r && r.width > 0 && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight ? r : null
}

// One photo, full screen. A native <dialog>, so Esc, focus trapping and an inert page come free.
// Tap to close; swipe, the arrow keys or the buttons step through the rest of the group.
// Given `origin` (the photo's tile on the page), it grows out of that tile and shrinks back into it.
export function Lightbox({ photos, alt, index, onIndex, labels, origin }: {
  photos: P[]
  alt: string
  index: number | null
  onIndex: (i: number | null) => void
  labels: Labels
  origin?: (i: number) => HTMLElement | null | undefined
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const fig = useRef<HTMLElement>(null)
  const shade = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const down = useRef<number | null>(null)
  const closing = useRef(false)
  const from = useRef(origin)
  from.current = origin
  const n = photos.length

  useEffect(() => {
    const d = ref.current!
    if (index === null) { if (d.open) d.close(); return }
    setGel(photos[index].gel)
    const f = fig.current!
    if (d.open) {
      // Stepping to the next photo: a quick fade.
      f.animate([{ opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1 }], { duration: 320, easing: EASE })
      return
    }
    const tile = onScreen(from.current?.(index)) // measured before the page locks its scroll
    d.showModal()
    shade.current!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: 'ease-out' })
    bar.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 200, easing: 'ease-out', fill: 'backwards' })
    if (tile) f.animate([{ transform: onto(tile, f.getBoundingClientRect()) }, { transform: 'none' }], { duration: 520, easing: EASE })
    else f.animate([{ opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1 }], { duration: 400, easing: EASE })
  }, [index, photos])

  // Shrink back into the tile (or fade), then close.
  const close = () => {
    const d = ref.current!, f = fig.current
    if (closing.current || !d.open) return
    closing.current = true
    const anims: Animation[] = []
    if (f) {
      const tile = index === null ? null : onScreen(from.current?.(index))
      const opts = { duration: 460, easing: EASE, fill: 'forwards' as const }
      anims.push(shade.current!.animate([{ opacity: 1 }, { opacity: 0 }], { ...opts, easing: 'ease-in-out' }))
      if (bar.current) anims.push(bar.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' }))
      anims.push(tile
        ? f.animate([{ transform: 'none' }, { transform: onto(tile, f.getBoundingClientRect()) }], opts)
        : f.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: 0.97 }], opts))
    }
    Promise.all(anims.map((a) => a.finished)).catch(() => {}).then(() => {
      d.close()
      anims.forEach((a) => a.cancel())
      closing.current = false
    })
  }

  const step = (k: number) => index !== null && !closing.current && onIndex((index + k + n) % n)
  const p = index === null ? null : photos[index]

  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label={alt}
      onClose={() => onIndex(null)}
      onCancel={(e) => { e.preventDefault(); close() }}
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
        else if (Math.abs(dx) < 8) close()
      }}
    >
      <div ref={shade} className="lightbox-shade" />
      {p && (
        <>
          <figure ref={fig} key={p.id} className="lightbox-photo" style={{ '--ar': p.w / p.h } as React.CSSProperties}>
            <Photo p={p} alt={alt} sizes="100vw" priority />
          </figure>
          <div ref={bar} className="lightbox-bar">
            {n > 1 && (
              <>
                <button type="button" className="glass" onClick={() => step(-1)} aria-label={labels.prev}>←</button>
                <span className="lightbox-count">{index! + 1}</span>
                <button type="button" className="glass" onClick={() => step(1)} aria-label={labels.next}>→</button>
              </>
            )}
          </div>
        </>
      )}
    </dialog>
  )
}
