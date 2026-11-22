// Generates the PWA icons from public/favicon.svg: node scripts/gen-icons.mjs
import sharp from 'sharp'
import { readFileSync } from 'node:fs'

const svg = readFileSync('public/favicon.svg')
for (const [name, size] of [['pwa-192.png', 192], ['pwa-512.png', 512], ['apple-touch-icon.png', 180]]) {
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(`public/${name}`)
}
// maskable: full-bleed background with the artwork inside the safe zone
const inner = await sharp(svg, { density: 300 }).resize(400, 400).png().toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#ffb703' } }).composite([{ input: inner, left: 56, top: 56 }]).png().toFile('public/pwa-maskable-512.png')
