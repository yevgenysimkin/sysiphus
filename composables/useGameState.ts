import { ref, computed } from 'vue'
import { PEAK_DISTANCE, PLAYER_SCREEN_X_RATIO, prometheusConfigDistance } from './usePhysics'
import { boulderExclamations, sisyphusExclamations, sassyComments, finalThoughts } from '~/game/content'

export type GameState = 'start' | 'playing' | 'countdown' | 'crushing' | 'rolling_back' | 'rolling_over' | 'continue_prompt' | 'getting_up' | 'final_thought' | 'credits' | 'gameover'

// Environment types
export interface Bird { x: number; y: number; vx: number; vy: number; flapPhase: number }
export interface Cloud { x: number; y: number; speed: number; size: number }
export interface Tree { worldX: number; size: number; type: 'pine' | 'oak' | 'dead' }
export interface GrassTuft { worldX: number; height: number; blades: number }
export interface Landmark { worldX: number; type: 'souvlaki' | 'sign' | 'rock' | 'bench' }

export function useGameState() {
  // Core reactive state
  const gameState = ref<GameState>('start')
  const autoPlay = ref(false)
  const score = ref(0)
  const displayScore = ref(0)
  const finalScore = ref(0)
  const intensity = ref(50)
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
    if (intensity.value > 60) return '#4ade80'
    if (intensity.value > 30) return '#fbbf24'
    return '#ef4444'
  })

  const progressPercent = computed(() => {
    const effectiveDist = world.pushDir > 0 ? world.boulderDistance : 2 * PEAK_DISTANCE - world.boulderDistance
    return Math.min(100, Math.max(0, (effectiveDist / PEAK_DISTANCE) * 100))
  })

  const showGameUI = computed(() => {
    return ['playing', 'countdown', 'crushing', 'rolling_back', 'rolling_over', 'continue_prompt', 'getting_up'].includes(gameState.value)
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
    landmarks: [] as Landmark[],
    prometheusDistance: prometheusConfigDistance,
    prometheusGreeted: false,
    spaceshipX: -200,
    spaceshipY: 100,
    spaceshipActive: false,
    spaceshipTimer: 0,
  }

  function triggerBoulderExclamation() {
    world.currentBoulderExclamation = boulderExclamations[Math.floor(Math.random() * boulderExclamations.length)]
    world.boulderExclamationTimer = 8 + Math.random() * 4
  }

  function triggerSisyphusExclamation() {
    world.currentSisyphusExclamation = sisyphusExclamations[Math.floor(Math.random() * sisyphusExclamations.length)]
    world.sisyphusExclamationTimer = 3 + Math.random() * 2
  }

  function resetGameState(getLevelAtDistance: (dist: number) => number) {
    score.value = 0
    displayScore.value = 0
    intensity.value = 50

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

    world.clouds = []
    for (let i = 0; i < 10; i++) {
      world.clouds.push({
        x: Math.random() * 2000,
        y: 40 + Math.random() * 100,
        speed: 8 + Math.random() * 15,
        size: 25 + Math.random() * 35
      })
    }

    world.trees = []
    for (let i = 0; i < 400; i++) {
      const worldX = Math.random() * PEAK_DISTANCE * 2
      world.trees.push({
        worldX,
        size: 20 + Math.random() * 40,
        type: Math.random() > 0.7 ? 'pine' : Math.random() > 0.5 ? 'oak' : 'dead'
      })
    }

    world.grass = []
    for (let i = 0; i < 500; i++) {
      world.grass.push({
        worldX: Math.random() * PEAK_DISTANCE * 2,
        height: 5 + Math.random() * 10,
        blades: 3 + Math.floor(Math.random() * 4)
      })
    }

    world.landmarks = [
      { worldX: 2000, type: 'souvlaki' },
      { worldX: 5000, type: 'sign' },
      { worldX: 8000, type: 'bench' },
      { worldX: 12000, type: 'rock' },
      { worldX: 18000, type: 'sign' },
      { worldX: 25000, type: 'souvlaki' },
      // Mirrored side
      { worldX: 2 * PEAK_DISTANCE - 2000, type: 'souvlaki' },
      { worldX: 2 * PEAK_DISTANCE - 5000, type: 'sign' },
      { worldX: 2 * PEAK_DISTANCE - 8000, type: 'bench' },
      { worldX: 2 * PEAK_DISTANCE - 12000, type: 'rock' },
      { worldX: 2 * PEAK_DISTANCE - 18000, type: 'sign' },
      { worldX: 2 * PEAK_DISTANCE - 25000, type: 'souvlaki' },
    ]

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
