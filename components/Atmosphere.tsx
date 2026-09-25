'use client'
import { useEffect, useRef } from 'react'

type RGB = [number, number, number]
const parse = (c: string): RGB | null => {
  const hex = c.trim().match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)
  if (hex) return [1, 2, 3].map((i) => parseInt(hex[i], 16)) as RGB
  const n = c.match(/[\d.]+/g)?.slice(0, 3).map(Number)
  return n?.length === 3 ? ((n.every((v) => v <= 1) ? n.map((v) => v * 255) : n) as RGB) : null
}

// Stage lights hung above the page: where they hang (x, 0-1), where they point (radians from
// straight down), how far and how fast they sweep (cycles per second), and how bright they are.
const BEAMS = [
  { x: 0.16, aim: 0.38, sweep: 0.3, speed: 0.07, phase: 0, alpha: 0.22 },
  { x: 0.6, aim: -0.12, sweep: 0.38, speed: 0.05, phase: 2.2, alpha: 0.17 },
  { x: 0.94, aim: -0.5, sweep: 0.24, speed: 0.085, phase: 4.1, alpha: 0.13 },
]

// The room behind the photos: a few faint beams in the current stage color, sweeping slowly on
// black. Drawn at 320x180 and stretched to full screen (soft light needs little resolution; much
// smaller and the stretch shows as stair-steps). Fades to the color of the photo on stage.
export function Atmosphere() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const initial = parse(getComputedStyle(document.documentElement).getPropertyValue('--gel')) ?? [34, 48, 195]
    const cur: RGB = [...initial]
    let target: RGB = [...initial]
    const ctx = ref.current!.getContext('2d')!
    const { width: W, height: H } = ctx.canvas
    const LEN = H * 1.7, SPREAD = 0.2, PAD = 24 // beam length, widest half-angle, room for the blur

    // One soft beam, blurred once: white nested cones pointing straight down from the top middle.
    // Each frame only turns this stencil and tints the lot, so nothing is re-blurred per frame.
    const sw = Math.ceil(Math.sin(SPREAD) * LEN * 2 + PAD * 2), sh = Math.ceil(LEN + PAD * 2)
    const sharp = Object.assign(document.createElement('canvas'), { width: sw, height: sh }).getContext('2d')!
    const ox = sw / 2, oy = PAD
    for (const [spread, k] of [[0.2, 0.35], [0.13, 0.35], [0.07, 0.3]]) {
      const fill = sharp.createRadialGradient(ox, oy, 0, ox, oy, LEN)
      fill.addColorStop(0, `rgba(255,255,255,${k})`)
      fill.addColorStop(1, 'rgba(255,255,255,0)')
      sharp.fillStyle = fill
      sharp.beginPath()
      sharp.moveTo(ox, oy)
      sharp.lineTo(ox + Math.sin(-spread) * LEN, oy + Math.cos(spread) * LEN)
      sharp.lineTo(ox + Math.sin(spread) * LEN, oy + Math.cos(spread) * LEN)
      sharp.closePath()
      sharp.fill()
    }
    const beam = Object.assign(document.createElement('canvas'), { width: sw, height: sh })
    const soft = beam.getContext('2d')!
    if ('filter' in soft) soft.filter = 'blur(7px)'
    soft.drawImage(sharp.canvas, 0, 0)

    const draw = (t: number) => {
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'
      for (const b of BEAMS) {
        const aim = b.aim + b.sweep * Math.sin(t * b.speed * 2 * Math.PI + b.phase)
        ctx.globalAlpha = b.alpha
        ctx.setTransform(1, 0, 0, 1, b.x * W, -0.2 * H)
        ctx.rotate(-aim) // aim is measured from straight down, toward the right
        ctx.drawImage(beam, -ox, -oy)
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = 1
      // Tint: keep the light's shape and strength, take the stage color.
      ctx.globalCompositeOperation = 'source-in'
      ctx.fillStyle = `rgb(${cur.map(Math.round).join(',')})`
      ctx.fillRect(0, 0, W, H)
    }

    const onGel = (e: Event) => {
      target = parse((e as CustomEvent<string>).detail) ?? target
    }
    addEventListener('gel', onGel)

    // 30fps is plenty for beams this slow.
    let raf = 0, last = 0
    const loop = (ms: number) => {
      raf = requestAnimationFrame(loop)
      if (ms - last < 32) return
      last = ms
      cur.forEach((v, i) => (cur[i] += (target[i] - v) * 0.05)) // ~2.5s fade to the new stage color
      draw(ms / 1000)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('gel', onGel)
    }
  }, [])

  return <canvas ref={ref} className="glow" width={320} height={180} aria-hidden />
}
