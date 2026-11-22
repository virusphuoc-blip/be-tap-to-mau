import { useEffect, useMemo, useRef, useState } from 'react'
import { PICTURES } from '../data/pictures'
import { allIds, regionIds, sampleColors, svgMarkup } from '../data/shapes'
import { renderPicture } from '../lib/exportImage'
import { type StrokeOp, addPoint, drawStrokes, strokesOf } from '../lib/paint'
import { pop } from '../lib/sound'
import { type Brush, EditorShell } from './EditorShell'
import { usePainting } from './usePainting'

const SIZES = [9, 20, 38]
const RES = 800

export default function Editor2D({ id, onBack }: { id: string; onBack: () => void }) {
  const pic = PICTURES.find((p) => p.id === id) ?? PICTURES[0]
  const required = useMemo(() => regionIds(pic.items), [pic])
  const sample = useMemo(() => sampleColors(pic.items), [pic])
  const { ops, fills, party, add, undo } = usePainting('2d', pic.id, required)
  const [brush, setBrush] = useState<Brush>({ tool: 'fill', color: '#ef4444', size: 1 })
  const strokes = useMemo(() => strokesOf(ops), [ops])
  const markup = useMemo(() => svgMarkup(pic.items, fills), [pic, fills])
  const canvas = useRef<HTMLCanvasElement>(null)
  const live = useRef<{ stroke: StrokeOp; region: string | null; pointer: number } | null>(null)

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, RES, RES)
    drawStrokes(ctx, strokes, RES / 400)
  }, [strokes])

  const point = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * 400, ((e.clientY - r.top) / r.height) * 400]
  }
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (live.current) return
    const region = (e.target as Element).closest?.('[data-id]')?.getAttribute('data-id') ?? null
    if (brush.tool === 'fill') {
      if (region && allIds(pic.items).includes(region) && fills[region] !== brush.color) {
        add({ t: 'fill', id: region, color: brush.color })
        pop()
      }
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    const [x, y] = point(e)
    const stroke: StrokeOp = { t: 'stroke', color: brush.tool === 'eraser' ? null : brush.color, size: SIZES[brush.size], pts: [x, y] }
    live.current = { stroke, region, pointer: e.pointerId }
    const ctx = canvas.current?.getContext('2d')
    if (ctx) drawStrokes(ctx, [stroke], RES / 400)
  }
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const cur = live.current
    if (!cur || cur.pointer !== e.pointerId) return
    const [x, y] = point(e)
    const pts = cur.stroke.pts
    const n = pts.length
    if (!addPoint(pts, x, y)) return
    const ctx = canvas.current?.getContext('2d')
    if (ctx) drawStrokes(ctx, [{ ...cur.stroke, pts: pts.slice(n - 2) }], RES / 400)
  }
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const cur = live.current
    if (!cur || cur.pointer !== e.pointerId) return
    live.current = null
    // an eraser tap also wipes the fill of the tapped region
    if (cur.stroke.color == null && cur.stroke.pts.length <= 4 && cur.region && fills[cur.region]) {
      const g = Date.now()
      add({ ...cur.stroke, g }, { t: 'fill', id: cur.region, color: null, g })
    } else add(cur.stroke)
  }

  return (
    <EditorShell kind="2d" name={pic.name} onBack={onBack} brush={brush} setBrush={setBrush} ops={ops} add={add} undo={undo} sample={sample} party={party} makeImage={() => renderPicture(pic.items, fills, strokes)}>
      <div className="square flex h-full w-full items-center justify-center">
        <div
          data-testid="board"
          className="relative touch-none overflow-hidden rounded-3xl border-4 border-white bg-white shadow-lg"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <div className="pic h-full w-full" dangerouslySetInnerHTML={{ __html: markup }} />
          <canvas ref={canvas} width={RES} height={RES} className="pointer-events-none absolute inset-0 h-full w-full mix-blend-multiply" />
        </div>
      </div>
    </EditorShell>
  )
}
