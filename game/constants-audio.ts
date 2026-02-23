// ── Audio Synthesis Parameters ────────────────────────────────────────
// 8-bit sound effect definitions for Web Audio API oscillators.

export const AUDIO = {
  footstep: { freqMin: 80, freqRange: 40, freqEnd: 40, duration: 0.05, gain: 0.08, gainEnd: 0.01 },
  huff: { freqStart: 150, freqEnd: 80, duration: 0.15, gain: 0.04, gainEnd: 0.01 },
  push: { freqStart: 100, freqEnd: 180, rampDuration: 0.03, duration: 0.08, gain: 0.12, gainEnd: 0.01 },
  slip: { freqStart: 200, freqEnd: 50, duration: 0.2, gain: 0.08, gainEnd: 0.01 },
  crush: { freqStart: 100, freqEnd: 30, duration: 0.5, gain: 0.25, gainEnd: 0.01 },
  roll: { freqMin: 50, freqRange: 30, duration: 0.08, gain: 0.06, gainEnd: 0.01 },
  levelup: { notes: [440, 554, 659] as readonly number[], noteTimes: [0, 0.1, 0.2] as readonly number[], duration: 0.4, gain: 0.15, gainEnd: 0.01 },
  bark: { freqStart: 300, freqPeak: 450, peakTime: 0.05, freqEnd: 200, duration: 0.12, gain: 0.1, gainEnd: 0.01 },
  thunder: { freqStart: 80, freqEnd: 20, duration: 0.6, gain: 0.2, gainEnd: 0.01 },
  laser: { freqStart: 800, freqMid: 200, rampDownTime: 0.3, freqPeak: 600, duration: 0.5, gain: 0.1, gainEnd: 0.01 },
  squawk: { freqStart: 600, freqPeak: 900, peakTime: 0.03, freqEnd: 400, duration: 0.1, gain: 0.08, gainEnd: 0.01 },
} as const

// ── Music Track Definitions ──────────────────────────────────────────
// Each track is a sequence of { freq, duration } notes with a wave type and gain.
// freq=0 means a rest (silence). Tracks loop continuously.

export type MusicTrackName = 'pushing' | 'rolling' | 'credits'

interface MusicNote { freq: number; duration: number }
interface MusicTrack { wave: OscillatorType; gain: number; notes: readonly MusicNote[] }

// Helper: note frequencies (octave 2-5)
const N = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, Bb2: 116.54, B2: 123.47,
  C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61,
  G3: 196.00, Ab3: 207.65, A3: 220.00, Bb3: 233.08, B3: 246.94,
  C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23,
  G4: 392.00, Ab4: 415.30, A4: 440.00, Bb4: 466.16, B4: 493.88,
  C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.25, F5: 698.46, G5: 783.99,
  R: 0, // rest
} as const

// Shorthand note builder at a given duration
const n = (freq: number, duration: number) => ({ freq, duration })
const r = (duration: number) => ({ freq: 0, duration })

export const MUSIC_TRACKS: Record<MusicTrackName, MusicTrack> = {

  // ── Pushing: Phrygian lament (~30s) ──────────────────────────────
  // Slow, mournful, ancient Greek. AABA' form with development.
  pushing: {
    wave: 'square',
    gain: 0.06,
    notes: [
      // === A section: Phrygian descent (the weight of the stone) ===
      n(N.E4, 0.28), n(N.F4, 0.22), n(N.E4, 0.28), n(N.D4, 0.22),
      n(N.C4, 0.35), r(0.15),
      n(N.E4, 0.22), n(N.G4, 0.28), n(N.F4, 0.22), n(N.E4, 0.35),
      r(0.18),
      n(N.D4, 0.28), n(N.C4, 0.22), n(N.B3, 0.28), n(N.C4, 0.35),
      r(0.15),
      n(N.F4, 0.22), n(N.E4, 0.22), n(N.D4, 0.28), n(N.E4, 0.45),
      r(0.30),

      // === A section repeat with variation ===
      n(N.E4, 0.28), n(N.F4, 0.22), n(N.G4, 0.22), n(N.F4, 0.22),
      n(N.E4, 0.35), r(0.15),
      n(N.D4, 0.22), n(N.E4, 0.28), n(N.F4, 0.22), n(N.D4, 0.35),
      r(0.18),
      n(N.C4, 0.28), n(N.D4, 0.22), n(N.E4, 0.22), n(N.D4, 0.28),
      n(N.C4, 0.35), r(0.15),
      n(N.B3, 0.22), n(N.C4, 0.22), n(N.D4, 0.22), n(N.E4, 0.50),
      r(0.30),

      // === B section: higher register, yearning (reaching the peak) ===
      n(N.G4, 0.28), n(N.A4, 0.22), n(N.Bb4, 0.28), n(N.A4, 0.22),
      n(N.G4, 0.35), r(0.15),
      n(N.A4, 0.22), n(N.Bb4, 0.28), n(N.C5, 0.35), n(N.Bb4, 0.22),
      n(N.A4, 0.28), r(0.18),
      n(N.G4, 0.28), n(N.F4, 0.22), n(N.E4, 0.28), n(N.F4, 0.22),
      n(N.G4, 0.40), r(0.15),
      n(N.A4, 0.22), n(N.G4, 0.22), n(N.F4, 0.28), n(N.E4, 0.50),
      r(0.35),

      // === A' section: return, wearier (the eternal return) ===
      n(N.E4, 0.32), n(N.F4, 0.25), n(N.E4, 0.32), n(N.D4, 0.25),
      n(N.C4, 0.40), r(0.18),
      n(N.D4, 0.25), n(N.E4, 0.32), n(N.F4, 0.25), n(N.E4, 0.40),
      r(0.20),
      n(N.D4, 0.32), n(N.C4, 0.25), n(N.B3, 0.32), n(N.C4, 0.25),
      n(N.D4, 0.32), r(0.18),
      n(N.C4, 0.25), n(N.B3, 0.25), n(N.A3, 0.32), n(N.E4, 0.60),
      r(0.45),
    ],
  },

  // ── Rolling: major key romp (~20s) ───────────────────────────────
  // Fast, bouncy, almost mocking. The boulder's having a great time.
  rolling: {
    wave: 'triangle',
    gain: 0.07,
    notes: [
      // === A section: tumbling arpeggios ===
      n(N.C4, 0.09), n(N.E4, 0.09), n(N.G4, 0.09), n(N.C5, 0.14),
      r(0.06),
      n(N.B4, 0.09), n(N.G4, 0.09), n(N.E4, 0.09), n(N.C4, 0.14),
      r(0.06),
      n(N.D4, 0.09), n(N.F4, 0.09), n(N.A4, 0.09), n(N.D5, 0.14),
      r(0.06),
      n(N.C5, 0.09), n(N.A4, 0.09), n(N.F4, 0.09), n(N.D4, 0.14),
      r(0.08),

      // === A section variation: same shape, different landing ===
      n(N.E4, 0.09), n(N.G4, 0.09), n(N.B4, 0.09), n(N.E5, 0.14),
      r(0.06),
      n(N.D5, 0.09), n(N.B4, 0.09), n(N.G4, 0.09), n(N.E4, 0.14),
      r(0.06),
      n(N.F4, 0.09), n(N.A4, 0.09), n(N.C5, 0.09), n(N.F5, 0.14),
      r(0.06),
      n(N.E5, 0.09), n(N.C5, 0.09), n(N.A4, 0.09), n(N.F4, 0.14),
      r(0.08),

      // === B section: syncopated bounce ===
      n(N.G4, 0.12), n(N.R, 0.06), n(N.G4, 0.08), n(N.A4, 0.12),
      n(N.B4, 0.12), n(N.C5, 0.16), r(0.06),
      n(N.E5, 0.12), n(N.R, 0.06), n(N.D5, 0.08), n(N.C5, 0.12),
      n(N.B4, 0.12), n(N.A4, 0.16), r(0.06),
      n(N.G4, 0.08), n(N.A4, 0.08), n(N.B4, 0.08), n(N.C5, 0.08),
      n(N.D5, 0.08), n(N.E5, 0.08), n(N.D5, 0.08), n(N.C5, 0.08),
      r(0.08),

      // === C section: playful call-and-response ===
      n(N.C5, 0.10), n(N.G4, 0.10), r(0.06),
      n(N.E5, 0.10), n(N.C5, 0.10), r(0.06),
      n(N.G5, 0.16), n(N.E5, 0.10), n(N.C5, 0.10), n(N.G4, 0.16),
      r(0.08),
      n(N.A4, 0.10), n(N.C5, 0.10), n(N.E5, 0.10), n(N.G5, 0.18),
      r(0.06),
      n(N.F5, 0.10), n(N.D5, 0.10), n(N.B4, 0.10), n(N.G4, 0.18),
      r(0.08),

      // === Resolution: big bouncy finish ===
      n(N.C4, 0.08), n(N.E4, 0.08), n(N.G4, 0.08), n(N.C5, 0.08),
      n(N.E5, 0.08), n(N.G5, 0.20), r(0.06),
      n(N.G5, 0.10), n(N.E5, 0.10), n(N.C5, 0.10), n(N.G4, 0.10),
      n(N.E4, 0.10), n(N.C4, 0.20),
      r(0.15),
    ],
  },

  // ── Credits: funeral dirge (~45s) ────────────────────────────────
  // Very slow, descending, grim. The weight of eternity in minor.
  credits: {
    wave: 'sawtooth',
    gain: 0.05,
    notes: [
      // === A section: chromatic descent into darkness ===
      n(N.E4, 0.45), n(N.Eb4, 0.40), n(N.D4, 0.40), n(N.C4, 0.50),
      r(0.25),
      n(N.B3, 0.45), n(N.Bb3, 0.40), n(N.A3, 0.40), n(N.Ab3, 0.50),
      r(0.30),
      n(N.G3, 0.50), n(N.Ab3, 0.40), n(N.G3, 0.55),
      r(0.35),

      // === A section: deeper, slower ===
      n(N.E4, 0.50), n(N.D4, 0.45), n(N.C4, 0.45), n(N.B3, 0.55),
      r(0.30),
      n(N.A3, 0.50), n(N.Ab3, 0.45), n(N.G3, 0.45), n(N.F3, 0.55),
      r(0.30),
      n(N.E3, 0.55), n(N.F3, 0.45), n(N.E3, 0.60),
      r(0.40),

      // === B section: fragile hope (a brief upward reach) ===
      n(N.C4, 0.45), n(N.D4, 0.40), n(N.Eb4, 0.50),
      r(0.20),
      n(N.F4, 0.45), n(N.G4, 0.50), n(N.Ab4, 0.55),
      r(0.25),
      n(N.G4, 0.40), n(N.F4, 0.40), n(N.Eb4, 0.45), n(N.D4, 0.45),
      n(N.C4, 0.55),
      r(0.35),

      // === A' section: final descent, the lowest register ===
      n(N.Eb4, 0.50), n(N.D4, 0.45), n(N.C4, 0.50), n(N.B3, 0.45),
      n(N.Bb3, 0.50), r(0.30),
      n(N.A3, 0.50), n(N.Ab3, 0.45), n(N.G3, 0.50), n(N.F3, 0.55),
      r(0.30),
      n(N.E3, 0.50), n(N.D3, 0.50), n(N.C3, 0.70),
      r(0.50),

      // === Coda: single low notes, fading into nothing ===
      n(N.G2, 0.60), r(0.40),
      n(N.E2, 0.60), r(0.45),
      n(N.C2, 0.80), r(0.60),
    ],
  },
} as const
