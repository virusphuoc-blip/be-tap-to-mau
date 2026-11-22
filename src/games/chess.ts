import { Chess, type PieceSymbol, type Square } from 'chess.js'
import { type BasePos, type Level, type Side, pick } from './types'

/** Cờ vua. Rules come from chess.js; moves are encoded like "e2e4" or "e7e8q". */
export type Cell = { t: PieceSymbol; side: Side } | null
export type Pos = BasePos & { board: Cell[] }
export const PIECE_NAMES: Record<PieceSymbol, string> = { k: 'Vua', q: 'Hậu', r: 'Xe', b: 'Tượng', n: 'Mã', p: 'Tốt' }

/** "e4" -> 0..63, a8 = 0, h1 = 63. */
export const index = (sq: string) => sq.charCodeAt(0) - 97 + (8 - Number(sq[1])) * 8
export const square = (i: number) => 'abcdefgh'[i % 8] + (8 - ((i / 8) | 0))

function replay(moves: readonly string[]): Chess {
  const game = new Chess()
  for (const t of moves) game.move({ from: t.slice(0, 2), to: t.slice(2, 4), promotion: t[4] })
  return game
}

/** Position after the given moves. Throws when a move is not legal. */
export function play(moves: readonly string[]): Pos {
  const game = replay(moves)
  const turn: Side = game.turn() === 'w' ? 0 : 1
  const over = game.isGameOver()
  const mate = game.isCheckmate()
  const lastMove = moves.at(-1)
  return {
    board: game.board().flat().map((p) => (p ? { t: p.type, side: p.color === 'w' ? 0 : 1 } : null)),
    turn,
    legal: game.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion ?? '')),
    check: game.isCheck(),
    over,
    winner: mate ? ((1 - turn) as Side) : null,
    reason: mate ? 'Chiếu hết!' : game.isStalemate() ? 'Hòa cờ: hết nước đi' : game.isInsufficientMaterial() ? 'Hòa cờ: không đủ quân' : game.isThreefoldRepetition() ? 'Hòa cờ: lặp lại 3 lần' : over ? 'Hòa cờ' : '',
    last: lastMove ? [index(lastMove.slice(0, 2)), index(lastMove.slice(2, 4))] : null,
  }
}

// ---------- computer player ----------
const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 }
// piece-square tables from White's side, a8 first (Tomasz Michniewski's "simplified evaluation")
const PST: Record<string, number[]> = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
}

type InternalMove = { from: number; to: number; piece: string; captured?: string; promotion?: string }
/** chess.js internals: its public move list builds SAN and FEN strings for every move, far too slow for a search. */
type Internals = {
  _board: ({ type: string; color: string } | undefined)[]
  _moves(o?: { legal?: boolean }): InternalMove[]
  _makeMove(m: InternalMove): void
  _undoMove(): unknown
  _isKingAttacked(color: string): boolean
  _turn: string
}

/** Material + position, from White's point of view. The board is chess.js's 0x88 array. */
function evaluate(g: Internals): number {
  let total = 0
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = g._board[r * 16 + c]
      if (!p) continue
      total += p.color === 'w' ? VALUE[p.type] + PST[p.type][r * 8 + c] : -(VALUE[p.type] + PST[p.type][(7 - r) * 8 + c])
    }
  return total
}

const MATE = 1_000_000
export const DEPTH = 3
const gain = (m: InternalMove) => (m.captured ? VALUE[m.captured] * 10 - VALUE[m.piece] / 10 : 0) + (m.promotion ? VALUE[m.promotion] : 0)

function search(g: Internals, depth: number, alpha: number, beta: number): number {
  if (depth === 0) return evaluate(g) * (g._turn === 'w' ? 1 : -1)
  const moves = g._moves()
  if (moves.length === 0) return g._isKingAttacked(g._turn) ? -MATE - depth : 0
  moves.sort((x, y) => gain(y) - gain(x))
  for (const m of moves) {
    g._makeMove(m)
    const v = -search(g, depth - 1, -beta, -alpha)
    g._undoMove()
    if (v > alpha) alpha = v
    if (alpha >= beta) break
  }
  return alpha
}

/** Computer move. Dễ: random. Khó: best immediate material gain. Cực khó: alpha-beta search of DEPTH plies. */
export function think(moves: readonly string[], level: Level, rnd: () => number = Math.random): string {
  const game = replay(moves)
  const list = game.moves({ verbose: true })
  if (list.length === 0) throw new Error('Hết nước đi')
  const text = (m: { from: string; to: string; promotion?: string }) => m.from + m.to + (m.promotion ?? '')
  if (level === 0) return text(pick(list, rnd))
  if (level === 1) {
    const scored = list.map((m) => ({ t: text(m), v: (m.captured ? VALUE[m.captured] : 0) + (m.promotion ? VALUE[m.promotion] - VALUE.p : 0) }))
    const best = Math.max(...scored.map((x) => x.v))
    return pick(scored.filter((x) => x.v === best).map((x) => x.t), rnd)
  }
  const g = game as unknown as Internals
  const scored = list.map((m) => {
    game.move(m)
    const v = game.isThreefoldRepetition() ? 0 : -search(g, DEPTH - 1, -MATE * 2, MATE * 2)
    game.undo()
    return { t: text(m), v }
  })
  const best = Math.max(...scored.map((x) => x.v))
  return pick(scored.filter((x) => x.v >= best - 5).map((x) => x.t), rnd)
}

export const isPromotion = (pos: Pos, from: number, to: number) => pos.legal.includes(square(from) + square(to) + 'q')
export type { Square }
