'use client'
import { useEffect, useRef, useState } from 'react'
import { Lightbox, type Labels } from '@/components/Lightbox'
import { Photo } from '@/components/Photo'
import { setGel } from '@/lib/gel'
import type { Photo as P } from '@/lib/sets'

// Horizontal scroll gallery for set pages: photos scroll left-right within a sticky section,
// neighbors peek on sides, click/drag/arrows to navigate. Tap the center photo to open it.
export function HorizontalGallery({ photos, alt, title, labels }: { photos: P[]; alt: string; title: string; labels: Labels }) {
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState<number | null>(null)
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef({ x: 0, left: 0, moved: false, on: false })

  useEffect(() => {
    setGel(photos[0].gel)
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const i = Number((e.target as HTMLElement).dataset.i)
        setActive(i)
        setGel(photos[i].gel)
      }
    }, { root: track.current, rootMargin: '0px -30% 0px -30%' })
    track.current!.querySelectorAll('.hgal-slide').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [photos])

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
            <Photo p={p} alt={alt} sizes="(min-width: 768px) 70vw, 90vw" priority={i === 0} />
          </figure>
        ))}
      </div>
      <div className="hgal-controls">
        <button onClick={() => center(active - 1)} disabled={active === 0} aria-label={labels.prev}>{' ← '}</button>
        <span className="hgal-count">{active + 1} / {photos.length}</span>
        <button onClick={() => center(active + 1)} disabled={active === photos.length - 1} aria-label={labels.next}>{' → '}</button>
      </div>
      <Lightbox photos={photos} alt={alt} index={open} onIndex={setOpen} labels={labels} />
    </section>
  )
}
