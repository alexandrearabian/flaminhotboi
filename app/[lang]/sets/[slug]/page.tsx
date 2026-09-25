import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ViewTransition } from 'react'
import { Reel } from '@/components/Reel'
import { SetBlock } from '@/components/SetBlock'
import { details, t, type Lang } from '@/lib/i18n'
import { sets } from '@/lib/sets'

type Params = { params: Promise<{ lang: string; slug: string }> }

export const dynamicParams = false
export const generateStaticParams = () => sets.map((s) => ({ slug: s.slug }))

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const s = sets.find((x) => x.slug === slug)
  if (!s) return {}
  return {
    title: s.artist,
    description: details(s).join(', ') || s.artist,
    openGraph: { images: [`/photos/${s.cover.id}/${s.cover.widths.at(-2) ?? s.cover.widths[0]}.webp`] },
  }
}

export default async function SetPage({ params }: Params) {
  const { lang: l, slug } = await params
  const lang = l as Lang
  const i = sets.findIndex((x) => x.slug === slug)
  if (i < 0) notFound()
  const set = sets[i]
  const next = sets[(i + 1) % sets.length]
  const tr = t[lang]
  const alt = tr.liveAt(set.artist, set.venue)
  // Cover first, then the rest in filename order: the set, track by track.
  const photos = [set.cover, ...set.photos.filter((p) => p.id !== set.cover.id)]

  return (
    <ViewTransition
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      default="none"
    >
      <main id="main">
        <Reel
          frames={photos.map((p, n) => ({
            photo: p,
            alt,
            title: `${tr.track} ${String(n + 1).padStart(2, '0')}  ${set.artist}`,
            name: n === 0 ? `cover-${set.slug}` : undefined,
          }))}
          intro={
            <>
              <h1 className="display-l">{set.artist}</h1>
              <p className="intro-meta">
                <Link href={`/${lang}#setlist`} className="back" transitionTypes={['nav-back']}>← {tr.allSets}</Link>
                {details(set).map((d) => <span key={d}>{d}</span>)}
                <span>{photos.length} {tr.photos}</span>
              </p>
            </>
          }
        />
        {next !== set && (
          <section className="sets sets-next">
            <SetBlock set={next} lang={lang} label={`${tr.nextSet} →`} />
          </section>
        )}
      </main>
    </ViewTransition>
  )
}
