import { type ReactNode, useState } from 'react'
import { canShareFiles, downloadBlob, fileName, shareBlob, toPngBlob, toThumb } from '../lib/exportImage'
import type { Op } from '../lib/paint'
import { type Kind, addWork } from '../lib/storage'
import { Confetti, Copyright, Header, IconButton, Palette } from './ui'

export type Tool = 'fill' | 'brush' | 'eraser'
export type Brush = { tool: Tool; color: string; size: 0 | 1 | 2 }

type Props = {
  kind: Kind
  name: string
  onBack: () => void
  brush: Brush
  setBrush: (b: Brush) => void
  ops: readonly Op[]
  add: (...ops: Op[]) => void
  undo: () => void
  sample: Record<string, string>
  party: number
  /** Full-size image of the current work: a canvas or a PNG data URL. */
  makeImage: () => Promise<HTMLCanvasElement | string>
  extra?: ReactNode
  children: ReactNode
}

/** Shared editor layout: action bar on top, drawing area, tools and the color palette at the bottom. */
export function EditorShell(p: Props) {
  const [savedOps, setSavedOps] = useState<readonly Op[] | null>(null)
  const [closedParty, setClosedParty] = useState(0)
  const share = canShareFiles()
  const { tool, color, size } = p.brush
  // "saved" disappears with the next paint action, "done" stays until it is closed
  const note = savedOps === p.ops ? 'saved' : p.party !== closedParty ? 'done' : ''
  const close = () => {
    setSavedOps(null)
    setClosedParty(p.party)
  }

  const save = async () => {
    addWork({ name: p.name, kind: p.kind, img: await toThumb(await p.makeImage()) })
    setSavedOps(p.ops)
    setClosedParty(p.party)
  }
  const download = async () => downloadBlob(await toPngBlob(await p.makeImage()), fileName(p.name))
  const send = async () => shareBlob(await toPngBlob(await p.makeImage()), fileName(p.name), `Bé Tập Tô Màu – ${p.name}`)

  return (
    <div className="sky flex h-dvh flex-col">
      <Header title={p.name} onBack={p.onBack} />
      <div className="flex gap-1.5 px-2 pt-2">
        <IconButton icon="↩️" label="Hoàn tác" onClick={p.undo} disabled={p.ops.length === 0} />
        <IconButton icon="🧽" label="Xoá hết" onClick={() => p.add({ t: 'clear' })} disabled={p.ops.length === 0} />
        <IconButton icon="✨" label="Tô mẫu" onClick={() => p.add({ t: 'fillAll', colors: p.sample })} />
        <IconButton icon="💾" label="Lưu" onClick={save} className="!border-emerald-600 !bg-emerald-400" />
      </div>

      <div className="relative min-h-0 flex-1 p-2">
        {p.children}
        {note && (
          <div className="pop-in absolute inset-x-3 top-3 z-10 flex items-center gap-2 rounded-3xl bg-white/95 p-2 shadow-lg" role="status">
            <span className="flex-1 pl-2 text-lg leading-tight font-black text-emerald-700">{note === 'done' ? '🎉 Giỏi quá!' : '✅ Đã lưu!'}</span>
            {note === 'done' && <IconButton icon="💾" label="Lưu" onClick={save} className="!flex-none !border-emerald-600 !bg-emerald-400" />}
            <IconButton icon="⬇️" label="Tải ảnh" onClick={download} className="!flex-none" />
            {share && <IconButton icon="📤" label="Chia sẻ" onClick={send} className="!flex-none" />}
            <button type="button" aria-label="Đóng" onClick={close} className="h-14 w-10 rounded-2xl text-2xl font-black text-slate-400">
              ✕
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1.5 px-2 pb-2">
        <IconButton icon="🪣" label="Đổ màu" active={tool === 'fill'} onClick={() => p.setBrush({ ...p.brush, tool: 'fill' })} />
        <IconButton icon="🖌️" label="Cọ vẽ" active={tool === 'brush'} onClick={() => p.setBrush({ ...p.brush, tool: 'brush' })} />
        <IconButton icon="🧼" label="Tẩy" active={tool === 'eraser'} onClick={() => p.setBrush({ ...p.brush, tool: 'eraser' })} />
        {p.extra}
        <div className="flex flex-[2] items-center justify-around rounded-2xl border-b-4 border-slate-200 bg-white px-1 shadow-sm" role="radiogroup" aria-label="Cỡ cọ">
          {([0, 1, 2] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={size === s}
              aria-label={['Cọ nhỏ', 'Cọ vừa', 'Cọ to'][s]}
              onClick={() => p.setBrush({ ...p.brush, size: s, tool: tool === 'fill' ? 'brush' : tool })}
              className={`flex h-11 w-11 items-center justify-center rounded-full ${size === s && tool !== 'fill' ? 'bg-amber-300' : ''}`}
            >
              <span className="rounded-full border-2 border-slate-700" style={{ width: 12 + s * 10, height: 12 + s * 10, background: tool === 'eraser' ? '#fff' : color }} />
            </button>
          ))}
        </div>
      </div>
      <Palette color={color} onPick={(c) => p.setBrush({ ...p.brush, color: c, tool: tool === 'eraser' ? 'fill' : tool })} />
      <Copyright />
      <Confetti shot={p.party} />
    </div>
  )
}
