import { type ReactNode, useMemo } from 'react'
import { PALETTE } from '../lib/palette'

export function IconButton(props: { icon: string; label: string; onClick: () => void; disabled?: boolean; active?: boolean; className?: string }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      aria-pressed={props.active}
      disabled={props.disabled}
      onClick={props.onClick}
      className={`flex h-14 min-w-12 flex-1 flex-col items-center justify-center rounded-2xl border-b-4 px-1 shadow-sm transition ${
        props.active ? 'border-amber-600 bg-amber-300' : 'border-slate-200 bg-white'
      } ${props.className ?? ''}`}
    >
      <span className="text-2xl leading-none">{props.icon}</span>
      <span className="mt-0.5 text-[11px] leading-none font-bold whitespace-nowrap">{props.label}</span>
    </button>
  )
}

export function Header({ title, onBack, children }: { title: string; onBack: () => void; children?: ReactNode }) {
  return (
    <header className="flex items-center gap-2 px-2 pt-2">
      <button type="button" aria-label="Quay lại" onClick={onBack} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-b-4 border-sky-600 bg-sky-400 text-3xl font-black text-white shadow-sm">
        ←
      </button>
      <h1 className="min-w-0 flex-1 truncate text-2xl font-black text-amber-700">{title}</h1>
      {children}
    </header>
  )
}

export function Palette({ color, onPick }: { color: string; onPick: (c: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-1.5 px-2 pb-2" role="radiogroup" aria-label="Bảng màu">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={c === color}
          aria-label={`Màu ${c}`}
          data-color={c}
          onClick={() => onPick(c)}
          className={`aspect-square w-full rounded-full border-2 border-black/15 shadow-sm ${c === color ? 'scale-110 ring-4 ring-slate-800' : ''}`}
          style={{ background: c }}
        />
      ))}
    </div>
  )
}

const CONFETTI = ['#ef4444', '#f97316', '#fde047', '#22c55e', '#38bdf8', '#8b5cf6', '#f472b6']
/** Confetti rain; re-fires whenever `shot` changes (0 = nothing). */
export function Confetti({ shot }: { shot: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => {
        const r = (n: number) => ((Math.sin((i + 1) * 12.9898 * (n + 1) + shot) * 43758.5453) % 1 + 1) % 1
        return { left: r(1) * 100, dx: (r(2) - 0.5) * 30, rot: 360 + r(3) * 720, dur: 1.8 + r(4) * 1.6, delay: r(5) * 0.6, color: CONFETTI[i % CONFETTI.length] }
      }),
    [shot],
  )
  if (!shot) return null
  return (
    <div className="confetti" key={shot} aria-hidden>
      {pieces.map((p, i) => (
        <i key={i} style={{ left: `${p.left}%`, background: p.color, ['--dx' as string]: `${p.dx}vw`, ['--rot' as string]: `${p.rot}deg`, ['--dur' as string]: `${p.dur}s`, ['--delay' as string]: `${p.delay}s` }} />
      ))}
    </div>
  )
}

/** Copyright line shown at the bottom of every screen. */
export function Copyright() {
  return (
    <p data-copyright className="shrink-0 px-2 py-1 text-center text-[11px] leading-tight text-slate-500">
      © 2026 VH Phước. Mọi nội dung thuộc về VH Phước.
    </p>
  )
}
