import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { notFound } from 'next/navigation'
import { Nav } from '@/components/Nav'
import { Atmosphere } from '@/components/Atmosphere'
import { Footer } from '@/components/Footer'
import { isLang, langs, site, t } from '@/lib/i18n'
import { design, featured } from '@/lib/sets'
import '../globals.css'

// Display only. Body copy stays on the system mono in globals.css.
const display = localFont({ src: '../../fonts/Parafina-RegularL.otf', variable: '--font-display' })

export const dynamicParams = false
export const generateStaticParams = () => langs.map((lang) => ({ lang }))

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  const tr = t[isLang(lang) ? lang : 'en']
  const cover = featured[0]
  return {
    metadataBase: new URL(
      process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000',
    ),
    title: { default: `${site.name} | ${tr.tagline}`, template: `%s | ${site.name}` },
    description: tr.tagline,
    alternates: { languages: { en: '/en', es: '/es' } },
    openGraph: cover && { images: [`/photos/${cover.id}/${cover.widths.at(-2) ?? cover.widths[0]}.webp`] },
  }
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  return (
    <html lang={lang} className={display.variable} style={{ '--gel': featured[0]?.gel } as React.CSSProperties}>
      <body>
        <a href="#main" className="skip">Skip to content</a>
        <Atmosphere />
        <Nav lang={lang} hasDesign={design.length > 0} />
        {children}
        <Footer lang={lang} />
      </body>
    </html>
  )
}
