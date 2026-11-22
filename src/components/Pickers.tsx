import { useEffect, useMemo, useState } from 'react'
import { CATEGORIES, PICTURES } from '../data/pictures'
import { type Category, svgMarkup } from '../data/shapes'
import { fillsOf } from '../lib/paint'
import { loadOps } from '../lib/storage'
import { STATUES } from '../three/statues'
import { Copyright, Header } from './ui'

const tile = 'flex flex-col items-center rounded-3xl border-b-4 border-slate-200 bg-white p-2 shadow-md'

export function PicturePicker({ go, onBack }: { go: (path: string) => void; onBack: () => void }) {
  const [cat, setCat] = useState<Category>(() => (sessionStorage.getItem('bttm:cat') as Category) || 'animals')
  const list = useMemo(() => PICTURES.filter((p) => p.cat === cat), [cat])
  return (
    <div className="sky flex min-h-dvh flex-col">
      <div className="sticky top-0 z-10 bg-[#bfe9ff]/95 pb-2">
        <Header title="Chọn tranh" onBack={onBack} />
        <div className="flex gap-1.5 px-2 pt-2" role="tablist">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === cat}
              onClick={() => {
                sessionStorage.setItem('bttm:cat', c.id)
                setCat(c.id)
              }}
              className={`flex h-16 flex-1 flex-col items-center justify-center rounded-2xl border-b-4 shadow-sm ${c.id === cat ? 'border-amber-600 bg-amber-300' : 'border-slate-200 bg-white'}`}
            >
              <span className="text-3xl leading-none">{c.icon}</span>
              <span className="mt-0.5 text-[11px] leading-none font-bold">{c.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-3">
        {list.map((p) => (
          <button key={p.id} type="button" data-pic={p.id} onClick={() => go(`/tranh/${p.id}`)} className={tile}>
            <span className="pic block aspect-square w-full overflow-hidden rounded-2xl" dangerouslySetInnerHTML={{ __html: svgMarkup(p.items, fillsOf(loadOps('2d', p.id))) }} />
            <span className="pt-1 text-xl font-black">{p.name}</span>
          </button>
        ))}
      </div>
      <div className="flex-1" />
      <Copyright />
    </div>
  )
}

export function StatuePicker({ go, onBack }: { go: (path: string) => void; onBack: () => void }) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  useEffect(() => {
    let alive = true
    void import('../three/view').then((m) => alive && setThumbs(m.statueThumbs()))
    return () => {
      alive = false
    }
  }, [])
  return (
    <div className="sky flex min-h-dvh flex-col">
      <Header title="Chọn tượng 3D" onBack={onBack} />
      <div className="grid grid-cols-2 gap-3 p-3">
        {STATUES.map((s) => (
          <button key={s.id} type="button" data-statue={s.id} onClick={() => go(`/tuong/${s.id}`)} className={tile}>
            <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-sky-100 text-7xl">
              {thumbs[s.id] ? <img src={thumbs[s.id]} alt="" className="h-full w-full object-cover" /> : s.icon}
            </span>
            <span className="pt-1 text-xl font-black">{s.name}</span>
          </button>
        ))}
      </div>
      <div className="flex-1" />
      <Copyright />
    </div>
  )
}
