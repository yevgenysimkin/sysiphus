// ── Rendering Constants ─────────────────────────────────────────────
// Centralized values extracted from canvas rendering code.
// Change here → changes everywhere.

// ── Character Geometry ──────────────────────────────────────────────
export const BOULDER_RADIUS = 26
export const BOULDER_GROUND_OFFSET = 3       // gap between boulder bottom and hill surface
export const HEAD_RADIUS = 6
export const BODY_LENGTH = 28
export const UPPER_ARM = 14
export const FOREARM = 14
export const HIP_HEIGHT = 18                 // hip above ground
export const SHOULDER_HEAD_GAP = 4           // space between shoulder and head bottom
export const RENDER_GAP_BASE = 40            // base horizontal gap between feet and boulder
export const TUMBLE_OFFSET_X = 70            // horizontal offset for tumbling Sisyphus

// ── Culling ─────────────────────────────────────────────────────────
export const DEFAULT_CULL_MARGIN = 150
export const STRAY_DOG_CULL_MARGIN = 600
export const SOUND_AUDIBLE_RANGE = 600

// ── Colors ──────────────────────────────────────────────────────────
export const COLORS = {
  // Character & boulder
  white: '#ffffff',
  black: '#000',
  boulderFill: '#505050',
  boulderStroke: '#ffffff',
  boulderCrack: '#6a6a6a',
  stickFigure: '#fff',

  // Hill
  hillFill: '#3d3d3d',
  hillStroke: '#ffffff',
  levelMarker: '#666',
  peakGold: '#ffd700',

  // Prometheus
  rockFill: '#555',
  rockStroke: '#777',
  chainColor: '#888',
  bloodRed: '#8b0000',

  // Sky & environment
  mountainFill: '#2e2850',
  hillsFill: '#1e3328',
  treesFar: '#152a18',
  treesMid: '#0d1f10',
  treesNear: '#0a170c',
  riverFill: '#1a2a3a',
  shimmer: 'rgba(180, 200, 220, 0.12)',
  cloudFill: 'rgba(255, 255, 255, 0.08)',
  moonGlow: '#f0f0d0',
  starFill: '#ffffff',

  // Trees
  trunkBrown: '#3d2817',
  pineGreen: '#1a3d1a',
  oakGreen: '#2d4a2d',
  deadBranch: '#4a3a2a',
  grassGreen: '#3a5a3a',

  // Obstacles
  woodBrown: '#654321',
  signPost: '#5c4033',
  souvlakiBuilding: '#8b4513',
  souvlakiAwning: '#c41e3a',
  rockGray: '#5a5a5a',
  rockDark: '#4a4a4a',
  dogStroke: '#ddd',
  sasquatchBrown: '#5C3A1E',
  sasquatchBody: '#5C3A1E',
  sasquatchTreeTrunk: '#3d2817',
  sasquatchTreeFoliage: '#1a3d1a',
  ruinsStone: '#8a8070',
  ruinsStroke: '#6a6050',
  ruinsCrack: '#5a5040',
  scatteredStone: '#7a7060',
  dangerRed: '#cc3300',
  warningYellow: '#ffcc00',
  stormCloud: 'rgba(40, 40, 50, 0.8)',
  rainBlue: 'rgba(150, 180, 255, 0.6)',
  ufoBody: '#555',
  ufoDome: '#88f',
  ufoLights: '#0f0',
  laserGreen: 'rgba(0, 255, 0, 0.7)',

  // UI
  intensityGreen: '#4ade80',
  intensityYellow: '#fbbf24',
  intensityRed: '#ef4444',
  uiDim: '#888',
  uiDimmer: '#666',
  bubbleFill: '#fff',
  bubbleStroke: '#333',
  textBlack: '#000',
} as const

// ── Fonts ───────────────────────────────────────────────────────────
export const FONTS = {
  tiny: '7px monospace',
  xs: '8px monospace',
  sm: '9px monospace',
  base: '10px monospace',
  md: '11px monospace',
  lg: '12px monospace',
  xl: '14px monospace',
  ui: '16px monospace',
  score: '24px monospace',
  heading: '48px monospace',
  countdownNumber: 'bold 120px monospace',
  countdownPush: 'bold 72px monospace',
  exclamationBold: 'bold 14px monospace',
} as const

// ── Timing (seconds) ────────────────────────────────────────────────
export const TIMING = {
  // Sound intervals
  footstepInterval: 0.25,
  huffInterval: 0.7,
  rollSoundInterval: 0.12,
  rollSoundIntervalFast: 0.1,

  // Exclamations & dialogue
  boulderExclamationDuration: 2,           // base; + random * 2
  sisyphusExclamationDuration: 3,          // base; + random * 2
  prometheusExchangeDuration: 3.5,
  thoughtDuration: 4,
  philosopherThoughtCycle: 5,

  // Bark
  barkIntervalBase: 3,                    // + random * 4
  barkIntervalRandom: 4,

  // Countdown
  countdownTotal: 3.5,

  // Getting up
  gettingUpStandDuration: 1.5,
  gettingUpTotalDuration: 3,

  // Continue prompt
  continueTimerDuration: 5,

  // Crushing
  crushStaggerDelay: 0.2,
  crushToRollbackDelay: 1.0,

  // Final thought
  finalThoughtDuration: 4,

  // Level announcement
  levelAnnouncementDuration: 2,

  // Credits
  creditsScrollSpeed: 40,
  creditsEndY: -1100,

  // Auto-play tap interval (ms)
  autoTapInterval: 120,

  // Storm cloud
  stormDuration: 4,
  alienLaserDuration: 3.5,
  attackBirdsDuration: 3,

  // Mountain goat blink
  blinkIntervalBase: 3,                   // + random * 5
  blinkIntervalRandom: 5,
  blinkDuration: 0.15,
} as const

// ── Physics (inline values from game loop) ──────────────────────────
export const PHYSICS = {
  rollbackAcceleration: 150,
  rollbackBounceVelocityThreshold: 20,
  rollingOverDeceleration: 0.94,
  rollingOverGravityScale: 200,
  crushRollAccelBase: 40,
  crushRollAccelRate: 200,
  crushFlattenOffset: -30,
  initialIntensity: 50,
  scoreMultiplier: 0.125,
  boulderRotationScale: 0.02,
  dogRunSpeed: 200,
  spaceshipSpeed: 120,

  // Bounce
  maxBounceAmplitude: 8,
  bounceVelocityScale: 0.008,
} as const

// ── Environment Spawning ────────────────────────────────────────────
export const ENVIRONMENT = {
  cloudCount: 10,
  treeCount: 400,
  grassCount: 500,
  initialBirdCount: 4,
  maxBirds: 5,
  birdSpawnChance: 0.02,
  spaceshipSpawnChance: 0.002,
  spaceshipMinDistance: 100,
  shimmerCount: 8,
} as const
