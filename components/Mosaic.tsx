'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Lightbox, type Labels } from '@/components/Lightbox'
import { Photo } from '@/components/Photo'
import { setGel } from '@/lib/gel'
import type { Photo as P } from '@/lib/sets'

type Phase = 'pending' | 'intro' | 'settling' | 'done'
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const T = (dx: number, dy: number, s: number) => `translate(${dx}px, ${dy}px) scale(${s})`
// Scattered like prints tossed on a table: fixed per index so it's the same on every visit.
const scatter = (i: number) => ({ '--r': `${((i * 37) % 11) - 5}deg`, '--x': `${((i * 53) % 13) - 6}vw`, '--y': `${((i * 29) % 9) - 4}vh` })

const ROWS = 3
const COPIES = 3 // each row is its photos three times over; it drifts within the middle copy and wraps
const SPEED = 26 // px per second
const RESUME = 1400 // ms after the visitor lets go before a row drifts again
const DEALT = 14 // prints flicked onto the screen in the intro

// Once per page load: coming back from another page skips the intro...
let introPlayed = false
// ...and each row picks up where it was (offset into its middle copy, in px).
let saved: number[] | null = null

// Width of one copy of a row: from the first photo of one copy to the first of the next (so it
// includes the gap between copies, which scrollWidth / 3 would get wrong by a third of a gap).
const period = (row: HTMLElement) => {
  const f = row.querySelectorAll<HTMLElement>('figure')
  return f[f.length / COPIES].offsetLeft - f[0].offsetLeft
}

// Opening sequence, on every page load: every main photo is dealt onto the screen like a stack
// of prints, fast; the last one lands, fills the room, then settles into the top row while the
// three rows slide in. Rows then drift in alternating directions, forever. Swipe, scroll or drag
// one and it follows you, then drifts on from there; tap a photo to open it.
export function Mosaic({ photos, title, alt, label, labels }: {
  photos: P[]
  title: string
  alt: string
  label: string
  labels: Labels
}) {
  const [phase, setPhase] = useState<Phase>('pending')
  const [dealing, setDealing] = useState(false) // the intro's overlay; outlives 'settling' by a beat
  const [open, setOpen] = useState<number | null>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const deal = useRef<HTMLDivElement>(null)
  const hero = useRef<HTMLImageElement>(null)
  const moved = useRef(false) // a mouse drag just happened, so the click that ends it isn't a tap
  const rows = Array.from({ length: ROWS }, (_, k) => photos.map((p, i) => ({ p, i })).filter(({ i }) => i % ROWS === k))

  // Before paint: put each row where it was left, or (first time) the hero in the middle of the top row.
  useLayoutEffect(() => {
    rowRefs.current.forEach((el, k) => {
      if (!el) return
      const W = period(el)
      if (saved) el.scrollLeft = W + saved[k]
      else if (k === 0) {
        const h = el.querySelector<HTMLElement>('[data-hero]')!
        el.scrollLeft = h.offsetLeft + h.offsetWidth / 2 - el.clientWidth / 2
      } else el.scrollLeft = W
    })
  }, [])

  // Decide once on mount whether to play the intro.
  useEffect(() => {
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (introPlayed || still || scrollY > innerHeight / 2 || photos.length < 2) return setPhase('done')
    setDealing(true)
    setPhase('intro')
  }, [photos.length])
  useEffect(() => { if (phase === 'done') introPlayed = true }, [phase])

  // The choreography. Any wheel, touch, key or click skips straight to the rows.
  const playing = phase === 'intro' || phase === 'settling'
  useEffect(() => {
    if (!playing) return
    let cancelled = false
    const skip = () => { cancelled = true; setDealing(false); setPhase('done') }
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
    events.forEach((e) => addEventListener(e, skip, { once: true, passive: true }))

    const run = async () => {
      const r = rowRefs.current[0]!.querySelector<HTMLElement>('[data-hero]')!.getBoundingClientRect()
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
      const settle = img.animate([{ transform: T(dx, dy, sCover) }, { transform: 'none' }],
        { duration: 1150, easing: 'cubic-bezier(.32,.72,0,1)', fill: 'forwards' }).finished
      // The curve has a long tail: by now the hero looks landed, so the rows start sliding in
      // around it while it finishes; the overlay goes once it's exactly in place.
      await wait(420)
      if (cancelled) return
      setPhase('done')
      await settle
      setDealing(false)
    }
    run().catch(() => {}) // animations reject if the intro is skipped mid-flight
    return () => { cancelled = true; events.forEach((e) => removeEventListener(e, skip)) }
  }, [playing])

  // The drift. Rows are real scrollers, so swiping, trackpads and momentum are native. The drift
  // itself is a sub-pixel slide of the row's track (scroll positions snap to whole pixels, which
  // stutters at this speed); every so often, and whenever the visitor takes hold, the slide is
  // folded into the scroll position in whole pixels, which looks identical. It waits for the
  // intro's hero to finish landing (moving its tile sooner makes the handoff jump), then eases in.
  useEffect(() => {
    if (phase !== 'done' || dealing) return
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    const els = rowRefs.current.filter(Boolean) as HTMLDivElement[]
    const tracks = els.map((el) => el.firstElementChild as HTMLElement)
    // d: how far the track has slid on top of the scroll position (px, positive = content moved left).
    const state = els.map(() => ({ d: 0, until: 0 }))
    const slide = (k: number) => (tracks[k].style.transform = `translate3d(${-state[k].d}px, 0, 0)`)
    // Fold the slide into the scroll position, keeping that within the middle copy.
    const fold = (k: number) => {
      const el = els[k], s = state[k], W = period(el)
      let target = el.scrollLeft + s.d
      if (target < W * 0.5) target += W // every copy looks the same, so jumping one is invisible
      else if (target > W * 1.5) target -= W
      el.scrollLeft = Math.round(target)
      s.d = target - el.scrollLeft
      slide(k)
    }
    const hold = (k: number) => () => {
      if (performance.now() >= state[k].until) fold(k) // hand over exactly what's on screen
      state[k].until = performance.now() + RESUME
    }
    // Scrolling that follows a touch (momentum, a mouse drag) keeps the hold; folding doesn't.
    const follow = (k: number) => () => { if (performance.now() < state[k].until) state[k].until = performance.now() + RESUME }
    const off = els.flatMap((el, k) => {
      const on = [['pointerdown', hold(k)], ['wheel', hold(k)], ['touchstart', hold(k)], ['scroll', follow(k)]] as const
      on.forEach(([e, f]) => el.addEventListener(e, f, { passive: true }))
      return on.map(([e, f]) => () => el.removeEventListener(e, f))
    })

    let raf = 0, last = performance.now()
    const start = last
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const ease = Math.min(1, (now - start) / 1500)
      const dt = Math.min(0.05, (now - last) / 1000) * ease * ease
      last = now
      els.forEach((_, k) => {
        const s = state[k]
        if (now < s.until) return // the visitor has it
        s.d += SPEED * dt * (k % 2 ? -1 : 1)
        if (Math.abs(s.d) > 48) fold(k)
        else slide(k)
      })
    }
    if (!still) raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      off.forEach((f) => f())
      saved = els.map((el, k) => { const W = period(el); return (((el.scrollLeft + state[k].d - W) % W) + W) % W })
    }
  }, [phase, dealing, photos])

  // The photo passing the middle of the middle row tints the room. Set up on mount, so its first
  // recolor (which restyles the page) isn't at the same moment the drift starts.
  useEffect(() => {
    const row = rowRefs.current[1]
    if (!row) return
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setGel(photos[Number((e.target as HTMLElement).dataset.i)].gel)
    }, { root: row, rootMargin: '0px -49.5% 0px -49.5%' })
    row.querySelectorAll('figure').forEach((f) => io.observe(f))
    return () => io.disconnect()
  }, [photos])

  // Mouse: drag a row sideways (touch and trackpads scroll it natively).
  const drag = (e: React.PointerEvent<HTMLDivElement>) => {
    moved.current = false
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    const el = e.currentTarget
    const x0 = e.clientX, left0 = el.scrollLeft
    el.setPointerCapture(e.pointerId)
    el.classList.add('is-dragging')
    const move = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - x0) > 5) moved.current = true
      el.scrollLeft = left0 - (ev.clientX - x0)
    }
    const up = () => {
      el.classList.remove('is-dragging')
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  return (
    <section className={`mosaic is-${phase}`} aria-label={label}>
      <h1 className="sr-only">{title}</h1>
      {rows.map((row, k) => (
        <div
          key={k}
          ref={(el) => { rowRefs.current[k] = el }}
          className="mrow"
          onPointerDown={drag}
          onDragStart={(e) => e.preventDefault()}
        >
          <div className="mtrack">
          {Array.from({ length: COPIES }, (_, c) =>
            row.map(({ p, i }, j) => (
              <figure
                key={`${c}-${p.id}`}
                data-i={i}
                data-hero={c === 1 && i === 0 ? '' : undefined}
                style={{ '--ar': p.w / p.h, '--j': j } as React.CSSProperties}
                aria-hidden={c !== 1 || undefined}
                tabIndex={c === 1 ? 0 : -1}
                onKeyDown={(e) => e.key === 'Enter' && setOpen(i)}
                onClick={() => !moved.current && setOpen(i)}
              >
                <Photo p={p} alt={alt} sizes="(min-width: 768px) 30vw, 90vw" priority={c === 1 && j < 5} />
              </figure>
            )),
          )}
          </div>
        </div>
      ))}
      <Lightbox photos={photos} alt={alt} index={open} onIndex={setOpen} labels={labels} />

      {dealing && (
        <div ref={deal} className="deal" aria-hidden>
          {photos.slice(1, DEALT + 1).map((p, i) => (
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
