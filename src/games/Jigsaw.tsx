import { useEffect, useMemo, useRef, useState } from 'react'
import { Confetti, Copyright, Header, IconButton } from '../components/ui'
import { PICTURES } from '../data/pictures'
import { sampleColors, svgMarkup } from '../data/shapes'
import { cheer, pop } from '../lib/sound'
import { loadState, saveState } from '../lib/storage'
import { count } from '../online/stats'
import { clock, shuffle } from './types'

const SIZES = [2, 3, 4] as const
type Game = { pic: string; n: number; tray: number[]; placed: number[]; ms: number }
type Best = Record<string, number>
const KEY = 'game:xephinh'
const BEST = 'game:xephinh:best'

const image = (id: string) => {
  const p = PICTURES.find((x) => x.id === id) ?? PICTURES[0]
  return `url("data:image/svg+xml,${encodeURIComponent(svgMarkup(p.items, sampleColors(p.items)))}")`
}
const pieceStyle = (img: string, n: number, piece: number) => ({
  backgroundImage: img,
  backgroundSize: `${n * 100}% ${n * 100}%`,
  backgroundPosition: `${((piece % n) / (n - 1)) * 100}% ${(Math.floor(piece / n) / (n - 1)) * 100}%`,
})

export default function Jigsaw({ onBack }: { onBack: () => void }) {
  const [game, setGame] = useState<Game | null>(() => loadState<Game | null>(KEY, null))
  const [n, setN] = useState<number>(() => loadState<number>('game:xephinh:n', 2))
  const [best, setBest] = useState<Best>(() => loadState<Best>(BEST, {}))
  const save = (g: Game | null) => {
    setGame(g)
    saveState(KEY, g)
  }
  const start = (pic: string, size: number) => {
    count('puzzle_start')
    save({ pic, n: size, tray: shuffle(size * size), placed: [], ms: 0 })
  }

  if (game)
    return (
      <Play
        key={`${game.pic}${game.n}`}
        game={game}
        best={best[game.n]}
        save={save}
        onBack={() => save(null)}
        restart={() => start(game.pic, game.n)}
        onWin={(ms) => {
          if (best[game.n] !== undefined && best[game.n] <= ms) return
          const next = { ...best, [game.n]: ms }
          setBest(next)
          saveState(BEST, next)
        }}
      />
    )
  return (
    <div className="sky flex min-h-dvh flex-col">
      <div className="sticky top-0 z-10 bg-[#bfe9ff]/95 pb-2">
        <Header title="🧩 Xếp hình" onBack={onBack} />
        <div className="flex gap-1.5 px-2 pt-2" role="tablist" aria-label="Độ khó">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={s === n}
              data-size={s}
              onClick={() => {
                setN(s)
                saveState('game:xephinh:n', s)
              }}
              className={`flex h-16 flex-1 flex-col items-center justify-center rounded-2xl border-b-4 shadow-sm ${s === n ? 'border-amber-600 bg-amber-300' : 'border-slate-200 bg-white'}`}
            >
              <span className="text-2xl leading-none font-black">
                {s}×{s}
              </span>
              <span className="mt-1 text-[11px] leading-none font-bold">{best[s] === undefined ? `${s * s} mảnh` : `🏆 ${clock(best[s])}`}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid flex-1 grid-cols-3 content-start gap-2 p-3">
        {PICTURES.map((p) => (
          <button key={p.id} type="button" data-puzzle={p.id} onClick={() => start(p.id, n)} className="flex flex-col items-center rounded-2xl border-b-4 border-slate-200 bg-white p-1.5 shadow-md">
            <span className="block aspect-square w-full rounded-xl bg-cover" style={{ backgroundImage: image(p.id) }} />
            <span className="pt-0.5 text-sm font-black">{p.name}</span>
          </button>
        ))}
      </div>
      <Copyright />
    </div>
  )
}

function Play(p: { game: Game; best?: number; save: (g: Game) => void; onBack: () => void; restart: () => void; onWin: (ms: number) => void }) {
  const { game } = p
  const { n } = game
  const img = useMemo(() => image(game.pic), [game.pic])
  const [sel, setSel] = useState<number | null>(null)
  const [wrong, setWrong] = useState<number | null>(null)
  const [preview, setPreview] = useState(false)
  const [shot, setShot] = useState(0)
  const done = game.tray.length === 0
  const live = useRef(p)
  useEffect(() => {
    live.current = p
  })
  useEffect(() => {
    if (done) return
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      const g = live.current.game
      if (g.tray.length) live.current.save({ ...g, ms: g.ms + (now - last) })
      last = now
    }, 500)
    return () => clearInterval(id)
  }, [done])

  const drop = (slot: number) => {
    if (sel === null || game.placed.includes(slot)) return
    if (sel !== slot) {
      setWrong(slot)
      setTimeout(() => setWrong(null), 350)
      return
    }
    pop()
    const next = { ...game, tray: game.tray.filter((x) => x !== sel), placed: [...game.placed, sel] }
    p.save(next)
    setSel(null)
    if (next.tray.length === 0) {
      cheer()
      count('puzzle_done')
      setShot((x) => x + 1)
      p.onWin(next.ms)
    }
  }

  return (
    <div className="sky flex h-dvh flex-col" data-game="xephinh" data-placed={game.placed.length} data-done={done}>
      <Header title="Xếp hình" onBack={p.onBack}>
        <span className="rounded-2xl bg-white/90 px-3 py-1 text-xl font-black tabular-nums shadow-sm" data-time>
          ⏱ {clock(game.ms)}
        </span>
      </Header>
      <div className="square relative mx-auto flex min-h-0 w-full flex-1 items-center justify-center p-2">
        <div className="relative grid overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg" style={{ gridTemplateColumns: `repeat(${n}, 1fr)`, gridTemplateRows: `repeat(${n}, 1fr)` }}>
          <div className="pointer-events-none absolute inset-0 bg-cover transition-opacity" data-preview={preview} style={{ backgroundImage: img, opacity: preview ? 1 : 0.12 }} />
          {Array.from({ length: n * n }, (_, slot) => {
            const filled = game.placed.includes(slot)
            return (
              <button
                key={slot}
                type="button"
                data-slot={slot}
                data-filled={filled}
                aria-label={`Ô ${slot + 1}`}
                onClick={() => drop(slot)}
                className={`relative !transform-none border border-dashed border-slate-400/70 ${wrong === slot ? 'bg-rose-400/60' : ''} ${preview ? 'opacity-0' : ''}`}
                style={filled ? { ...pieceStyle(img, n, slot), borderColor: 'transparent' } : undefined}
              />
            )
          })}
        </div>
      </div>
      <div className="mx-2 min-h-24 rounded-3xl bg-white/80 p-2" data-tray>
        {done ? (
          <p className="py-4 text-center text-2xl font-black text-emerald-700">
            🎉 Bé giỏi quá! {clock(game.ms)}
            {p.best !== undefined && <span className="block text-base text-slate-600">🏆 Kỷ lục {n}×{n}: {clock(p.best)}</span>}
          </p>
        ) : (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${n === 2 ? 4 : n === 3 ? 5 : 8}, 1fr)` }}>
            {game.tray.map((piece) => (
              <button
                key={piece}
                type="button"
                data-piece={piece}
                aria-label={`Mảnh ${piece + 1}`}
                aria-pressed={piece === sel}
                onClick={() => setSel(piece === sel ? null : piece)}
                className={`aspect-square w-full rounded-lg border-2 bg-white shadow ${piece === sel ? 'z-10 scale-110 border-sky-500 ring-4 ring-sky-400' : 'border-slate-300'}`}
                style={pieceStyle(img, n, piece)}
              />
            ))}
          </div>
        )}
      </div>
      <p className="px-2 pt-1 text-center text-sm font-bold text-slate-600">{done ? ' ' : sel === null ? 'Chạm một mảnh, rồi chạm vào ô của nó' : 'Giờ chạm vào ô đúng trên bảng'}</p>
      <div className="flex gap-1.5 px-2">
        <IconButton icon="👁️" label="Xem mẫu" onClick={() => setPreview(!preview)} active={preview} />
        <IconButton icon="🔄" label="Chơi lại" onClick={p.restart} />
        <IconButton icon="🖼️" label="Tranh khác" onClick={p.onBack} />
      </div>
      <Copyright />
      <Confetti shot={shot} />
    </div>
  )
}
