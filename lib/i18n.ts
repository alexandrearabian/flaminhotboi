// Everything the photographer provides lives here: name, contact, bio.
// TODO(photographer): real name, email, Instagram, bio in both languages, optional portrait in /public.
import type { Set } from '@/lib/sets'

export const site = {
  name: 'Ramiro Daneloglu',
  navName: 'Rami', // short form in the nav pill
  email: 'ramidane@hotmail.com.ar',
  // Shown in the footer in this order. Add TikTok, YouTube, etc. as needed.
  socials: [
    { label: 'Instagram', href: 'https://www.instagram.com/ramidane/' },
    { label: 'WhatsApp', href: 'https://wa.me/5491150183209' },
  ],
  portrait: '' as string, // e.g. '/portrait.jpg'
}

export const langs = ['en', 'es'] as const
export type Lang = (typeof langs)[number]
export const isLang = (l: string): l is Lang => (langs as readonly string[]).includes(l)

export const t = {
  en: {
    tagline: 'Art.',
    setlist: 'Work',
    about: 'About',
    advertising: 'Advertising',
    openSet: 'Open work',
    selected: 'Selected photos',
    bookingLine: 'Concerts, festivals and music design.',
    top: 'Back to top',
    design: 'Design',
    designBy: (name: string) => `Music design by ${name}`,
    allSets: 'All works',
    nextSet: 'Next work',
    track: 'Track',
    photos: 'photos',
    close: 'Close',
    prev: 'Previous photo',
    next: 'Next photo',
    liveAt: (artist: string, venue: string) => (venue ? `${artist} live at ${venue}` : `${artist} live`),
    photoBy: (name: string) => `Live jazz photograph by ${name}`,
    empty: 'No works yet. New concerts show up here within a day of being added.',
    bookings: 'Bookings',
    emailMe: 'Email me',
    // One paragraph per entry.
    bio: [
      "I'm an advertising creative with a deep love for photography.",
      'I believe everything I learn in advertising feeds into my photography and vice versa.',
      'My only rule: capture the best photo regardless of the camera, format, or situation.',
    ],
  },
  es: {
    tagline: 'Arte.',
    setlist: 'Work',
    about: 'Sobre mí',
    advertising: 'Publicidades',
    openSet: 'Ver work',
    selected: 'Fotos destacadas',
    bookingLine: 'Conciertos, festivales y diseño musical.',
    top: 'Volver arriba',
    design: 'Diseño',
    designBy: (name: string) => `Diseño musical de ${name}`,
    allSets: 'Todos los works',
    nextSet: 'Siguiente work',
    track: 'Tema',
    photos: 'fotos',
    close: 'Cerrar',
    prev: 'Foto anterior',
    next: 'Foto siguiente',
    liveAt: (artist: string, venue: string) => (venue ? `${artist} en directo en ${venue}` : `${artist} en directo`),
    photoBy: (name: string) => `Fotografía de jazz en directo de ${name}`,
    empty: 'Todavía no hay works. Los conciertos nuevos aparecen aquí en menos de un día.',
    bookings: 'Contrataciones',
    emailMe: 'Escríbeme',
    bio: [
      'Soy creativo publicitario pero también tengo un amor muy profundo con la fotografía.',
      'Creo en que todo lo que aprendo en publicidad termina alimentando a mi fotografía y viceversa.',
      'Mi única regla en la fotografía es intentar sacar la mejor foto sin importar la cámara, el formato o la situación.',
    ],
  },
} satisfies Record<Lang, unknown>

// "Venue, City" and the date, skipping whatever the folder name didn't include.
export const details = (x: Set) =>
  [[x.venue, x.city].filter(Boolean).join(', '), x.date && fmtDate(x.date)].filter(Boolean) as string[]

// "2026-03-14" -> "14.03.26"
export const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y.slice(2)}`
}
