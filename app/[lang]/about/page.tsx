import type { Metadata } from 'next'
import { Photo } from '@/components/Photo'
import { site, t, type Lang } from '@/lib/i18n'
import { about, featured } from '@/lib/sets'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return { title: t[(await params).lang as Lang].about }
}

// Contact lives in the footer, right below.
export default async function About({ params }: { params: Promise<{ lang: string }> }) {
  const tr = t[(await params).lang as Lang]
  const shot = about ?? featured[1] ?? featured[0] // a home photo until "SOBRE MI" has one
  return (
    <>
      <main id="main" className="about">
        <h1 className="display-xl about-name">{site.name}</h1>
        <div className="about-bio">
          {tr.bio.map((p) => <p key={p}>{p}</p>)}
        </div>
        {site.portrait ? (
          <img className="about-photo" src={site.portrait} alt={site.name} />
        ) : (
          shot && (
            <figure className="about-photo" style={{ '--ar': shot.w / shot.h } as React.CSSProperties}>
              <Photo p={shot} alt={tr.photoBy(site.name)} sizes="(min-width: 768px) 40vw, 100vw" />
            </figure>
          )
        )}
      </main>
    </>
  )
}
