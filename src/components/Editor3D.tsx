import { useEffect, useMemo, useRef, useState } from 'react'
import { pop } from '../lib/sound'
import { STATUES, partIds, sampleColors3d } from '../three/statues'
import { StatueView } from '../three/view'
import { type Brush, EditorShell } from './EditorShell'
import { IconButton } from './ui'
import { usePainting } from './usePainting'

const SIZES = [7, 13, 22]

export default function Editor3D({ id, onBack }: { id: string; onBack: () => void }) {
  const def = STATUES.find((s) => s.id === id) ?? STATUES[0]
  const required = useMemo(() => partIds(def), [def])
  const sample = useMemo(() => sampleColors3d(def), [def])
  const { ops, fills, party, add, undo } = usePainting('3d', def.id, required)
  const [brush, setBrush] = useState<Brush>({ tool: 'fill', color: '#ef4444', size: 1 })
  const [spin, setSpin] = useState(false)
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<StatueView | null>(null)
  const latest = useRef({ brush, fills, add })
  useEffect(() => {
    latest.current = { brush, fills, add }
  })

  useEffect(() => {
    if (!host.current) return
    const v = new StatueView(host.current, def, {
      onTap: (part) => {
        const { brush, fills, add } = latest.current
        const color = brush.tool === 'eraser' ? null : brush.color
        if ((fills[part] ?? null) === color && brush.tool !== 'eraser') return
        add({ t: 'fill', id: part, color })
        pop()
      },
      onStroke: (pieces) => {
        const { brush, add } = latest.current
        const g = Date.now()
        add(...pieces.map((p) => ({ t: 'stroke' as const, color: brush.tool === 'eraser' ? null : brush.color, size: SIZES[brush.size], pts: p.pts, target: p.target, g })))
      },
    })
    view.current = v
    return () => {
      v.dispose()
      view.current = null
    }
  }, [def])

  useEffect(() => view.current?.replay(ops), [ops, def])
  useEffect(() => {
    const v = view.current
    if (!v) return
    v.tool = brush.tool
    v.color = brush.color
    v.size = SIZES[brush.size]
    v.autoRotate = spin
  }, [brush, spin, def])

  return (
    <EditorShell
      kind="3d"
      name={def.name}
      onBack={onBack}
      brush={brush}
      setBrush={setBrush}
      ops={ops}
      add={add}
      undo={undo}
      sample={sample}
      party={party}
      makeImage={async () => view.current?.snapshot() ?? ''}
      extra={<IconButton icon="🔄" label="Tự xoay" active={spin} onClick={() => setSpin((s) => !s)} />}
    >
      <div ref={host} data-testid="stage" className="h-full w-full overflow-hidden rounded-3xl border-4 border-white bg-sky-100 shadow-lg" />
    </EditorShell>
  )
}
