'use client'
import { useEffect, useRef } from 'react'
import { srcSet } from '@/components/Photo'
import type { Photo as P } from '@/lib/sets'

const warmed = new Set<string>() // once per photo per visit

// Fetches a few photos ahead of time, quietly, once whatever this sits in comes within a screen of
// view. It asks for them exactly as the page that shows them will (same sizes, same AVIF), so by
// the time that page opens they come straight from the browser's cache.
export function WarmUp({ photos, sizes }: { photos: P[]; sizes: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      for (const p of photos) {
        if (warmed.has(p.id)) continue
        warmed.add(p.id)
        const link = Object.assign(document.createElement('link'), { rel: 'preload', as: 'image', type: 'image/avif' })
        link.setAttribute('imagesrcset', srcSet(p, 'avif'))
        link.setAttribute('imagesizes', sizes)
        link.setAttribute('fetchpriority', 'low')
        document.head.append(link)
      }
    }, { rootMargin: '100% 0px' })
    io.observe(ref.current!.parentElement!)
    return () => io.disconnect()
  }, [photos, sizes])
  return <span ref={ref} hidden />
}
