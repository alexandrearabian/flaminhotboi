import { ViewTransition } from 'react'
import { Mosaic } from '@/components/Mosaic'
import { Setlist } from '@/components/Setlist'
import { site, t, type Lang } from '@/lib/i18n'
import { featured, sets } from '@/lib/sets'

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang
  const tr = t[lang]
  return (
    <ViewTransition enter={{ 'nav-back': 'nav-back', default: 'none' }} exit={{ 'nav-forward': 'nav-forward', default: 'none' }} default="none">
      <main id="main">
        {featured.length > 0 && (
          <Mosaic
            photos={featured}
            title={site.name}
            alt={tr.photoBy(site.name)}
            labels={{ prev: tr.prev, next: tr.next, strip: tr.selected }}
            footer={
              <div className="mosaic-lede">
                <p>{tr.tagline}</p>
                <a href="#setlist" className="cta glass">
                  {tr.seeSets}
                  <span className="cta-icon" aria-hidden>↓</span>
                </a>
              </div>
            }
          />
        )}
        <Setlist sets={sets} lang={lang} />
      </main>
    </ViewTransition>
  )
}
