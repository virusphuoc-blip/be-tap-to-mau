import BoardGame, { type BoardProps, type Engine } from './BoardGame'
import { NAMES, type Pos, play, think } from './xiangqi'

const sqOf = (t: string) => t.charCodeAt(0) - 97 + Number(t[1]) * 9
const RED = '#c81e1e'
const BLACK = '#1f2937'
const palace = 'M3 0L5 2M5 0L3 2M3 7L5 9M5 7L3 9'

function Board({ pos, flip, sel, targets, onTap }: BoardProps<Pos>) {
  const at = (i: number) => {
    const c = i % 9, r = (i / 9) | 0
    return flip ? [8 - c, 9 - r] : [c, r]
  }
  const lines: string[] = []
  for (let r = 0; r < 10; r++) lines.push(`M0 ${r}H8`)
  for (let c = 0; c < 9; c++) lines.push(c === 0 || c === 8 ? `M${c} 0V9` : `M${c} 0V4M${c} 5V9`)
  return (
    <svg viewBox="-0.6 -0.6 9.2 10.2" className="h-full w-full" role="grid" aria-label="Bàn cờ tướng">
      <rect x="-0.6" y="-0.6" width="9.2" height="10.2" rx="0.25" fill="#f6d28b" />
      <path d={lines.join('') + palace} stroke="#7c4a12" strokeWidth="0.035" fill="none" />
      <text x="2" y="4.62" textAnchor="middle" fontSize="0.34" fontWeight="700" fill="#7c4a12">Sông</text>
      <text x="6" y="4.62" textAnchor="middle" fontSize="0.34" fontWeight="700" fill="#7c4a12">Sông</text>
      {pos.last?.map((i) => {
        const [x, y] = at(i)
        return <rect key={`l${i}`} x={x - 0.48} y={y - 0.48} width="0.96" height="0.96" rx="0.2" fill="#fde047" opacity="0.75" />
      })}
      {Array.from(pos.board, (p, i) => {
        if (!p) return null
        const [x, y] = at(i)
        const col = p > 0 ? RED : BLACK
        const name = NAMES[Math.abs(p)]
        return (
          <g key={i} data-piece={p} data-sq={i}>
            <circle cx={x} cy={y} r="0.44" fill="#fff8e7" stroke={i === sel ? '#2563eb' : col} strokeWidth={i === sel ? 0.1 : 0.05} />
            <circle cx={x} cy={y} r="0.36" fill="none" stroke={col} strokeWidth="0.02" />
            <text x={x} y={y + 0.09} textAnchor="middle" fontSize={name.length > 4 ? 0.23 : name.length > 3 ? 0.27 : 0.33} fontWeight="900" fill={col}>
              {name}
            </text>
          </g>
        )
      })}
      {[...targets].map((i) => {
        const [x, y] = at(i)
        return pos.board[i] ? <circle key={`t${i}`} cx={x} cy={y} r="0.47" fill="none" stroke="#16a34a" strokeWidth="0.09" strokeDasharray="0.2 0.12" /> : <circle key={`t${i}`} cx={x} cy={y} r="0.16" fill="#16a34a" opacity="0.85" />
      })}
      {Array.from({ length: 90 }, (_, i) => {
        const [x, y] = at(i)
        return <rect key={`h${i}`} data-cell={i} data-target={targets.has(i) || undefined} x={x - 0.5} y={y - 0.5} width="1" height="1" fill="transparent" onClick={() => onTap(i)} />
      })}
    </svg>
  )
}

const engine: Engine<Pos> = {
  id: 'cotuong',
  title: 'Cờ tướng',
  icon: '🀄',
  sides: ['Đỏ', 'Đen'],
  checkText: 'Chiếu tướng!',
  play,
  think,
  from: (m) => sqOf(m.slice(0, 2)),
  to: (m) => sqOf(m.slice(2, 4)),
  owner: (pos, sq) => (pos.board[sq] === 0 ? null : pos.board[sq] > 0 ? 0 : 1),
  pieceName: (pos, sq) => NAMES[Math.abs(pos.board[sq])],
  Board,
}

export default function XiangqiGame({ onBack }: { onBack: () => void }) {
  return <BoardGame engine={engine} onBack={onBack} />
}
