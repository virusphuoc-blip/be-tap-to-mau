import { type BasePos, type Level, type Side, pick } from './types'

/**
 * Cờ tướng rules. The board is 9 files x 10 ranks, index = row * 9 + col, row 0 at the top (Đen),
 * row 9 at the bottom (Đỏ). Pieces are 1..7 for Đỏ and -1..-7 for Đen.
 */
export const K = 1, A = 2, B = 3, N = 4, R = 5, C = 6, P = 7
export const NAMES = ['', 'Tướng', 'Sĩ', 'Tượng', 'Mã', 'Xe', 'Pháo', 'Tốt']
export type Board = Int8Array

const BACK = [R, N, B, A, K, A, B, N, R]
export function initial(): Board {
  const b = new Int8Array(90)
  for (let c = 0; c < 9; c++) {
    b[c] = -BACK[c]
    b[81 + c] = BACK[c]
  }
  b[19] = b[25] = -C
  b[64] = b[70] = C
  for (let c = 0; c < 9; c += 2) {
    b[27 + c] = -P
    b[54 + c] = P
  }
  return b
}

const sign = (side: Side) => (side === 0 ? 1 : -1)
const inPalace = (r: number, c: number, side: Side) => c >= 3 && c <= 5 && (side === 0 ? r >= 7 : r <= 2)
const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]]
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
const JUMPS = [[-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0], [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1]]

/** Pseudo-legal moves (own king may be left in check), each encoded as from * 90 + to. */
export function gen(b: Board, side: Side, out: number[] = []): number[] {
  const s = sign(side)
  for (let from = 0; from < 90; from++) {
    const p = b[from] * s
    if (p <= 0) continue
    const r = (from / 9) | 0
    const c = from % 9
    const add = (tr: number, tc: number) => {
      if (b[tr * 9 + tc] * s <= 0) out.push(from * 90 + tr * 9 + tc)
    }
    switch (p) {
      case K: {
        for (const [dr, dc] of ORTH) if (inPalace(r + dr, c + dc, side)) add(r + dr, c + dc)
        // "flying general": the two kings may not face each other on an open file
        const dr = -s
        for (let tr = r + dr; tr >= 0 && tr <= 9; tr += dr) {
          const q = b[tr * 9 + c]
          if (q === 0) continue
          if (q === -s * K) out.push(from * 90 + tr * 9 + c)
          break
        }
        break
      }
      case A:
        for (const [dr, dc] of DIAG) if (inPalace(r + dr, c + dc, side)) add(r + dr, c + dc)
        break
      case B:
        for (const [dr, dc] of DIAG) {
          const tr = r + 2 * dr
          const tc = c + 2 * dc
          if (tc < 0 || tc > 8 || (side === 0 ? tr < 5 || tr > 9 : tr < 0 || tr > 4)) continue
          if (b[(r + dr) * 9 + c + dc] === 0) add(tr, tc)
        }
        break
      case N:
        for (const [dr, dc, lr, lc] of JUMPS) {
          const tr = r + dr
          const tc = c + dc
          if (tr < 0 || tr > 9 || tc < 0 || tc > 8) continue
          if (b[(r + lr) * 9 + c + lc] === 0) add(tr, tc)
        }
        break
      case R:
      case C:
        for (const [dr, dc] of ORTH) {
          let tr = r + dr
          let tc = c + dc
          for (; tr >= 0 && tr <= 9 && tc >= 0 && tc <= 8; tr += dr, tc += dc) {
            const q = b[tr * 9 + tc]
            if (q === 0) {
              out.push(from * 90 + tr * 9 + tc)
              continue
            }
            if (p === R) {
              if (q * s < 0) out.push(from * 90 + tr * 9 + tc)
            } else {
              // the cannon captures by jumping over exactly one piece
              for (tr += dr, tc += dc; tr >= 0 && tr <= 9 && tc >= 0 && tc <= 8; tr += dr, tc += dc) {
                const t = b[tr * 9 + tc]
                if (t === 0) continue
                if (t * s < 0) out.push(from * 90 + tr * 9 + tc)
                break
              }
            }
            break
          }
        }
        break
      case P: {
        const tr = r - s
        if (tr >= 0 && tr <= 9) add(tr, c)
        if (side === 0 ? r <= 4 : r >= 5) {
          if (c > 0) add(r, c - 1)
          if (c < 8) add(r, c + 1)
        }
        break
      }
    }
  }
  return out
}

export function inCheck(b: Board, side: Side): boolean {
  const king = b.indexOf(sign(side) * K)
  if (king < 0) return true
  for (const m of gen(b, (1 - side) as Side)) if (m % 90 === king) return true
  return false
}

export function legalMoves(b: Board, side: Side): number[] {
  return gen(b, side).filter((m) => {
    const from = (m / 90) | 0
    const to = m % 90
    const cap = b[to]
    b[to] = b[from]
    b[from] = 0
    const ok = !inCheck(b, side)
    b[from] = b[to]
    b[to] = cap
    return ok
  })
}

const sq = (i: number) => 'abcdefghi'[i % 9] + ((i / 9) | 0)
const unsq = (t: string) => t.charCodeAt(0) - 97 + Number(t[1]) * 9
export const encode = (m: number) => sq((m / 90) | 0) + sq(m % 90)
export const decode = (t: string) => unsq(t.slice(0, 2)) * 90 + unsq(t.slice(2, 4))

export type Pos = BasePos & { board: Board }

/** Position after the given moves. Throws when a move is not legal. */
export function play(moves: readonly string[]): Pos {
  const board = initial()
  let turn: Side = 0
  let last: [number, number] | null = null
  for (const t of moves) {
    const m = decode(t)
    if (!legalMoves(board, turn).includes(m)) throw new Error(`Nước đi không hợp lệ: ${t}`)
    last = [(m / 90) | 0, m % 90]
    board[last[1]] = board[last[0]]
    board[last[0]] = 0
    turn = (1 - turn) as Side
  }
  const legal = legalMoves(board, turn).map(encode)
  const check = inCheck(board, turn)
  const over = legal.length === 0
  // in Cờ tướng a player with no legal move loses, in check or not
  return { board, turn, legal, check, over, winner: over ? ((1 - turn) as Side) : null, reason: over ? (check ? 'Chiếu bí!' : 'Hết nước đi!') : '', last }
}

// ---------- computer player ----------
const VALUE = [0, 10000, 20, 20, 42, 95, 47, 10]
/** Material + position score of one piece, from its owner's point of view. */
function score(p: number, r: number, c: number, side: Side): number {
  const adv = side === 0 ? 9 - r : r // ranks advanced from the own back rank
  const mid = 4 - Math.abs(c - 4)
  switch (p) {
    case P: return adv >= 5 ? 20 + (adv - 5) * 2 + mid * 2 - (adv === 9 ? 8 : 0) : 10 + (c === 4 ? 2 : 0)
    case N: return 42 + mid * 1.5 + Math.min(adv, 6) * 0.8
    case C: return 47 + mid + (adv < 3 ? 1 : 0)
    case R: return 95 + mid * 0.5 + Math.min(adv, 7) * 0.5
    default: return VALUE[p]
  }
}
export function evaluate(b: Board): number {
  let total = 0
  for (let i = 0; i < 90; i++) {
    const p = b[i]
    if (p > 0) total += score(p, (i / 9) | 0, i % 9, 0)
    else if (p < 0) total -= score(-p, (i / 9) | 0, i % 9, 1)
  }
  return total
}

const MATE = 100000
export const DEPTH = 3
let nodes = 0
function search(b: Board, side: Side, depth: number, alpha: number, beta: number): number {
  nodes++
  if (depth === 0) return evaluate(b) * sign(side)
  const moves = gen(b, side)
  moves.sort((x, y) => VALUE[Math.abs(b[y % 90])] - VALUE[Math.abs(b[x % 90])])
  for (const m of moves) {
    const from = (m / 90) | 0
    const to = m % 90
    const cap = b[to]
    if (cap === K || cap === -K) return MATE + depth // the king can be taken: the previous move was illegal or lost
    b[to] = b[from]
    b[from] = 0
    const v = -search(b, (1 - side) as Side, depth - 1, -beta, -alpha)
    b[from] = b[to]
    b[to] = cap
    if (v > alpha) alpha = v
    if (alpha >= beta) break
  }
  return alpha
}

/** Computer move. Dễ: random. Khó: best immediate capture. Cực khó: alpha-beta search of DEPTH plies. */
export function think(moves: readonly string[], level: Level, rnd: () => number = Math.random): string {
  const pos = play(moves)
  if (pos.legal.length === 0) throw new Error('Hết nước đi')
  if (level === 0) return pick(pos.legal, rnd)
  const b = pos.board
  const scored = pos.legal.map((t) => {
    const m = decode(t)
    const from = (m / 90) | 0
    const to = m % 90
    const cap = b[to]
    if (level === 1) return { t, v: VALUE[Math.abs(cap)] }
    b[to] = b[from]
    b[from] = 0
    const v = -search(b, (1 - pos.turn) as Side, DEPTH - 1, -MATE * 2, MATE * 2)
    b[from] = b[to]
    b[to] = cap
    return { t, v }
  })
  const best = Math.max(...scored.map((x) => x.v))
  return pick(scored.filter((x) => x.v >= best - (level === 2 ? 0.5 : 0)).map((x) => x.t), rnd)
}
export const nodeCount = () => nodes
