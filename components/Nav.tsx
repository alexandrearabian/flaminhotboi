'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { site, t, type Lang } from '@/lib/i18n'

// Plain text across the top of the page, scrolling away with it (nothing floats over the photos).
// The language switch shows the language you're reading in; it links to the other one.
export function Nav({ lang, hasDesign }: { lang: Lang; hasDesign: boolean }) {
  const other: Lang = lang === 'en' ? 'es' : 'en'
  const path = usePathname().replace(/^\/(en|es)/, `/${other}`)
  return (
    <header className="nav">
      <Link href={`/${lang}`} className="nav-brand" transitionTypes={['nav-back']}>
        {site.navName}
      </Link>
      <nav>
        <Link href={`/${lang}#work`} transitionTypes={['nav-back']}>{t[lang].setlist}</Link>
        {hasDesign && <Link href={`/${lang}#design`} transitionTypes={['nav-back']}>{t[lang].design}</Link>}
        <Link href={`/${lang}/about`} transitionTypes={['nav-forward']}>{t[lang].about}</Link>
        <a href="https://ramitoto.myportfolio.com/" target="_blank" rel="noopener noreferrer">{t[lang].advertising}</a>
        <Link href={path} hrefLang={other} className="nav-lang" aria-label={other === 'en' ? 'English' : 'Español'} title={other === 'en' ? 'English' : 'Español'}>
          {lang.toUpperCase()}
        </Link>
      </nav>
    </header>
  )
}
