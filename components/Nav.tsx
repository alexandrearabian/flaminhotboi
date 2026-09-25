'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { site, t, type Lang } from '@/lib/i18n'

// Plain text across the top of the screen, staying there while the page scrolls.
// The language switch shows the language you're reading in; it links to the other one.
export function Nav({ lang }: { lang: Lang }) {
  const other: Lang = lang === 'en' ? 'es' : 'en'
  const path = usePathname().replace(/^\/(en|es)/, `/${other}`)

  useEffect(() => { document.documentElement.lang = lang }, [lang])

  // Focus rings show only while someone is using Tab to move around; a click hides them again.
  useEffect(() => {
    const root = document.documentElement
    const key = (e: KeyboardEvent) => { if (e.key === 'Tab') root.dataset.tab = '' }
    const point = () => delete root.dataset.tab
    addEventListener('keydown', key)
    addEventListener('pointerdown', point)
    return () => { removeEventListener('keydown', key); removeEventListener('pointerdown', point) }
  }, [])
  return (
    <header className="nav">
      <Link href={`/${lang}`} className="nav-brand" transitionTypes={['nav-back']}>
        {site.navName}
      </Link>
      <nav>
        <Link href={`/${lang}/work`} transitionTypes={['nav-forward']}>{t[lang].setlist}</Link>
        <Link href={`/${lang}/about`} transitionTypes={['nav-forward']}>{t[lang].about}</Link>
        <a href="https://ramitoto.myportfolio.com/" target="_blank" rel="noopener noreferrer">{t[lang].advertising}</a>
        <Link href={path} hrefLang={other} scroll={false} className="nav-lang" aria-label={other === 'en' ? 'English' : 'Español'} title={other === 'en' ? 'English' : 'Español'}>
          {lang.toUpperCase()}
        </Link>
      </nav>
    </header>
  )
}
