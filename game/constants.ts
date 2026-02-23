// ── Rendering Constants ─────────────────────────────────────────────
// Centralized values extracted from canvas rendering code.
// Change here → changes everywhere.

// ── Character Geometry ──────────────────────────────────────────────
export const BOULDER_RADIUS = 26
export const BOULDER_GROUND_OFFSET = 3       // gap between boulder bottom and hill surface
export const HEAD_RADIUS = 6
export const BODY_LENGTH = 16                 // torso length (short for proportional IK legs)
export const UPPER_ARM = 14
export const FOREARM = 14
export const HIP_HEIGHT = 30                 // hip above ground (tall for longer IK legs)
export const THIGH_LENGTH = 20               // upper leg segment
export const SHIN_LENGTH = 18                // lower leg segment
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
  pineHighlight: '#2a5a2a',
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
  laserImpactInner: 'rgba(0, 255, 0, 0.4)',
  laserImpactOuter: 'rgba(0, 255, 0, 0)',
  talonColor: '#ccc',
  fallingRockFill: '#6a6a6a',

  // Moon & sky
  moonGradientInner: 'rgba(255, 255, 200, 0.3)',
  moonGradientOuter: 'rgba(255, 255, 200, 0)',

  // Campfire
  campfireGlowInner: 'rgba(255, 150, 50, 0.15)',
  campfireGlowOuter: 'rgba(255, 100, 0, 0)',
  campfireFlames: ['#ff4500', '#ff6b00', '#ffaa00', '#ffcc00', '#ff8800'] as readonly string[],
  smokeColor: 'rgba(200, 200, 200, 0.3)',

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

/** Extract the numeric pixel size from a CSS font string (e.g. 'bold 14px monospace' → 14) */
export function fontSizePx(font: string): number {
  const match = font.match(/(\d+)px/)
  return match ? parseInt(match[1]) : BUBBLE_DEFAULTS.fallbackFontSize
}

// ── Bubble Defaults ─────────────────────────────────────────────────
export const BUBBLE_DEFAULTS = {
  lineHeightPadding: 4,
  fallbackFontSize: 12,
  padding: 10,
  maxWidth: 180,
  offsetX: 20,
  offsetY: -20,
  edgeMargin: 5,
  strokeWidth: 2,
  thoughtRadius: 12,
  speechRadius: 8,
  tailInset: 10,
  tailHalfWidth: 6,
  tailGap: 1,
  tailSpeakerOffset: 5,
  dotStartOffset: 5,
  dotNearDist: 10,
  dotNearRadius: 5,
  dotFarDist: 22,
  dotFarRadius: 3,
  textLineOffset: 0.8,
} as const

// ── Timing (seconds) ────────────────────────────────────────────────
export const TIMING = {
  // Sound intervals
  footstepInterval: 0.25,
  huffInterval: 0.7,
  rollSoundInterval: 0.12,
  rollSoundIntervalFast: 0.1,

  // Exclamations & dialogue
  boulderExclamationDuration: 2,           // base; + random * boulderExclamationRandom
  boulderExclamationRandom: 2,
  sisyphusExclamationDuration: 3,          // base; + random * sisyphusExclamationRandom
  sisyphusExclamationRandom: 2,
  prometheusExchangeDuration: 3.5,
  prometheusExchangePause: 0.5,            // gap between sequential exchanges
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
  stormArrivalDuration: 20,     // seconds for cloud to drift in from offscreen
  stormActiveDuration: 30,      // seconds of rain + lightning
  stormDepartDuration: 8,       // seconds for cloud to fly away offscreen
  stormThoughtInterval: 7,      // seconds between storm thought bubbles
  alienLaserDuration: 8,        // total duration (arrival + active + departure)
  alienArrivalDuration: 2,      // seconds for UFO to fly in
  alienDepartDuration: 2,       // seconds for UFO to fly away upward
  attackBirdsDuration: 5,

  // Flat idle harassment
  idleBirdDelay: 10,                          // seconds before Lou swoops in
  idleBoulderThoughtDelay: 15,               // seconds before boulder thought bubble
  idleGaryDelay: 30,                          // seconds before Gary arrives
  idleDialogueLineDuration: 4,               // seconds each dialogue line shows
  idleDialoguePause: 0.5,                    // gap between sequential lines
  garyExitThoughtDuration: 4,                // Gary's departing thought bubble duration

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

  // Rollback flat friction
  rollbackFlatFriction: 0.993,             // gentle velocity decay per frame on flat (like rolling into sand)
  rollbackScreenEdgeMargin: 200,           // boulder stops this many px from screen edge
  deliveryBirdSpeed: 160,                  // px/s horizontal
  deliveryBirdCruiseAltitude: -180,        // y offset from ground (negative = high above)
  deliveryBirdDropHeight: 40,              // altitude above ground for the drop
  deliveryBirdGrabPause: 0.4,             // seconds bird pauses to grab body
  rollbackStopVelocity: 5,               // velocity threshold to consider boulder stopped

  // Idle bird flight speeds (px/s)
  louFlyAwaySpeedX: 80,                   // Lou horizontal exit speed
  louFlyAwaySpeedY: 40,                   // Lou vertical exit speed (positive = up)
  louApproachRate: 2,                      // Lou approach interpolation rate
  louCircleBaseRadius: 60,                 // Lou circling base radius
  louCircleRadiusVariance: 25,             // Lou circling radius oscillation
  louSwoopTrigger: 0.8,                   // sin threshold to trigger swat
  garyFlyAwaySpeedX: 35,                  // Gary horizontal exit speed (slow — thought bubble must be readable)
  garyFlyAwaySpeedY: 15,                  // Gary vertical exit speed (positive = up)
  garyApproachRate: 1.2,                   // Gary approach interpolation rate (slower = more leisurely)
  garyLandingOffset: 70,                   // px to left of player where Gary lands
  garyLandingPhaseMin: 1.5,               // min seconds before Gary can land

  // Swat animation
  swatDuration: 0.4,                       // seconds for arm swat animation

  // Return push (after continue, Sis pushes boulder back to start)
  returnPushSpeed: 120,                    // px/s — Sis pushes boulder back toward start

  // Game loop thresholds
  defaultCanvasWidth: 800,
  rollingOverInitialVelocity: 80,
  rollingOverTumbleOffsetScale: 70,
  playerWorldDistanceOffset: 40,
  progressPercentScale: 100,
  frameRate: 60,
  rollingBackScoreDivisor: 5,
  rollingBackMinDistance: 100,
  rollSoundVelocityThreshold: 5,
  bodyOnScreenMargin: 50,
  maxDeltaTime: 0.05,

  // Delivery bird flight
  deliveryBirdSpawnXOffset: 150,
  deliveryBirdDropXOffset: 50,
  deliveryBirdPositionThreshold: 15,
  deliveryBirdDescentThreshold: 200,
  deliveryBirdCarryDescentThreshold: 150,
  deliveryBirdExitSpeedMultiplier: 1.5,
  deliveryBirdExitScreenMargin: 200,

  // Blood drops (delivery bird)
  bloodDropGravity: 200,
  bloodDropAlphaFadeRate: 0.4,
  bloodDropSpawnRate: 8,
  bloodDropXRange: 10,
  bloodDropYOffset: 60,
  bloodDropVelocityYMin: 20,
  bloodDropVelocityYRange: 40,
  bloodDropAlphaMin: 0.8,
  bloodDropAlphaRange: 0.2,

  // Rolling over
  rollingOverTotalRollDistance: 500,
  rollingOverHalfwayScale: 2,
  sisyphusStopRunningChance: 0.02,
  sisyphusTumbleRotationSpeed: 4,
  sisyphusTumbleXAmplitude: 10,
  rollingOverBoulderExclaimThreshold: 30,
  rollingOverSisExclaimThreshold: 20,
  rollingOverContinueVelocityThreshold: 5,

  // Animation speeds
  legAnimationSpeed: 8,
  breathAnimationSpeed: 3,
  birdFlapSpeed: 12,
  birdBobbingSineFreq: 3,
  birdBobbingPositionScale: 0.01,
  birdBobbingYAmplitude: 20,
  armPhaseDamping: 0.88,
  thoughtFadeInRate: 3,
  prometheusFadeInRate: 3,

  // Bird spawning
  birdSpawnEdgeOffset: 50,
  birdSpawnXRange: 200,
  birdSpawnYMin: 40,
  birdSpawnYRange: 120,
  birdVelocityXBase: 40,
  birdVelocityXRange: 40,
  birdVelocityYAmplitude: 15,
  birdCullDistanceLeft: 100,

  // Cloud reset
  cloudResetXOffset: 100,
  cloudResetXRange: 500,

  // Spaceship Y
  spaceshipYOscillation: 15,
  spaceshipSpawnXOffset: 100,
  spaceshipSpawnYMin: 60,
  spaceshipSpawnYRange: 80,

  // Idle bird (Lou) behavior
  idleBirdSpawnXOffset: 80,
  idleBirdSpawnY: 40,
  idleBirdSwoopSpeed: 6,
  idleBirdApproachDuration: 2.5,
  idleBirdCirclePhaseDelay: 2.5,
  idleBirdApproachYBase: 30,
  idleBirdApproachYAmplitude: 10,
  idleBirdCircleSineFreq: 0.7,
  idleBirdCirclePhaseSpeed: 2.5,
  idleBirdCircleYBase: 20,
  idleBirdCircleYSineSpeed: 2.5,
  idleBirdDiveAmplitude: 30,
  idleBirdDiveFreq: 5,
  idleBirdDiveMaxAmplitude: 40,
  idleBirdCullDistance: 200,

  // Gary bird behavior
  garyBirdSpawnXOffset: 80,
  garyBirdSpawnY: 40,
  garyThoughtAnimationSpeed: 6,
  garyCullDistance: 200,
  garyLandingDistanceThreshold: 5,
  garyLandingPositionThreshold: 5,

  // Bounce animation
  bounceSineFrequency: 3,
} as const

// ── Input ────────────────────────────────────────────────────────────
export const INPUT = {
  tapIntensity: 100,
  tapArmPhase: Math.PI * 0.4,
} as const

// ── Level Transition ────────────────────────────────────────────────
export const LEVEL_TRANSITION_ZONE = 30

// ── Spawning Ranges ──────────────────────────────────────────────────
export const SPAWNING = {
  // Clouds
  cloudMaxXSpawn: 2000,
  cloudYMin: 40, cloudYRange: 100,
  cloudSpeedMin: 8, cloudSpeedRange: 15,
  cloudSizeMin: 25, cloudSizeRange: 35,

  // Trees
  treeSizeMin: 120, treeSizeRange: 180,
  treePineThreshold: 0.7,
  treeOakThreshold: 0.5,
  treeForegroundThreshold: 0.3,

  // Grass
  grassHeightMin: 5, grassHeightRange: 10,
  grassBladesMin: 3, grassBladesRange: 4,

  // Initial state values
  strayDogBarkTimerMin: 2, strayDogBarkTimerRange: 3,
  sasquatchInitialPeek: 0.8,
  goatBlinkTimerMin: 3, goatBlinkTimerRange: 4,
  creditsInitialY: 600,
  initialWorldDistanceOffset: 40,
  scorePerDistance: 5,
  autoPlayStartDelay: 1000,

  // Bird spawning (used in index.vue)
  initialBirdSpawnCount: 4,
} as const

// ── Obstacle Update Constants ────────────────────────────────────────
export const OBSTACLE_BEHAVIOR = {
  // Stray dog
  strayDogDefaultProximity: 200,

  // Smoke particles (campfire)
  smokeSpawnRateMultiplier: 3,
  smokeXOffsetRange: 8,
  smokeVyMin: -15, smokeVyRange: -10,
  smokeAlphaMin: 0.4, smokeAlphaRange: 0.2,
  smokeSizeMin: 2, smokeSizeRange: 3,
  smokeDriftRange: 10,
  smokeAlphaDecayRate: 0.3,
  smokeSizeGrowthRate: 2,

  // Sasquatch
  sasquatchDefaultProximity: 250,
  sasquatchHideSpeed: 2,
  sasquatchPeekDistanceThreshold: 100,
  sasquatchPeekSpeed: 0.5,

  // Attack birds
  attackBirdCount: 6,
  attackBirdVxMagnitude: 80,
  attackBirdVyMagnitude: 60,
  attackBirdVyDownOffset: 20,
  attackBirdPhaseStagger: 0.5,
  attackBirdAnimSpeed: 12,

  // Storm cloud
  raindropSpawnRateMultiplier: 30,
  raindropXOffsetRange: 120,
  raindropSpawnY: -80,
  raindropSpeedMin: 200, raindropSpeedRange: 100,
  raindropGroundY: 10,
  lightningFlashIntensity: 0.3,
  lightningIntervalMin: 1, lightningIntervalRange: 2,
  lightningFadeSpeed: 2,
  stormDefaultProximity: 150,
  stormCloudHoverHeight: 300,   // px above Sisyphus head
  stormCloudSpawnOffsetX: 600,  // how far offscreen the cloud starts
  stormCloudDepartSpeedX: 120,  // px/s horizontal departure speed
  stormCloudDepartSpeedY: 30,   // px/s upward departure speed

  // Alien laser
  alienDefaultProximity: 200,
  ufoDefaultY: 80,
  ufoBobAmplitude: 10,
  ufoBobSpeed: 2,
  laserAngleSpeed: 1.5,
  laserActiveStart: 2,         // start laser after arrival phase
  laserActiveEnd: 6,           // stop laser before departure
  ufoSpawnOffsetX: 500,       // how far offscreen UFO starts
  ufoDepartSpeedX: 150,       // px/s horizontal departure speed
  ufoDepartSpeedY: 80,        // px/s upward departure speed

  // Avalanche
  rockSpawnRate: 2,
  rockXOffsetRange: 60,
  rockSpawnYMin: -40, rockSpawnYRange: -20,
  rockVyMin: 30, rockVyRange: 40,
  rockSizeMin: 2, rockSizeRange: 4,
  rockGravity: 80,
  rockRotationSpeed: 3,
  rockGroundY: 10,

  // Muses
  musesLaughSpeed: 4,

  // Philosopher
  philosopherThoughtPositions: 4,
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
