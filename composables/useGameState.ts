import { ref, computed } from 'vue'
import { PEAK_DISTANCE, LEVEL_DISTANCES, PLAYER_SCREEN_X_RATIO, prometheusConfigDistance, prometheusProximity } from './usePhysics'
import { TIMING, PHYSICS, ENVIRONMENT, COLORS } from '~/game/constants'
import dialogue from '~/game.dialogue.json'
import obstacleConfig from '~/game.obstacles.json'
import { boulderExclamations, sisyphusExclamations, sassyComments, finalThoughts } from '~/game/content'

export type GameState = 'start' | 'playing' | 'countdown' | 'crushing' | 'rolling_back' | 'rolling_over' | 'continue_prompt' | 'getting_up' | 'returning' | 'final_thought' | 'credits' | 'gameover'

// Environment types
export interface Bird { x: number; y: number; vx: number; vy: number; flapPhase: number }
export interface Cloud { x: number; y: number; speed: number; size: number }
export interface Tree { worldX: number; size: number; type: 'pine' | 'oak' | 'dead'; layer: 'bg' | 'fg' }
export interface GrassTuft { worldX: number; height: number; blades: number }

export type ObstacleType =
  | 'souvlaki' | 'sign' | 'rock' | 'bench'
  | 'stray_dog' | 'campfire' | 'sasquatch'
  | 'ancient_ruins' | 'attack_birds'
  | 'philosopher' | 'storm_cloud'
  | 'mountain_goat' | 'alien_laser'
  | 'avalanche_warning' | 'the_muses'

export interface SmokeParticle { x: number; y: number; vy: number; alpha: number; size: number }
export interface AttackBird { x: number; y: number; vx: number; vy: number; phase: number }
export interface Raindrop { x: number; y: number; speed: number }
export interface FallingRock { x: number; y: number; vy: number; size: number; rotation: number }

export interface ObstacleState {
  animTimer: number
  // Stray Dog
  dogFled?: boolean
  dogX?: number
  dogBarkTimer?: number
  // Campfire
  smokeParticles?: SmokeParticle[]
  // Sasquatch
  squatchPeekAmount?: number
  squatchHiding?: boolean
  // Attack Birds
  attackBirds?: AttackBird[]
  triggered?: boolean
  triggerComplete?: boolean
  triggerTimer?: number
  // Storm Cloud
  raindrops?: Raindrop[]
  lightningTimer?: number
  lightningFlash?: number
  // Alien Laser
  ufoX?: number
  ufoY?: number
  laserAngle?: number
  laserActive?: boolean
  // Mountain Goat
  blinkTimer?: number
  blinking?: boolean
  // Avalanche Warning
  fallingRocks?: FallingRock[]
  // The Muses
  laughPhase?: number
  // Philosopher
  thoughtIndex?: number
  thoughtTimer?: number
}

export interface Obstacle {
  worldX: number
  type: ObstacleType
  triggerProximity?: number
  state: ObstacleState
}

// Keep Landmark as alias for backward compat in imports
export type Landmark = Obstacle

function computeObstacleWorldX(level: number, positionInLevel: number): number {
  const levelStart = LEVEL_DISTANCES[level - 1]
  const levelEnd = level < LEVEL_DISTANCES.length ? LEVEL_DISTANCES[level] : PEAK_DISTANCE
  const levelWidth = levelEnd - levelStart
  return levelStart + levelWidth * positionInLevel
}

function initObstacleState(type: ObstacleType): ObstacleState {
  const base: ObstacleState = { animTimer: 0 }
  switch (type) {
    case 'stray_dog':
      return { ...base, dogFled: false, dogX: 0, dogBarkTimer: 2 + Math.random() * 3 }
    case 'campfire':
      return { ...base, smokeParticles: [] }
    case 'sasquatch':
      return { ...base, squatchPeekAmount: 0.8, squatchHiding: false }
    case 'attack_birds':
      return { ...base, attackBirds: [], triggered: false, triggerComplete: false, triggerTimer: 0 }
    case 'storm_cloud':
      return { ...base, raindrops: [], lightningTimer: 0, lightningFlash: 0, triggered: false, triggerComplete: false, triggerTimer: 0 }
    case 'alien_laser':
      return { ...base, ufoX: 0, ufoY: 80, laserAngle: 0, laserActive: false, triggered: false, triggerComplete: false, triggerTimer: 0 }
    case 'mountain_goat':
      return { ...base, blinkTimer: 3 + Math.random() * 4, blinking: false }
    case 'avalanche_warning':
      return { ...base, fallingRocks: [] }
    case 'the_muses':
      return { ...base, laughPhase: 0 }
    case 'philosopher':
      return { ...base, thoughtIndex: 0, thoughtTimer: 0 }
    default:
      return base
  }
}

function buildObstacles(): Obstacle[] {
  const obstacles: Obstacle[] = []
  for (const entry of obstacleConfig) {
    const worldX = computeObstacleWorldX(entry.level, entry.positionInLevel)
    const mirrorX = 2 * PEAK_DISTANCE - worldX
    const base = {
      type: entry.type as ObstacleType,
      triggerProximity: (entry as any).triggerProximity,
    }
    obstacles.push({ ...base, worldX, state: initObstacleState(base.type) })
    obstacles.push({ ...base, worldX: mirrorX, state: initObstacleState(base.type) })
  }
  return obstacles
}

export function useGameState() {
  // Core reactive state
  const gameState = ref<GameState>('start')
  const autoPlay = ref(false)
  const score = ref(0)
  const displayScore = ref(0)
  const finalScore = ref(0)
  const intensity = ref(0)
  const leaderboard = ref<{ initials: string; score: number }[]>([])
  const continueTimer = ref(5)
  const continueFromPeak = ref(false)
  const currentLevel = ref(1)
  const displayLevel = ref(1)
  const levelAnnouncement = ref('')
  const creditsY = ref(600)
  const initials = ref(['', '', ''])
  const initialInputs = ref<(HTMLInputElement | null)[]>([null, null, null])
  const initialsSubmitted = ref(false)

  const canSubmit = computed(() => initials.value.every(i => i.length === 1))

  const intensityColor = computed(() => {
    if (intensity.value > 60) return COLORS.intensityGreen
    if (intensity.value > 30) return COLORS.intensityYellow
    return COLORS.intensityRed
  })

  const progressPercent = ref(0)

  const showGameUI = computed(() => {
    return ['playing', 'countdown', 'crushing', 'rolling_back', 'rolling_over', 'continue_prompt', 'getting_up', 'returning'].includes(gameState.value)
  })

  // Mutable world state (non-reactive for performance - updated every frame)
  const world = {
    worldDistance: 0,
    boulderDistance: 0,
    worldScrollX: 0,
    lastTapTime: 0,
    gameTime: 0,
    lastFrameTime: 0,

    // Direction: 1 = pushing right (toward peak), -1 = pushing left (toward peak from other side)
    pushDir: 1 as 1 | -1,

    // Animation
    legPhase: 0,
    armPhase: 0,
    boulderRotation: 0,
    breathPhase: 0,

    // Game over states
    crushTime: 0,
    sisyphusFlattened: false,
    boulderVelocity: 0,
    boulderBounce: 0,
    finalThoughtTimer: 0,
    currentFinalThought: '',
    reachedPeak: false,
    sisyphusTumbleRotation: 0,
    sisyphusTumbleX: 0,
    sisyphusFallen: false,
    sisyphusRunning: true,
    sisyphusCrushWorldX: 0,
    boulderRollingForward: false,

    // Rolling exclamations
    currentBoulderExclamation: '',
    boulderExclamationTimer: 0,
    currentSisyphusExclamation: '',
    sisyphusExclamationTimer: 0,
    lastExclamationTime: 0,

    // Thoughts
    currentThought: null as { text: string; timer: number; fadeIn: number } | null,
    lastThoughtTime: 0,
    levelPhrasesSaid: {} as Record<number, Set<number>>,

    // Flat terrain idle
    flatIdleTime: 0,
    idleBirdSent: false,
    idleBoulderThought: false,
    isIdle: false,
    swatPhase: 0,                  // Sisyphus arm-swat animation phase (0 = not swatting)
    idleBird: null as { x: number; y: number; phase: number; swoopPhase: number; targetX: number; flyingAway: boolean; flyAwayX: number; flyAwayY: number } | null,

    // Gary bird (second idle bird for dialogue)
    garyBird: null as { x: number; y: number; phase: number; landed: boolean; flyingAway: boolean; flyAwayX: number; flyAwayY: number; thought: string; thoughtTimer: number } | null,
    garySent: false,
    idleDialogue: null as { exchanges: { speaker: string; text: string }[]; currentIndex: number; timer: number; pauseTimer: number } | null,

    // Getting up
    gettingUpPhase: 0,
    currentSassyComment: '',

    // Countdown
    countdownTimer: 0,

    // Level announcement
    levelAnnouncementTimer: 0,

    // Auto-play
    autoPlayMode: false,
    lastAutoTapTime: 0,

    // Sound timing
    lastFootstepTime: 0,
    lastHuffTime: 0,
    lastRollSoundTime: 0,

    // Environment
    birds: [] as Bird[],
    clouds: [] as Cloud[],
    trees: [] as Tree[],
    grass: [] as GrassTuft[],
    obstacles: [] as Obstacle[],
    prometheusDistance: prometheusConfigDistance,
    prometheusProximity: prometheusProximity,
    prometheusGreeted: false,
    prometheusDialogueIndex: 0,
    prometheusNextExchange: 0,
    prometheusExchangePauseTimer: 0,
    prometheusActiveExchange: null as { speaker: string; text: string; timer: number; fadeIn: number } | null,
    spaceshipX: -200,
    spaceshipY: 100,
    spaceshipActive: false,
    spaceshipTimer: 0,

    // Delivery bird (carries Sisyphus body after rollback)
    // Phases: 'fetch' → fly to body, 'grab' → brief pause, 'carry' → fly to boulder, 'drop' → release, 'exit' → fly away
    deliveryBird: {
      active: false,
      phase: 'fetch' as 'fetch' | 'grab' | 'carry' | 'drop' | 'exit',
      x: 0,
      y: 0,               // altitude offset (negative = above ground)
      pickupX: 0,         // world X of body to pick up
      dropX: 0,           // world X of drop point (near boulder)
      grabTimer: 0,
      bodyPickedUp: false, // hides the crushed body from rolling_back renderer
      dropComplete: false, // shows flattened body at drop point
      bloodDrops: [] as { x: number; y: number; vy: number; alpha: number }[],
    },
  }

  function triggerBoulderExclamation() {
    world.currentBoulderExclamation = boulderExclamations[Math.floor(Math.random() * boulderExclamations.length)]
    world.boulderExclamationTimer = 2 + Math.random() * 2
  }

  function triggerSisyphusExclamation() {
    world.currentSisyphusExclamation = sisyphusExclamations[Math.floor(Math.random() * sisyphusExclamations.length)]
    world.sisyphusExclamationTimer = 3 + Math.random() * 2
  }

  function resetGameState(getLevelAtDistance: (dist: number) => number) {
    score.value = 0
    displayScore.value = 0
    intensity.value = 0

    const startDist = (typeof window !== 'undefined' && (window as any).__sisyphusStartDistance) || 0
    world.boulderDistance = startDist
    world.worldDistance = Math.max(0, startDist - 40)
    const initialScreenWidth = (typeof window !== 'undefined' ? window.innerWidth : 800)
    world.worldScrollX = world.boulderDistance - (initialScreenWidth * PLAYER_SCREEN_X_RATIO)

    if (startDist > 0) {
      currentLevel.value = getLevelAtDistance(startDist)
      displayLevel.value = currentLevel.value
      score.value = startDist * 5
      displayScore.value = score.value
    }

    const rightSide = (typeof window !== 'undefined' && (window as any).__sisyphusRightSide) || false
    if (rightSide && startDist === 0) {
      world.pushDir = -1
      world.boulderDistance = PEAK_DISTANCE * 2
      world.worldDistance = world.boulderDistance + 40
      world.worldScrollX = world.boulderDistance - (initialScreenWidth * PLAYER_SCREEN_X_RATIO)
    } else {
      world.pushDir = 1
    }
    world.lastTapTime = Date.now()
    world.gameTime = 0
    currentLevel.value = 1
    displayLevel.value = 1
    levelAnnouncement.value = ''
    world.levelAnnouncementTimer = 0
    world.legPhase = 0
    world.armPhase = 0
    world.boulderRotation = 0
    world.breathPhase = 0
    world.crushTime = 0
    world.sisyphusFlattened = false
    world.boulderVelocity = 0
    world.currentThought = null
    world.lastThoughtTime = 0
    world.levelPhrasesSaid = {}
    world.reachedPeak = false
    world.spaceshipActive = false
    world.prometheusGreeted = false
    world.prometheusDialogueIndex = Math.floor(Math.random() * dialogue.prometheusDialogues.length)
    world.prometheusNextExchange = 0
    world.prometheusExchangePauseTimer = 0
    world.prometheusActiveExchange = null
    world.sisyphusTumbleRotation = 0
    world.sisyphusTumbleX = 0
    world.sisyphusFallen = false
    world.sisyphusRunning = true
    world.sisyphusCrushWorldX = 0
    world.boulderRollingForward = false
    world.boulderBounce = 0
    world.currentBoulderExclamation = ''
    world.boulderExclamationTimer = 0
    world.currentSisyphusExclamation = ''
    world.sisyphusExclamationTimer = 0
    world.lastExclamationTime = 0
    world.countdownTimer = 0
    world.deliveryBird.active = false
    world.deliveryBird.phase = 'fetch'
    world.deliveryBird.bodyPickedUp = false
    world.deliveryBird.dropComplete = false
    world.deliveryBird.bloodDrops = []
    world.flatIdleTime = 0
    world.idleBirdSent = false
    world.idleBoulderThought = false
    world.swatPhase = 0
    world.idleBird = null
    world.garyBird = null
    world.garySent = false
    world.idleDialogue = null

    world.clouds = []
    for (let i = 0; i < ENVIRONMENT.cloudCount; i++) {
      world.clouds.push({
        x: Math.random() * 2000,
        y: 40 + Math.random() * 100,
        speed: 8 + Math.random() * 15,
        size: 25 + Math.random() * 35
      })
    }

    world.trees = []
    for (let i = 0; i < ENVIRONMENT.treeCount; i++) {
      const worldX = Math.random() * PEAK_DISTANCE * 2
      world.trees.push({
        worldX,
        size: 120 + Math.random() * 180,
        type: Math.random() > 0.7 ? 'pine' : Math.random() > 0.5 ? 'oak' : 'dead',
        layer: Math.random() < 0.3 ? 'fg' : 'bg',
      })
    }

    world.grass = []
    for (let i = 0; i < ENVIRONMENT.grassCount; i++) {
      world.grass.push({
        worldX: Math.random() * PEAK_DISTANCE * 2,
        height: 5 + Math.random() * 10,
        blades: 3 + Math.floor(Math.random() * 4)
      })
    }

    // Config-driven obstacles (replaces hardcoded landmarks)
    world.obstacles = buildObstacles()

    world.birds = []
  }

  function acceptContinue() {
    world.currentSassyComment = sassyComments[Math.floor(Math.random() * sassyComments.length)]
    world.gettingUpPhase = 0
    gameState.value = 'getting_up'
  }

  function declineContinue() {
    finalScore.value = 0
    gameState.value = 'final_thought'
    world.currentFinalThought = continueFromPeak.value
      ? "Well, there it goes..."
      : finalThoughts[Math.floor(Math.random() * finalThoughts.length)]
    world.finalThoughtTimer = 0
  }

  return {
    // Reactive state
    gameState,
    autoPlay,
    score,
    displayScore,
    finalScore,
    intensity,
    leaderboard,
    continueTimer,
    continueFromPeak,
    currentLevel,
    displayLevel,
    levelAnnouncement,
    creditsY,
    initials,
    initialInputs,
    initialsSubmitted,

    // Computed
    canSubmit,
    intensityColor,
    progressPercent,
    showGameUI,

    // Mutable world
    world,

    // Functions
    resetGameState,
    triggerBoulderExclamation,
    triggerSisyphusExclamation,
    acceptContinue,
    declineContinue,
  }
}
