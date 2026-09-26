'use client'
import { useEffect, useRef } from 'react'
import { SetBlock } from '@/components/SetBlock'
import { setGel } from '@/lib/gel'
import { t, type Lang } from '@/lib/i18n'
import type { Set } from '@/lib/sets'

// The concerts, one per screen. The page takes the color of the set crossing the middle.
export function Setlist({ sets, lang }: { sets: Set[]; lang: Lang }) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setGel((e.target as HTMLElement).dataset.gel!)
    }, { rootMargin: '-45% 0px -45% 0px' })
    ref.current!.querySelectorAll('.set-block').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [sets])

  return (
    <section id="work" className="sets" ref={ref}>
      <h1 className="sets-title display-xl">{t[lang].setlist}</h1>
      {sets.length === 0 && <p className="empty">{t[lang].empty}</p>}
      {sets.map((s, n) => (
        <SetBlock key={s.slug} set={s} lang={lang} label={String(n + 1).padStart(2, '0')} flip={n % 2 === 1} />
      ))}
    </section>
  )
}
