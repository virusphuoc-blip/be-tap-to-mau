import { describe, expect, it } from 'vitest'
import * as chess from './chess'
import type { Side } from './types'
import * as xq from './xiangqi'

const { K, A, B, N, R, C, P } = xq
/** Board from "piece@square" items, e.g. "K@e9" (Đỏ) or "-R@a0" (Đen). */
function setup(...items: string[]): xq.Board {
  const b = new Int8Array(90)
  const code: Record<string, number> = { K, A, B, N, R, C, P }
  for (const it of items) {
    const [p, s] = it.split('@')
    b[s.charCodeAt(0) - 97 + Number(s[1]) * 9] = p[0] === '-' ? -code[p[1]] : code[p]
  }
  return b
}
const from = (b: xq.Board, side: Side, s: string) =>
  xq.legalMoves(b, side).map(xq.encode).filter((m) => m.startsWith(s)).map((m) => m.slice(2)).sort()
function perft(b: xq.Board, side: Side, depth: number): number {
  const moves = xq.legalMoves(b, side)
  if (depth === 1) return moves.length
  let n = 0
  for (const m of moves) {
    const f = (m / 90) | 0, t = m % 90, cap = b[t]
    b[t] = b[f]; b[f] = 0
    n += perft(b, (1 - side) as Side, depth - 1)
    b[f] = b[t]; b[t] = cap
  }
  return n
}

describe('Cờ tướng rules', () => {
  it('matches the known move counts from the start position', () => {
    const b = xq.initial()
    expect(perft(b, 0, 1)).toBe(44)
    expect(perft(b, 0, 2)).toBe(1920)
    expect(perft(b, 0, 3)).toBe(79666)
  })
  it('keeps Tướng and Sĩ inside the palace', () => {
    const b = setup('K@d9', 'A@e8', '-K@e0')
    expect(from(b, 0, 'd9')).toEqual(['d8', 'e9'])
    expect(from(b, 0, 'e8')).toEqual(['d7', 'f7', 'f9'])
  })
  it('Tượng moves two diagonally, is blocked at the eye and never crosses the river', () => {
    const b = setup('K@e9', '-K@d0', 'B@c5', 'P@d6')
    expect(from(b, 0, 'c5')).toEqual(['a7'])
    b[xq.decode('d6d6') % 90] = 0
    expect(from(b, 0, 'c5')).toEqual(['a7', 'e7'])
  })
  it('Mã is blocked by a piece next to it', () => {
    const b = setup('K@e9', '-K@d0', 'N@b9', 'P@b8')
    expect(from(b, 0, 'b9')).toEqual(['d8'])
    expect(from(setup('K@e9', '-K@d0', 'N@b9'), 0, 'b9')).toEqual(['a7', 'c7', 'd8'])
  })
  it('Pháo slides freely but captures only over exactly one piece', () => {
    const b = setup('K@e9', '-K@d0', 'C@a5', 'P@c5', '-R@f5', '-N@h5')
    expect(from(b, 0, 'a5')).toContain('b5')
    expect(from(b, 0, 'a5')).toContain('f5')
    expect(from(b, 0, 'a5')).not.toContain('c5')
    expect(from(b, 0, 'a5')).not.toContain('d5')
    expect(from(b, 0, 'a5')).not.toContain('h5')
  })
  it('Tốt moves forward only, and sideways after the river', () => {
    expect(from(setup('K@e9', '-K@d0', 'P@a6'), 0, 'a6')).toEqual(['a5'])
    expect(from(setup('K@e9', '-K@d0', 'P@c4'), 0, 'c4')).toEqual(['b4', 'c3', 'd4'])
    expect(from(setup('K@e9', '-K@d0', '-P@c5'), 1, 'c5')).toEqual(['b5', 'c6', 'd5'])
    expect(from(setup('K@e9', '-K@d0', 'P@c0'), 0, 'c0')).toEqual(['b0', 'd0'])
  })
  it('forbids the two Tướng facing each other (flying general)', () => {
    const b = setup('K@e9', '-K@e0', 'R@e5')
    expect(from(b, 0, 'e5').every((t) => t[0] === 'e')).toBe(true) // the Xe is pinned to the file
    const open = setup('K@d9', '-K@e0')
    expect(from(open, 0, 'd9')).toEqual(['d8']) // d9-e9 would face the other Tướng
  })
  it('detects check, and forces the player to answer it', () => {
    const b = setup('K@e9', '-K@d0', '-R@e3', 'R@a9')
    expect(xq.inCheck(b, 0)).toBe(true)
    expect(xq.inCheck(b, 1)).toBe(false)
    const b2 = setup('K@e9', '-K@d0', '-R@e3', 'R@a8')
    expect(xq.legalMoves(b2, 0).map(xq.encode).sort()).toEqual(['a8e8', 'e9f9'])
  })
  it('detects checkmate and stalemate as a loss', () => {
    expect(xq.legalMoves(setup('K@e9', '-K@d0', '-R@a9', '-R@b8'), 0)).toHaveLength(0)
    expect(xq.inCheck(setup('K@e9', '-K@d0', '-R@a9', '-R@b8'), 0)).toBe(true)
    const stale = setup('K@d9', '-K@e0', '-R@a8')
    expect(xq.inCheck(stale, 0)).toBe(false)
    expect(xq.legalMoves(stale, 0)).toHaveLength(0)
  })
  it('replays games, rejects illegal moves and reports a finished game', () => {
    expect(xq.play([]).legal).toHaveLength(44)
    const p = xq.play(['h7e7', 'h0g2'])
    expect(p.turn).toBe(0)
    expect(p.board[xq.decode('e7e7') % 90]).toBe(C)
    expect(() => xq.play(['a9a5'])).toThrow()
    expect(() => xq.play(['h7e7', 'h7h0'])).toThrow()
  })
  it('computer: every level returns a legal move, Khó takes the biggest piece, Cực khó finds mate in one', () => {
    for (const level of [0, 1, 2] as const) expect(xq.play(['h7e7']).legal).toContain(xq.think(['h7e7'], level))
    // after b7b0 Đen can take the Pháo with the Xe
    expect(xq.think(['b7b0'], 1)).toBe('a0b0')
  })
})

describe('Cờ vua rules (chess.js)', () => {
  it('starts with 20 legal moves and alternates turns', () => {
    expect(chess.play([]).legal).toHaveLength(20)
    expect(chess.play(['e2e4']).turn).toBe(1)
    expect(() => chess.play(['e2e5'])).toThrow()
  })
  it('supports castling, en passant and promotion', () => {
    const castle = chess.play(['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5'])
    expect(castle.legal).toContain('e1g1')
    const after = chess.play(['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'e1g1'])
    expect(after.board[chess.index('f1')]).toEqual({ t: 'r', side: 0 })
    expect(after.board[chess.index('g1')]).toEqual({ t: 'k', side: 0 })
    const ep = ['e2e4', 'a7a6', 'e4e5', 'd7d5']
    expect(chess.play(ep).legal).toContain('e5d6')
    expect(chess.play([...ep, 'e5d6']).board[chess.index('d5')]).toBeNull()
    const promo = ['a2a4', 'b7b5', 'a4b5', 'a7a6', 'b5a6', 'c8b7', 'a6b7', 'b8c6']
    expect(chess.play(promo).legal).toEqual(expect.arrayContaining(['b7a8q', 'b7a8n', 'b7a8r', 'b7a8b']))
    expect(chess.isPromotion(chess.play(promo), chess.index('b7'), chess.index('a8'))).toBe(true)
    expect(chess.play([...promo, 'b7a8n']).board[chess.index('a8')]).toEqual({ t: 'n', side: 0 })
  })
  it('detects check, checkmate and stalemate', () => {
    expect(chess.play(['e2e4', 'f7f5', 'd1h5']).check).toBe(true)
    const mate = chess.play(['f2f3', 'e7e5', 'g2g4', 'd8h4'])
    expect(mate).toMatchObject({ over: true, winner: 1, check: true, reason: 'Chiếu hết!' })
    const stale = chess.play('e2e3 a7a5 d1h5 a8a6 h5a5 h7h5 h2h4 a6h6 a5c7 f7f6 c7d7 e8f7 d7b7 d8d3 b7b8 d3h7 b8c8 f7g6 c8e6'.split(' '))
    expect(stale).toMatchObject({ over: true, winner: null, check: false })
    expect(stale.legal).toHaveLength(0)
  })
  it('computer: every level returns a legal move, Khó captures, Cực khó mates in one', () => {
    for (const level of [0, 1, 2] as const) expect(chess.play(['e2e4']).legal).toContain(chess.think(['e2e4'], level))
    expect(chess.think(['e2e4', 'd7d5', 'a2a3'], 1)).toBe('d5e4')
    expect(chess.think(['f2f3', 'e7e5', 'g2g4'], 2)).toBe('d8h4')
  })
})
