import Link from 'next/link'
import { GALLERY_SIZES, Photo } from '@/components/Photo'
import { Reveal } from '@/components/Reveal'
import { WarmUp } from '@/components/WarmUp'
import { details, t, type Lang } from '@/lib/i18n'
import type { Set } from '@/lib/sets'

// One concert: its cover on top of a fanned stack of the set's other photos, so it reads as
// "there's more in here".
export function SetBlock({ set, lang, label, flip }: { set: Set; lang: Lang; label: string; flip?: boolean }) {
  const tr = t[lang]
  const rest = set.photos.filter((p) => p.id !== set.cover.id)
  const peek = rest.slice(0, 3)
  return (
    <Reveal className={`set-block${flip ? ' is-flip' : ''}`} data-gel={set.cover.gel} style={{ '--ar': set.cover.w / set.cover.h } as React.CSSProperties}>
      <Link href={`/${lang}/sets/${set.slug}`} className="set-link">
        <div className="stack">
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
            <Photo p={set.cover} alt={tr.liveAt(set.artist, set.venue)} sizes="(min-width: 768px) 52vw, 76vw" className="stack-cover" />
        </div>
        {/* The work's page opens on its cover and the two after it: have them ready. */}
        <WarmUp photos={[set.cover, ...rest.slice(0, 2)]} sizes={GALLERY_SIZES} />
        <div className="set-info">
          <div className="set-title">
            <span className="set-label">{label}</span>
            <h3 className="set-name">{set.artist}</h3>
          </div>
          {details(set).length > 0 && <p className="set-details">{details(set).join('   ')}</p>}
          <span className="cta glass">
            {tr.openSet}
            <span className="cta-icon" aria-hidden>→</span>
          </span>
        </div>
      </Link>
    </Reveal>
  )
}
