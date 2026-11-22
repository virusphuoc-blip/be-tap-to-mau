import BoardGame, { type BoardProps, type Engine } from './BoardGame'
import { PIECE_NAMES, type Pos, index, play, think } from './chess'

// solid glyphs for both sides (colored by CSS); U+FE0E keeps phones from drawing emoji
const GLYPH: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }

function Board({ pos, flip, sel, targets, onTap }: BoardProps<Pos>) {
  const order = Array.from({ length: 64 }, (_, i) => (flip ? 63 - i : i))
  return (
    <div className="square flex h-full w-full items-center justify-center">
      <div className="grid grid-cols-8 grid-rows-8 overflow-hidden rounded-xl border-4 border-amber-800 shadow-lg" role="grid" aria-label="Bàn cờ vua" style={{ fontSize: 'min(10cqw, 10cqh)' }}>
        {order.map((i) => {
          const cell = pos.board[i]
          const dark = ((i % 8) + ((i / 8) | 0)) % 2 === 1
          const last = pos.last?.includes(i)
          return (
            <button
              key={i}
              type="button"
              data-cell={i}
              data-piece={cell ? `${cell.side}${cell.t}` : undefined}
              data-target={targets.has(i) || undefined}
              aria-label={cell ? PIECE_NAMES[cell.t] : 'Ô trống'}
              onClick={() => onTap(i)}
              className="relative flex items-center justify-center leading-none !transform-none"
              style={{ background: i === sel ? '#60a5fa' : last ? (dark ? '#d9c24a' : '#f3e27a') : dark ? '#b98a5e' : '#f3dfc1' }}
            >
              {cell && (
                <span
                  style={
                    cell.side === 0
                      ? { color: '#fff', textShadow: '0 0 1px #000, 0 0 2px #000, 0 1px 2px #000, 1px 0 1px #000, -1px 0 1px #000' }
                      : { color: '#111827', textShadow: '0 0 2px #fff' }
                  }
                >
                  {GLYPH[cell.t]}&#xFE0E;
                </span>
              )}
              {targets.has(i) && <span className={`pointer-events-none absolute rounded-full ${cell ? 'inset-0.5 border-4 border-emerald-500' : 'h-1/3 w-1/3 bg-emerald-500/80'}`} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const engine: Engine<Pos> = {
  id: 'covua',
  title: 'Cờ vua',
  icon: '♟️',
  sides: ['Trắng', 'Đen'],
  checkText: 'Chiếu!',
  play,
  think,
  from: (m) => index(m.slice(0, 2)),
  to: (m) => index(m.slice(2, 4)),
  owner: (pos, sq) => pos.board[sq]?.side ?? null,
  pieceName: (pos, sq) => (pos.board[sq] ? PIECE_NAMES[pos.board[sq]!.t] : ''),
  Board,
  choice: { title: 'Phong cấp Tốt thành', label: (m) => `${GLYPH[m[4]]}\uFE0E ${PIECE_NAMES[m[4] as keyof typeof PIECE_NAMES]}` },
}

export default function ChessGame({ onBack }: { onBack: () => void }) {
  return <BoardGame engine={engine} onBack={onBack} />
}
