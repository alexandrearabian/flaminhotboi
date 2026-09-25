'use client'
import { useEffect, useRef, useState, ViewTransition } from 'react'
import { Photo } from '@/components/Photo'
import { setGel } from '@/lib/gel'
import type { Photo as P } from '@/lib/sets'

export type Frame = { photo: P; alt: string; title?: string; name?: string }

// A pinned stage; each screen of scroll brings the next photo on. Photos are shown whole and at
// full strength, framed by the dark room (and the waves behind it); text lives below, never on top.
export function Reel({ frames, intro }: { frames: Frame[]; intro?: React.ReactNode }) {
  const [active, setActive] = useState(0)
  const [inView, setInView] = useState(true)
  const steps = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const band = { rootMargin: '-45% 0px -45% 0px' } // "on stage" = crossing the middle of the screen
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const i = Number((e.target as HTMLElement).dataset.i)
        setActive(i)
        setGel(frames[i].photo.gel)
      }
    }, band)
    const section = new IntersectionObserver(([e]) => setInView(e.isIntersecting), band)
    steps.current!.querySelectorAll('[data-i]').forEach((el) => io.observe(el))
    section.observe(steps.current!)
    return () => { io.disconnect(); section.disconnect() }
  }, [frames])

  return (
    <section className="reel" style={{ '--n': frames.length } as React.CSSProperties}>
      <div className="reel-stage">
        {frames.map((f, i) => (
          <div key={i} className={`frame${i === active ? ' is-on' : ''}`} style={{ '--ar': f.photo.w / f.photo.h } as React.CSSProperties} aria-hidden={i !== active}>
            {/* Only frames near the playhead load their image. */}
            {Math.abs(i - active) <= 2 && (
              <ViewTransition name={f.name && inView && i === active ? f.name : undefined} share="morph" default="none">
                <Photo p={f.photo} alt={f.alt} sizes="(min-width: 768px) 90vw, 100vw" priority={i === 0} />
              </ViewTransition>
            )}
          </div>
        ))}

        <div className="reel-band">
          {intro && <div className={`reel-intro${active > 0 ? ' is-gone' : ''}`}>{intro}</div>}
          {frames.map((f, i) =>
            f.title ? (
              <p key={i} className={`caption${i === active && !(intro && i === 0) ? ' is-on' : ''}`}>{f.title}</p>
            ) : null,
          )}
        </div>

        {frames.length > 1 && (
          <nav className="reel-rail" aria-label="Photos">
            {frames.map((f, i) => (
              <a key={i} href={`#frame-${i + 1}`} className={i === active ? 'is-on' : ''} aria-label={f.title ?? String(i + 1)} />
            ))}
          </nav>
        )}
      </div>
      <div className="reel-steps" ref={steps}>
        {frames.map((_, i) => <div key={i} id={`frame-${i + 1}`} data-i={i} />)}
      </div>
    </section>
  )
}
