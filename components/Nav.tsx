'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { site, t, type Lang } from '@/lib/i18n'

export function Nav({ lang, hasDesign }: { lang: Lang; hasDesign: boolean }) {
  const other: Lang = lang === 'en' ? 'es' : 'en'
  const path = usePathname().replace(/^\/(en|es)/, `/${other}`)
  return (
    <header className="nav glass">
      <Link href={`/${lang}`} className="nav-brand" transitionTypes={['nav-back']}>
        {site.navName}
      </Link>
      <nav>
        <Link href={`/${lang}#setlist`} transitionTypes={['nav-back']}>{t[lang].setlist}</Link>
        {hasDesign && <Link href={`/${lang}#design`} transitionTypes={['nav-back']}>{t[lang].design}</Link>}
        <Link href={`/${lang}/about`} transitionTypes={['nav-forward']}>{t[lang].about}</Link>
        <a href="https://ramitoto.myportfolio.com/" target="_blank" rel="noopener noreferrer">{t[lang].advertising}</a>
        <Link href={path} hrefLang={other} lang={other} className="nav-lang">
          {other.toUpperCase()}
        </Link>
      </nav>
    </header>
  )
}
