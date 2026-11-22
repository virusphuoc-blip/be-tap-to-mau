import { isMuted } from './storage'

/** All sounds are synthesized with Web Audio; the app ships no audio files. */
let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  if (isMuted()) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(ac: AudioContext, freq: number, at: number, dur: number, vol = 0.18, type: OscillatorType = 'sine') {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(gain).connect(ac.destination)
  osc.start(at)
  osc.stop(at + dur + 0.05)
}

/** Short "pop" when a region is filled. */
export function pop() {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.frequency.setValueAtTime(520, t)
  osc.frequency.exponentialRampToValueAtTime(880, t + 0.08)
  gain.gain.setValueAtTime(0.15, t)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
  osc.connect(gain).connect(ac.destination)
  osc.start(t)
  osc.stop(t + 0.15)
}

/** Happy fanfare when a picture is finished. */
export function cheer() {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime
  const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5]
  notes.forEach((f, i) => tone(ac, f, t + i * 0.11, 0.3, 0.16, 'triangle'))
  ;[1568, 2093, 2637].forEach((f, i) => tone(ac, f, t + 0.8 + i * 0.07, 0.4, 0.07))
}
