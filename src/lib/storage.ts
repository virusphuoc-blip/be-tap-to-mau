import { type Op, compact } from './paint'

/** Everything is kept on the device in localStorage. Nothing is ever sent anywhere. */
const PREFIX = 'bttm:'
const MAX_PROGRESS_CHARS = 250_000
const MAX_GALLERY = 30

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** Saved state of the games (board positions, best times...). */
export const loadState = <T,>(key: string, fallback: T): T => read(key, fallback)
export const saveState = (key: string, value: unknown) => void write(key, value)

export type Kind = '2d' | '3d'

export function loadOps(kind: Kind, id: string): Op[] {
  const ops = read<Op[]>(`${kind}:${id}`, [])
  return Array.isArray(ops) ? ops : []
}

/** Saves the drawing; when it is too large the brush strokes are dropped and only fills are kept. */
export function saveOps(kind: Kind, id: string, ops: readonly Op[]): void {
  let data = compact(ops)
  if (JSON.stringify(data).length > MAX_PROGRESS_CHARS) data = data.filter((o) => o.t !== 'stroke')
  if (data.length === 0) localStorage.removeItem(`${PREFIX}${kind}:${id}`)
  else write(`${kind}:${id}`, data)
}

export type Work = { id: string; name: string; kind: Kind; img: string; ts: number }

export function loadGallery(): Work[] {
  const g = read<Work[]>('gallery', [])
  return Array.isArray(g) ? g : []
}

/** Adds a work to the gallery (newest first). Oldest works are dropped when storage is full. */
export function addWork(work: Omit<Work, 'id' | 'ts'>, now = Date.now()): Work[] {
  let list = [{ ...work, id: `${now}-${Math.random().toString(36).slice(2, 7)}`, ts: now }, ...loadGallery()].slice(0, MAX_GALLERY)
  while (list.length > 0 && !write('gallery', list)) list = list.slice(0, -1)
  return list
}

export function removeWork(id: string): Work[] {
  const list = loadGallery().filter((w) => w.id !== id)
  write('gallery', list)
  return list
}

export const isMuted = () => read<boolean>('muted', false)
export const setMuted = (m: boolean) => void write('muted', m)
