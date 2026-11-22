// Guest smoke test on a 390px phone viewport: BASE=http://localhost:4173 node scripts/e2e.mjs [shots-dir]
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:4173'
const OUT = process.argv[2] ?? 'shots'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/home/ubuntu/.local/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true })
const page = await ctx.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))
const results = []
const check = (name, ok, info = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${info}`) }
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` })

await page.goto(BASE, { waitUntil: 'networkidle' })
await shot('01-home')
check('home shows 3 sections + parents note', (await page.getByText('Tô tranh').count()) > 0 && (await page.getByText('Dành cho ba mẹ').count()) > 0)
check('no horizontal overflow at 390px', await page.evaluate(() => document.documentElement.scrollWidth <= 390))

// ---- 2D: every picture loads ----
await page.getByText('Tô tranh').click()
let total = 0
const tabs = await page.getByRole('tab').count()
for (let i = 0; i < tabs; i++) {
  await page.getByRole('tab').nth(i).click()
  const n = await page.locator('[data-pic]').count()
  const drawn = await page.locator('[data-pic] svg path').count()
  total += n
  check(`category ${i + 1}: ${n} pictures rendered`, n >= 4 && drawn > n * 3)
  await shot(`02-pics-${i + 1}`)
}
check(`all pictures listed (${total})`, total >= 24)
// open each picture once and make sure the board has colorable regions
let opened = 0
for (let i = 0; i < tabs; i++) {
  await page.getByRole('tab').nth(i).click()
  const n = await page.locator('[data-pic]').count()
  for (let k = 0; k < n; k++) {
    await page.locator('[data-pic]').nth(k).click()
    await page.waitForSelector('[data-testid=board] svg [data-id]')
    opened++
    await page.getByLabel('Quay lại').click()
    await page.waitForSelector('[data-pic]')
  }
}
check(`every picture opens in the editor (${opened})`, opened === total)

// ---- 2D: fill, brush, undo, sample, save ----
await page.getByRole('tab').nth(0).click()
await page.locator('[data-pic=meo]').click()
await page.waitForSelector('[data-testid=board] svg')
await page.locator('[data-color="#3b82f6"]').click()
await page.locator('[data-testid=board] [data-id=dau]').first().click({ position: { x: 20, y: 60 }, force: true })
check('tap fills the region', (await page.locator('[data-id=dau]').first().getAttribute('fill')) === '#3b82f6')
await page.getByLabel('Cọ vẽ').click()
const box = await page.locator('[data-testid=board]').boundingBox()
await page.mouse.move(box.x + 60, box.y + 330)
await page.mouse.down()
for (let i = 0; i <= 10; i++) await page.mouse.move(box.x + 60 + i * 25, box.y + 330 + Math.sin(i) * 12)
await page.mouse.up()
const inked = () => page.evaluate(() => { const c = document.querySelector('[data-testid=board] canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n })
check('brush paints on the canvas', (await inked()) > 2000)
await shot('03-2d-fill-brush')
await page.getByLabel('Hoàn tác').click()
check('undo removes the stroke', (await inked()) === 0)
await page.getByLabel('Hoàn tác').click()
check('undo removes the fill', (await page.locator('[data-id=dau]').first().getAttribute('fill')) === '#ffffff')
await page.getByLabel('Tô mẫu').click()
await page.waitForSelector('text=Giỏi quá')
check('auto-fill finishes the picture: confetti + done note', (await page.locator('.confetti i').count()) > 20)
await shot('04-2d-done')
await page.getByLabel('Lưu').first().click()
await page.waitForSelector('text=Đã lưu')
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByLabel('Tải ảnh').click()])
const path2d = `${OUT}/saved-2d.png`
await dl.saveAs(path2d)
check('2D save-as-PNG downloads a file', dl.suggestedFilename().endsWith('.png'), dl.suggestedFilename())
await page.getByLabel('Xoá hết').click()
check('clear-all blanks the picture', (await page.locator('[data-id=dau]').first().getAttribute('fill')) === '#ffffff')
await page.getByLabel('Hoàn tác').click()
await page.reload({ waitUntil: 'networkidle' })
check('progress is restored after reload', (await page.locator('[data-id=dau]').first().getAttribute('fill')) !== '#ffffff')

// ---- 3D ----
await page.goto(`${BASE}/#/tuong`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-statue] img')
check('8 statue previews rendered', (await page.locator('[data-statue] img').count()) === 8)
await page.screenshot({ path: `${OUT}/05-statues.png`, fullPage: true })
const statues = await page.locator('[data-statue]').evaluateAll((els) => els.map((e) => e.getAttribute('data-statue')))
const pixel = (x, y) => page.evaluate(([x, y]) => { const c = document.querySelector('[data-testid=stage] canvas'); const r = c.getBoundingClientRect(); const t = document.createElement('canvas'); t.width = c.width; t.height = c.height; const g = t.getContext('2d'); g.drawImage(c, 0, 0); return [...g.getImageData(Math.round(x * c.width / r.width), Math.round(y * c.height / r.height), 1, 1).data].slice(0, 3) }, [x, y])
for (const id of statues) {
  await page.goto(`${BASE}/#/tuong/${id}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid=stage] canvas')
  await page.waitForTimeout(500)
  await shot(`06-3d-${id}-blank`)
  const b = await page.locator('[data-testid=stage]').boundingBox()
  await page.getByLabel('Xoá hết').click({ force: true }).catch(() => {})
  await page.locator('[data-color="#8b5cf6"]').click()
  // find a spot on the statue: first candidate whose pixel turns violet after a tap
  let cx = 0, cy = 0, before, after, painted = false
  for (const [fx, fy] of [[0.5, 0.5], [0.5, 0.45], [0.45, 0.5], [0.55, 0.55], [0.5, 0.4]]) {
    cx = b.width * fx; cy = b.height * fy
    before = await pixel(cx, cy)
    await page.mouse.click(b.x + cx, b.y + cy)
    await page.waitForTimeout(300)
    after = await pixel(cx, cy)
    if (before.join() !== after.join() && after[2] > after[1]) { painted = true; break }
  }
  check(`statue ${id}: tap paints a part`, painted, `${before} -> ${after}`)
  if (id === statues[0]) {
    await page.getByLabel('Cọ vẽ').click()
    await page.locator('[data-color="#fde047"]').click()
    await page.mouse.move(b.x + cx - 40, b.y + cy)
    await page.mouse.down()
    for (let i = 0; i <= 8; i++) await page.mouse.move(b.x + cx - 40 + i * 10, b.y + cy + (i % 2) * 6)
    await page.mouse.up()
    await page.waitForTimeout(300)
    const p = await pixel(cx, cy)
    check('3D brush paints on the surface', p[0] > 150 && p[1] > 130 && p[2] < 120, String(p))
    await shot('07-3d-brush')
    await page.getByLabel('Hoàn tác').click()
    await page.waitForTimeout(300)
    const u = await pixel(cx, cy)
    check('3D undo removes the stroke', u.join() === after.join(), String(u))
    // drag on the background rotates
    await page.getByLabel('Đổ màu').click()
    await page.mouse.move(b.x + 20, b.y + 20)
    await page.mouse.down()
    await page.mouse.move(b.x + 150, b.y + 30, { steps: 6 })
    await page.mouse.up()
    await page.waitForTimeout(400)
    await shot('08-3d-rotated')
    await page.getByLabel('Tự xoay').click()
    const a1 = await page.locator('[data-testid=stage] canvas').screenshot()
    await page.waitForTimeout(700)
    const a2 = await page.locator('[data-testid=stage] canvas').screenshot()
    check('auto-rotate moves the statue', !a1.equals(a2))
    await page.getByLabel('Tự xoay').click()
  }
  await page.getByLabel('Tô mẫu').click()
  await page.waitForTimeout(400)
  await shot(`06-3d-${id}-color`)
}
await page.getByLabel('Lưu').first().click()
await page.waitForSelector('text=Đã lưu')
const [dl3] = await Promise.all([page.waitForEvent('download'), page.getByLabel('Tải ảnh').click()])
await dl3.saveAs(`${OUT}/saved-3d.png`)
check('3D snapshot downloads as PNG', dl3.suggestedFilename().endsWith('.png'), dl3.suggestedFilename())

// ---- gallery ----
await page.goto(`${BASE}/#/bst`, { waitUntil: 'networkidle' })
check('gallery lists the saved works', (await page.locator('img[alt]').count()) >= 2)
await shot('09-gallery')

// ---- PWA / offline ----
const sw = await page.evaluate(async () => !!(await navigator.serviceWorker?.ready.then((r) => r.active)))
check('service worker active', sw)
if (sw) {
  await ctx.setOffline(true)
  await page.goto(`${BASE}/#/tuong/meo`).catch(() => {})
  await page.reload().catch(() => {})
  const ok = await page.waitForSelector('[data-testid=stage] canvas', { timeout: 8000 }).then(() => true, () => false)
  check('works offline after first load (3D editor)', ok)
  await ctx.setOffline(false)
}
const real = errors.filter((e) => !/GL Driver Message|GPU stall/.test(e))
check('no console errors', real.length === 0, real.slice(0, 5).join(' | '))
await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length ? 1 : 0)
