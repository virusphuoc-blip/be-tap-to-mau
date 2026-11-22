import { BLANK, INK } from '../lib/palette'

/** One drawable item of a picture, in paint order (later items cover earlier ones). */
export type Item = {
  /** Region id. Items sharing an id are colored together. Absent for fixed details. */
  id?: string
  /** Suggested color ("tô mẫu"). */
  c?: string
  d: string
  /** Fat-stroke region: the path is drawn as a thick colorable line. */
  sw?: number
  /** Fixed fill color of a non-colorable detail. */
  fix?: string
  /** Detail with an outline. */
  o?: boolean
  /** Non-colorable line detail with this stroke width. */
  line?: number
  tr?: string
}

export type Category = 'animals' | 'vehicles' | 'fruits' | 'abc' | 'nature'
export type Picture = { id: string; name: string; cat: Category; items: Item[] }

export const BG = 'nen'
const n = (v: number) => Math.round(v * 10) / 10

/** Ellipse (optionally rotated by `rot` degrees) as a path. */
export function E(x: number, y: number, rx: number, ry: number, rot = 0): string {
  const a = (rot * Math.PI) / 180
  const dx = rx * Math.cos(a)
  const dy = rx * Math.sin(a)
  return `M${n(x - dx)} ${n(y - dy)}A${rx} ${ry} ${rot} 1 0 ${n(x + dx)} ${n(y + dy)}A${rx} ${ry} ${rot} 1 0 ${n(x - dx)} ${n(y - dy)}Z`
}
export const Ci = (x: number, y: number, r: number) => E(x, y, r, r)
export function R(x: number, y: number, w: number, h: number, r = 0): string {
  if (!r) return `M${x} ${y}h${w}v${h}h${-w}Z`
  return `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}Z`
}
export function P(...p: number[]): string {
  let d = ''
  for (let i = 0; i < p.length; i += 2) d += `${i ? 'L' : 'M'}${n(p[i])} ${n(p[i + 1])}`
  return d + 'Z'
}
export function star(cx: number, cy: number, r: number, points = 5, inner = 0.45): string {
  const p: number[] = []
  for (let i = 0; i < points * 2; i++) {
    const a = (i * Math.PI) / points - Math.PI / 2
    const rr = i % 2 ? r * inner : r
    p.push(cx + rr * Math.cos(a), cy + rr * Math.sin(a))
  }
  return P(...p)
}
export function heart(x: number, y: number, s: number): string {
  return `M${x} ${n(y + s * 0.9)}C${n(x - s * 1.6)} ${n(y - s * 0.1)} ${n(x - s * 0.7)} ${n(y - s * 1.2)} ${x} ${n(y - s * 0.35)}C${n(x + s * 0.7)} ${n(y - s * 1.2)} ${n(x + s * 1.6)} ${n(y - s * 0.1)} ${x} ${n(y + s * 0.9)}Z`
}
export const cloud = (x: number, y: number, s = 1) =>
  `M${x} ${y}a${30 * s} ${30 * s} 0 0 1 ${20 * s} ${-55 * s}a${35 * s} ${35 * s} 0 0 1 ${65 * s} 0a${30 * s} ${30 * s} 0 0 1 ${20 * s} ${55 * s}Z`

/** Colorable region. */
export const f = (id: string, c: string, d: string): Item => ({ id, c, d })
/** Colorable fat stroke. */
export const s = (id: string, c: string, d: string, sw: number): Item => ({ id, c, d, sw })
/** Fixed detail (eyes, nostrils...). */
export const k = (d: string, fix: string = INK, o = false): Item => ({ d, fix, o })
/** Fixed line detail (mouth, whiskers...). */
export const l = (d: string, line = 5): Item => ({ d, line })
export const bg = (c: string): Item => f(BG, c, R(0, 0, 400, 400))

/** Ids a child has to color for the picture to count as finished (background is optional). */
export function regionIds(items: readonly Item[]): string[] {
  return [...new Set(items.filter((i) => i.id && i.id !== BG).map((i) => i.id!))]
}
export function allIds(items: readonly Item[]): string[] {
  return [...new Set(items.filter((i) => i.id).map((i) => i.id!))]
}
/** Suggested colors for every region ("tô mẫu"). */
export function sampleColors(items: readonly Item[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const i of items) if (i.id && i.c && !(i.id in out)) out[i.id] = i.c
  return out
}

/** SVG markup of a picture with the given fills. Used for the editor, thumbnails and PNG export. */
export function svgMarkup(items: readonly Item[], fills: Record<string, string>, size?: number): string {
  const round = 'stroke-linecap="round" stroke-linejoin="round"'
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"${size ? ` width="${size}" height="${size}"` : ''}>`
  for (const i of items) {
    const tr = i.tr ? ` transform="${i.tr}"` : ''
    if (i.id) {
      const col = fills[i.id] ?? BLANK
      if (i.sw) {
        out += `<path d="${i.d}"${tr} fill="none" stroke="${INK}" stroke-width="${i.sw + 10}" ${round} pointer-events="none"/>`
        out += `<path data-id="${i.id}" d="${i.d}"${tr} fill="none" stroke="${col}" stroke-width="${i.sw}" ${round}/>`
      } else if (i.id === BG) out += `<path data-id="${i.id}" d="${i.d}" fill="${col}"/>`
      else out += `<path data-id="${i.id}" d="${i.d}"${tr} fill="${col}" stroke="${INK}" stroke-width="5" ${round}/>`
    } else if (i.line) out += `<path d="${i.d}"${tr} fill="none" stroke="${INK}" stroke-width="${i.line}" ${round} pointer-events="none"/>`
    else out += `<path d="${i.d}"${tr} fill="${i.fix}"${i.o ? ` stroke="${INK}" stroke-width="4" ${round}` : ''} pointer-events="none"/>`
  }
  return out + '</svg>'
}
