import { describe, expect, it } from 'vitest'
import { CATEGORIES, PICTURES, ZODIAC } from '../data/pictures'
import { BG, allIds, regionIds, sampleColors, svgMarkup } from '../data/shapes'
import { STATUES, partIds, sampleColors3d } from '../three/statues'
import { type Op, MAX_OPS, addPoint, compact, fillsOf, filledCount, isComplete, push, strokesOf, undo } from './paint'
import { PALETTE } from './palette'

const stroke = (extra: Partial<Op> = {}): Op => ({ t: 'stroke', color: '#ef4444', size: 10, pts: [1, 2, 3, 4], ...extra }) as Op

describe('fill logic', () => {
  it('fills a region with the selected color and overwrites it', () => {
    let ops = push([], { t: 'fill', id: 'dau', color: '#ef4444' })
    ops = push(ops, { t: 'fill', id: 'than', color: '#22c55e' })
    ops = push(ops, { t: 'fill', id: 'dau', color: '#3b82f6' })
    expect(fillsOf(ops)).toEqual({ dau: '#3b82f6', than: '#22c55e' })
  })
  it('erases a region when filled with null', () => {
    const ops = [{ t: 'fill', id: 'dau', color: '#ef4444' }, { t: 'fill', id: 'dau', color: null }] as Op[]
    expect(fillsOf(ops)).toEqual({})
  })
  it('does not mutate the previous operation list', () => {
    const a: Op[] = []
    const b = push(a, { t: 'fill', id: 'x', color: '#fff' })
    expect(a).toHaveLength(0)
    expect(b).toHaveLength(1)
  })
  it('clear-all wipes fills and strokes, and can be undone', () => {
    let ops: Op[] = [{ t: 'fill', id: 'dau', color: '#ef4444' }, stroke()]
    ops = push(ops, { t: 'clear' })
    expect(fillsOf(ops)).toEqual({})
    expect(strokesOf(ops)).toEqual([])
    ops = undo(ops)
    expect(fillsOf(ops)).toEqual({ dau: '#ef4444' })
    expect(strokesOf(ops)).toHaveLength(1)
  })
  it('auto-fill replaces everything in one undoable step', () => {
    let ops: Op[] = [{ t: 'fill', id: 'dau', color: '#000000' }, stroke()]
    ops = push(ops, { t: 'fillAll', colors: { dau: '#ef4444', than: '#22c55e' } })
    expect(fillsOf(ops)).toEqual({ dau: '#ef4444', than: '#22c55e' })
    expect(strokesOf(ops)).toEqual([])
    expect(fillsOf(undo(ops))).toEqual({ dau: '#000000' })
  })
  it('keeps painting after auto-fill', () => {
    const ops: Op[] = [{ t: 'fillAll', colors: { dau: '#ef4444' } }, { t: 'fill', id: 'dau', color: '#3b82f6' }, stroke()]
    expect(fillsOf(ops)).toEqual({ dau: '#3b82f6' })
    expect(strokesOf(ops)).toHaveLength(1)
  })
})

describe('undo', () => {
  it('removes one operation at a time', () => {
    const ops: Op[] = [{ t: 'fill', id: 'a', color: '#111111' }, { t: 'fill', id: 'b', color: '#222222' }]
    expect(fillsOf(undo(ops))).toEqual({ a: '#111111' })
    expect(undo(undo(ops))).toEqual([])
    expect(undo([])).toEqual([])
  })
  it('removes a whole group (a 3D stroke crossing several parts)', () => {
    const ops: Op[] = [{ t: 'fill', id: 'a', color: '#111111' }, stroke({ g: 7, target: 0 }), stroke({ g: 7, target: 1 }), stroke({ g: 7, target: 2 })]
    expect(undo(ops)).toHaveLength(1)
  })
  it('does not merge different groups', () => {
    const ops: Op[] = [stroke({ g: 1 }), stroke({ g: 2 })]
    expect(undo(ops)).toHaveLength(1)
  })
})

describe('completion and compaction', () => {
  it('counts filled regions and detects completion', () => {
    const ids = ['a', 'b', 'c']
    expect(filledCount({ a: '#fff' }, ids)).toBe(1)
    expect(isComplete({ a: '#fff', b: '#fff' }, ids)).toBe(false)
    expect(isComplete({ a: '#fff', b: '#fff', c: '#000', extra: '#000' }, ids)).toBe(true)
    expect(isComplete({}, [])).toBe(false)
  })
  it('compact keeps the visible result and drops history', () => {
    const ops: Op[] = [
      stroke(), { t: 'fill', id: 'a', color: '#111111' }, { t: 'clear' }, { t: 'fill', id: 'a', color: '#222222' },
      stroke({ color: null }), { t: 'fill', id: 'b', color: '#333333' }, { t: 'fill', id: 'b', color: null },
    ]
    const c = compact(ops)
    expect(fillsOf(c)).toEqual(fillsOf(ops))
    expect(strokesOf(c)).toEqual(strokesOf(ops))
    expect(c.length).toBeLessThan(ops.length)
    expect(compact([])).toEqual([])
  })
  it('caps the history length without changing the picture', () => {
    let ops: Op[] = []
    for (let i = 0; i < MAX_OPS + 50; i++) ops = push(ops, { t: 'fill', id: `r${i % 7}`, color: PALETTE[i % PALETTE.length] })
    expect(ops.length).toBeLessThanOrEqual(MAX_OPS)
    const all: Op[] = Array.from({ length: MAX_OPS + 50 }, (_, i) => ({ t: 'fill', id: `r${i % 7}`, color: PALETTE[i % PALETTE.length] }))
    expect(fillsOf(ops)).toEqual(fillsOf(all))
  })
  it('addPoint skips points that are too close', () => {
    const pts: number[] = []
    expect(addPoint(pts, 10, 10)).toBe(true)
    expect(addPoint(pts, 10.5, 10.5)).toBe(false)
    expect(addPoint(pts, 14, 10)).toBe(true)
    expect(pts).toEqual([10, 10, 14, 10])
  })
})

describe('pictures', () => {
  it('has at least 24 pictures with unique ids in known categories', () => {
    expect(PICTURES.length).toBeGreaterThanOrEqual(24)
    expect(new Set(PICTURES.map((p) => p.id)).size).toBe(PICTURES.length)
    const cats = CATEGORIES.map((c) => c.id)
    expect(cats).toHaveLength(5)
    for (const c of cats) expect(PICTURES.filter((p) => p.cat === c).length).toBeGreaterThanOrEqual(4)
  })
  it('contains all 12 zodiac animals', () => {
    expect(ZODIAC).toHaveLength(12)
    for (const id of ZODIAC) expect(PICTURES.find((p) => p.id === id)?.cat).toBe('animals')
  })
  it.each(PICTURES.map((p) => [p.id, p] as const))('%s is colorable and its sample fill completes it', (_id, p) => {
    const ids = regionIds(p.items)
    expect(ids.length).toBeGreaterThanOrEqual(2)
    expect(allIds(p.items)).toContain(BG)
    const sample = sampleColors(p.items)
    expect(isComplete(sample, ids)).toBe(true)
    for (const id of ids) expect(PALETTE).toContain(sample[id])
    const svg = svgMarkup(p.items, { [ids[0]]: '#123456' })
    expect(svg).toContain(`data-id="${ids[0]}"`)
    expect(svg).toContain('#123456')
    expect(svg).not.toMatch(/NaN|undefined/)
  })
})

describe('statues', () => {
  it('has the 8 launch statues built only from primitives', () => {
    expect(STATUES.map((s) => s.id)).toEqual(['gautruc', 'meo', 'cho', 'tho', 'voi', 'khunglong', 'oto', 'buom'])
    for (const s of STATUES) {
      const ids = partIds(s)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids.length).toBeGreaterThanOrEqual(6)
      expect(isComplete(sampleColors3d(s), ids)).toBe(true)
      for (const m of [...s.parts, ...s.fixed].flatMap((p) => p.m)) {
        expect(['sph', 'box', 'cyl', 'cone', 'tor']).toContain(m.g)
        expect([...m.p, ...m.s].every(Number.isFinite)).toBe(true)
        expect(m.s.every((x) => x > 0)).toBe(true)
      }
    }
  })
})
