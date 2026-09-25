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
// black. Drawn small and stretched to full screen (soft light needs little resolution), so
// animating it is cheap; drawn too small, though, the stretch shows as blocky stair-steps, so the
// beams are drawn at 320x180 and softened with one blur. Fades to the color of the photo on stage.
export function Atmosphere() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const initial = parse(getComputedStyle(document.documentElement).getPropertyValue('--gel')) ?? [34, 48, 195]
    const cur: RGB = [...initial]
    let target: RGB = [...initial]
    const out = ref.current!.getContext('2d')!
    const { width: W, height: H } = out.canvas
    // Beams are drawn sharp off-screen, then copied through a single blur.
    const ctx = Object.assign(document.createElement('canvas'), { width: W, height: H }).getContext('2d')!
    const soft = 'filter' in out
    const rgba = (a: number) => `rgba(${cur.map(Math.round).join(',')},${a})`

    const draw = (t: number) => {
      ctx.globalCompositeOperation = 'source-over'
      ctx.clearRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'
      for (const b of BEAMS) {
        const ox = b.x * W, oy = -0.2 * H, len = H * 1.7
        const aim = b.aim + b.sweep * Math.sin(t * b.speed * 2 * Math.PI + b.phase)
        // Nested cones, dimmest widest, for a soft falloff across the beam.
        for (const [spread, k] of [[0.2, 0.35], [0.13, 0.35], [0.07, 0.3]]) {
          const fill = ctx.createRadialGradient(ox, oy, 0, ox, oy, len)
          fill.addColorStop(0, rgba(b.alpha * k))
          fill.addColorStop(1, rgba(0))
          ctx.fillStyle = fill
          ctx.beginPath()
          ctx.moveTo(ox, oy)
          ctx.lineTo(ox + Math.sin(aim - spread) * len, oy + Math.cos(aim - spread) * len)
          ctx.lineTo(ox + Math.sin(aim + spread) * len, oy + Math.cos(aim + spread) * len)
          ctx.closePath()
          ctx.fill()
        }
      }
      out.clearRect(0, 0, W, H)
      if (soft) out.filter = 'blur(7px)'
      out.drawImage(ctx.canvas, 0, 0)
    }

    const onGel = (e: Event) => {
      target = parse((e as CustomEvent<string>).detail) ?? target
    }
    addEventListener('gel', onGel)

    // 30fps is plenty for beams this slow, and every redraw makes the frosted nav re-blur what's behind it.
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
