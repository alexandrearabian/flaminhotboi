import localFont from 'next/font/local'
import { Atmosphere } from '@/components/Atmosphere'
import { featured } from '@/lib/sets'
import { Analytics } from "@vercel/analytics/next"
import './globals.css'

// Display only. Body copy is Helvetica (globals.css).
const display = localFont({ src: '../fonts/Parafina-RegularL.otf', variable: '--font-display' })

// The shell shared by both languages. It sits above /en and /es so switching language is an
// in-page navigation (a root layout under [lang] would make it a full reload: intro, background
// and every photo starting over). Its <html lang> is set from the address before first paint, and
// kept in step by the nav.
export default function Root({ children }: { children: React.ReactNode }) {
B  return (
    <html className={display.variable} data-scroll-behavior="smooth" style={{ '--gel': featured[0]?.gel } as React.CSSProperties} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `document.documentElement.lang=location.pathname.startsWith('/es')?'es':'en'` }} />
      </head>
      <body>
        <Atmosphere />
        {children}
      </body>
	<Analytics/>
    </html>
  )
}
