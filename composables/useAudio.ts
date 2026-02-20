import { ref } from 'vue'

type SoundType = 'footstep' | 'huff' | 'push' | 'slip' | 'crush' | 'roll' | 'levelup' | 'bark' | 'thunder' | 'laser'

let audioCtx: AudioContext | null = null
const muted = ref(false)

export function useAudio() {
  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  function toggleMute() {
    muted.value = !muted.value
  }

  function play8BitSound(type: SoundType) {
    if (!audioCtx || muted.value) return
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    const now = audioCtx.currentTime

    switch (type) {
      case 'footstep':
        osc.type = 'square'
        osc.frequency.setValueAtTime(80 + Math.random() * 40, now)
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.05)
        gain.gain.setValueAtTime(0.08, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05)
        osc.start(now)
        osc.stop(now + 0.05)
        break
      case 'huff':
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(150, now)
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.15)
        gain.gain.setValueAtTime(0.04, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
        osc.start(now)
        osc.stop(now + 0.15)
        break
      case 'push':
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(100, now)
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.03)
        gain.gain.setValueAtTime(0.12, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08)
        osc.start(now)
        osc.stop(now + 0.08)
        break
      case 'slip':
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(200, now)
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.2)
        gain.gain.setValueAtTime(0.08, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
        osc.start(now)
        osc.stop(now + 0.2)
        break
      case 'crush':
        osc.type = 'square'
        osc.frequency.setValueAtTime(100, now)
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.5)
        gain.gain.setValueAtTime(0.25, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5)
        osc.start(now)
        osc.stop(now + 0.5)
        break
      case 'roll':
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(50 + Math.random() * 30, now)
        gain.gain.setValueAtTime(0.06, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08)
        osc.start(now)
        osc.stop(now + 0.08)
        break
      case 'levelup':
        osc.type = 'square'
        osc.frequency.setValueAtTime(440, now)
        osc.frequency.setValueAtTime(554, now + 0.1)
        osc.frequency.setValueAtTime(659, now + 0.2)
        gain.gain.setValueAtTime(0.15, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
        osc.start(now)
        osc.stop(now + 0.4)
        break
      case 'bark':
        osc.type = 'square'
        osc.frequency.setValueAtTime(300, now)
        osc.frequency.setValueAtTime(450, now + 0.05)
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.12)
        gain.gain.setValueAtTime(0.1, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12)
        osc.start(now)
        osc.stop(now + 0.12)
        break
      case 'thunder':
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(80, now)
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.6)
        gain.gain.setValueAtTime(0.2, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6)
        osc.start(now)
        osc.stop(now + 0.6)
        break
      case 'laser':
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(800, now)
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.3)
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.5)
        gain.gain.setValueAtTime(0.1, now)
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5)
        osc.start(now)
        osc.stop(now + 0.5)
        break
    }
  }

  function closeAudio() {
    if (audioCtx) audioCtx.close()
  }

  return { initAudio, play8BitSound, closeAudio, muted, toggleMute }
}
