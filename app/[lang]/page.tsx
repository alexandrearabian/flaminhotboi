import { ViewTransition } from 'react'
import { Mosaic } from '@/components/Mosaic'
import { site, t, type Lang } from '@/lib/i18n'
import { featured } from '@/lib/sets'

// Just the mosaic; contact is the footer right below it.
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
            label={tr.selected}
            labels={{ prev: tr.prev, next: tr.next, close: tr.close }}
          />
        )}
      </main>
    </ViewTransition>
  )
}
