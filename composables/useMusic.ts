import { type Ref, watch } from 'vue'
import { MUSIC_TRACKS, type MusicTrackName } from '~/game/constants-audio'

// ── Procedural 8-bit Music Engine ────────────────────────────────────
// Schedules oscillator notes in a look-ahead loop against the shared
// AudioContext from useAudio. Each track loops continuously until
// stopMusic() is called or a different track is started.

const SCHEDULE_AHEAD_S = 0.2
const SCHEDULE_INTERVAL_MS = 100
const FADE_OUT_S = 0.3
const NOTE_RELEASE_S = 0.02 // tiny gap between notes to avoid clicks

export function useMusic(
  getAudioCtx: () => AudioContext | null,
  muted: Ref<boolean>,
) {
  let currentTrack: MusicTrackName | null = null
  let schedulerTimer: ReturnType<typeof setInterval> | null = null
  let nextNoteTime = 0
  let noteIndex = 0
  let musicGain: GainNode | null = null
  let activeOscillators: OscillatorNode[] = []

  function ensureMusicGain(): GainNode | null {
    const ctx = getAudioCtx()
    if (!ctx) return null
    if (!musicGain || musicGain.context !== ctx) {
      musicGain = ctx.createGain()
      musicGain.connect(ctx.destination)
    }
    return musicGain
  }

  function scheduleNotes() {
    const ctx = getAudioCtx()
    if (!ctx || !currentTrack || muted.value) return

    const gain = ensureMusicGain()
    if (!gain) return

    const track = MUSIC_TRACKS[currentTrack]
    const now = ctx.currentTime

    while (nextNoteTime < now + SCHEDULE_AHEAD_S) {
      const note = track.notes[noteIndex]
      const noteDuration = note.duration - NOTE_RELEASE_S

      if (note.freq > 0 && noteDuration > 0) {
        const osc = ctx.createOscillator()
        const noteGain = ctx.createGain()
        osc.type = track.wave
        osc.frequency.setValueAtTime(note.freq, nextNoteTime)
        noteGain.gain.setValueAtTime(track.gain, nextNoteTime)
        noteGain.gain.exponentialRampToValueAtTime(0.001, nextNoteTime + noteDuration)
        osc.connect(noteGain)
        noteGain.connect(gain)
        osc.start(nextNoteTime)
        osc.stop(nextNoteTime + noteDuration)
        osc.onended = () => {
          const idx = activeOscillators.indexOf(osc)
          if (idx !== -1) activeOscillators.splice(idx, 1)
        }
        activeOscillators.push(osc)
      }

      nextNoteTime += note.duration
      noteIndex = (noteIndex + 1) % track.notes.length
    }
  }

  function startMusic(track: MusicTrackName) {
    if (currentTrack === track) return

    stopMusicImmediate()

    const ctx = getAudioCtx()
    if (!ctx) return

    currentTrack = track
    noteIndex = 0
    nextNoteTime = ctx.currentTime

    const gain = ensureMusicGain()
    if (gain) gain.gain.setValueAtTime(1, ctx.currentTime)

    scheduleNotes()
    schedulerTimer = setInterval(scheduleNotes, SCHEDULE_INTERVAL_MS)
  }

  function stopMusic() {
    if (!currentTrack) return

    const ctx = getAudioCtx()
    if (ctx && musicGain) {
      const now = ctx.currentTime
      musicGain.gain.setValueAtTime(musicGain.gain.value, now)
      musicGain.gain.exponentialRampToValueAtTime(0.001, now + FADE_OUT_S)
    }

    const track = currentTrack
    currentTrack = null

    if (schedulerTimer !== null) {
      clearInterval(schedulerTimer)
      schedulerTimer = null
    }

    // Let fade complete, then disconnect oscillators
    setTimeout(() => {
      if (currentTrack !== null) return // new track started during fade
      for (const osc of activeOscillators) {
        try { osc.stop() } catch (_) { /* already stopped */ }
      }
      activeOscillators = []
    }, FADE_OUT_S * 1000 + 50)
  }

  function stopMusicImmediate() {
    currentTrack = null
    if (schedulerTimer !== null) {
      clearInterval(schedulerTimer)
      schedulerTimer = null
    }
    for (const osc of activeOscillators) {
      try { osc.stop() } catch (_) { /* already stopped */ }
    }
    activeOscillators = []
  }

  // Pause/resume music when mute toggles
  watch(muted, (isMuted) => {
    if (isMuted) {
      if (schedulerTimer !== null) {
        clearInterval(schedulerTimer)
        schedulerTimer = null
      }
      for (const osc of activeOscillators) {
        try { osc.stop() } catch (_) { /* already stopped */ }
      }
      activeOscillators = []
    } else if (currentTrack) {
      // Resume: restart scheduling from now
      const ctx = getAudioCtx()
      if (ctx) {
        noteIndex = 0
        nextNoteTime = ctx.currentTime
        const gain = ensureMusicGain()
        if (gain) gain.gain.setValueAtTime(1, ctx.currentTime)
        scheduleNotes()
        schedulerTimer = setInterval(scheduleNotes, SCHEDULE_INTERVAL_MS)
      }
    }
  })

  return { startMusic, stopMusic }
}
