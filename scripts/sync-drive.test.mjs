import assert from 'node:assert/strict'
import { test } from 'node:test'
import sharp from 'sharp'
import { gelColor, parseFolderName, slugify } from './sync-drive.mjs'

test('parses folder names', () => {
  assert.deepEqual(parseFolderName('2026-03-14 — Blue Reed Quartet — Café Central, Madrid'),
    { date: '2026-03-14', artist: 'Blue Reed Quartet', venue: 'Café Central', city: 'Madrid' })
  assert.deepEqual(parseFolderName('2026-03-14 - Trio - Club, Room 2, Bilbao'),
    { date: '2026-03-14', artist: 'Trio', venue: 'Club, Room 2', city: 'Bilbao' })
  assert.equal(parseFolderName('2026-03-14 - Trio - Club').city, '')
  assert.deepEqual(parseFolderName(' Fer Moreno '), { date: '', artist: 'Fer Moreno', venue: '', city: '' })
  assert.equal(slugify('2026-03-14 Café Ñandú'), '2026-03-14-cafe-nandu')
})

const hue = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const max = Math.max(r, g, b)
  return max === r ? 'red' : max === g ? 'green' : 'blue'
}
const raw = async (file) => (await sharp(file).resize(48, 48, { fit: 'fill' }).removeAlpha().raw().toBuffer())

test('gel color follows the stage light', async () => {
  const dir = 'fixtures/2026-03-14 — Blue Reed Quartet — Café Central, Madrid'
  assert.equal(hue(gelColor(await raw(`${dir}/00_cover.png`))), 'blue')
  assert.equal(hue(gelColor(await raw(`fixtures/2026-02-07 — Lena Ortiz Trio — Bogui Jazz, Madrid/01.png`))), 'red')
  assert.equal(gelColor(Buffer.alloc(48 * 48 * 3, 10)), '#5c5650') // pure grey: neutral fallback
})
