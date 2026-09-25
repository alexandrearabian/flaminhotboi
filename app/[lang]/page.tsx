import { ViewTransition } from 'react'
import { DesignStack } from '@/components/DesignStack'
import { Mosaic } from '@/components/Mosaic'
import { Setlist } from '@/components/Setlist'
import { site, t, type Lang } from '@/lib/i18n'
import { featured, sets, design } from '@/lib/sets'

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang
  const tr = t[lang]
  const labels = { prev: tr.prev, next: tr.next, close: tr.close }
  return (
    <ViewTransition enter={{ 'nav-back': 'nav-back', default: 'none' }} exit={{ 'nav-forward': 'nav-forward', default: 'none' }} default="none">
      <main id="main">
        {featured.length > 0 && (
          <Mosaic
            photos={featured}
            title={site.name}
            alt={tr.photoBy(site.name)}
            label={tr.selected}
            labels={labels}
            footer={
              <div className="mosaic-lede">
                <p>{tr.tagline}</p>
                <a href="#work" className="cta glass">
                  {tr.seeSets}
                  <span className="cta-icon" aria-hidden>↓</span>
                </a>
              </div>
            }
          />
        )}
        <Setlist sets={sets} lang={lang} />
        {design.length > 0 && (
          <section className="design-section" id="design">
            <h2 className="display-xl">{tr.design}</h2>
            <DesignStack pieces={design} alt={tr.designBy(site.name)} title={tr.design} labels={labels} />
          </section>
        )}
      </main>
    </ViewTransition>
  )
}
