import type { Metadata } from 'next'
import { ViewTransition } from 'react'
import { Photo } from '@/components/Photo'
import { site, t, type Lang } from '@/lib/i18n'
import { featured } from '@/lib/sets'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return { title: t[(await params).lang as Lang].about }
}

// Contact lives in the footer, right below.
export default async function About({ params }: { params: Promise<{ lang: string }> }) {
  const tr = t[(await params).lang as Lang]
  const shot = featured[1] ?? featured[0]
  return (
    <ViewTransition
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      default="none"
    >
      <main id="main" className="about">
        <div className="about-bio">
          <h1 className="display-xl">{site.name}</h1>
          {tr.bio.map((p) => <p key={p}>{p}</p>)}
        </div>
        {site.portrait ? (
          <img className="about-photo" src={site.portrait} alt={site.name} />
        ) : (
          shot && <Photo p={shot} alt={tr.photoBy(site.name)} sizes="(min-width: 768px) 40vw, 100vw" className="about-photo" />
        )}
      </main>
    </ViewTransition>
  )
}
