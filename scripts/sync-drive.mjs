// Pulls one-folder-per-concert photos from Google Drive (or ./fixtures locally),
// makes web-sized AVIF/WebP copies, and writes data/sets.json.
// Originals never leave the build machine; only the resized copies are published.
import { createHash, createSign } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'

const WIDTHS = [800, 1600, 2400]
const CACHE = '.next/cache/drive' // Vercel keeps .next/cache between builds
const OUT = 'public/photos'
const IMAGE_EXT = /\.(jpe?g|png|tiff?|webp)$/i
const FEATURED = /^mosaico principal$/i // this folder feeds the home page's opening reel, not a set
const DESIGN = /^music design$/i // design work: its own page, not a concert
const ABOUT = /^(sobre m[ií]|about( me)?)$/i // the portrait on the about page: the newest photo in it
const FEATURED_COUNT = 48 // first N photos by filename; the home table grows a row per 6 (3 on phones)

// "03 Fer Moreno", "03-Fer Moreno", "03. 2026-03-14 — Artist — Venue": a leading number of up to
// three digits only sets the order (01 first) and never shows on the site. A date is not a number.
export function splitOrder(name) {
  const m = name.trim().match(/^(\d{1,3})(?!\d)(?:\s*[-–—._)]\s*|\s+)(?=\S)/)
  return m ? { order: Number(m[1]), rest: name.trim().slice(m[0].length) } : { order: Infinity, rest: name.trim() }
}

// "2026-03-14 — Artist — Venue, City"; anything that doesn't fit is just the artist.
export function parseFolderName(name) {
  const m = name.trim().match(/^(\d{4}-\d{2}-\d{2})\s+[—–-]\s+(.+?)\s+[—–-]\s+(.+?)(?:,\s*([^,]+))?$/)
  if (!m) return { date: '', artist: name.trim(), venue: '', city: '' }
  const [, date, artist, venue, city = ''] = m
  return { date, artist: artist.trim(), venue: venue.trim(), city: city.trim() }
}

// Promise.all with at most `limit` in flight; keeps input order.
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  const worker = async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i], i) } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

export const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Stage-gel color: the circular mean hue of bright, saturated pixels.
// (sharp's stats().dominant returns near-black for dark concert shots, so it's useless here.)
export function gelColor(rgb) {
  let x = 0, y = 0, total = 0
  for (let i = 0; i < rgb.length; i += 3) {
    const r = rgb[i] / 255, g = rgb[i + 1] / 255, b = rgb[i + 2] / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    if (max === min) continue
    const d = max - min
    const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    const w = (d / max) * max * max // saturation × brightness²
    const a = (h / 6) * 2 * Math.PI
    x += Math.cos(a) * w
    y += Math.sin(a) * w
    total += w
  }
  if (total < 1 || Math.hypot(x, y) / total < 0.15) return '#5c5650' // no clear gel: warm grey
  const hue = ((Math.atan2(y, x) / (2 * Math.PI)) * 360 + 360) % 360
  return hslToHex(hue, 0.7, 0.45)
}

function hslToHex(h, s, l) {
  const f = (n) => {
    const k = (n + h / 30) % 12
    const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// ---------- sources: Drive (service account) or a local folder ----------

function loadServiceAccount() {
  const raw = process.env.GOOGLE_SA_JSON?.trim()
  if (!raw || raw === '[SENSITIVE]') return null
  // Vercel: paste the JSON itself. Locally: a path to the downloaded key file also works.
  if (raw.startsWith('{')) return JSON.parse(raw)
  if (!existsSync(raw)) throw new Error(`GOOGLE_SA_JSON points at ${raw}, which is not on this machine. On Vercel, paste the service account JSON itself.`)
  return JSON.parse(readFileSync(raw, 'utf8'))
}

// `vercel build` pulls sensitive vars as the literal "[SENSITIVE]" and sets them before this
// script runs. loadEnvFile will not replace those, so fill them from .env / .env.local.
function loadLocalEnv() {
  const fromFile = {}
  for (const path of ['.env', '.env.local']) {
    let text
    try { text = readFileSync(path, 'utf8') } catch { continue }
    for (const line of text.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i < 1) continue
      let val = t.slice(i + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
      fromFile[t.slice(0, i).trim()] = val
    }
  }
  for (const [key, val] of Object.entries(fromFile)) {
    const current = process.env[key]
    if (current == null || current === '' || current === '[SENSITIVE]') process.env[key] = val
  }
}

async function driveSource(sa, rootId) {
  const now = Math.floor(Date.now() / 1000)
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`
  const jwt = `${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url')}`
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  if (!tokenRes.ok) throw new Error(`Google auth failed: ${tokenRes.status} ${await tokenRes.text()}`)
  const { access_token } = await tokenRes.json()
  const headers = { Authorization: `Bearer ${access_token}` }

  async function list(q) {
    const files = []
    let pageToken = ''
    do {
      const params = new URLSearchParams({
        q: `${q} and trashed=false`,
        fields: 'nextPageToken,files(id,name,mimeType,md5Checksum,createdTime)',
        pageSize: '1000',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
        ...(pageToken && { pageToken }),
      })
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { headers })
      if (!res.ok) throw new Error(`Drive list failed: ${res.status} ${await res.text()}`)
      const json = await res.json()
      files.push(...json.files)
      pageToken = json.nextPageToken
    } while (pageToken)
    return files
  }

  // `npm run sync -- --tree`: print the folder structure (names and counts only) and stop.
  if (process.argv.includes('--tree')) {
    const walk = async (id, depth) => {
      const items = await list(`'${id}' in parents`)
      for (const f of items.filter((i) => i.mimeType === 'application/vnd.google-apps.folder')) {
        const inside = await list(`'${f.id}' in parents`)
        const images = inside.filter((i) => i.mimeType.startsWith('image/')).length
        const folders = inside.filter((i) => i.mimeType === 'application/vnd.google-apps.folder').length
        const other = [...new Set(inside.filter((i) => !i.mimeType.startsWith('image/') && !i.mimeType.includes('folder')).map((i) => i.mimeType.split('/').pop()))]
        console.log(`${'  '.repeat(depth)}${f.name}  [${images} images${folders ? `, ${folders} folders` : ''}${other.length ? `, other: ${other.join(' ')}` : ''}]`)
        if (depth < 3) await walk(f.id, depth + 1)
      }
    }
    const loose = (await list(`'${rootId}' in parents and mimeType contains 'image/'`)).length
    console.log(`(root folder)  [${loose} loose images]`)
    await walk(rootId, 0)
    process.exit(0)
  }

  const folders = await list(`'${rootId}' in parents and mimeType='application/vnd.google-apps.folder'`)
  if (!folders.length) console.warn('! Root folder is empty or not shared with the service account.')
  return Promise.all(
    folders.map(async (f) => ({
      name: f.name,
      created: f.createdTime,
      files: (await list(`'${f.id}' in parents and mimeType contains 'image/'`)).map((file) => ({
        key: `${file.id}-${file.md5Checksum}`,
        name: file.name,
        created: file.createdTime,
        read: async () => {
          const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, { headers })
          if (!res.ok) throw new Error(`download ${res.status}`)
          return Buffer.from(await res.arrayBuffer())
        },
      })),
    })),
  )
}

async function localSource(dir) {
  const folders = (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory())
  return Promise.all(
    folders.map(async (f) => {
      const names = (await readdir(join(dir, f.name))).filter((n) => IMAGE_EXT.test(n))
      return {
        name: f.name,
        created: (await stat(join(dir, f.name))).birthtime.toISOString(),
        files: await Promise.all(
          names.map(async (n) => {
            const buf = await readFile(join(dir, f.name, n))
            const created = (await stat(join(dir, f.name, n))).birthtime.toISOString()
            return { key: createHash('md5').update(buf).digest('hex'), name: n, created, read: async () => buf }
          }),
        ),
      }
    }),
  )
}

// ---------- processing ----------

async function processPhoto(file) {
  const id = createHash('sha1').update(file.key).digest('hex').slice(0, 12)
  const dir = join(CACHE, id)
  const metaPath = join(dir, 'meta.json')
  if (existsSync(metaPath)) return JSON.parse(await readFile(metaPath, 'utf8'))

  const input = sharp(await file.read()).rotate() // apply EXIF orientation, then all metadata is dropped
  const { width, height } = await input.clone().toBuffer({ resolveWithObject: true }).then((r) => r.info)
  await mkdir(dir, { recursive: true })
  const widths = WIDTHS.filter((w) => w < width).concat(Math.min(width, WIDTHS.at(-1)))
  const uniq = [...new Set(widths)]
  for (const w of uniq) {
    const resized = input.clone().resize({ width: w })
    await resized.clone().avif({ quality: 55 }).toFile(join(dir, `${w}.avif`))
    await resized.clone().webp({ quality: 78 }).toFile(join(dir, `${w}.webp`))
  }
  const { data } = await input.clone().resize(48, 48, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const blur = await input.clone().resize(16).blur(1).webp({ quality: 40 }).toBuffer()
  const meta = {
    id,
    w: Math.min(width, WIDTHS.at(-1)),
    h: Math.round((height / width) * Math.min(width, WIDTHS.at(-1))),
    widths: uniq,
    gel: gelColor(data),
    blur: `data:image/webp;base64,${blur.toString('base64')}`,
  }
  await writeFile(metaPath, JSON.stringify(meta))
  console.log(`    + ${file.name}`) // only new photos get here; cached ones are instant
  return meta
}

async function main() {
  loadLocalEnv()
  const sa = loadServiceAccount()
  const rootId = process.env.DRIVE_ROOT_FOLDER_ID
  let folders
  // `--local` forces ./fixtures even when Drive credentials are set.
  if (sa && rootId && !process.argv.includes('--local')) {
    console.log('Syncing from Google Drive…')
    folders = await driveSource(sa, rootId)
  } else if (process.env.VERCEL) {
    throw new Error('GOOGLE_SA_JSON and DRIVE_ROOT_FOLDER_ID must be set on Vercel.')
  } else {
    console.log('Using ./fixtures (no Drive credentials in .env, or --local)')
    folders = existsSync('fixtures') ? await localSource('fixtures') : []
  }

  const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })
  const processAll = async (folder, files) =>
    (await mapLimit(files, 4, (f) => processPhoto(f).catch((e) => console.warn(`! Skipping "${folder.name}/${f.name}": ${e.message}`)))).filter(Boolean)

  const sets = []
  let featured = []
  let design = []
  let about = null
  const slugs = new Set()
  for (const folder of folders) {
    const files = [...folder.files].sort(byName) // Drive already filtered to images; sharp skips what it can't read
    const { order, rest: name } = splitOrder(folder.name)
    if (FEATURED.test(name)) {
      featured = await processAll(folder, files.slice(0, FEATURED_COUNT))
      console.log(`  ${folder.name}: ${featured.length} photos for the home reel`)
      continue
    }
    if (ABOUT.test(name)) {
      const newest = [...folder.files].sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''))[0]
      about = newest ? (await processAll(folder, [newest]))[0] ?? null : null
      console.log(`  ${folder.name}: ${about ? `"${newest.name}"` : 'no photo'} for the about page`)
      continue
    }
    if (DESIGN.test(name)) {
      design = await processAll(folder, files)
      console.log(`  ${folder.name}: ${design.length} pieces for the design page`)
      continue
    }
    const photos = await processAll(folder, files)
    if (!photos.length) continue
    const info = parseFolderName(name)
    let slug = slugify(`${info.date} ${info.artist}`) || 'set'
    while (slugs.has(slug)) slug += '-2'
    slugs.add(slug)
    sets.push({ slug, order, ...info, created: folder.created ?? '', cover: photos[0], photos })
    console.log(`  ${info.artist}${info.date ? `  ${info.date}` : ''}  (${photos.length} photos)`)
  }
  // Numbered folders first, 01 at the top; then the rest, newest first.
  sets.sort((a, b) => a.order - b.order || (b.date || b.created).localeCompare(a.date || a.created))
  for (const s of sets) delete s.order

  // Rebuild public/photos from cache so deleted photos disappear from the site.
  // ponytail: cache dir is never pruned; clear .next/cache/drive if it ever gets big.
  await rm(OUT, { recursive: true, force: true })
  for (const p of [...featured, ...design, ...(about ? [about] : []), ...sets.flatMap((s) => s.photos)])
    await cp(join(CACHE, p.id), join(OUT, p.id), { recursive: true, filter: (src) => !src.endsWith('meta.json') })
  await mkdir('data', { recursive: true })
  await writeFile('data/sets.json', JSON.stringify({ featured, design, about, sets }, null, 1))
  console.log(`✓ ${sets.length} sets synced`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e.message)
    process.exit(1)
  })
}
