import { useEffect, useState } from 'react'
import { ADMIN_EMAIL, onlineReady, useEmulator } from '../online/config'
import { GAME_TOTALS, type StatKey, type Stats, mostPlayed, vietnamDay } from '../online/stats'
import { Copyright, Header } from './ui'

type Session = { email: string | null } | null
const big = 'flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-b-4 px-3 text-xl font-black text-white shadow-md'
const ROWS: [string, StatKey][] = [
  ['Tranh 2D đã mở', 'pic2d'],
  ['Tượng 3D đã tô', 'statue3d'],
  ['Cờ tướng – với máy', 'cotuong_cpu'],
  ['Cờ tướng – hai người một máy', 'cotuong_local'],
  ['Cờ tướng – phòng online', 'cotuong_online'],
  ['Cờ vua – với máy', 'covua_cpu'],
  ['Cờ vua – hai người một máy', 'covua_local'],
  ['Cờ vua – phòng online', 'covua_online'],
  ['Rubik – lần xáo trộn', 'rubik_scramble'],
  ['Rubik – lần giải xong', 'rubik_solve'],
  ['Xếp hình – ván bắt đầu', 'puzzle_start'],
  ['Xếp hình – ván hoàn thành', 'puzzle_done'],
  ['Phòng online đã tạo', 'rooms_created'],
]

async function auth() {
  const [{ firebaseApp }, m] = await Promise.all([import('../online/app'), import('firebase/auth')])
  const a = m.getAuth(firebaseApp())
  if (useEmulator && !a.emulatorConfig) m.connectAuthEmulator(a, 'http://127.0.0.1:9099', { disableWarnings: true })
  return { a, m }
}

async function fetchStats(): Promise<Stats> {
  const [{ database }, { get, ref }] = await Promise.all([import('../online/app'), import('firebase/database')])
  const day = vietnamDay()
  const [total, today] = await Promise.all([get(ref(database(), 'stats/total')), get(ref(database(), `stats/daily/${day}`))])
  return { total: total.val() ?? {}, today: today.val() ?? {}, day }
}

export default function Admin({ onBack }: { onBack: () => void }) {
  const [user, setUser] = useState<Session | undefined>(undefined)
  const [stats, setStats] = useState<Stats | null>(null)
  const [note, setNote] = useState('')
  const isAdmin = user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (!onlineReady) return
    let stop = () => {}
    void auth().then(({ a, m }) => {
      stop = m.onAuthStateChanged(a, (u) => setUser(u ? { email: u.emailVerified ? u.email : null } : null))
    })
    return () => stop()
  }, [])

  const load = () =>
    fetchStats().then(
      (st) => {
        setStats(st)
        setNote('')
      },
      () => setNote('Không đọc được thống kê. Kiểm tra lại quy tắc (rules) của Realtime Database.'),
    )
  useEffect(() => {
    if (!isAdmin) return
    let alive = true
    fetchStats().then(
      (st) => alive && setStats(st),
      () => alive && setNote('Không đọc được thống kê. Kiểm tra lại quy tắc (rules) của Realtime Database.'),
    )
    return () => {
      alive = false
    }
  }, [isAdmin])

  const signIn = async () => {
    setNote('')
    try {
      const { a, m } = await auth()
      // the emulator has no Google popup: tests sign in with a made-up Google identity instead
      const fake = useEmulator ? new URLSearchParams(location.hash.split('?')[1]).get('as') : null
      if (fake) await m.signInWithCredential(a, m.GoogleAuthProvider.credential(JSON.stringify({ sub: fake, email: fake, email_verified: true })))
      else await m.signInWithPopup(a, new m.GoogleAuthProvider())
    } catch (e) {
      const code = (e as { code?: string }).code ?? ''
      if (/popup-closed|cancelled-popup/.test(code)) return
      setNote(
        /operation-not-allowed|configuration-not-found|admin-restricted/.test(code)
          ? 'Đăng nhập Google chưa được bật trong Firebase (Authentication → Sign-in method → Google).'
          : /unauthorized-domain/.test(code)
            ? 'Tên miền này chưa được thêm vào Firebase Authentication → Settings → Authorized domains.'
            : `Không đăng nhập được (${code || 'lỗi không rõ'}).`,
      )
    }
  }
  const signOut = () => void auth().then(({ a, m }) => m.signOut(a))
  const top = stats && mostPlayed(stats.total)

  return (
    <div className="sky flex min-h-dvh flex-col" data-admin={isAdmin ? 'admin' : 'guest'}>
      <Header title="Quản trị" onBack={onBack} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 p-3">
        {!onlineReady ? (
          <p role="alert" className="rounded-3xl bg-amber-100 p-4 text-center font-bold text-amber-900">
            Trang quản trị cần cấu hình Firebase (biến VITE_FIREBASE_*).
          </p>
        ) : user === undefined ? (
          <p className="p-6 text-center font-bold text-slate-600">Đang kiểm tra…</p>
        ) : !isAdmin ? (
          <div className="rounded-3xl bg-white/85 p-4 text-center shadow-md">
            <p className="text-6xl">🔒</p>
            <p className="my-2 text-lg font-black text-slate-800">Trang này chỉ dành cho chủ trang web.</p>
            {user ? (
              <>
                <p className="mb-3 font-bold text-rose-700" data-denied>
                  Tài khoản này không có quyền quản trị.
                </p>
                <button type="button" className={`${big} border-slate-600 bg-slate-400`} onClick={signOut}>
                  Đăng xuất
                </button>
              </>
            ) : (
              <button type="button" data-signin className={`${big} border-sky-700 bg-sky-500`} onClick={() => void signIn()}>
                Đăng nhập bằng Google
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-3xl bg-white/90 p-3 shadow-md">
                <div className="text-sm font-bold text-slate-500">Tổng lượt truy cập</div>
                <div className="text-4xl font-black text-sky-700" data-stat="visits">{stats?.total.visits ?? 0}</div>
              </div>
              <div className="rounded-3xl bg-white/90 p-3 shadow-md">
                <div className="text-sm font-bold text-slate-500">Hôm nay ({stats?.day.slice(5).split('-').reverse().join('/')})</div>
                <div className="text-4xl font-black text-emerald-700" data-stat="visits-today">{stats?.today.visits ?? 0}</div>
              </div>
            </div>
            <div className="rounded-3xl bg-white/90 p-3 text-center shadow-md">
              <div className="text-sm font-bold text-slate-500">Trò được chơi nhiều nhất</div>
              <div className="text-2xl font-black text-amber-700" data-stat="top">{top ? `${top.name} (${top.plays})` : 'Chưa có dữ liệu'}</div>
            </div>
            <table className="w-full overflow-hidden rounded-3xl bg-white/90 text-left shadow-md">
              <thead>
                <tr className="bg-slate-100 text-sm text-slate-600">
                  <th className="p-2 pl-3">Mục</th>
                  <th className="p-2 text-right">Hôm nay</th>
                  <th className="p-2 pr-3 text-right">Tổng</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([label, k]) => (
                  <tr key={k} className="border-t border-slate-200">
                    <td className="p-2 pl-3 font-bold">{label}</td>
                    <td className="p-2 text-right tabular-nums">{stats?.today[k] ?? 0}</td>
                    <td className="p-2 pr-3 text-right font-black tabular-nums" data-stat={k}>{stats?.total[k] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-center text-xs text-slate-500">
              Số đếm ẩn danh, không gắn với người chơi nào. Xếp hạng “chơi nhiều nhất” tính theo: {GAME_TOTALS.map((g) => g.name).join(', ')}.
            </p>
            <div className="flex gap-2">
              <button type="button" className={`${big} border-sky-700 bg-sky-500`} onClick={() => void load()}>
                Tải lại
              </button>
              <button type="button" className={`${big} border-slate-600 bg-slate-400`} onClick={signOut}>
                Đăng xuất
              </button>
            </div>
          </>
        )}
        {note && (
          <p role="alert" data-admin-note className="rounded-2xl bg-amber-100 p-3 text-center font-bold text-amber-900">
            {note}
          </p>
        )}
      </main>
      <Copyright />
    </div>
  )
}
