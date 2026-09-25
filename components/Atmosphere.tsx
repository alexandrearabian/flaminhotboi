'use client'
import { useEffect, useRef } from 'react'

type RGB = [number, number, number]
const parse = (c: string): RGB | null => {
  const hex = c.trim().match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)
  if (hex) return [1, 2, 3].map((i) => parseInt(hex[i], 16)) as RGB
  const n = c.match(/[\d.]+/g)?.slice(0, 3).map(Number)
  return n?.length === 3 ? ((n.every((v) => v <= 1) ? n.map((v) => v * 255) : n) as RGB) : null
}

// The room behind the photos (scrolling itself is native):
// - room light: two pools of the current stage color, drawn on a tiny canvas the browser stretches
//   to full screen (a soft glow needs no resolution, so it costs next to nothing);
// - a waveform band that flows continuously and swells a little while you scroll.
// Both fade to the color of the photo on stage (see lib/gel.ts).
export function Atmosphere() {
  const glowRef = useRef<HTMLCanvasElement>(null)
  const wavesRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    // Scroll speed, sampled once per frame (no scroll listener), eased so the swell never jumps.
    let energy = 0
    let lastY = scrollY

    const initial = parse(getComputedStyle(document.documentElement).getPropertyValue('--gel')) ?? [34, 48, 195]
    const cur: RGB = [...initial]
    let target: RGB = [...initial]
    let glowDirty = true
    const onGel = (e: Event) => {
      target = parse((e as CustomEvent<string>).detail) ?? target
      glowDirty = true
      if (still) { cur.splice(0, 3, ...target); drawGlow(); drawWaves(2) }
    }
    addEventListener('gel', onGel)
    const rgba = (mix: number, a: number) => `rgba(${cur.map((c) => Math.round(c + (255 - c) * mix * 0.3)).join(',')},${a})`

    const glow = glowRef.current!.getContext('2d')!
    const drawGlow = () => {
      const { width: W, height: H } = glow.canvas
      glow.clearRect(0, 0, W, H)
      for (const [x, y, r, a] of [[0.1, -0.12, 0.95, 0.16], [1.02, 1.1, 0.8, 0.09]]) { // a faint tint on black, never a wash
        const g = glow.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * W)
        g.addColorStop(0, rgba(0.05, a))
        g.addColorStop(1, rgba(0, 0))
        glow.fillStyle = g
        glow.fillRect(0, 0, W, H)
      }
    }

    const wavesCanvas = wavesRef.current!
    const waves = wavesCanvas.getContext('2d')!
    let w = 0, h = 0
    const size = () => {
      const dpr = Math.min(devicePixelRatio, 1.5)
      w = wavesCanvas.clientWidth
      h = wavesCanvas.clientHeight
      wavesCanvas.width = w * dpr
      wavesCanvas.height = h * dpr
      waves.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (still) drawWaves(2)
    }
    const ro = new ResizeObserver(size)
    ro.observe(wavesCanvas)

    const lines = [
      { a: 1, alpha: 0.4, mix: 0.15, width: 1.4, phase: 0, main: true },
      { a: -0.85, alpha: 0.3, mix: 0.1, width: 1.3, phase: 2.1, main: true },
      { a: 0.7, alpha: 0.25, mix: 0.08, width: 1.2, phase: 4.3, main: true },
      { a: 0.86, alpha: 0.2, mix: 0.06, width: 1.1, phase: 0.8 },
      { a: 0.72, alpha: 0.15, mix: 0.04, width: 1, phase: 1.6 },
      { a: 0.6, alpha: 0.12, mix: 0.03, width: 0.9, phase: 2.4 },
      { a: 0.48, alpha: 0.1, mix: 0.02, width: 0.9, phase: 3.2 },
      { a: 0.36, alpha: 0.08, mix: 0.02, width: 0.8, phase: 4 },
      { a: 0.24, alpha: 0.06, mix: 0.01, width: 0.8, phase: 4.8 },
    ]
    const drawWaves = (t: number) => {
      const amp = h * 0.3 * (0.8 + 0.45 * energy)
      const cy = h / 2
      waves.clearRect(0, 0, w, h)
      waves.globalCompositeOperation = 'lighter'
      lines.forEach((l) => {
        waves.beginPath()
        for (let x = 0; x <= w; x += 5) {
          const u = x / w
          const env = Math.sin(Math.PI * u) ** 1.2 // taper at both ends, like a plucked string
          const y = cy + amp * l.a * env * (
            0.6 * Math.sin(u * 8 + t * 0.85 + l.phase) +
            0.3 * Math.sin(u * 15 - t * 1.3 + l.phase * 1.7) +
            0.1 * Math.sin(u * 29 + t * 2 + l.phase * 0.5))
          if (x === 0) waves.moveTo(x, y)
          else waves.lineTo(x, y)
        }
        if (l.main) {
          waves.lineWidth = 14 // soft halo under each main line
          waves.strokeStyle = rgba(0.1, 0.09)
          waves.stroke()
        }
        waves.lineWidth = l.width
        waves.strokeStyle = rgba(l.mix, l.alpha)
        waves.stroke()
      })
    }

    let raf = 0
    const loop = (ms: number) => {
      // Fade toward the new stage color (~2.5s, much slower); the glow only redraws while it's changing.
      const d = target.map((v, i) => v - cur[i])
      if (d.some((v) => Math.abs(v) > 0.5)) {
        d.forEach((v, i) => (cur[i] += v * 0.025))
        glowDirty = true
      }
      if (glowDirty) { drawGlow(); glowDirty = false }
      const speed = Math.min(1, Math.abs(scrollY - lastY) / 60)
      lastY = scrollY
      energy += (speed - energy) * (speed > energy ? 0.08 : 0.025)
      drawWaves(ms / 1000)
      raf = requestAnimationFrame(loop)
    }
    size()
    drawGlow()
    if (still) drawWaves(2)
    else raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      removeEventListener('gel', onGel)
    }
  }, [])

  return (
    <>
      <canvas ref={glowRef} className="glow" width={96} height={54} aria-hidden />
      <canvas ref={wavesRef} className="waves" aria-hidden />
    </>
  )
}
