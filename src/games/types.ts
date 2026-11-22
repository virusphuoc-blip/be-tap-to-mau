/** Shared types of the two board games. Side 0 moves first (Đỏ / Trắng). */
export type Side = 0 | 1
export type Level = 0 | 1 | 2
export const LEVELS = ['Dễ', 'Khó', 'Cực khó'] as const

export type BasePos = {
  turn: Side
  /** Encoded legal moves of the side to move. */
  legal: string[]
  check: boolean
  over: boolean
  /** null when the game is drawn or still running. */
  winner: Side | null
  /** Vietnamese reason shown when the game is over. */
  reason: string
  /** Squares of the last move, in the board's own numbering. */
  last: [number, number] | null
}

export const pick = <T,>(list: readonly T[], rnd: () => number = Math.random): T => list[Math.floor(rnd() * list.length)]

/** mm:ss */
export const clock = (ms: number) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`

/** Shuffled piece order that is never already in place. */
export function shuffle(count: number, rnd: () => number = Math.random): number[] {
  const a = Array.from({ length: count }, (_, i) => i)
  do {
    for (let i = count - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
  } while (count > 1 && a.every((v, i) => v === i))
  return a
}
