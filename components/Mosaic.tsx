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

// Where each print rests on the table (desktop), hand-placed so the spread is loose but balanced:
// [center x in % of the table, center y in svh, width in vw, rotation in deg]. 0 is the hero.
const SLOTS = [
  [50, 34, 34, 0], [14, 15, 19, -5], [85, 19, 18, 4], [20, 52, 17, 3],
  [80, 54, 22, -3], [38, 72, 19, -6], [63, 80, 21, 5], [11, 88, 18, -2],
  [90, 90, 15, 7], [30, 106, 22, 2], [56, 110, 16, -4], [80, 112, 20, 3],
]
// Integer hash in [0, 1]: identical on server and client, so hydration never disagrees.
const rnd = (i: number, k: number) => ((i * (37 + k * 14) + k * 11) % 17) / 16
// Phones get a loose zig-zag instead, one print per step down the page.
const slot = (i: number) => {
  const [x, y, w, r] = SLOTS[i % SLOTS.length]
  return {
    '--x': x, '--y': y + 110 * Math.floor(i / SLOTS.length), '--w': w, '--r': r,
    '--xm': i ? (i % 2 ? 33 : 67) + Math.round((rnd(i, 1) - 0.5) * 6) : 50,
    '--ym': 15 + i * 22 + (i ? Math.round((rnd(i, 2) - 0.5) * 6) : 0),
    '--wm': i ? 50 + Math.round(rnd(i, 3) * 12) : 84,
    '--rm': i ? Math.round((rnd(i, 4) - 0.5) * 8) : 0,
  }
}

// Opening sequence, first visit per tab: every main photo is dealt onto the screen like a stack
// of prints, fast; the last one lands, fills the room, settles onto the table, and the rest
// spread out from under it. Every print can then be picked up and moved.
export function Mosaic({ photos, title, footer, alt, label }: {
  photos: P[]
  title: string
  footer: React.ReactNode
  alt: string
  label: string
}) {
  const [phase, setPhase] = useState<Phase>('pending')
  const spread = useRef<HTMLDivElement>(null)
  const deal = useRef<HTMLDivElement>(null)
  const hero = useRef<HTMLImageElement>(null)
  const top = useRef(20) // z-index of the print picked up last

  // Decide once on mount whether to play the intro.
  useEffect(() => {
    let played = false
    try { played = sessionStorage.getItem('intro') === '1' } catch {}
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    const atTop = spread.current!.getBoundingClientRect().top < innerHeight
    if (played || still || !atTop || photos.length < 2) return setPhase('done')
    try { sessionStorage.setItem('intro', '1') } catch {}
    setPhase('intro')
  }, [photos.length])

  // The choreography. Any wheel, touch, key or click skips straight to the table.
  const playing = phase === 'intro' || phase === 'settling'
  useEffect(() => {
    if (!playing) return
    let cancelled = false
    const skip = () => { cancelled = true; setPhase('done') }
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
    events.forEach((e) => addEventListener(e, skip, { once: true, passive: true }))

    const run = async () => {
      const r = spread.current!.querySelector<HTMLElement>('.pic')!.getBoundingClientRect()
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

  // The print crossing the middle of the screen tints the room.
  useEffect(() => {
    setGel(photos[0].gel)
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setGel(photos[Number((e.target as HTMLElement).dataset.i)].gel)
    }, { rootMargin: '-45% 0px -45% 0px' })
    spread.current!.querySelectorAll('.pic').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [photos])

  // Pick a print up and move it. Position lives in CSS variables, so dragging never re-renders.
  // On touch, a vertical swipe still scrolls the page (touch-action: pan-y cancels the drag).
  const grab = (e: React.PointerEvent<HTMLElement>, p: P) => {
    if (e.button !== 0 || phase !== 'done') return
    const el = e.currentTarget
    const box = spread.current!.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    const ox = parseFloat(el.style.getPropertyValue('--dx')) || 0
    const oy = parseFloat(el.style.getPropertyValue('--dy')) || 0
    const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
    el.setPointerCapture(e.pointerId)
    el.style.zIndex = String(++top.current)
    el.classList.add('is-held')
    setGel(p.gel)
    const move = (ev: PointerEvent) => {
      // The print's center stays on the table, so nothing gets lost off-screen.
      el.style.setProperty('--dx', `${ox + clamp(ev.clientX - e.clientX, box.left - cx, box.right - cx)}px`)
      el.style.setProperty('--dy', `${oy + clamp(ev.clientY - e.clientY, box.top - cy, box.bottom - cy)}px`)
    }
    const drop = () => {
      el.classList.remove('is-held')
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', drop)
      el.removeEventListener('pointercancel', drop)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', drop)
    el.addEventListener('pointercancel', drop)
  }

  const s0 = slot(0)
  const n = photos.length
  return (
    <section className={`mosaic is-${phase}`}>
      <h1 className="sr-only">{title}</h1>

      <div
        ref={spread}
        className="spread"
        role="group"
        aria-label={label}
        style={{
          '--h': Math.max(...photos.map((_, i) => slot(i)['--y'])) + 26,
          '--hm': slot(n - 1)['--ym'] + 28,
          '--x0': s0['--x'], '--y0': s0['--y'], '--xm0': s0['--xm'], '--ym0': s0['--ym'],
        } as React.CSSProperties}
      >
        {photos.map((p, i) => (
          <figure
            key={p.id}
            data-i={i}
            className="pic"
            style={{ ...slot(i), '--ar': p.w / p.h, '--i': i } as React.CSSProperties}
            onPointerDown={(e) => grab(e, p)}
            onDragStart={(e) => e.preventDefault()}
          >
            <Photo p={p} alt={alt} sizes={i ? '(min-width: 768px) 24vw, 68vw' : '(min-width: 768px) 36vw, 86vw'} priority={i === 0} />
          </figure>
        ))}
      </div>

      <div className="mosaic-foot">{footer}</div>

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
