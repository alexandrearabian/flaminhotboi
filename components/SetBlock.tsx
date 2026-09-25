import Link from 'next/link'
import { ViewTransition } from 'react'
import { Photo } from '@/components/Photo'
import { Reveal } from '@/components/Reveal'
import { details, t, type Lang } from '@/lib/i18n'
import type { Set } from '@/lib/sets'

// One concert as a card: its cover on top of a fanned stack of the set's other photos, so it reads
// as "there's more in here", in a fixed frame so cards line up in the grid. `row` lays it out
// sideways (thumbnail left, text right), as phones and the "next work" link at a set's end do.
// The cover morphs into the set page when opened.
export function SetBlock({ set, lang, label, row }: { set: Set; lang: Lang; label: string; row?: boolean }) {
  const tr = t[lang]
  const peek = set.photos.filter((p) => p.id !== set.cover.id).slice(0, 3)
  return (
    <Reveal className={`set-block${row ? ' is-row' : ''}`} data-gel={set.cover.gel} style={{ '--ar': set.cover.w / set.cover.h } as React.CSSProperties}>
      <Link href={`/${lang}/sets/${set.slug}`} className="set-link" transitionTypes={['nav-forward']}>
        <div className="stack">
          <div className="stack-inner">
            {peek.map((p, k) => (
              <img
                key={p.id}
                className="stack-peek"
                style={{ '--k': k, aspectRatio: `${p.w} / ${p.h}` } as React.CSSProperties}
                src={`/photos/${p.id}/${p.widths[0]}.webp`}
                width={p.w}
                height={p.h}
                alt=""
                loading="lazy"
                decoding="async"
              />
            ))}
            <ViewTransition name={`cover-${set.slug}`} share="morph" default="none">
              <Photo p={set.cover} alt={tr.liveAt(set.artist, set.venue)} sizes="(min-width: 768px) 30vw, 45vw" className="stack-cover" />
            </ViewTransition>
          </div>
        </div>
        <div className="set-info">
          <span className="set-label">{label}</span>
          <h3 className="set-name">{set.artist}</h3>
          {details(set).length > 0 && <p className="set-details">{details(set).join('   ')}</p>}
          <span className="set-count">{set.photos.length} {tr.photos}</span>
          <span className="cta glass">
            {tr.openSet}
            <span className="cta-count">{set.photos.length} {tr.photos}</span>
            <span className="cta-icon" aria-hidden>→</span>
          </span>
        </div>
      </Link>
    </Reveal>
  )
}
