// Dev helper: renders a contact sheet of all pictures (outline + sample colors) for visual review.
import sharp from 'sharp'
import { PICTURES } from '../src/data/pictures'
import { sampleColors, svgMarkup } from '../src/data/shapes'

const out = process.argv[2] ?? 'sheet'
const cols = 6, cell = 260
for (const [name, colored] of [['line', false], ['color', true]] as const) {
  const rows = Math.ceil(PICTURES.length / cols)
  const comps = await Promise.all(PICTURES.map(async (p, i) => ({
    input: await sharp(Buffer.from(svgMarkup(p.items, colored ? sampleColors(p.items) : {}, cell - 10))).png().toBuffer(),
    left: (i % cols) * cell + 5, top: Math.floor(i / cols) * cell + 5,
  })))
  await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: '#888' } }).composite(comps).png().toFile(`${out}-${name}.png`)
}
