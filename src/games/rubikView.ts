import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

/** One quarter turn: axis 0/1/2 = x/y/z, layer -1/0/1, dir +1/-1 (right-hand rule about the positive axis). */
export type Turn = [axis: number, layer: number, dir: number]
// +x, -x, +y, -y, +z, -z
const COLORS = [0xef4444, 0xf97316, 0xffffff, 0xfde047, 0x22c55e, 0x3b82f6]
const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]
const NORMALS = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)]
const TURN_MS = 180
const DRAG_PX = 14

export function randomTurns(count: number, rnd: () => number = Math.random): Turn[] {
  const out: Turn[] = []
  while (out.length < count) {
    const t: Turn = [Math.floor(rnd() * 3), Math.floor(rnd() * 3) - 1, rnd() < 0.5 ? 1 : -1]
    const prev = out.at(-1)
    if (prev && prev[0] === t[0] && prev[1] === t[1]) continue // would cancel or repeat the last turn
    out.push(t)
  }
  return out
}

export class RubikView {
  onTurn: (turn: Turn) => void = () => {}
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  private controls: OrbitControls
  private cubies: THREE.Mesh[] = []
  private pivot = new THREE.Group()
  private ray = new THREE.Raycaster()
  private raf = 0
  private ro: ResizeObserver
  private el: HTMLElement
  private grab: { x: number; y: number; id: number; point: THREE.Vector3; normal: THREE.Vector3; cubie: THREE.Mesh } | null = null
  private anim: { turn: Turn; group: THREE.Mesh[]; start: number } | null = null

  constructor(el: HTMLElement) {
    this.el = el
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.scene.background = new THREE.Color(0xdff3ff)
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xc9d3e2, 2.2))
    const sun = new THREE.DirectionalLight(0xffffff, 1.2)
    sun.position.set(3, 5, 4)
    this.scene.add(sun, this.pivot)
    const geo = new THREE.BoxGeometry(0.94, 0.94, 0.94)
    const inner = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6 })
    const stickers = COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 }))
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++)
        for (let z = -1; z <= 1; z++) {
          if (!x && !y && !z) continue
          const on = [x === 1, x === -1, y === 1, y === -1, z === 1, z === -1]
          const cubie = new THREE.Mesh(geo, on.map((o, i) => (o ? stickers[i] : inner)))
          cubie.userData.home = new THREE.Vector3(x, y, z)
          this.cubies.push(cubie)
          this.scene.add(cubie)
        }
    this.reset()
    const canvas = this.renderer.domElement
    canvas.style.touchAction = 'none'
    canvas.style.display = 'block'
    el.appendChild(canvas)
    // registered before OrbitControls so a drag on the cube can switch the controls off first
    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('pointermove', this.onMove)
    canvas.addEventListener('pointerup', this.onUp)
    canvas.addEventListener('pointercancel', this.onUp)
    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enablePan = false
    this.controls.enableDamping = true
    this.controls.minDistance = 6
    this.controls.maxDistance = 16
    this.camera.position.set(5.2, 4.6, 7.2)
    this.resize()
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(el)
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop)
      this.step(now)
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    }
    this.raf = requestAnimationFrame(loop)
  }

  /** Back to the solved cube. */
  reset() {
    this.finish()
    for (const c of this.cubies) {
      c.position.copy(c.userData.home as THREE.Vector3)
      c.quaternion.identity()
    }
  }

  /** Applies turns at once, without animation (scramble, restoring a saved cube). */
  apply(turns: readonly Turn[]) {
    this.finish()
    for (const t of turns) this.rotate(this.layer(t), t, Math.PI / 2)
  }

  get solved(): boolean {
    const seen: (THREE.Material | undefined)[] = []
    const n = new THREE.Vector3()
    for (const c of this.cubies) {
      const mats = c.material as THREE.Material[]
      const home = c.userData.home as THREE.Vector3
      for (let i = 0; i < 6; i++) {
        if (home.dot(NORMALS[i]) !== 1) continue // not a sticker
        n.copy(NORMALS[i]).applyQuaternion(c.quaternion)
        const dir = NORMALS.findIndex((d) => d.dot(n) > 0.9)
        if (seen[dir] && seen[dir] !== mats[i]) return false
        seen[dir] = mats[i]
      }
    }
    return true
  }

  get busy() {
    return this.anim !== null
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.controls.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private layer(t: Turn) {
    return this.cubies.filter((c) => Math.round(c.position.getComponent(t[0])) === t[1])
  }

  private rotate(group: THREE.Mesh[], t: Turn, angle: number) {
    const q = new THREE.Quaternion().setFromAxisAngle(AXES[t[0]], angle * t[2])
    for (const c of group) {
      c.position.applyQuaternion(q).round()
      c.quaternion.premultiply(q).normalize()
    }
  }

  private turn(t: Turn) {
    if (this.anim) return
    const group = this.layer(t)
    for (const c of group) this.pivot.attach(c)
    this.anim = { turn: t, group, start: performance.now() }
  }

  private step(now: number) {
    const a = this.anim
    if (!a) return
    const k = Math.min(1, (now - a.start) / TURN_MS)
    this.pivot.quaternion.setFromAxisAngle(AXES[a.turn[0]], (Math.PI / 2) * a.turn[2] * (1 - (1 - k) * (1 - k)))
    if (k >= 1) {
      this.finish()
      this.onTurn(a.turn)
    }
  }

  /** Ends a running animation by snapping its layer to the final place. */
  private finish() {
    const a = this.anim
    if (!a) return
    this.anim = null
    this.pivot.quaternion.identity()
    for (const c of a.group) this.scene.add(c) // local transform is still the one from before the turn
    this.rotate(a.group, a.turn, Math.PI / 2)
  }

  private resize() {
    const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    // keep the whole cube inside narrow (portrait) screens
    this.camera.fov = w < h ? THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(17.5)) * (h / w))) : 35
    this.camera.updateProjectionMatrix()
  }

  private screen(v: THREE.Vector3) {
    const p = v.clone().project(this.camera)
    return new THREE.Vector2((p.x * this.el.clientWidth) / 2, (-p.y * this.el.clientHeight) / 2)
  }

  private onDown = (e: PointerEvent) => {
    if (this.grab || this.anim || !e.isPrimary) return
    const r = this.renderer.domElement.getBoundingClientRect()
    this.ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera)
    const hit = this.ray.intersectObjects(this.cubies, false)[0]
    if (!hit?.face) return // background: OrbitControls spins the whole cube
    const normal = hit.face.normal.clone().applyQuaternion(hit.object.quaternion).round()
    this.grab = { x: e.clientX, y: e.clientY, id: e.pointerId, point: hit.point.clone(), normal, cubie: hit.object as THREE.Mesh }
    this.controls.enabled = false
  }

  private onMove = (e: PointerEvent) => {
    const g = this.grab
    if (!g || e.pointerId !== g.id) return
    const drag = new THREE.Vector2(e.clientX - g.x, e.clientY - g.y)
    if (drag.length() < DRAG_PX) return
    // which of the two directions lying in the touched face does the finger follow?
    const origin = this.screen(g.point)
    let best: { t: THREE.Vector3; along: number } | null = null
    for (const axis of AXES) {
      if (Math.abs(axis.dot(g.normal)) > 0.5) continue
      const s = this.screen(g.point.clone().add(axis)).sub(origin).normalize()
      const along = s.dot(drag)
      if (!best || Math.abs(along) > Math.abs(best.along)) best = { t: axis, along }
    }
    this.release()
    if (!best) return
    // turning about n × t carries the touched face along +t
    const r = g.normal.clone().cross(best.t)
    const axis = AXES.findIndex((a) => Math.abs(a.dot(r)) > 0.5)
    const sign = Math.sign(r.getComponent(axis)) * Math.sign(best.along)
    this.turn([axis, Math.round(g.cubie.position.getComponent(axis)), sign])
  }

  private onUp = (e: PointerEvent) => {
    if (this.grab && e.pointerId === this.grab.id) this.release()
  }

  private release() {
    this.grab = null
    this.controls.enabled = true
  }
}
