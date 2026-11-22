// v2 guest test of the game hub on a 390px phone viewport.
//   BASE=http://localhost:4173 node scripts/e2e-games.mjs [shots-dir]
// ONLINE=1: BASE is a build made with VITE_FIREBASE_EMULATOR=1 and the Firebase emulators are running
// (npx firebase-tools emulators:start --only database,auth --project demo-gau-truc-xanh).
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:4173'
const ONLINE = process.env.ONLINE === '1'
const SLOW = Number(process.env.SLOW ?? 4) // CPU slow-down factor used to time the computer player
const OUT = process.argv[2] ?? 'shots'
const DB = 'http://127.0.0.1:9000'
const NS = 'ns=demo-gau-truc-xanh-default-rtdb'
const COPYRIGHT = '© 2026 VH Phước. Mọi nội dung thuộc về VH Phước.'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/home/ubuntu/.local/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const errors = []
async function phone() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  p.on('pageerror', (e) => errors.push(String(e)))
  return p
}
const page = await phone()
const results = []
const check = (name, ok, info = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${info}`) }
const shot = (n, p = page) => p.screenshot({ path: `${OUT}/${n}.png` })
const home = async (p = page) => { await p.goto(BASE + '/#/', { waitUntil: 'networkidle' }); await p.waitForSelector('[data-entry]') }
const footer = async (name, p = page) => {
  await p.waitForTimeout(200)
  const f = p.locator('[data-copyright]').last()
  const box = await f.boundingBox()
  check(`footer on: ${name}`, (await f.innerText()).trim() === COPYRIGHT && !!box && box.height > 8)
  check(`no horizontal overflow: ${name}`, await p.evaluate(() => document.documentElement.scrollWidth <= 390))
}
const open = async (title, p = page) => { await home(p); await p.locator('[data-entry]', { hasText: title }).click() }

// ---------- home ----------
await home()
await shot('v2-01-home')
check('page title', (await page.title()) === 'Trò chơi - Gấu Trúc Xanh', await page.title())
check('home brand', (await page.locator('h1').innerText()).replace(/\s+/g, ' ') === 'Trò chơi Gấu Trúc Xanh')
check('coloring section keeps its label', (await page.getByText('Bé Tập Tô Màu').count()) > 0)
for (const t of ['Tô tranh', 'Tô tượng 3D', 'Cờ tướng', 'Cờ vua', 'Rubik 3D', 'Xếp hình']) check(`home entry: ${t}`, await page.locator('[data-entry]', { hasText: t }).isVisible())
await footer('home')
check('guest sees no statistics on home', (await page.locator('[data-stat]').count()) === 0)
const meta = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('meta[name],meta[property]')].map((m) => [m.getAttribute('name') ?? m.getAttribute('property'), m.content])))
const words = ['tô màu', 'tô tượng 3D', 'cờ tướng', 'cờ vua', 'Rubik 3D', 'xếp hình', 'miễn phí cho trẻ em']
check('meta description mentions every game', words.every((w) => meta.description.includes(w)))
check('Open Graph + Twitter tags', meta['og:site_name'] === 'Trò chơi - Gấu Trúc Xanh' && meta['og:title'] === 'Trò chơi - Gấu Trúc Xanh' && meta['og:description'] === meta.description && meta['twitter:card'] === 'summary' && meta['twitter:title'] === 'Trò chơi - Gấu Trúc Xanh' && meta['twitter:description'] === meta.description)
const manifest = await (await fetch(BASE + '/manifest.webmanifest')).json()
check('manifest name / short_name', manifest.name === 'Trò chơi - Gấu Trúc Xanh' && manifest.short_name === 'Trò chơi', `${manifest.name} / ${manifest.short_name}`)
const robots = await fetch(BASE + '/robots.txt'), sitemap = await fetch(BASE + '/sitemap.xml')
check('robots.txt 200 + sitemap line', robots.status === 200 && /Allow: \/[\s\S]*Sitemap: https:\/\/game\.vhphuoc\.shop\/sitemap\.xml/.test(await robots.text()))
check('sitemap.xml 200 + main URL', sitemap.status === 200 && (await sitemap.text()).includes('<loc>https://game.vhphuoc.shop/</loc>'))

// ---------- the two board games ----------
const cdp = await page.context().newCDPSession(page)
const turn = () => page.locator('[data-game]').getAttribute('data-turn')
const pieces = () => page.locator('[data-piece]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-piece')}@${e.getAttribute('data-sq') ?? e.getAttribute('data-cell')}`).sort().join())
/** Plays one human move: the first own piece (from the given cells) that has a legal target. */
async function humanMove(p, cells) {
  for (const c of cells) {
    await p.locator(`[data-cell="${c}"]`).click({ force: true })
    const t = p.locator('[data-target]')
    if (await t.count()) { await t.first().click({ force: true }); return true }
  }
  return false
}
for (const g of [
  { title: 'Cờ tướng', id: 'cotuong', first: [64, 70, 54, 56], own: (s) => /^[1-7]@/.test(s), sides: 'Đỏ' },
  { title: 'Cờ vua', id: 'covua', first: [52, 51, 62, 57], own: (s) => s.startsWith('0'), sides: 'Trắng' },
]) {
  await open(g.title)
  await page.waitForSelector('[data-level]')
  check(`${g.title}: mode screen offers 3 levels, 2 players, online`, (await page.locator('[data-level]').allInnerTexts()).join() === 'Dễ,Khó,Cực khó' && (await page.getByText('Chơi với máy').count()) > 0 && (await page.getByText('Chơi với bạn qua ID').count()) > 0 && (await page.locator('[data-local]').count()) === 1)
  await footer(`${g.title} mode screen`)
  await shot(`v2-${g.id}-modes`)
  for (const level of [0, 1, 2]) {
    await open(g.title)
    await page.locator(`[data-level="${level}"]`).click()
    await page.waitForSelector('[data-cell]')
    const start = await pieces()
    if (level === 2) await cdp.send('Emulation.setCPUThrottlingRate', { rate: SLOW })
    const times = []
    const rounds = level === 2 ? 8 : 2
    let ok = true
    for (let i = 0; i < rounds && ok; i++) {
      if ((await page.locator('[data-game]').getAttribute('data-over')) === 'true') break
      const before = await pieces()
      const own = (await page.locator('[data-piece]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-piece'), e.getAttribute('data-sq') ?? e.getAttribute('data-cell')]))).filter(([p]) => g.own(p + '@')).map(([, c]) => Number(c))
      ok = await humanMove(page, i === 0 ? g.first : own.sort(() => Math.random() - 0.5))
      if (!ok) break
      const mid = await pieces()
      ok = mid !== before
      await page.waitForFunction((m) => { const el = document.querySelector('[data-game]'); return el.dataset.over === 'true' || (el.dataset.turn === '0' && document.documentElement.dataset.thinkMs !== undefined && m !== [...document.querySelectorAll('[data-piece]')].map((e) => `${e.getAttribute('data-piece')}@${e.getAttribute('data-sq') ?? e.getAttribute('data-cell')}`).sort().join()) }, mid, { timeout: 30000 })
      times.push(Number(await page.evaluate(() => { const t = document.documentElement.dataset.thinkMs; delete document.documentElement.dataset.thinkMs; return t })))
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
    check(`${g.title} vs máy ${['Dễ', 'Khó', 'Cực khó'][level]}: human moves, computer replies`, ok && times.length > 0, level === 2 ? `reply ms at ${SLOW}x CPU slow-down: max ${Math.max(...times)}, all ${times.join(' ')}` : '')
    if (level === 2) check(`${g.title} Cực khó replies within 3 s (${SLOW}x slow-down)`, Math.max(...times) < 3000)
    if (level === 0) {
      await footer(`${g.title} board`)
      await shot(`v2-${g.id}-board`)
      const now = await pieces()
      await page.getByLabel('Đi lại').click()
      const undone = await pieces()
      check(`${g.title}: undo takes back the last round`, undone !== now && (await turn()) === '0')
      await page.reload({ waitUntil: 'networkidle' })
      await page.locator('[data-continue]').click()
      await page.waitForSelector('[data-cell]')
      check(`${g.title}: saved game continues after reload`, (await pieces()) === undone)
      await page.getByLabel('Ván mới').click()
      check(`${g.title}: restart resets the board`, (await pieces()) === start)
    }
  }
  await open(g.title)
  await page.locator('[data-local]').click()
  await page.waitForSelector('[data-cell]')
  await humanMove(page, g.first)
  const t1 = await turn()
  const black = (await page.locator('[data-piece]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-piece'), e.getAttribute('data-sq') ?? e.getAttribute('data-cell')]))).filter(([p]) => !g.own(p + '@')).map(([, c]) => Number(c))
  await humanMove(page, black)
  check(`${g.title}: two players on one device take turns`, t1 === '1' && (await turn()) === '0')
  if (!ONLINE) {
    await open(g.title)
    await page.locator('[data-create]').click()
    const note = await page.locator('[data-online-note]').innerText()
    check(`${g.title}: online without config shows the message`, note.trim() === 'Chơi online cần cấu hình Firebase — xem hướng dẫn' && (await page.locator('[data-online-help]').isVisible()), note)
    await shot(`v2-${g.id}-online-noconfig`)
  }
}

// ---------- Rubik ----------
await open('Rubik 3D')
await page.waitForSelector('[data-game=rubik] canvas')
await page.waitForTimeout(600)
await footer('Rubik 3D')
const rb = await page.locator('[data-game=rubik] canvas').boundingBox()
const cx = rb.x + rb.width / 2, cy = rb.y + rb.height / 2
const moves = () => page.locator('[data-game=rubik]').getAttribute('data-moves')
const solved = () => page.locator('[data-game=rubik]').getAttribute('data-solved')
const drag = async (x0, y0, x1, y1) => { await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 }); await page.mouse.move(x1, y1, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(500) }
const frame = () => page.locator('[data-game=rubik] canvas').screenshot()
const f0 = await frame()
await drag(cx - 10, cy + 30, cx + 70, cy + 30)
check('Rubik: dragging a face turns one layer', (await moves()) === '1' && (await solved()) === 'false', `moves=${await moves()}`)
await shot('v2-rubik-turned')
const f1 = await frame()
await drag(rb.x + 12, rb.y + 12, rb.x + 90, rb.y + 40)
const f2 = await frame()
check('Rubik: dragging the background spins the cube, not a layer', (await moves()) === '1' && !f1.equals(f2) && !f0.equals(f1))
await page.waitForTimeout(600)
check('Rubik: timer runs after the first turn', (await page.locator('[data-time]').innerText()) !== '00:00')
await page.getByLabel('Xáo trộn').click()
check('Rubik: scramble mixes the cube and resets the counter', (await moves()) === '0' && (await solved()) === 'false')
await shot('v2-rubik-scrambled')
await page.getByLabel('Làm lại').click()
check('Rubik: reset gives the solved cube', (await moves()) === '0' && (await solved()) === 'true' && (await page.locator('[data-time]').innerText()) === '00:00')
// a turn and its inverse solve the cube again
await drag(cx - 10, cy + 30, cx + 70, cy + 30)
await drag(cx + 70, cy + 30, cx - 10, cy + 30)
check('Rubik: turning back detects the solved cube', (await moves()) === '2' && (await solved()) === 'true')

// ---------- jigsaw ----------
await open('Xếp hình')
await page.waitForSelector('[data-puzzle]')
check('Xếp hình: every coloring picture is a puzzle', (await page.locator('[data-puzzle]').count()) === 37 && (await page.locator('[data-size]').count()) === 3)
await footer('Xếp hình picker')
for (const n of [4, 3, 2]) {
  await page.locator(`[data-size="${n}"]`).click()
  await page.locator('[data-puzzle=meo]').click()
  await page.waitForSelector('[data-slot]')
  check(`Xếp hình ${n}x${n}: ${n * n} pieces and slots`, (await page.locator('[data-piece]').count()) === n * n && (await page.locator('[data-slot]').count()) === n * n)
  if (n !== 2) await page.getByLabel('Quay lại').click()
}
await footer('Xếp hình board')
const placed = () => page.locator('[data-game=xephinh]').getAttribute('data-placed')
const first = await page.locator('[data-piece]').first().getAttribute('data-piece')
await page.locator(`[data-piece="${first}"]`).click()
await page.locator(`[data-slot="${(Number(first) + 1) % 4}"]`).click()
check('Xếp hình: a wrong slot is refused', (await placed()) === '0')
await page.locator(`[data-slot="${first}"]`).click()
check('Xếp hình: a piece is placed on its slot', (await placed()) === '1' && (await page.locator(`[data-slot="${first}"]`).getAttribute('data-filled')) === 'true')
await shot('v2-puzzle-one-placed')
await page.getByLabel('Xem mẫu').click()
check('Xếp hình: preview shows the picture', (await page.locator('[data-preview]').getAttribute('data-preview')) === 'true')
await page.getByLabel('Xem mẫu').click()
await page.getByLabel('Chơi lại').click()
check('Xếp hình: restart empties the board', (await placed()) === '0' && (await page.locator('[data-piece]').count()) === 4)
await page.waitForTimeout(1200)
for (let i = 0; i < 4; i++) { await page.locator(`[data-piece="${i}"]`).click(); await page.locator(`[data-slot="${i}"]`).click() }
check('Xếp hình: finishing fires confetti', (await page.locator('[data-game=xephinh]').getAttribute('data-done')) === 'true' && (await page.locator('.confetti i').count()) > 20)
const best = await page.evaluate(() => JSON.parse(localStorage.getItem('bttm:game:xephinh:best') ?? '{}'))
check('Xếp hình: best time saved in localStorage', best[2] > 0, JSON.stringify(best))
await shot('v2-puzzle-done')

// ---------- old coloring still works ----------
await home()
await page.locator('[data-entry]', { hasText: 'Tô tranh' }).click()
await page.waitForSelector('[data-pic]')
await footer('picture picker')
await page.locator('[data-pic=meo]').click()
await page.waitForSelector('[data-testid=board] svg')
await page.locator('[data-color="#3b82f6"]').click()
await page.locator('[data-testid=board] [data-id=dau]').first().click({ position: { x: 20, y: 60 }, force: true })
check('old 2D picture opens and fills', (await page.locator('[data-id=dau]').first().getAttribute('fill')) === '#3b82f6')
await footer('2D editor')
await shot('v2-old-2d')
await home()
await page.locator('[data-entry]', { hasText: 'Tô tượng 3D' }).click()
await page.waitForSelector('[data-statue] img')
await footer('statue picker')
await page.locator('[data-statue]').first().click()
await page.waitForSelector('[data-testid=stage] canvas')
await page.waitForTimeout(800)
check('old 3D statue opens', await page.locator('[data-testid=stage] canvas').isVisible())
await footer('3D editor')
await shot('v2-old-3d')
await home()
await page.locator('[data-entry]', { hasText: 'Tranh của bé' }).click()
await footer('gallery')

// ---------- admin page as a guest ----------
await home()
await page.locator('[data-admin-entry]').click()
await page.waitForSelector('[data-admin]')
await page.waitForTimeout(800)
check('admin page shows nothing to a guest', (await page.locator('[data-admin]').getAttribute('data-admin')) === 'guest' && (await page.locator('[data-stat]').count()) === 0)
await footer('admin page')
await shot('v2-admin-guest')

// ---------- online rooms, statistics and admin (Firebase emulators) ----------
if (ONLINE) {
  const rest = async (path, init) => { const r = await fetch(`${DB}/${path}.json?${NS}`, init); return { status: r.status, body: await r.json().catch(() => null) } }
  const owner = { headers: { Authorization: 'Bearer owner' } }
  const friend = await phone()
  for (const g of [{ title: 'Cờ tướng', id: 'cotuong', a: 64, b: 19 }, { title: 'Cờ vua', id: 'covua', a: 52, b: 12 }]) {
    await open(g.title)
    await page.locator('[data-create]').click()
    await page.waitForSelector('[data-room]')
    const code = await page.locator('[data-room]').getAttribute('data-room')
    check(`${g.title} online: room code is 5 digits`, /^\d{5}$/.test(code), code)
    check(`${g.title} online: creator waits for the friend`, (await page.locator('[data-peer]').getAttribute('data-peer')) === 'wait')
    await footer(`${g.title} online room`)
    await shot(`v2-${g.id}-online-waiting`)
    await page.locator(`[data-cell="${g.a}"]`).click({ force: true })
    check(`${g.title} online: cannot move before the friend joins`, (await page.locator('[data-target]').count()) === 0)
    await open(g.title, friend)
    await friend.locator('input').fill('00000')
    await friend.locator('[data-join]').click()
    await friend.waitForSelector('[data-online-note]')
    check(`${g.title} online: unknown code is refused`, (await friend.locator('[data-online-note]').innerText()).includes('Không tìm thấy phòng'))
    await friend.locator('input').fill(code)
    await friend.locator('[data-join]').click()
    await friend.waitForSelector('[data-peer=on]')
    await page.waitForSelector('[data-peer=on]')
    check(`${g.title} online: both devices show the friend connected`, true)
    await friend.locator(`[data-cell="${g.b}"]`).click({ force: true })
    check(`${g.title} online: the second player cannot move first`, (await friend.locator('[data-target]').count()) === 0)
    await humanMove(page, [g.a])
    await friend.waitForSelector('[data-game][data-turn="1"]')
    check(`${g.title} online: move appears on the other device`, (await friend.locator('[data-piece]').evaluateAll((e) => e.map((x) => x.getAttribute('data-piece') + (x.getAttribute('data-sq') ?? x.getAttribute('data-cell'))).sort().join())) === (await page.locator('[data-piece]').evaluateAll((e) => e.map((x) => x.getAttribute('data-piece') + (x.getAttribute('data-sq') ?? x.getAttribute('data-cell'))).sort().join())))
    check(`${g.title} online: turn indicator`, (await page.locator('[data-status]').innerText()).includes('Lượt bạn') && (await friend.locator('[data-status]').innerText()).includes('Lượt bé'), `${await page.locator('[data-status]').innerText()} | ${await friend.locator('[data-status]').innerText()}`)
    await humanMove(friend, [g.b])
    await page.waitForSelector('[data-game][data-turn="0"]')
    check(`${g.title} online: reply syncs back`, true)
    await shot(`v2-${g.id}-online-playing`)
    await shot(`v2-${g.id}-online-friend`, friend)
    // the friend reloads and comes back to the same seat
    await friend.reload({ waitUntil: 'networkidle' })
    await friend.getByText(`Vào lại phòng ${code}`).click()
    await friend.waitForSelector('[data-peer=on]')
    check(`${g.title} online: reload returns to the room with the game intact`, (await friend.locator('[data-game]').getAttribute('data-turn')) === '0')
    await page.waitForSelector('[data-peer=on]')
    // the friend leaves
    await friend.goto('about:blank')
    await page.waitForSelector('[data-left]', { timeout: 20000 })
    check(`${g.title} online: "Đối thủ đã rời phòng" with rematch / exit`, (await page.locator('[data-left]').innerText()).includes('Đối thủ đã rời phòng') && (await page.locator('[data-rematch]').isVisible()) && (await page.getByText('Thoát').isVisible()))
    await shot(`v2-${g.id}-online-left`)
    await page.locator('[data-rematch]').click()
    await page.waitForSelector('[data-peer=wait]')
    check(`${g.title} online: rematch resets the room and waits again`, (await rest(`rooms/${code}/moves`, owner)).body === '')
    await page.getByLabel('Rời phòng').click()
    await page.waitForSelector('[data-level]')
  }
  // database rules
  check('rules: guests cannot read statistics', (await rest('stats')).status === 401)
  check('rules: guests cannot list rooms', (await rest('rooms')).status === 401)
  check('rules: a counter can only go up by one', (await rest('stats/total/visits', { method: 'PUT', body: '99999' })).status === 401)
  check('rules: counters cannot be deleted', (await rest('stats/total/visits', { method: 'DELETE' })).status === 401)
  check('rules: nothing else is writable', (await rest('other', { method: 'PUT', body: '1' })).status === 401 && (await rest('rooms/abc', { method: 'PUT', body: '{"game":"covua","created":1,"round":0,"moves":""}' })).status === 401)
  await page.waitForTimeout(1500)
  const stats = (await rest('stats', owner)).body
  const t = stats?.total ?? {}
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
  console.log('stats/total', JSON.stringify(t))
  check('stats: counters went up while playing', t.visits >= 1 && t.pic2d >= 1 && t.cotuong_cpu >= 3 && t.covua_cpu >= 3 && t.cotuong_local >= 1 && t.cotuong_online >= 1 && t.covua_online >= 1 && t.rooms_created >= 2 && t.rubik_scramble >= 1 && t.puzzle_start >= 1 && t.puzzle_done >= 1)
  check('stats: daily counters use the Vietnam day', stats?.daily?.[day]?.visits >= 1, day)
  check('stats: no personal data stored', Object.values(t).every((v) => typeof v === 'number') && Object.keys(stats).sort().join() === 'daily,total')
  // admin page
  await page.goto(BASE + '/#/quan-tri?as=someone.else@gmail.com', { waitUntil: 'networkidle' })
  await page.locator('[data-signin]').click()
  await page.waitForSelector('[data-denied]')
  check('admin: another Google account is refused', (await page.locator('[data-stat]').count()) === 0 && (await page.locator('[data-admin]').getAttribute('data-admin')) === 'guest')
  await page.getByText('Đăng xuất').click()
  await page.goto(BASE + '/#/quan-tri?as=virusphuoc@gmail.com', { waitUntil: 'networkidle' })
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('[data-signin]').click()
  await page.waitForSelector('[data-stat=visits]')
  await page.waitForFunction(() => document.querySelector('[data-stat=visits]').textContent !== '0')
  check('admin: the owner sees the statistics', (await page.locator('[data-stat=visits]').innerText()) === String(t.visits) && (await page.locator('[data-stat=rooms_created]').innerText()) === String(t.rooms_created) && (await page.locator('[data-stat=top]').innerText()).length > 3, await page.locator('[data-stat=top]').innerText())
  await shot('v2-admin-owner')
  await page.getByText('Đăng xuất').click()
  await page.waitForSelector('[data-signin]')
  check('admin: signing out hides the statistics', (await page.locator('[data-stat]').count()) === 0)
}

const real = errors.filter((e) => !/GL Driver Message|GPU stall/.test(e))
check('no console errors', real.length === 0, real.slice(0, 5).join(' | '))
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
await browser.close()
process.exit(failed.length ? 1 : 0)
