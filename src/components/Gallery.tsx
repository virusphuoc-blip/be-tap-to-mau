import { useState } from 'react'
import { canShareFiles, downloadBlob, fileName, shareBlob, toPngBlob } from '../lib/exportImage'
import { type Work, loadGallery, removeWork } from '../lib/storage'
import { Copyright, Header, IconButton } from './ui'

export default function Gallery({ onBack }: { onBack: () => void }) {
  const [works, setWorks] = useState<Work[]>(loadGallery)
  const [open, setOpen] = useState<Work | null>(null)
  const [sure, setSure] = useState(false)
  const share = canShareFiles()

  if (open)
    return (
      <div className="sky flex min-h-dvh flex-col">
        <Header title={open.name} onBack={() => setOpen(null)} />
        <div className="p-3">
          <img src={open.img} alt={open.name} className="w-full rounded-3xl border-4 border-white bg-white shadow-lg" />
        </div>
        <div className="flex gap-2 px-3">
          <IconButton icon="⬇️" label="Tải ảnh" onClick={async () => downloadBlob(await toPngBlob(open.img), fileName(open.name))} />
          {share && <IconButton icon="📤" label="Chia sẻ" onClick={async () => shareBlob(await toPngBlob(open.img), fileName(open.name), `Bé Tập Tô Màu – ${open.name}`)} />}
          <IconButton
            icon="🗑️"
            label={sure ? 'Xoá thật nhé?' : 'Xoá'}
            className={sure ? '!border-red-700 !bg-red-400' : ''}
            onClick={() => {
              if (!sure) return setSure(true)
              setWorks(removeWork(open.id))
              setSure(false)
              setOpen(null)
            }}
          />
        </div>
        <div className="flex-1" />
        <Copyright />
      </div>
    )

  return (
    <div className="sky flex min-h-dvh flex-col">
      <Header title="Tranh của bé" onBack={onBack} />
      {works.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-10 text-center">
          <span className="text-8xl">🖼️</span>
          <p className="text-xl font-black text-slate-600">Chưa có tranh nào.</p>
          <p className="text-lg font-bold text-slate-500">Tô xong bé bấm 💾 Lưu nhé!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-3">
          {works.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => {
                setSure(false)
                setOpen(w)
              }}
              className="rounded-3xl border-b-4 border-slate-200 bg-white p-2 shadow-md"
            >
              <img src={w.img} alt={w.name} className="aspect-square w-full rounded-2xl object-cover" />
              <span className="block pt-1 text-lg font-black">
                {w.kind === '3d' ? '🗿 ' : '🎨 '}
                {w.name}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="flex-1" />
      <Copyright />
    </div>
  )
}
