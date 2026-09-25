import type { Metadata } from 'next'
import { ViewTransition } from 'react'
import { DesignStack } from '@/components/DesignStack'
import { Setlist } from '@/components/Setlist'
import { site, t, type Lang } from '@/lib/i18n'
import { design, sets } from '@/lib/sets'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return { title: t[(await params).lang as Lang].setlist }
}

// The concerts, one per screen, then the music design crate.
export default async function Work({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang
  const tr = t[lang]
  return (
    <ViewTransition
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      default="none"
    >
      <main id="main">
        <Setlist sets={sets} lang={lang} />
        {design.length > 0 && (
          <section className="design-section" id="design">
            <h2 className="display-xl">{tr.design}</h2>
            <DesignStack pieces={design} alt={tr.designBy(site.name)} title={tr.design} labels={{ prev: tr.prev, next: tr.next, close: tr.close }} />
          </section>
        )}
      </main>
    </ViewTransition>
  )
}
