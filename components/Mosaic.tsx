'use client'
import { useEffect, useRef, useState } from 'react'
import { Photo } from '@/components/Photo'
import { setGel } from '@/lib/gel'
import type { Photo as P } from '@/lib/sets'

type Phase = 'pending' | 'intro' | 'settling' | 'done'
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const T = (dx: number, dy: number, s: number) => `translate(${dx}px, ${dy}px) scale(${s})`
// Scattered like prints tossed on a table: fixed per index so it's the same on every visit.
const scatter = (i: number) => ({ '--r': `${((i * 37) % 11) - 5}deg`, '--x': `${((i * 53) % 13) - 6}vw`, '--y': `${((i * 29) % 9) - 4}vh` })

// Opening sequence, first visit per tab: every main photo is dealt onto the screen like a stack
// of prints, fast; the last one lands, fills the room, then pulls back into a filmstrip.
export function Mosaic({ photos, title, footer, alt, labels }: {
  photos: P[]
  title: string
  footer: React.ReactNode
  alt: string
  labels: { prev: string; next: string; strip: string }
}) {
  const [phase, setPhase] = useState<Phase>('pending')
  const [active, setActive] = useState(0)
  const track = useRef<HTMLDivElement>(null)
  const deal = useRef<HTMLDivElement>(null)
  const hero = useRef<HTMLImageElement>(null)
  const drag = useRef({ x: 0, left: 0, moved: false, on: false })

  // Decide once on mount whether to play the intro.
  useEffect(() => {
    let played = false
    try { played = sessionStorage.getItem('intro') === '1' } catch {}
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    const atTop = track.current!.getBoundingClientRect().top < innerHeight
    if (played || still || !atTop || photos.length < 2) return setPhase('done')
    try { sessionStorage.setItem('intro', '1') } catch {}
    setPhase('intro')
  }, [photos.length])

  // The choreography. Any wheel, touch, key or click skips straight to the filmstrip.
  const playing = phase === 'intro' || phase === 'settling'
  useEffect(() => {
    if (!playing) return
    let cancelled = false
    const skip = () => { cancelled = true; setPhase('done') }
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
    events.forEach((e) => addEventListener(e, skip, { once: true, passive: true }))

    const run = async () => {
      const slide = track.current!.querySelector<HTMLElement>('.slide')!
      const r = slide.getBoundingClientRect()
      const img = hero.current!
      Object.assign(img.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` })
      const dx = innerWidth / 2 - (r.left + r.width / 2)
      const dy = innerHeight / 2 - (r.top + r.height / 2)
      const sPrint = (innerHeight * 0.46) / r.height
      const sCover = Math.max(innerWidth / r.width, innerHeight / r.height)

      const imgs = [...deal.current!.querySelectorAll('img')]
      await Promise.race([Promise.all(imgs.map((i) => i.decode().catch(() => {}))), wait(1500)])
      if (cancelled) return

      const prints = [...deal.current!.querySelectorAll<HTMLElement>('.print:not(.print-hero)')]
      const mid = (prints.length - 1) / 2 || 1
      for (const [i, el] of prints.entries()) {
        if (cancelled) return
        el.classList.add('is-in')
        await wait(55 + 120 * ((i - mid) / mid) ** 2) // accelerate, then brake: a motor drive
      }
      img.animate([{ opacity: 0, transform: T(dx, dy, sPrint * 1.15) }, { opacity: 1, transform: T(dx, dy, sPrint) }],
        { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' })
      await wait(520)
      if (cancelled) return

      deal.current!.classList.add('is-landing')
      await img.animate([{ transform: T(dx, dy, sPrint) }, { transform: T(dx, dy, sCover) }],
        { duration: 950, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' }).finished
      await wait(350)
      if (cancelled) return

      setPhase('settling')
      await img.animate([{ transform: T(dx, dy, sCover) }, { transform: 'none' }],
        { duration: 1150, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'forwards' }).finished
      if (!cancelled) setPhase('done')
    }
    run().catch(() => {}) // animations reject if the intro is skipped mid-flight
    return () => { cancelled = true; events.forEach((e) => removeEventListener(e, skip)) }
  }, [playing])

  // The slide crossing the middle of the strip is the active one; the page takes its color.
  useEffect(() => {
    setGel(photos[0].gel)
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const i = Number((e.target as HTMLElement).dataset.i)
        setActive(i)
        setGel(photos[i].gel)
      }
    }, { root: track.current, rootMargin: '0px -49% 0px -49%' })
    track.current!.querySelectorAll('.slide').forEach((el) => io.observe(el))
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

  const n = photos.length
  return (
    <section className={`mosaic is-${phase}`}>
      <h1 className="sr-only">{title}</h1>

      <div
        ref={track}
        className="mosaic-track"
        tabIndex={0}
        aria-label={labels.strip}
        style={{ '--ar0': photos[0].w / photos[0].h, '--arN': photos[n - 1].w / photos[n - 1].h } as React.CSSProperties}
        // Mouse drag to pan (touch and trackpads scroll natively).
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
            className={`slide${i === active ? ' is-on' : ''}`}
            style={{ '--ar': p.w / p.h, '--i': i } as React.CSSProperties}
            onClick={() => !drag.current.moved && i !== active && center(i)}
          >
            <Photo p={p} alt={alt} sizes="(min-width: 768px) 62vw, 88vw" priority={i === 0} />
          </figure>
        ))}
      </div>

      <div className="mosaic-foot">
        {footer}
        <div className="mosaic-arrows">
          <button type="button" className="glass" onClick={() => center(active - 1)} disabled={active === 0} aria-label={labels.prev}>←</button>
          <button type="button" className="glass" onClick={() => center(active + 1)} disabled={active === n - 1} aria-label={labels.next}>→</button>
        </div>
      </div>

      {playing && (
        <div ref={deal} className="deal" aria-hidden>
          {photos.slice(1).map((p, i) => (
            <img key={p.id} className="print" src={`/photos/${p.id}/${p.widths[0]}.webp`} alt="" style={{ ...scatter(i), '--ar': p.w / p.h } as React.CSSProperties} />
          ))}
          <div className="deal-flash" />
          <img
            ref={hero}
            className="print print-hero"
            src={`/photos/${photos[0].id}/${photos[0].widths[0]}.webp`}
            srcSet={photos[0].widths.map((w) => `/photos/${photos[0].id}/${w}.webp ${w}w`).join(', ')}
            sizes="100vw"
            alt=""
          />
        </div>
      )}
    </section>
  )
}
