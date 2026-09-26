'use client'
import { useEffect, useRef, useState } from 'react'
import { Lightbox, type Labels } from '@/components/Lightbox'
import { Photo } from '@/components/Photo'
import { setGel } from '@/lib/gel'
import type { Photo as P } from '@/lib/sets'

// Music design, one piece at a time, like flipping through a record crate: the front sleeve is
// whole, a few peek out behind it (CSS hides the rest). Flip with the arrows, a swipe or the arrow
// keys; the sleeve you leave slides out and goes to the back. Tap the front one to open it.
export function DesignStack({ pieces, alt, title, labels }: { pieces: P[]; alt: string; title: string; labels: Labels }) {
  const [top, setTop] = useState(0)
  const [flip, setFlip] = useState<{ i: number; dir: 'out' | 'in' } | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const down = useRef<number | null>(null)
  const n = pieces.length

  // While the crate crosses the middle of the screen, the room takes the front sleeve's color.
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setGel(pieces[top].gel), { rootMargin: '-45% 0px -45% 0px' })
    io.observe(stage.current!)
    return () => io.disconnect()
  }, [pieces, top])

  const go = (k: 1 | -1) => {
    if (n < 2) return
    const next = (top + k + n) % n
    setFlip(k === 1 ? { i: top, dir: 'out' } : { i: next, dir: 'in' })
    setTop(next)
  }

  return (
    <div className="crate">
      <div
        ref={stage}
        className="crate-stage"
        tabIndex={0}
        role="group"
        aria-roledescription="carousel"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') go(1)
          else if (e.key === 'ArrowLeft') go(-1)
          else if (e.key === 'Enter') setOpen(top)
        }}
        onPointerDown={(e) => { down.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId) }}
        onPointerUp={(e) => {
          if (down.current === null) return
          const dx = e.clientX - down.current
          down.current = null
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
          else if (Math.abs(dx) < 8) setOpen(top)
        }}
        onPointerCancel={() => (down.current = null)}
        onDragStart={(e) => e.preventDefault()}
      >
        {pieces.map((p, i) => (
          <figure
            key={p.id}
            className={`sleeve${flip?.i === i ? ` is-${flip.dir}` : ''}`}
            style={{ '--d': (i - top + n) % n, '--ar': p.w / p.h } as React.CSSProperties}
            aria-hidden={i !== top}
            onAnimationEnd={() => setFlip(null)}
          >
            <Photo p={p} alt={alt} sizes="(min-width: 768px) 40vw, 78vw" />
          </figure>
        ))}
      </div>
      {n > 1 && (
        <div className="crate-controls">
          <span className="crate-count">{String(top + 1).padStart(2, '0')}</span>
          <div className="crate-arrows">
            <button type="button" className="glass" onClick={() => go(-1)} aria-label={labels.prev}>←</button>
            <button type="button" className="glass" onClick={() => go(1)} aria-label={labels.next}>→</button>
          </div>
        </div>
      )}
      <Lightbox photos={pieces} alt={alt} index={open} onIndex={setOpen} labels={labels} />
    </div>
  )
}
