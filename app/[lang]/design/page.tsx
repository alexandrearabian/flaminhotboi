import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ViewTransition } from 'react'
import { Reel } from '@/components/Reel'
import { site, t, type Lang } from '@/lib/i18n'
import { design } from '@/lib/sets'

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  return { title: t[(await params).lang as Lang].design }
}

// The "MUSIC DESIGN" folder, walked through full-screen like a set.
export default async function Design({ params }: { params: Promise<{ lang: string }> }) {
  const tr = t[(await params).lang as Lang]
  if (!design.length) notFound()
  return (
    <ViewTransition
      enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      exit={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }}
      default="none"
    >
      <main id="main">
        <Reel frames={design.map((photo) => ({ photo, alt: tr.designBy(site.name) }))} intro={<h1 className="display-l">{tr.design}</h1>} />
      </main>
    </ViewTransition>
  )
}
