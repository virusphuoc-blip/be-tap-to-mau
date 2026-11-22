import { type Item, svgMarkup } from '../data/shapes'
import { type StrokeOp, drawStrokes } from './paint'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

/** Renders a 2D picture (fills + brush strokes + line art) to a canvas. */
export async function renderPicture(items: readonly Item[], fills: Record<string, string>, strokes: readonly StrokeOp[], size = 1024): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, size, size)
  const url = URL.createObjectURL(new Blob([svgMarkup(items, fills, size)], { type: 'image/svg+xml' }))
  try {
    ctx.drawImage(await loadImage(url), 0, 0, size, size)
  } finally {
    URL.revokeObjectURL(url)
  }
  if (strokes.length) {
    const layer = document.createElement('canvas')
    layer.width = layer.height = size
    drawStrokes(layer.getContext('2d')!, strokes, size / 400)
    ctx.globalCompositeOperation = 'multiply'
    ctx.drawImage(layer, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
  }
  return canvas
}

/** Scales any image down to a small JPEG data URL for the gallery. */
export async function toThumb(source: HTMLCanvasElement | string, max = 480): Promise<string> {
  const img = typeof source === 'string' ? await loadImage(source) : source
  const w = img.width, h = img.height
  const k = Math.min(1, max / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.round(w * k)
  c.height = Math.round(h * k)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.85)
}

export async function toPngBlob(source: HTMLCanvasElement | string): Promise<Blob> {
  let canvas: HTMLCanvasElement
  if (typeof source === 'string') {
    const img = await loadImage(source)
    canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    canvas.getContext('2d')!.drawImage(img, 0, 0)
  } else canvas = source
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png failed'))), 'image/png'))
}

export const fileName = (name: string) => `be-to-mau-${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-')}.png`

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function canShareFiles(): boolean {
  try {
    return !!navigator.canShare && navigator.canShare({ files: [new File([''], 'a.png', { type: 'image/png' })] })
  } catch {
    return false
  }
}

export async function shareBlob(blob: Blob, name: string, title: string): Promise<void> {
  try {
    await navigator.share({ files: [new File([blob], name, { type: 'image/png' })], title })
  } catch {
    // the share sheet was dismissed
  }
}
