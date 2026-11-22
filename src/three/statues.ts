/**
 * 3D statues described as plain data: every statue is a list of colorable parts, each made of
 * primitives (spheres, boxes, cylinders, cones, torus). No model files are loaded.
 * Convention: Y is up, the statue faces +Z, sizes are half-extents.
 */
import { C } from '../lib/palette'

export type V3 = [number, number, number]
export type Prim = {
  g: 'sph' | 'box' | 'cyl' | 'cone' | 'tor'
  p: V3
  /** half-extents (sphere radii, box half sizes, cylinder/cone radius + half height) */
  s: V3
  r?: V3
}
export type Part = { id: string; color: string; m: Prim[] }
export type Fixed = { color: string; m: Prim[] }
export type Statue = { id: string; name: string; icon: string; parts: Part[]; fixed: Fixed[] }

const { RED, ORA, AMB, YEL, LIM, GRN, SKY, VIO, PNK, LPK, BRN, TAN, WHT, LGR, BLK } = C
const INK = '#1f2937'

const v = (s: number | V3): V3 => (typeof s === 'number' ? [s, s, s] : s)
const prim = (g: Prim['g']) => (p: V3, s: number | V3, r?: V3): Prim => ({ g, p, s: v(s), r })
const sph = prim('sph'), box = prim('box'), cyl = prim('cyl'), cone = prim('cone'), tor = prim('tor')
/** The primitive plus its mirror image across the YZ plane. */
const mir = (m: Prim): Prim[] => [m, { ...m, p: [-m.p[0], m.p[1], m.p[2]], r: m.r && [m.r[0], -m.r[1], -m.r[2]] }]
/** Spheres strung along a polyline, radius going from r0 to r1 (tails, necks, trunks). */
function chain(pts: V3[], r0: number, r1: number): Prim[] {
  const out: Prim[] = []
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1], p[2] - pts[i][2]))
  const total = lens.reduce((a, b) => a + b, 0)
  let done = 0
  pts.slice(1).forEach((b, i) => {
    const a = pts[i]
    const steps = Math.max(1, Math.round(lens[i] / (Math.min(r0, r1) * 0.9 + 0.03)))
    for (let k = i === 0 ? 0 : 1; k <= steps; k++) {
      const t = k / steps
      const u = (done + lens[i] * t) / total
      out.push(sph([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], r0 + (r1 - r0) * u))
    }
    done += lens[i]
  })
  return out
}
const part = (id: string, color: string, ...m: (Prim | Prim[])[]): Part => ({ id, color, m: m.flat() })
const fix = (color: string, ...m: (Prim | Prim[])[]): Fixed => ({ color, m: m.flat() })
/** Shiny black eyes with a white highlight. */
const eyes = (x: number, y: number, z: number, r = 0.07): Fixed[] => [
  fix(INK, mir(sph([x, y, z], r))),
  fix('#ffffff', mir(sph([x + r * 0.35, y + r * 0.4, z + r * 0.75], r * 0.35))),
]

export const STATUES: Statue[] = [
  {
    id: 'gautruc', name: 'Gấu trúc', icon: '🐼',
    parts: [
      part('than', WHT, sph([0, -0.45, 0], [0.72, 0.68, 0.62])),
      part('chan', BLK, mir(sph([0.42, -0.92, 0.42], [0.26, 0.22, 0.34]))),
      part('tay', BLK, mir(sph([0.66, -0.2, 0.2], [0.2, 0.38, 0.22], [0.3, 0, 0.5]))),
      part('tai', BLK, mir(sph([0.5, 1.02, 0], [0.24, 0.24, 0.13]))),
      part('dau', WHT, sph([0, 0.52, 0.05], [0.68, 0.6, 0.6])),
      part('mat', BLK, mir(sph([0.27, 0.6, 0.55], [0.17, 0.2, 0.1], [0, 0.35, -0.35]))),
      part('mom', WHT, sph([0, 0.36, 0.58], [0.24, 0.17, 0.14])),
      part('duoi', WHT, sph([0, -0.75, -0.6], 0.17)),
    ],
    fixed: [
      fix('#ffffff', mir(sph([0.26, 0.61, 0.62], 0.08))),
      fix(INK, mir(sph([0.255, 0.61, 0.675], 0.045))),
      fix(INK, sph([0, 0.42, 0.71], [0.08, 0.055, 0.04])),
    ],
  },
  {
    id: 'meo', name: 'Mèo', icon: '🐱',
    parts: [
      part('than', AMB, sph([0, -0.5, 0], [0.55, 0.65, 0.55])),
      part('nguc', WHT, sph([0, -0.42, 0.3], [0.33, 0.42, 0.3])),
      part('chansau', AMB, mir(sph([0.48, -0.97, 0.2], [0.2, 0.18, 0.32]))),
      part('chantruoc', WHT, mir(sph([0.22, -0.85, 0.5], [0.14, 0.3, 0.16]))),
      part('duoi', AMB, chain([[0.1, -1.0, -0.5], [0.55, -1.0, -0.75], [0.9, -0.8, -0.65], [1.02, -0.4, -0.5], [0.92, 0, -0.42]], 0.12, 0.1)),
      part('tai', AMB, mir(cone([0.38, 1.0, 0.08], [0.22, 0.26, 0.14], [0, 0, -0.3]))),
      part('trongtai', PNK, mir(cone([0.38, 0.97, 0.15], [0.12, 0.16, 0.08], [0, 0, -0.3]))),
      part('dau', AMB, sph([0, 0.5, 0.1], [0.62, 0.52, 0.55])),
      part('mom', WHT, mir(sph([0.1, 0.36, 0.6], [0.14, 0.11, 0.1]))),
    ],
    fixed: [
      ...eyes(0.24, 0.56, 0.6),
      fix('#f472b6', sph([0, 0.43, 0.67], [0.055, 0.04, 0.035])),
      fix(INK, mir(cyl([0.42, 0.4, 0.55], [0.008, 0.2, 0.008], [0, 0.3, 1.45])), mir(cyl([0.42, 0.33, 0.55], [0.008, 0.2, 0.008], [0, 0.3, 1.7]))),
    ],
  },
  {
    id: 'cho', name: 'Chó', icon: '🐶',
    parts: [
      part('than', TAN, sph([0, -0.3, -0.1], [0.48, 0.45, 0.8])),
      part('dom', BRN, sph([0.18, 0.0, -0.35], [0.26, 0.16, 0.3])),
      part('chan', TAN, mir(cyl([0.3, -0.82, 0.4], [0.14, 0.3, 0.14])), mir(cyl([0.3, -0.82, -0.6], [0.14, 0.3, 0.14]))),
      part('ban', WHT, mir(sph([0.3, -1.1, 0.45], [0.17, 0.1, 0.21])), mir(sph([0.3, -1.1, -0.55], [0.17, 0.1, 0.21]))),
      part('duoi', TAN, cone([0, 0.22, -0.98], [0.1, 0.3, 0.1], [-0.6, 0, 0])),
      part('vong', RED, tor([0, 0.1, 0.36], [0.4, 0.4, 0.4], [-0.9, 0, 0])),
      part('dau', TAN, sph([0, 0.5, 0.62], [0.5, 0.45, 0.45])),
      part('tai', BRN, mir(sph([0.5, 0.42, 0.56], [0.12, 0.34, 0.2], [0, 0, 0.25]))),
      part('mom', WHT, sph([0, 0.38, 1.02], [0.24, 0.19, 0.26])),
      part('luoi', PNK, sph([0, 0.22, 1.2], [0.07, 0.1, 0.035], [0.3, 0, 0])),
    ],
    fixed: [...eyes(0.2, 0.63, 1.0, 0.065), fix(INK, sph([0, 0.47, 1.26], [0.09, 0.07, 0.06]))],
  },
  {
    id: 'tho', name: 'Thỏ', icon: '🐰',
    parts: [
      part('than', WHT, sph([0, -0.5, 0], [0.55, 0.62, 0.5])),
      part('bung', LPK, sph([0, -0.5, 0.28], [0.32, 0.4, 0.28])),
      part('chan', WHT, mir(sph([0.36, -1.0, 0.38], [0.2, 0.14, 0.36]))),
      part('tay', WHT, mir(sph([0.42, -0.3, 0.36], [0.13, 0.24, 0.15], [0.5, 0, 0.5]))),
      part('duoi', WHT, sph([0, -0.75, -0.52], 0.2)),
      part('tai', WHT, mir(sph([0.25, 1.2, 0], [0.15, 0.5, 0.1], [0, 0, -0.15]))),
      part('trongtai', PNK, mir(sph([0.25, 1.2, 0.07], [0.08, 0.38, 0.05], [0, 0, -0.15]))),
      part('dau', WHT, sph([0, 0.35, 0.05], [0.58, 0.5, 0.5])),
      part('ma', LPK, mir(sph([0.13, 0.2, 0.5], [0.15, 0.11, 0.1]))),
      part('carot', ORA, cone([0, -0.42, 0.66], [0.12, 0.3, 0.12], [Math.PI, 0, 0])),
      part('la', GRN, cone([0, -0.05, 0.66], [0.09, 0.13, 0.09]), mir(cone([0.08, -0.06, 0.66], [0.06, 0.11, 0.06], [0, 0, -0.6]))),
    ],
    fixed: [
      ...eyes(0.22, 0.43, 0.5),
      fix('#f472b6', sph([0, 0.29, 0.6], [0.05, 0.035, 0.03])),
      fix('#ffffff', box([0, 0.13, 0.6], [0.05, 0.05, 0.02])),
    ],
  },
  {
    id: 'voi', name: 'Voi', icon: '🐘',
    parts: [
      part('than', SKY, sph([0, -0.2, -0.25], [0.7, 0.62, 0.85])),
      part('chan', SKY, mir(cyl([0.38, -0.85, 0.3], [0.2, 0.32, 0.2])), mir(cyl([0.38, -0.85, -0.75], [0.2, 0.32, 0.2]))),
      part('mong', WHT, mir(cyl([0.38, -1.13, 0.3], [0.215, 0.05, 0.215])), mir(cyl([0.38, -1.13, -0.75], [0.215, 0.05, 0.215]))),
      part('duoi', SKY, cyl([0, -0.25, -1.15], [0.04, 0.28, 0.04], [0.5, 0, 0])),
      part('tai', SKY, mir(sph([0.78, 0.42, 0.45], [0.42, 0.48, 0.08], [0, -0.35, 0]))),
      part('trongtai', PNK, mir(sph([0.79, 0.42, 0.5], [0.3, 0.36, 0.06], [0, -0.35, 0]))),
      part('dau', SKY, sph([0, 0.35, 0.6], [0.55, 0.52, 0.5])),
      part('voi', SKY, chain([[0, 0.25, 1.02], [0, 0, 1.25], [0, -0.35, 1.36], [0, -0.66, 1.46], [0, -0.74, 1.72]], 0.2, 0.12)),
      part('nga', WHT, mir(cone([0.27, -0.02, 1.08], [0.07, 0.25, 0.07], [2.2, 0, 0]))),
    ],
    fixed: [...eyes(0.3, 0.5, 1.0), fix('#1f2937', sph([0, -0.6, -1.3], 0.07))],
  },
  {
    id: 'khunglong', name: 'Khủng long', icon: '🦕',
    parts: [
      part('than', GRN, sph([0, -0.3, -0.1], [0.55, 0.5, 0.85])),
      part('bung', YEL, sph([0, -0.42, -0.05], [0.42, 0.42, 0.72])),
      part('chan', GRN, mir(cyl([0.33, -0.85, 0.35], [0.17, 0.3, 0.17])), mir(cyl([0.33, -0.85, -0.55], [0.17, 0.3, 0.17]))),
      part('co', GRN, chain([[0, 0, 0.55], [0, 0.4, 0.82], [0, 0.8, 0.95], [0, 1.12, 1.02]], 0.27, 0.2)),
      part('dau', GRN, sph([0, 1.25, 1.18], [0.28, 0.24, 0.38])),
      part('duoi', GRN, chain([[0, -0.25, -0.8], [0, -0.45, -1.3], [0, -0.72, -1.7], [0, -0.95, -2.05]], 0.3, 0.07)),
      part('gai', ORA,
        cone([0, 1.12, 0.78], [0.05, 0.12, 0.1], [-0.5, 0, 0]), cone([0, 0.72, 0.68], [0.05, 0.13, 0.11], [-0.7, 0, 0]),
        cone([0, 0.3, 0.3], [0.06, 0.17, 0.14]), cone([0, 0.33, -0.05], [0.06, 0.18, 0.15]), cone([0, 0.28, -0.42], [0.06, 0.17, 0.14]),
        cone([0, 0.12, -0.8], [0.06, 0.15, 0.13], [-0.3, 0, 0]), cone([0, -0.18, -1.2], [0.05, 0.13, 0.11], [-0.5, 0, 0])),
      part('dom', LIM, mir(sph([0.47, -0.1, -0.25], [0.1, 0.14, 0.16])), mir(sph([0.42, -0.12, 0.25], [0.1, 0.12, 0.13])), mir(sph([0.44, -0.2, -0.6], [0.08, 0.1, 0.11]))),
    ],
    fixed: [...eyes(0.2, 1.33, 1.32, 0.06), fix(INK, mir(sph([0.08, 1.27, 1.54], 0.025)))],
  },
  {
    id: 'oto', name: 'Ô tô', icon: '🚗',
    parts: [
      part('than', RED, box([0, -0.45, 0], [0.75, 0.3, 1.5])),
      part('noc', RED, box([0, 0.15, -0.15], [0.65, 0.32, 0.8])),
      part('kinh', SKY, box([0, 0.15, 0.66], [0.55, 0.24, 0.02]), box([0, 0.15, -0.96], [0.55, 0.24, 0.02]), mir(box([0.66, 0.15, -0.15], [0.02, 0.24, 0.68]))),
      part('banh', BLK, mir(cyl([0.78, -0.75, 0.9], [0.33, 0.13, 0.33], [0, 0, Math.PI / 2])), mir(cyl([0.78, -0.75, -0.9], [0.33, 0.13, 0.33], [0, 0, Math.PI / 2]))),
      part('mam', LGR, mir(cyl([0.91, -0.75, 0.9], [0.17, 0.02, 0.17], [0, 0, Math.PI / 2])), mir(cyl([0.91, -0.75, -0.9], [0.17, 0.02, 0.17], [0, 0, Math.PI / 2]))),
      part('den', YEL, mir(sph([0.5, -0.38, 1.5], [0.15, 0.13, 0.07]))),
      part('denhau', ORA, mir(box([0.5, -0.38, -1.5], [0.15, 0.08, 0.03]))),
      part('can', LGR, box([0, -0.68, 1.52], [0.74, 0.07, 0.07]), box([0, -0.68, -1.52], [0.74, 0.07, 0.07])),
    ],
    fixed: [fix(INK, box([0, -0.4, 1.51], [0.22, 0.07, 0.02])), fix(INK, mir(box([0.77, -0.3, -0.05], [0.015, 0.02, 0.08])))],
  },
  {
    id: 'buom', name: 'Bướm', icon: '🦋',
    parts: [
      part('canhtren', PNK, mir(sph([0.74, 0.42, -0.05], [0.62, 0.5, 0.05], [0, -0.25, -0.5]))),
      part('canhduoi', VIO, mir(sph([0.56, -0.44, -0.05], [0.42, 0.44, 0.05], [0, -0.25, 0.4]))),
      part('dom', YEL, mir(sph([0.84, 0.48, -0.02], [0.22, 0.2, 0.075], [0, -0.25, -0.5]))),
      part('dom2', SKY, mir(sph([0.6, -0.48, -0.04], [0.17, 0.17, 0.075], [0, -0.25, 0.4]))),
      part('than', BRN, sph([0, -0.1, 0], [0.13, 0.6, 0.13])),
      part('dau', BRN, sph([0, 0.62, 0], 0.2)),
      part('rau', YEL, mir(sph([0.235, 1.17, 0], 0.055))),
    ],
    fixed: [fix(INK, mir(cyl([0.14, 0.97, 0], [0.015, 0.22, 0.015], [0, 0, -0.4]))), ...eyes(0.08, 0.66, 0.17, 0.04)],
  },
]

export const partIds = (s: Statue): string[] => s.parts.map((p) => p.id)
export const sampleColors3d = (s: Statue): Record<string, string> => Object.fromEntries(s.parts.map((p) => [p.id, p.color]))
