import { ref } from 'vue'
import { AUDIO } from '~/game/constants-audio'

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
      case 'footstep': {
        const p = AUDIO.footstep
        osc.type = 'square'
        osc.frequency.setValueAtTime(p.freqMin + Math.random() * p.freqRange, now)
        osc.frequency.exponentialRampToValueAtTime(p.freqEnd, now + p.duration)
        gain.gain.setValueAtTime(p.gain, now)
        gain.gain.exponentialRampToValueAtTime(p.gainEnd, now + p.duration)
        osc.start(now)
        osc.stop(now + p.duration)
        break
      }
      case 'huff': {
        const p = AUDIO.huff
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(p.freqStart, now)
        osc.frequency.exponentialRampToValueAtTime(p.freqEnd, now + p.duration)
        gain.gain.setValueAtTime(p.gain, now)
        gain.gain.exponentialRampToValueAtTime(p.gainEnd, now + p.duration)
        osc.start(now)
        osc.stop(now + p.duration)
        break
      }
      case 'push': {
        const p = AUDIO.push
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(p.freqStart, now)
        osc.frequency.exponentialRampToValueAtTime(p.freqEnd, now + p.rampDuration)
        gain.gain.setValueAtTime(p.gain, now)
        gain.gain.exponentialRampToValueAtTime(p.gainEnd, now + p.duration)
        osc.start(now)
        osc.stop(now + p.duration)
        break
      }
      case 'slip': {
        const p = AUDIO.slip
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(p.freqStart, now)
        osc.frequency.exponentialRampToValueAtTime(p.freqEnd, now + p.duration)
        gain.gain.setValueAtTime(p.gain, now)
        gain.gain.exponentialRampToValueAtTime(p.gainEnd, now + p.duration)
        osc.start(now)
        osc.stop(now + p.duration)
        break
      }
      case 'crush': {
        const p = AUDIO.crush
        osc.type = 'square'
        osc.frequency.setValueAtTime(p.freqStart, now)
        osc.frequency.exponentialRampToValueAtTime(p.freqEnd, now + p.duration)
        gain.gain.setValueAtTime(p.gain, now)
        gain.gain.exponentialRampToValueAtTime(p.gainEnd, now + p.duration)
        osc.start(now)
        osc.stop(now + p.duration)
        break
      }
      case 'roll': {
        const p = AUDIO.roll
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(p.freqMin + Math.random() * p.freqRange, now)
        gain.gain.setValueAtTime(p.gain, now)
        gain.gain.exponentialRampToValueAtTime(p.gainEnd, now + p.duration)
        osc.start(now)
        osc.stop(now + p.duration)
        break
      }
      case 'levelup': {
        const p = AUDIO.levelup
        osc.type = 'square'
        for (let i = 0; i < p.notes.length; i++) {
          osc.frequency.setValueAtTime(p.notes[i], now + p.noteTimes[i])
        }
        gain.gain.setValueAtTime(p.gain, now)
        gain.gain.exponentialRampToValueAtTime(p.gainEnd, now + p.duration)
        osc.start(now)
        osc.stop(now + p.duration)
        break
      }
      case 'bark': {
        const p = AUDIO.bark
        osc.type = 'square'
        osc.frequency.setValueAtTime(p.freqStart, now)
        osc.frequency.setValueAtTime(p.freqPeak, now + p.peakTime)
        osc.frequency.exponentialRampToValueAtTime(p.freqEnd, now + p.duration)
        gain.gain.setValueAtTime(p.gain, now)
        gain.gain.exponentialRampToValueAtTime(p.gainEnd, now + p.duration)
        osc.start(now)
        osc.stop(now + p.duration)
        break
      }
      case 'thunder': {
        const p = AUDIO.thunder
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(p.freqStart, now)
        osc.frequency.exponentialRampToValueAtTime(p.freqEnd, now + p.duration)
        gain.gain.setValueAtTime(p.gain, now)
        gain.gain.exponentialRampToValueAtTime(p.gainEnd, now + p.duration)
        osc.start(now)
        osc.stop(now + p.duration)
        break
      }
      case 'laser': {
        const p = AUDIO.laser
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(p.freqStart, now)
        osc.frequency.exponentialRampToValueAtTime(p.freqMid, now + p.rampDownTime)
        osc.frequency.exponentialRampToValueAtTime(p.freqPeak, now + p.duration)
        gain.gain.setValueAtTime(p.gain, now)
        gain.gain.exponentialRampToValueAtTime(p.gainEnd, now + p.duration)
        osc.start(now)
        osc.stop(now + p.duration)
        break
      }
    }
  }

  function closeAudio() {
    if (audioCtx) audioCtx.close()
  }

  return { initAudio, play8BitSound, closeAudio, muted, toggleMute }
}
