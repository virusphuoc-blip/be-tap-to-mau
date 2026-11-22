import { useEffect, useRef, useState } from 'react'
import { Confetti, Copyright, Header, IconButton } from '../components/ui'
import { cheer, pop } from '../lib/sound'
import { loadState, saveState } from '../lib/storage'
import { count } from '../online/stats'
import { clock } from './types'
import { RubikView, type Turn, randomTurns } from './rubikView'

type Saved = { turns: Turn[]; moves: number; ms: number; scrambled: boolean; best?: number }
const KEY = 'game:rubik'
const fresh: Saved = { turns: [], moves: 0, ms: 0, scrambled: false }

export default function Rubik({ onBack }: { onBack: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<RubikView | null>(null)
  const [game, setGame] = useState<Saved>(() => ({ ...fresh, ...loadState<Partial<Saved>>(KEY, {}) }))
  const [running, setRunning] = useState(false)
  const [solved, setSolved] = useState(true)
  const [shot, setShot] = useState(0)
  const state = useRef(game)
  const update = (next: Saved) => {
    state.current = next
    setGame(next)
    saveState(KEY, next)
  }
  const live = useRef({ update, running })
  useEffect(() => {
    live.current = { update, running }
  })

  useEffect(() => {
    const v = new RubikView(host.current!)
    view.current = v
    v.apply(state.current.turns)
    setSolved(v.solved)
    v.onTurn = (turn) => {
      pop()
      const g = state.current
      const done = v.solved
      setSolved(done)
      setRunning(!done)
      const won = done && g.scrambled
      const best = won ? Math.min(g.best ?? Infinity, g.ms) : g.best
      // a solved cube needs no history: saving it empty keeps the stored game small
      live.current.update({ ...g, turns: done ? [] : [...g.turns, turn], moves: g.moves + 1, scrambled: done ? false : g.scrambled, best })
      if (won) {
        count('rubik_solve')
        cheer()
        setShot((n) => n + 1)
      }
    }
    return () => v.dispose()
  }, [])

  useEffect(() => {
    if (!running) return
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      live.current.update({ ...state.current, ms: state.current.ms + (now - last) })
      last = now
    }, 250)
    return () => clearInterval(id)
  }, [running])

  const restart = (turns: Turn[]) => {
    const v = view.current
    if (!v) return
    v.reset()
    v.apply(turns)
    setRunning(false)
    setSolved(v.solved)
    update({ turns, moves: 0, ms: 0, scrambled: turns.length > 0, best: state.current.best })
  }

  return (
    <div className="sky flex h-dvh flex-col" data-game="rubik" data-moves={game.moves} data-solved={solved}>
      <Header title="Rubik 3D" onBack={onBack} />
      <div className="mx-2 mt-2 grid grid-cols-3 gap-2 text-center font-black">
        <div className="rounded-2xl bg-white/90 py-1 shadow-sm">
          <div className="text-xs text-slate-500">Số lần xoay</div>
          <div className="text-2xl" data-count>{game.moves}</div>
        </div>
        <div className="rounded-2xl bg-white/90 py-1 shadow-sm">
          <div className="text-xs text-slate-500">Thời gian</div>
          <div className="text-2xl tabular-nums" data-time>{clock(game.ms)}</div>
        </div>
        <div className="rounded-2xl bg-white/90 py-1 shadow-sm">
          <div className="text-xs text-slate-500">Kỷ lục</div>
          <div className="text-2xl tabular-nums">{game.best === undefined ? '--:--' : clock(game.best)}</div>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 p-2">
        <div ref={host} className="h-full w-full overflow-hidden rounded-3xl border-4 border-white shadow-lg" />
        <p className="pointer-events-none absolute inset-x-4 bottom-3 text-center text-sm font-bold text-slate-600">
          {solved && game.moves > 0 && shot > 0 ? '🎉 Bé giỏi quá! Xong rồi!' : 'Vuốt trên khối để xoay một tầng · vuốt bên ngoài để xoay cả khối'}
        </p>
      </div>
      <div className="flex gap-1.5 px-2">
        <IconButton icon="🔀" label="Xáo trộn" onClick={() => {
            count('rubik_scramble')
            restart(randomTurns(22))
          }} />
        <IconButton icon="🔄" label="Làm lại" onClick={() => restart([])} />
      </div>
      <Copyright />
      <Confetti shot={shot} />
    </div>
  )
}
