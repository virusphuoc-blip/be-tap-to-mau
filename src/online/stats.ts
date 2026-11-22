import { onlineReady } from './config'

/**
 * Anonymous site statistics: plain counters in the Realtime Database, nothing about who played.
 * stats/total/{key} and stats/daily/{YYYY-MM-DD (Vietnam day)}/{key}. Only the admin can read them.
 */
export const STAT_KEYS = ['visits', 'pic2d', 'statue3d', 'cotuong_cpu', 'cotuong_local', 'cotuong_online', 'covua_cpu', 'covua_local', 'covua_online', 'rubik_scramble', 'rubik_solve', 'puzzle_start', 'puzzle_done', 'rooms_created'] as const
export type StatKey = (typeof STAT_KEYS)[number]

export const vietnamDay = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now)

/** Adds one to each counter. Never throws and never blocks the game (offline, no config, rules not published...). */
export function count(...keys: (StatKey | string)[]): void {
  if (!onlineReady) return
  void (async () => {
    try {
      const [{ database }, { increment, ref, update }] = await Promise.all([import('./app'), import('firebase/database')])
      const day = vietnamDay()
      const changes: Record<string, unknown> = {}
      for (const k of keys) {
        changes[`total/${k}`] = increment(1)
        changes[`daily/${day}/${k}`] = increment(1)
      }
      await update(ref(database(), 'stats'), changes)
    } catch {
      // statistics are best effort
    }
  })()
}

/** One visit per browser tab session. */
export function countVisit(): void {
  try {
    if (sessionStorage.getItem('bttm:visit')) return
    sessionStorage.setItem('bttm:visit', '1')
  } catch {
    return
  }
  count('visits')
}

export type Stats = { total: Partial<Record<StatKey, number>>; today: Partial<Record<StatKey, number>>; day: string }
export const GAME_TOTALS: { name: string; keys: StatKey[] }[] = [
  { name: 'Tô tranh 2D', keys: ['pic2d'] },
  { name: 'Tô tượng 3D', keys: ['statue3d'] },
  { name: 'Cờ tướng', keys: ['cotuong_cpu', 'cotuong_local', 'cotuong_online'] },
  { name: 'Cờ vua', keys: ['covua_cpu', 'covua_local', 'covua_online'] },
  { name: 'Rubik 3D', keys: ['rubik_scramble'] },
  { name: 'Xếp hình', keys: ['puzzle_start'] },
]
/** Game with the highest count, or null when nothing was played yet. */
export function mostPlayed(total: Stats['total']): { name: string; plays: number } | null {
  const list = GAME_TOTALS.map((g) => ({ name: g.name, plays: g.keys.reduce((n, k) => n + (total[k] ?? 0), 0) }))
  const top = list.reduce((a, b) => (b.plays > a.plays ? b : a))
  return top.plays > 0 ? top : null
}
