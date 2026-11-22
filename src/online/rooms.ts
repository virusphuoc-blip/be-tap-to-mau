import { type DatabaseReference, child, get, onDisconnect, onValue, ref, runTransaction, set } from 'firebase/database'
import type { Side } from '../games/types'
import { database } from './app'
import { count } from './stats'

/**
 * rooms/{code} = { game, created, round, moves: "e2e4 e7e5", p0: true, p1: true }
 * p0 / p1 are presence flags of the two players; Firebase removes them when a device disconnects.
 */
type RoomData = { game: string; created: number; round: number; moves: string; p0?: boolean; p1?: boolean }
export type RoomState = { moves: string[]; round: number; present: [boolean, boolean]; connected: boolean }
export type Room = {
  code: string
  side: Side
  subscribe(cb: (s: RoomState) => void): () => void
  /** Appends a move; ignored when the room has moved on in the meantime. */
  move(played: readonly string[], move: string): Promise<void>
  rematch(): Promise<void>
  leave(): void
}

const CODE_LENGTH = 5
const STALE_MS = 24 * 3600 * 1000
export const cleanCode = (text: string) => text.replace(/\D/g, '').slice(0, CODE_LENGTH)
export const isCode = (text: string) => new RegExp(`^\\d{${CODE_LENGTH}}$`).test(text)

let root: DatabaseReference | null = null
function rooms(): DatabaseReference {
  root ??= ref(database(), 'rooms')
  return root
}

const seatKey = (game: string) => `bttm:room:${game}`
/** Room this device was last seated in, so a reload returns to the same seat. */
export function lastSeat(game: string): { code: string; side: Side } | null {
  try {
    return JSON.parse(sessionStorage.getItem(seatKey(game)) ?? 'null')
  } catch {
    return null
  }
}
const forget = (game: string) => sessionStorage.removeItem(seatKey(game))

function open(game: string, code: string, side: Side): Room {
  const node = child(rooms(), code)
  const seat = child(node, `p${side}`)
  const info = ref(database(), '.info/connected')
  sessionStorage.setItem(seatKey(game), JSON.stringify({ code, side }))
  let connected = false
  let data: RoomData | null = null
  const listeners = new Set<(s: RoomState) => void>()
  const emit = () => {
    if (!data) return
    const state: RoomState = { moves: data.moves ? data.moves.split(' ') : [], round: data.round ?? 0, present: [!!data.p0, !!data.p1], connected }
    listeners.forEach((cb) => cb(state))
  }
  const stopInfo = onValue(info, (snap) => {
    connected = snap.val() === true
    if (connected) void onDisconnect(seat).remove().then(() => set(seat, true))
    emit()
  })
  const stopRoom = onValue(node, (snap) => {
    data = snap.val() as RoomData | null
    emit()
  })
  return {
    code,
    side,
    subscribe(cb) {
      listeners.add(cb)
      emit()
      return () => listeners.delete(cb)
    },
    async move(played, move) {
      const before = played.join(' ')
      await runTransaction(child(node, 'moves'), (cur: string | null) => ((cur ?? '') === before ? (before ? `${before} ${move}` : move) : undefined))
    },
    async rematch() {
      await runTransaction(node, (cur: RoomData | null) => (cur ? { ...cur, moves: '', round: (cur.round ?? 0) + 1 } : cur))
    },
    leave() {
      stopInfo()
      stopRoom()
      listeners.clear()
      forget(game)
      void onDisconnect(seat).cancel()
      void set(seat, null)
    },
  }
}

/** Creates a room with a fresh code. The creator plays side 0 (moves first). */
export async function createRoom(game: string): Promise<Room> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = String(Math.floor(Math.random() * 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0')
    const now = Date.now()
    const res = await runTransaction(child(rooms(), code), (cur: RoomData | null) =>
      // a code is free when unused, or when its room is a day old
      cur && now - cur.created < STALE_MS ? undefined : { game, created: now, round: 0, moves: '' },
    )
    if (res.committed) {
      count('rooms_created', `${game}_online`)
      return open(game, code, 0)
    }
  }
  throw new Error('Không tạo được phòng. Bé thử lại nhé!')
}

/** Joins a room by code, or returns to the seat this device already had in it. */
export async function joinRoom(game: string, code: string): Promise<Room> {
  const snap = await get(child(rooms(), code))
  const data = snap.val() as RoomData | null
  if (!data) throw new Error('Không tìm thấy phòng này.')
  if (data.game !== game) throw new Error('Phòng này đang chơi trò khác.')
  const mine = lastSeat(game)
  if (mine?.code === code) return open(game, code, mine.side)
  if (data.p1) throw new Error('Phòng đã đủ 2 người.')
  return open(game, code, 1)
}
