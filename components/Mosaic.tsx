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

const PHONE = '(max-width: 767px)' // phones get four shorter rows instead of three
const COPIES = 3 // each row is its photos three times over; it drifts within the middle copy and wraps
const SPEEDS = [26, 21, 31, 24] // px per second, per row: never quite in step, so their gaps never line up for long
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
// rows slide in. Rows then drift on their own in alternating directions, forever (visitors can't
// scroll them); tap a photo to open it, and it grows out of its tile and shrinks back into it.
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
  const section = useRef<HTMLElement>(null)
  // How far each row's track has slid (px): the drift is a transform, so it's sub-pixel smooth.
  const pos = useRef<number[]>([])
  const opened = useRef(open)
  opened.current = open
  // The server can't know the screen, so it renders three rows; a phone switches to four before
  // anything shows (the mosaic stays hidden until its intro starts).
  const [n, setN] = useState(3)
  useLayoutEffect(() => {
    const mq = matchMedia(PHONE)
    const pick = () => setN(mq.matches ? 4 : 3)
    pick()
    mq.addEventListener('change', pick)
    return () => mq.removeEventListener('change', pick)
  }, [])
  const rows = Array.from({ length: n }, (_, k) => photos.map((p, i) => ({ p, i })).filter(({ i }) => i % n === k))

  const place = (k: number) => {
    const track = rowRefs.current[k]?.firstElementChild as HTMLElement | undefined
    if (track) track.style.transform = `translate3d(${-pos.current[k]}px, 0, 0)`
  }

  // Before paint: put each row where it was left, or (first time) the hero in the middle of the top row.
  useLayoutEffect(() => {
    rowRefs.current.forEach((el, k) => {
      if (!el) return
      const W = period(el)
      // Restored positions land in the same range the drift keeps to (copies look identical, but
      // the intro's hero has to find its tile on screen, not a whole copy away).
      if (saved?.length === n) pos.current[k] = W + saved[k] > W * 1.5 ? saved[k] : W + saved[k]
      else if (k === 0) {
        const h = el.querySelectorAll<HTMLElement>('[data-hero]')[1] // the middle copy's
        pos.current[k] = h.offsetLeft + h.offsetWidth / 2 - el.clientWidth / 2
      } else {
        // The lower rows start staggered, like bricks, so their gaps don't line up.
        const first = el.querySelector<HTMLElement>('figure')!
        pos.current[k] = W + first.offsetWidth * [0, 0.5, 0.1, 0.75][k]
      }
      place(k)
    })
  }, [n])

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
      // Whichever copy of the hero's tile is nearest the middle of the screen.
      const heroTile = () => [...rowRefs.current[0]!.querySelectorAll<HTMLElement>('[data-hero]')].reduce((a, b) => {
        const mid = (f: HTMLElement) => { const q = f.getBoundingClientRect(); return Math.abs(q.left + q.width / 2 - innerWidth / 2) }
        return mid(b) < mid(a) ? b : a
      })
      const r = heroTile().getBoundingClientRect()
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

      // Aim the landing at where the tile is now, not where it was when the intro began: anything
      // that shifted the layout since (fonts, styles, the switch to phone rows) would otherwise
      // land the hero beside its tile.
      const now = heroTile().getBoundingClientRect()
      const land = T(now.left + now.width / 2 - (r.left + r.width / 2), now.top + now.height / 2 - (r.top + r.height / 2), now.width / r.width)
      setPhase('settling')
      const settle = img.animate([{ transform: T(dx, dy, sCover) }, { transform: land }],
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

  // The drift: every frame each row's track slides a little, wrapping within its copies (every copy
  // looks the same, so jumping one is invisible). It pauses while a photo is open, so the photo can
  // shrink back into its tile. It waits for the intro's hero to finish landing (moving its tile
  // sooner makes the handoff jump), then eases up to speed.
  useEffect(() => {
    if (phase !== 'done' || dealing) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const els = rowRefs.current.filter(Boolean) as HTMLDivElement[]
    const widths = els.map(period)
    let raf = 0, last = performance.now()
    const start = last
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const ease = Math.min(1, (now - start) / 1500)
      const dt = Math.min(0.05, (now - last) / 1000) * ease * ease
      last = now
      if (opened.current !== null) return
      els.forEach((_, k) => {
        const W = widths[k]
        let x = pos.current[k] + SPEEDS[k] * dt * (k % 2 ? -1 : 1)
        if (x < W * 0.5) x += W
        else if (x > W * 1.5) x -= W
        pos.current[k] = x
        place(k)
      })
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phase, dealing, n])

  // Remember where each row was, for coming back to this page (widths measured now: by the time
  // this cleanup runs the rows are already off the page).
  useEffect(() => {
    const widths = (rowRefs.current.filter(Boolean) as HTMLDivElement[]).map(period)
    return () => { saved = widths.map((W, k) => (((pos.current[k] - W) % W) + W) % W) }
  }, [n])

  // The photo passing the middle of the middle row tints the room. Set up on mount, so its first
  // recolor (which restyles the page) isn't at the same moment the drift starts.
  useEffect(() => {
    const row = rowRefs.current[1] // second from the top
    if (!row) return
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting && opened.current === null) setGel(photos[Number((e.target as HTMLElement).dataset.i)].gel)
    }, { root: row, rootMargin: '0px -49.5% 0px -49.5%' })
    row.querySelectorAll('figure').forEach((f) => io.observe(f))
    return () => io.disconnect()
  }, [photos, n])

  // The tile an open photo grows from and shrinks back into: the on-screen copy nearest the middle.
  const tile = (i: number) => {
    let best: HTMLElement | null = null, far = Infinity
    section.current?.querySelectorAll<HTMLElement>(`figure[data-i="${i}"]`).forEach((f) => {
      const r = f.getBoundingClientRect()
      if (r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight) return
      const d = Math.abs(r.left + r.width / 2 - innerWidth / 2)
      if (d < far) { far = d; best = f }
    })
    return best
  }

  return (
    <section ref={section} className={`mosaic is-${phase}`} aria-label={label} style={{ '--rows': n } as React.CSSProperties}>
      <h1 className="sr-only">{title}</h1>
      {rows.map((row, k) => (
        <div
          key={k}
          ref={(el) => { rowRefs.current[k] = el }}
          className="mrow"
          onDragStart={(e) => e.preventDefault()}
        >
          <div className="mtrack">
          {Array.from({ length: COPIES }, (_, c) =>
            row.map(({ p, i }, j) => (
              <figure
                key={`${c}-${p.id}`}
                data-i={i}
                data-hero={i === 0 ? '' : undefined}
                style={{ '--ar': p.w / p.h, '--j': j } as React.CSSProperties}
                aria-hidden={c !== 1 || undefined}
                tabIndex={c === 1 ? 0 : -1}
                onKeyDown={(e) => e.key === 'Enter' && setOpen(i)}
                onClick={() => setOpen(i)}
              >
                <Photo p={p} alt={alt} sizes="(min-width: 768px) 30vw, 90vw" priority={c === 1 && j < 5} />
              </figure>
            )),
          )}
          </div>
        </div>
      ))}
      <Lightbox photos={photos} alt={alt} index={open} onIndex={setOpen} labels={labels} origin={tile} />

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
