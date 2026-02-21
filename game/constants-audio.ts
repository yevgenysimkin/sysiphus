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
} as const
