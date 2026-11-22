import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Confetti, Copyright, Header, IconButton } from '../components/ui'
import { cheer, pop } from '../lib/sound'
import { loadState, saveState } from '../lib/storage'
import { NOT_CONFIGURED, onlineReady } from '../online/config'
import { count } from '../online/stats'
import type { Room, RoomState } from '../online/rooms'
import { type BasePos, LEVELS, type Level, type Side } from './types'

export type BoardProps<P> = { pos: P; flip: boolean; sel: number | null; targets: ReadonlySet<number>; onTap: (sq: number) => void }
export type Engine<P extends BasePos> = {
  id: 'cotuong' | 'covua'
  title: string
  icon: string
  sides: [string, string]
  checkText: string
  play(moves: readonly string[]): P
  think(moves: readonly string[], level: Level): string
  from(move: string): number
  to(move: string): number
  owner(pos: P, sq: number): Side | null
  pieceName(pos: P, sq: number): string
  Board(props: BoardProps<P>): ReactNode
  /** Extra choice for moves that share from/to squares (pawn promotion). */
  choice?: { title: string; label(move: string): string }
}

type Mode = { kind: 'cpu'; level: Level } | { kind: 'local' } | { kind: 'online' }
type Saved = { mode: Mode; moves: string[] }

const big = 'flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-b-4 px-3 text-xl font-black text-white shadow-md'
const card = 'rounded-3xl bg-white/85 p-3 shadow-md'

export default function BoardGame<P extends BasePos>({ engine, onBack }: { engine: Engine<P>; onBack: () => void }) {
  const key = `game:${engine.id}`
  const [mode, setMode] = useState<Mode | null>(null)
  const [moves, setMoves] = useState<string[]>([])
  const [room, setRoom] = useState<Room | null>(null)

  const start = (m: Mode, list: string[] = []) => {
    if (list.length === 0) count(`${engine.id}_${m.kind}`)
    setMoves(list)
    setMode(m)
  }
  const exit = () => {
    room?.leave()
    setRoom(null)
    setMode(null)
  }
  if (mode?.kind === 'online' && room) return <OnlineTable engine={engine} room={room} onExit={exit} />
  if (mode && mode.kind !== 'online')
    return (
      <LocalTable
        engine={engine}
        mode={mode}
        moves={moves}
        setMoves={(list) => {
          setMoves(list)
          saveState(key, { mode, moves: list } satisfies Saved)
        }}
        onExit={exit}
      />
    )
  const saved = loadState<Saved | null>(key, null)
  return (
    <ModeScreen
      engine={engine}
      saved={saved && saved.moves?.length > 0 ? saved : null}
      onBack={onBack}
      start={start}
      enter={(r) => {
        setRoom(r)
        setMode({ kind: 'online' })
      }}
    />
  )
}

// ---------- mode screen ----------
function ModeScreen<P extends BasePos>(p: { engine: Engine<P>; saved: Saved | null; onBack: () => void; start: (m: Mode, moves?: string[]) => void; enter: (r: Room) => void }) {
  const { engine } = p
  const [code, setCode] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [help, setHelp] = useState(false)
  const [seat, setSeat] = useState<{ code: string } | null>(null)
  useEffect(() => {
    if (onlineReady) void import('../online/rooms').then((m) => setSeat(m.lastSeat(engine.id)))
  }, [engine.id])

  const online = async (what: 'create' | 'join', joinCode = code) => {
    if (!onlineReady) {
      setNote(NOT_CONFIGURED)
      setHelp(true)
      return
    }
    setBusy(true)
    setNote('')
    try {
      const m = await import('../online/rooms')
      if (what === 'join' && !m.isCode(joinCode)) throw new Error('Mã phòng gồm 5 chữ số.')
      const wait = new Promise<never>((_, no) => setTimeout(() => no(new Error('Không kết nối được. Kiểm tra mạng rồi thử lại nhé!')), 12000))
      p.enter(await Promise.race([what === 'create' ? m.createRoom(engine.id) : m.joinRoom(engine.id, joinCode), wait]))
    } catch (e) {
      setNote(!(e instanceof Error) ? 'Không vào được phòng. Thử lại nhé!' : /permission/i.test(e.message) ? 'Chơi online chưa sẵn sàng: cơ sở dữ liệu chưa mở quyền cho phòng chơi.' : e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sky flex min-h-dvh flex-col">
      <Header title={`${engine.icon} ${engine.title}`} onBack={p.onBack} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 p-3">
        {p.saved && (
          <button type="button" data-continue className={`${big} border-emerald-700 bg-emerald-500`} onClick={() => p.start(p.saved!.mode, p.saved!.moves)}>
            ▶ Chơi tiếp ván trước
          </button>
        )}
        <section className={card}>
          <h2 className="mb-2 text-xl font-black text-slate-800">🤖 Chơi với máy</h2>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map((name, level) => (
              <button
                key={name}
                type="button"
                data-level={level}
                className={`${big} ${['border-emerald-700 bg-emerald-500', 'border-amber-700 bg-amber-500', 'border-rose-700 bg-rose-500'][level]}`}
                onClick={() => p.start({ kind: 'cpu', level: level as Level })}
              >
                {name}
              </button>
            ))}
          </div>
        </section>
        <section className={card}>
          <h2 className="mb-2 text-xl font-black text-slate-800">👫 Hai bé một máy</h2>
          <button type="button" data-local className={`${big} border-sky-700 bg-sky-500`} onClick={() => p.start({ kind: 'local' })}>
            Chơi hai người
          </button>
        </section>
        <section className={card}>
          <h2 className="mb-2 text-xl font-black text-slate-800">🌐 Chơi với bạn qua ID</h2>
          <div className="flex flex-col gap-2">
            {seat && (
              <button type="button" disabled={busy} className={`${big} border-emerald-700 bg-emerald-500`} onClick={() => void online('join', seat.code)}>
                Vào lại phòng {seat.code}
              </button>
            )}
            <button type="button" data-create disabled={busy} className={`${big} border-violet-700 bg-violet-500`} onClick={() => void online('create')}>
              Tạo phòng mới
            </button>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="Mã phòng"
                aria-label="Mã phòng"
                className="h-14 min-w-0 flex-1 rounded-2xl border-4 border-violet-300 bg-white px-3 text-center text-2xl font-black tracking-widest select-text"
              />
              <button type="button" data-join disabled={busy} className={`${big} !w-auto border-violet-700 bg-violet-500`} onClick={() => void online('join')}>
                Vào phòng
              </button>
            </div>
            {busy && <p className="text-center font-bold text-slate-600">Đang kết nối…</p>}
            {note && (
              <p role="alert" data-online-note className="rounded-2xl bg-amber-100 p-2 text-center font-bold text-amber-900">
                {note}
              </p>
            )}
            {help && (
              <div data-online-help className="rounded-2xl bg-slate-100 p-2 text-sm leading-snug text-slate-700">
                <b>Hướng dẫn cho ba mẹ:</b> chơi online dùng Firebase Realtime Database. Tạo dự án Firebase, bật Realtime Database, rồi thêm các biến <code>VITE_FIREBASE_*</code> vào cấu hình build (xem mục “Chơi online” trong README của dự án). Chơi với máy và hai người một máy vẫn dùng được bình thường.
              </div>
            )}
          </div>
        </section>
      </main>
      <Copyright />
    </div>
  )
}

// ---------- shared table ----------
function Table<P extends BasePos>(p: {
  engine: Engine<P>
  pos: P
  /** Side the person on this device may move, or null when it is not their turn to touch the board. */
  mover: Side | null
  flip: boolean
  status: ReactNode
  top?: ReactNode
  overlay?: ReactNode
  buttons: ReactNode
  onMove: (move: string) => void
  onExit: () => void
}) {
  const { engine, pos } = p
  const [sel, setSel] = useState<number | null>(null)
  const [ask, setAsk] = useState<string[] | null>(null)
  const [shot, setShot] = useState(0)
  const [seen, setSeen] = useState(pos)
  if (seen !== pos) {
    // the position changed (move, undo, new game): drop the selection
    setSeen(pos)
    setSel(null)
    setAsk(null)
  }
  const wasOver = useRef(pos.over)
  useEffect(() => {
    if (pos.over && !wasOver.current) {
      cheer()
      setShot((n) => n + 1)
    }
    wasOver.current = pos.over
  }, [pos.over])

  const active = p.mover !== null && p.mover === pos.turn && !pos.over
  const fromSel = useMemo(() => (sel === null ? [] : pos.legal.filter((m) => engine.from(m) === sel)), [sel, pos, engine])
  const targets = useMemo(() => new Set(fromSel.map(engine.to)), [fromSel, engine])
  const tap = (sq: number) => {
    if (!active) return
    if (sel !== null && targets.has(sq)) {
      const list = fromSel.filter((m) => engine.to(m) === sq)
      if (list.length > 1) setAsk(list)
      else {
        pop()
        p.onMove(list[0])
      }
      return
    }
    setSel(engine.owner(pos, sq) === pos.turn && sq !== sel ? sq : null)
  }
  const { Board } = engine
  return (
    <div className="sky flex h-dvh flex-col" data-game={engine.id} data-turn={pos.turn} data-over={pos.over}>
      <Header title={engine.title} onBack={p.onExit} />
      {p.top}
      <div role="status" data-status className="mx-2 mt-2 flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white/90 px-3 py-1 text-center text-lg leading-tight font-black shadow-sm">
        {p.status}
        {sel !== null && <span className="font-bold text-slate-500">· {engine.pieceName(pos, sel)}</span>}
      </div>
      <div className="relative min-h-0 flex-1 p-2">
        <Board pos={pos} flip={p.flip} sel={sel} targets={targets} onTap={tap} />
        {ask && engine.choice && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 p-4">
            <div className="pop-in w-full max-w-xs rounded-3xl bg-white p-3 shadow-xl">
              <p className="mb-2 text-center text-xl font-black">{engine.choice.title}</p>
              <div className="grid grid-cols-2 gap-2">
                {ask.map((m) => (
                  <button
                    key={m}
                    type="button"
                    data-choice={m}
                    className={`${big} border-sky-700 bg-sky-500`}
                    onClick={() => {
                      pop()
                      p.onMove(m)
                    }}
                  >
                    {engine.choice!.label(m)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {p.overlay}
      </div>
      <div className="flex gap-1.5 px-2">{p.buttons}</div>
      <Copyright />
      <Confetti shot={shot} />
    </div>
  )
}

function statusText<P extends BasePos>(engine: Engine<P>, pos: P, who: (side: Side) => string): ReactNode {
  if (pos.over) return <span className="text-emerald-700">🏁 {pos.reason} {pos.winner === null ? '' : `${who(pos.winner)} thắng!`}</span>
  return (
    <>
      <span className={pos.turn === 0 ? 'text-rose-600' : 'text-slate-900'}>Lượt {who(pos.turn)}</span>
      {pos.check && <span className="rounded-xl bg-rose-500 px-2 text-white">{engine.checkText}</span>}
    </>
  )
}

// ---------- vs computer / two players on one device ----------
function LocalTable<P extends BasePos>(p: { engine: Engine<P>; mode: Exclude<Mode, { kind: 'online' }>; moves: string[]; setMoves: (m: string[]) => void; onExit: () => void }) {
  const { engine, mode, moves, setMoves } = p
  const pos = useMemo(() => engine.play(moves), [engine, moves])
  const cpu = mode.kind === 'cpu'
  const thinking = cpu && pos.turn === 1 && !pos.over
  const latest = useRef(setMoves)
  useEffect(() => {
    latest.current = setMoves
  })
  useEffect(() => {
    if (!thinking || mode.kind !== 'cpu') return
    const id = setTimeout(() => {
      const t = performance.now()
      const reply = engine.think(moves, mode.level)
      document.documentElement.dataset.thinkMs = String(Math.round(performance.now() - t))
      pop()
      latest.current([...moves, reply])
    }, 450)
    return () => clearTimeout(id)
  }, [thinking, engine, moves, mode])

  const names = (side: Side) => (cpu ? (side === 0 ? `bé (${engine.sides[0]})` : `máy (${engine.sides[1]})`) : engine.sides[side])
  const back = cpu ? (pos.turn === 0 ? 2 : 1) : 1
  return (
    <Table
      engine={engine}
      pos={pos}
      mover={cpu ? 0 : pos.turn}
      flip={false}
      status={thinking ? <span className="text-slate-700">🤖 Máy đang nghĩ… ({LEVELS[mode.level]})</span> : statusText(engine, pos, names)}
      onMove={(m) => setMoves([...moves, m])}
      onExit={p.onExit}
      buttons={
        <>
          <IconButton icon="↩️" label="Đi lại" onClick={() => setMoves(moves.slice(0, Math.max(0, moves.length - back)))} disabled={moves.length === 0 || thinking} />
          <IconButton icon="🔄" label="Ván mới" onClick={() => setMoves([])} disabled={moves.length === 0} />
          <IconButton icon="🏠" label="Đổi kiểu chơi" onClick={p.onExit} />
        </>
      }
    />
  )
}

// ---------- online room ----------
function OnlineTable<P extends BasePos>({ engine, room, onExit }: { engine: Engine<P>; room: Room; onExit: () => void }) {
  const [state, setState] = useState<RoomState | null>(null)
  const [met, setMet] = useState(false)
  useEffect(() => room.subscribe(setState), [room])
  const other = (1 - room.side) as Side
  const here = !!state?.present[other]
  if (here && !met) setMet(true)
  const moves = state?.moves
  const pos = useMemo(() => {
    try {
      return engine.play(moves ?? [])
    } catch {
      return engine.play([])
    }
  }, [engine, moves])
  const names = (side: Side) => `${side === room.side ? 'bé' : 'bạn'} (${engine.sides[side]})`
  const left = met && !here
  const offline = state !== null && !state.connected
  return (
    <Table
      engine={engine}
      pos={pos}
      mover={state && here && !offline ? room.side : null}
      flip={room.side === 1}
      top={
        <div className="mx-2 mt-2 flex items-center justify-between gap-2 rounded-2xl bg-violet-100 px-3 py-1 font-black text-violet-900" data-room={room.code}>
          <span>
            Mã phòng: <span className="text-2xl tracking-widest select-text">{room.code}</span>
          </span>
          <span data-peer={here ? 'on' : left ? 'left' : 'wait'} className={here ? 'text-emerald-700' : 'text-amber-700'}>
            {offline ? '⚠️ Mất kết nối…' : here ? '🟢 Bạn đã vào' : left ? '🔴 Bạn đã rời' : '⏳ Đang chờ bạn…'}
          </span>
        </div>
      }
      status={!state ? 'Đang kết nối…' : !here && !left ? `Đọc mã ${room.code} cho bạn để vào phòng` : statusText(engine, pos, names)}
      onMove={(m) => void room.move(moves ?? [], m)}
      onExit={onExit}
      overlay={
        left && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 p-4">
            <div className="pop-in w-full max-w-xs rounded-3xl bg-white p-4 text-center shadow-xl" role="alert" data-left>
              <p className="text-5xl">👋</p>
              <p className="mb-3 text-2xl font-black">Đối thủ đã rời phòng</p>
              <div className="flex flex-col gap-2">
                <button type="button" data-rematch className={`${big} border-emerald-700 bg-emerald-500`} onClick={() => void room.rematch().then(() => setMet(false))}>
                  🔄 Ván mới, chờ bạn vào lại
                </button>
                <button type="button" className={`${big} border-slate-600 bg-slate-400`} onClick={onExit}>
                  Thoát
                </button>
              </div>
            </div>
          </div>
        )
      }
      buttons={
        <>
          <IconButton icon="🔄" label="Ván mới" onClick={() => void room.rematch()} disabled={!state || !pos.over} />
          <IconButton icon="🚪" label="Rời phòng" onClick={onExit} />
        </>
      }
    />
  )
}
