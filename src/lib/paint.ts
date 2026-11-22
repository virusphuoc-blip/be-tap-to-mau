/**
 * Paint logic shared by 2D pictures and 3D statues.
 * A drawing is an ordered list of operations; the visible state is derived by replaying it,
 * which makes undo a matter of dropping the last operation (or group of operations).
 */
export type FillOp = { t: 'fill'; id: string; color: string | null; g?: number }
export type FillAllOp = { t: 'fillAll'; colors: Record<string, string>; g?: number }
export type StrokeOp = {
  t: 'stroke'
  /** null = eraser */
  color: string | null
  size: number
  /** flat list x0,y0,x1,y1,... */
  pts: number[]
  /** 3D only: index of the mesh the stroke is painted on */
  target?: number
  g?: number
}
export type ClearOp = { t: 'clear'; g?: number }
export type Op = FillOp | FillAllOp | StrokeOp | ClearOp

export const MAX_OPS = 400

export function push(ops: readonly Op[], op: Op): Op[] {
  const next = [...ops, op]
  if (next.length <= MAX_OPS) return next
  // fold the oldest half of the history so the list cannot grow without bound
  const keep = MAX_OPS / 2
  return compact(next.slice(0, next.length - keep)).concat(next.slice(next.length - keep))
}

/** Removes the last operation; operations sharing a group id are removed together. */
export function undo(ops: readonly Op[]): Op[] {
  if (ops.length === 0) return []
  const g = ops[ops.length - 1].g
  let n = ops.length - 1
  if (g != null) while (n > 0 && ops[n - 1].g === g) n--
  return ops.slice(0, n)
}

/** Region id -> color after replaying all operations. */
export function fillsOf(ops: readonly Op[]): Record<string, string> {
  let fills: Record<string, string> = {}
  for (const op of ops) {
    if (op.t === 'clear') fills = {}
    else if (op.t === 'fillAll') fills = { ...op.colors }
    else if (op.t === 'fill') {
      if (op.color == null) delete fills[op.id]
      else fills[op.id] = op.color
    }
  }
  return fills
}

/** Index of the first operation that is still visible (after the last clear / fill-all). */
function resetIndex(ops: readonly Op[]): number {
  for (let i = ops.length - 1; i >= 0; i--) if (ops[i].t === 'clear' || ops[i].t === 'fillAll') return i
  return 0
}

/** Brush strokes that are still visible (those after the last clear / fill-all). */
export function strokesOf(ops: readonly Op[]): StrokeOp[] {
  return ops.slice(resetIndex(ops)).filter((o): o is StrokeOp => o.t === 'stroke')
}

/** Shorter list of operations that draws the same result (drops undo history). */
export function compact(ops: readonly Op[]): Op[] {
  const start = resetIndex(ops)
  let firstStroke = ops.findIndex((o, i) => i > start && o.t === 'stroke')
  if (firstStroke < 0) firstStroke = ops.length
  // fills before the first visible stroke fold into one step; later ones keep their order
  const base = fillsOf(ops.slice(0, firstStroke))
  const out: Op[] = Object.keys(base).length ? [{ t: 'fillAll', colors: base }] : []
  for (const op of ops.slice(firstStroke)) if (op.t === 'fill' || op.t === 'stroke') out.push(op)
  return out
}

export function filledCount(fills: Record<string, string>, ids: readonly string[]): number {
  return ids.filter((id) => fills[id] != null).length
}

export function isComplete(fills: Record<string, string>, ids: readonly string[]): boolean {
  return ids.length > 0 && filledCount(fills, ids) === ids.length
}

/** Appends a point unless it is closer than minDist to the previous one. Returns true if added. */
export function addPoint(pts: number[], x: number, y: number, minDist = 1.5): boolean {
  const n = pts.length
  if (n >= 2 && Math.hypot(pts[n - 2] - x, pts[n - 1] - y) < minDist) return false
  pts.push(Math.round(x * 100) / 100, Math.round(y * 100) / 100)
  return true
}

/** Draws strokes on a 2D canvas whose pixel size is `scale` times the stroke coordinate space. */
export function drawStrokes(ctx: CanvasRenderingContext2D, strokes: readonly StrokeOp[], scale: number): void {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of strokes) {
    if (s.pts.length < 2) continue
    ctx.globalCompositeOperation = s.color == null ? 'destination-out' : 'source-over'
    ctx.strokeStyle = s.color ?? '#000'
    ctx.lineWidth = s.size * scale
    ctx.beginPath()
    ctx.moveTo(s.pts[0] * scale, s.pts[1] * scale)
    if (s.pts.length === 2) ctx.lineTo(s.pts[0] * scale + 0.01, s.pts[1] * scale)
    for (let i = 2; i < s.pts.length; i += 2) ctx.lineTo(s.pts[i] * scale, s.pts[i + 1] * scale)
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}
