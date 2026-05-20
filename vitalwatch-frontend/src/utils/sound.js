/**
 * utils/sound.js
 * ───────────────
 * Generates alert tones using the Web Audio API.
 * No audio files required.
 * Call initAudio() on first user interaction,
 * then call the play functions as needed.
 */

let audioCtx = null

export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  }
}

function playTone(frequency, duration, volume = 0.35, type = 'sine') {
  if (!audioCtx) return

  const oscillator = audioCtx.createOscillator()
  const gainNode   = audioCtx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioCtx.destination)

  oscillator.type      = type
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime)

  gainNode.gain.setValueAtTime(volume, audioCtx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration)

  oscillator.start(audioCtx.currentTime)
  oscillator.stop(audioCtx.currentTime + duration)
}

function playSequence(tones) {
  let time = 0
  tones.forEach(({ freq, duration, gap = 0 }) => {
    setTimeout(() => playTone(freq, duration), time * 1000)
    time += duration + gap
  })
}

// Warning — soft double beep
export function playWarningAlert() {
  playSequence([
    { freq: 660, duration: 0.15, gap: 0.08 },
    { freq: 660, duration: 0.15 }
  ])
}

// Critical — three rapid high beeps
export function playCriticalAlert() {
  playSequence([
    { freq: 1040, duration: 0.12, gap: 0.06 },
    { freq: 1040, duration: 0.12, gap: 0.06 },
    { freq: 1040, duration: 0.20 }
  ])
}

// All clear — single low soft tone
export function playAllClear() {
  playSequence([
    { freq: 440, duration: 0.4 }
  ])
}

// Escalation — descending urgent tone
export function playEscalationSound() {
  playSequence([
    { freq: 880, duration: 0.15, gap: 0.05 },
    { freq: 660, duration: 0.15, gap: 0.05 },
    { freq: 440, duration: 0.25 }
  ])
}
