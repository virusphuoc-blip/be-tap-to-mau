import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Op } from '../lib/paint'
import { type Prim, type Statue, STATUES, sampleColors3d } from './statues'

const BLANK = '#ffffff'
const SKY_COLOR = 0xdff3ff

const geoCache = new Map<string, THREE.BufferGeometry>()
function geometry(g: Prim['g']): THREE.BufferGeometry {
  let geo = geoCache.get(g)
  if (!geo) {
    geo =
      g === 'sph' ? new THREE.SphereGeometry(1, 32, 20)
      : g === 'box' ? new THREE.BoxGeometry(2, 2, 2)
      : g === 'cyl' ? new THREE.CylinderGeometry(1, 1, 2, 28)
      : g === 'cone' ? new THREE.ConeGeometry(1, 2, 28)
      : new THREE.TorusGeometry(1, 0.17, 12, 36)
    geoCache.set(g, geo)
  }
  return geo
}

/** A paintable mesh with its own canvas texture. */
type Surface = { mesh: THREE.Mesh; part: string; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture; sphere: boolean }

const outlineMat = new THREE.MeshBasicMaterial({ color: 0x2b2b2b, side: THREE.BackSide })

function place(mesh: THREE.Object3D, m: Prim) {
  mesh.position.set(...m.p)
  mesh.scale.set(...m.s)
  if (m.r) mesh.rotation.set(...m.r)
}

function addOutline(mesh: THREE.Mesh, m: Prim, t = 0.022) {
  const o = new THREE.Mesh(mesh.geometry, outlineMat)
  o.scale.set(1 + t / m.s[0], 1 + t / m.s[1], 1 + t / m.s[2])
  o.raycast = () => {}
  mesh.add(o)
}

export function buildStatue(def: Statue): { group: THREE.Group; surfaces: Surface[] } {
  const group = new THREE.Group()
  const surfaces: Surface[] = []
  for (const part of def.parts) {
    for (const m of part.m) {
      const big = Math.max(...m.s) > 0.3
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = big ? 256 : 96
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = BLANK
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      const mesh = new THREE.Mesh(geometry(m.g), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0 }))
      place(mesh, m)
      if (m.g !== 'tor') addOutline(mesh, m)
      group.add(mesh)
      surfaces.push({ mesh, part: part.id, canvas, ctx, tex, sphere: m.g === 'sph' })
    }
  }
  for (const fx of def.fixed) {
    const mat = new THREE.MeshStandardMaterial({ color: fx.color, roughness: 0.3 })
    for (const m of fx.m) {
      const mesh = new THREE.Mesh(geometry(m.g), mat)
      place(mesh, m)
      group.add(mesh)
    }
  }
  // pedestal
  const box = new THREE.Box3().setFromObject(group)
  const r = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.5 + 0.15
  const base = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.06, 0.14, 48), new THREE.MeshStandardMaterial({ color: 0xfff7d6, roughness: 0.8 }))
  base.position.set((box.max.x + box.min.x) / 2, box.min.y - 0.07, (box.max.z + box.min.z) / 2)
  group.add(base)
  return { group, surfaces }
}

function fillSurface(s: Surface, color: string | null) {
  s.ctx.fillStyle = color ?? BLANK
  s.ctx.fillRect(0, 0, s.canvas.width, s.canvas.height)
  s.tex.needsUpdate = true
}

/** Stamps brush dots along uv points (u,v pairs). `size` is relative to a 256px texture. */
function strokeSurface(s: Surface, pts: readonly number[], color: string | null, size: number) {
  const { ctx, canvas } = s
  const W = canvas.width
  const ry = (size * W) / 256
  const rx = s.sphere ? ry / 2 : ry
  ctx.fillStyle = color ?? BLANK
  const dot = (u: number, v: number) => {
    for (const du of [0, -1, 1]) {
      const x = (u + du) * W
      if (x < -rx || x > W + rx) continue
      ctx.beginPath()
      ctx.ellipse(x, (1 - v) * W, rx, ry, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  for (let i = 0; i < pts.length; i += 2) {
    const u = pts[i], v = pts[i + 1]
    if (i >= 2) {
      const pu = pts[i - 2], pv = pts[i - 1]
      const dist = Math.hypot(u - pu, v - pv)
      // do not connect across the texture seam
      if (dist < 0.35) {
        const steps = Math.ceil((dist * W) / Math.max(1, rx * 0.5))
        for (let k = 1; k < steps; k++) dot(pu + ((u - pu) * k) / steps, pv + ((v - pv) * k) / steps)
      }
    }
    dot(u, v)
  }
  s.tex.needsUpdate = true
}

/** Repaints all textures from the operation list. */
export function replay(surfaces: Surface[], ops: readonly Op[]) {
  for (const s of surfaces) fillSurface(s, null)
  for (const op of ops) {
    if (op.t === 'clear') for (const s of surfaces) fillSurface(s, null)
    else if (op.t === 'fillAll') for (const s of surfaces) fillSurface(s, op.colors[s.part] ?? null)
    else if (op.t === 'fill') {
      for (const s of surfaces) if (s.part === op.id) fillSurface(s, op.color)
    } else if (op.target != null && surfaces[op.target]) strokeSurface(surfaces[op.target], op.pts, op.color, op.size)
  }
}

function lights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9c4d6, 1.5))
  const sun = new THREE.DirectionalLight(0xffffff, 1.6)
  sun.position.set(2.5, 4, 5)
  scene.add(sun)
}

function frame(camera: THREE.PerspectiveCamera, group: THREE.Object3D, az = 0.6, el = 0.22) {
  const sphere = new THREE.Box3().setFromObject(group).getBoundingSphere(new THREE.Sphere())
  const fov = (camera.fov * Math.PI) / 180
  const fit = Math.min(fov, 2 * Math.atan(Math.tan(fov / 2) * camera.aspect))
  const dist = (sphere.radius / Math.sin(fit / 2)) * 0.8
  camera.position.set(
    sphere.center.x + dist * Math.sin(az) * Math.cos(el),
    sphere.center.y + dist * Math.sin(el),
    sphere.center.z + dist * Math.cos(az) * Math.cos(el),
  )
  camera.lookAt(sphere.center)
  return { center: sphere.center, dist }
}

export type Tool = 'fill' | 'brush' | 'eraser'
export type ViewEvents = {
  /** A part was tapped with the fill tool (or the eraser). */
  onTap: (part: string) => void
  /** A brush stroke ended: one piece per mesh it touched. */
  onStroke: (pieces: { target: number; pts: number[] }[]) => void
}

/** Interactive statue view: rotate / zoom with OrbitControls, tap to fill, drag to brush. */
export class StatueView {
  tool: Tool = 'fill'
  color = '#ef4444'
  size = 14
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
  private controls: OrbitControls
  private surfaces: Surface[]
  private meshes: THREE.Mesh[]
  private raf = 0
  private ray = new THREE.Raycaster()
  private ro: ResizeObserver
  private down: { x: number; y: number; id: number } | null = null
  private pieces: { target: number; pts: number[] }[] | null = null
  private el: HTMLElement
  private events: ViewEvents

  constructor(el: HTMLElement, def: Statue, events: ViewEvents) {
    this.el = el
    this.events = events
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.scene.background = new THREE.Color(SKY_COLOR)
    lights(this.scene)
    const { group, surfaces } = buildStatue(def)
    this.surfaces = surfaces
    this.meshes = surfaces.map((s) => s.mesh)
    this.scene.add(group)
    const canvas = this.renderer.domElement
    canvas.style.touchAction = 'none'
    canvas.style.display = 'block'
    el.appendChild(canvas)
    // registered before OrbitControls so painting can switch the controls off first
    canvas.addEventListener('pointerdown', this.onDown)
    canvas.addEventListener('pointermove', this.onMove)
    canvas.addEventListener('pointerup', this.onUp)
    canvas.addEventListener('pointercancel', this.onUp)
    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enablePan = false
    this.controls.enableDamping = true
    this.controls.autoRotateSpeed = 4
    this.resize()
    const { center, dist } = frame(this.camera, group)
    this.controls.target.copy(center)
    this.controls.minDistance = dist * 0.45
    this.controls.maxDistance = dist * 1.6
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(el)
    const loop = () => {
      this.raf = requestAnimationFrame(loop)
      this.controls.update()
      this.renderer.render(this.scene, this.camera)
    }
    loop()
  }

  set autoRotate(on: boolean) {
    this.controls.autoRotate = on
  }

  replay(ops: readonly Op[]) {
    replay(this.surfaces, ops)
  }

  /** PNG data URL of the statue from the current camera angle. */
  snapshot(): string {
    this.renderer.render(this.scene, this.camera)
    return this.renderer.domElement.toDataURL('image/png')
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.controls.dispose()
    for (const s of this.surfaces) {
      s.tex.dispose()
      ;(s.mesh.material as THREE.Material).dispose()
    }
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private resize() {
    const w = Math.max(1, this.el.clientWidth), h = Math.max(1, this.el.clientHeight)
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  private hit(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect()
    this.ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera)
    const h = this.ray.intersectObjects(this.meshes, false)[0]
    if (!h || !h.uv) return null
    return { target: this.meshes.indexOf(h.object as THREE.Mesh), u: h.uv.x, v: h.uv.y }
  }

  private paint(e: PointerEvent) {
    const h = this.hit(e)
    if (!h || !this.pieces) return
    let piece = this.pieces[this.pieces.length - 1]
    if (!piece || piece.target !== h.target) {
      piece = { target: h.target, pts: [] }
      this.pieces.push(piece)
    }
    const n = piece.pts.length
    const u = Math.round(h.u * 1000) / 1000, v = Math.round(h.v * 1000) / 1000
    piece.pts.push(u, v)
    const color = this.tool === 'eraser' ? null : this.color
    strokeSurface(this.surfaces[h.target], n ? [piece.pts[n - 2], piece.pts[n - 1], u, v] : [u, v], color, this.size)
  }

  private onDown = (e: PointerEvent) => {
    if (this.down) {
      // second finger: stop painting, let the controls zoom
      if (this.pieces) this.endStroke()
      this.down = null
      return
    }
    this.down = { x: e.clientX, y: e.clientY, id: e.pointerId }
    if (this.tool !== 'fill' && this.hit(e)) {
      this.controls.enabled = false
      this.pieces = []
      this.renderer.domElement.setPointerCapture(e.pointerId)
      this.paint(e)
    }
  }

  private onMove = (e: PointerEvent) => {
    if (this.pieces && this.down?.id === e.pointerId) this.paint(e)
  }

  private endStroke() {
    const pieces = this.pieces
    this.pieces = null
    this.controls.enabled = true
    if (pieces && pieces.length) this.events.onStroke(pieces)
  }

  private onUp = (e: PointerEvent) => {
    const d = this.down
    if (!d || d.id !== e.pointerId) return
    this.down = null
    const tap = Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10
    if (this.pieces) {
      const pieces = this.pieces
      // an eraser tap wipes the whole part
      if (this.tool === 'eraser' && tap && pieces.length === 1 && pieces[0].pts.length <= 4) {
        this.pieces = null
        this.controls.enabled = true
        this.events.onTap(this.surfaces[pieces[0].target].part)
      } else this.endStroke()
    } else if (this.tool === 'fill' && tap) {
      const h = this.hit(e)
      if (h) this.events.onTap(this.surfaces[h.target].part)
    }
  }
}

let thumbCache: Record<string, string> | null = null
/** Renders a colored preview of every statue (used by the statue picker). */
export function statueThumbs(size = 320): Record<string, string> {
  if (thumbCache) return thumbCache
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setSize(size, size)
  const out: Record<string, string> = {}
  for (const def of STATUES) {
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(SKY_COLOR)
    lights(scene)
    const { group, surfaces } = buildStatue(def)
    replay(surfaces, [{ t: 'fillAll', colors: sampleColors3d(def) }])
    scene.add(group)
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    frame(camera, group)
    renderer.render(scene, camera)
    out[def.id] = renderer.domElement.toDataURL('image/jpeg', 0.85)
    for (const s of surfaces) {
      s.tex.dispose()
      ;(s.mesh.material as THREE.Material).dispose()
    }
  }
  renderer.dispose()
  renderer.forceContextLoss()
  thumbCache = out
  return out
}
