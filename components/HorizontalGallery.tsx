'use client'
import { useEffect, useRef, useState } from 'react'
import { Lightbox, type Labels } from '@/components/Lightbox'
import { Photo } from '@/components/Photo'
import { setGel } from '@/lib/gel'
import type { Photo as P } from '@/lib/sets'

// Set pages: one photo large in the middle, its neighbors shrunk toward it at the sides (sized by
// scroll position in CSS, not by React state, so it follows the finger exactly).
// Swipe, drag, click a neighbor or use the arrows to move; tap the one in the middle to open it.
const Arrow = ({ flip }: { flip?: boolean }) => (
  <svg width="40" height="14" viewBox="0 0 40 14" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden style={flip ? { scale: '-1 1' } : undefined}>
    <path d="M39 7H1M7 1 1 7l6 6" />
  </svg>
)

export function HorizontalGallery({ photos, alt, title, labels }: { photos: P[]; alt: string; title: string; labels: Labels }) {
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState<number | null>(null)
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef({ x: 0, left: 0, moved: false, on: false })

  // Recoloring the page restyles all of it, so it waits until the swipe settles on a photo.
  useEffect(() => {
    const id = setTimeout(() => setGel(photos[active].gel), 180)
    return () => clearTimeout(id)
  }, [photos, active])

  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i))
      }
    }, { root: track.current, rootMargin: '0px -49% 0px -49%' }) // whichever photo crosses the center line
    track.current!.querySelectorAll('.hgal-slide').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [photos])

  // The keyboard's arrow keys step through the set from anywhere on the page (the open photo
  // handles its own).
  useEffect(() => {
    if (open !== null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || (e.target as HTMLElement).closest('input, textarea, select')) return
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault() // not the browser's own nudge of the track
      center(active + (e.key === 'ArrowRight' ? 1 : -1))
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  const center = (i: number) => {
    const t = track.current!
    const el = t.children[Math.max(0, Math.min(photos.length - 1, i))] as HTMLElement
    t.scrollTo({ left: el.offsetLeft + el.offsetWidth / 2 - t.clientWidth / 2, behavior: 'smooth' })
  }

  const endDrag = () => {
    if (!drag.current.on) return
    drag.current.on = false
    track.current!.classList.remove('is-dragging')
    center(active)
  }

  return (
    <section className="hgal">
      <h2 className="sr-only">{title}</h2>
      <div
        ref={track}
        className="hgal-track"
        style={{ '--ar0': photos[0].w / photos[0].h, '--arN': photos.at(-1)!.w / photos.at(-1)!.h } as React.CSSProperties}
        tabIndex={0}
        aria-label={title}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(active)}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse') return
          drag.current = { x: e.clientX, left: track.current!.scrollLeft, moved: false, on: true }
          track.current!.classList.add('is-dragging')
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d.on) return
          if (Math.abs(e.clientX - d.x) > 4) d.moved = true
          track.current!.scrollLeft = d.left - (e.clientX - d.x)
        }}
        onDragStart={(e) => e.preventDefault()}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {photos.map((p, i) => (
          <figure
            key={p.id}
            data-i={i}
            className={`hgal-slide${i === active ? ' is-on' : ''}`}
            style={{ '--ar': p.w / p.h } as React.CSSProperties}
            onClick={() => !drag.current.moved && (i === active ? setOpen(i) : center(i))}
          >
            <Photo p={p} alt={alt} sizes="(min-width: 768px) 60vw, 84vw" priority={i === 0} />
          </figure>
        ))}
      </div>
      <div className="hgal-controls">
        <button type="button" onClick={() => center(active - 1)} disabled={active === 0} aria-label={labels.prev}><Arrow /></button>
        <span className="hgal-count">{active + 1} / {photos.length}</span>
        <button type="button" onClick={() => center(active + 1)} disabled={active === photos.length - 1} aria-label={labels.next}><Arrow flip /></button>
      </div>
      <Lightbox photos={photos} alt={alt} index={open} onIndex={setOpen} labels={labels} />
    </section>
  )
}
