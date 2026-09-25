// Server-only data access: importing this from a client component would ship all of data/sets.json
// to the browser. Client components import types with `import type` and colors from lib/gel.ts.
import data from '@/data/sets.json'

export type Photo = { id: string; w: number; h: number; widths: number[]; gel: string; blur: string }
export type Set = { slug: string; date: string; artist: string; venue: string; city: string; cover: Photo; photos: Photo[] }

const d = data as { featured: Photo[]; design?: Photo[]; sets: Set[] }
export const sets = d.sets
// Home reel: the photographer's "MOSAICO PRINCIPAL" folder, else the latest covers.
export const featured = d.featured.length ? d.featured : d.sets.slice(0, 8).map((x) => x.cover)
// The "MUSIC DESIGN" folder.
export const design = d.design ?? []
