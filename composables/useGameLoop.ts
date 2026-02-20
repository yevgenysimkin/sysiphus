import type { Ref } from 'vue'
import type { GameState } from './useGameState'
import type { Obstacle } from './useGameState'
import { PEAK_DISTANCE, PLAYER_SCREEN_X_RATIO, CONSTANT_SPEED, METER_DRAIN_RATES, LEVEL_DISTANCES } from './usePhysics'
import { createObstacleUpdater } from './useGameLoop-obstacles'
import dialogue from '~/game.dialogue.json'

interface GameLoopDeps {
  gameCanvas: Ref<HTMLCanvasElement | null>
  gameState: Ref<GameState>
  score: Ref<number>
  displayScore: Ref<number>
  finalScore: Ref<number>
  intensity: Ref<number>
  currentLevel: Ref<number>
  displayLevel: Ref<number>
  levelAnnouncement: Ref<string>
  progressPercent: Ref<number>
  continueTimer: Ref<number>
  continueFromPeak: Ref<boolean>
  creditsY: Ref<number>
  world: {
    worldDistance: number
    boulderDistance: number
    worldScrollX: number
    pushDir: 1 | -1
    lastTapTime: number
    gameTime: number
    lastFrameTime: number
    legPhase: number
    armPhase: number
    boulderRotation: number
    breathPhase: number
    crushTime: number
    sisyphusFlattened: boolean
    boulderVelocity: number
    boulderBounce: number
    finalThoughtTimer: number
    currentFinalThought: string
    reachedPeak: boolean
    sisyphusTumbleRotation: number
    sisyphusTumbleX: number
    sisyphusFallen: boolean
    sisyphusRunning: boolean
    sisyphusCrushWorldX: number
    boulderRollingForward: boolean
    currentBoulderExclamation: string
    boulderExclamationTimer: number
    currentSisyphusExclamation: string
    sisyphusExclamationTimer: number
    lastExclamationTime: number
    currentThought: { text: string; timer: number; fadeIn: number } | null
    lastThoughtTime: number
    levelPhrasesSaid: Record<number, Set<number>>
    gettingUpPhase: number
    currentSassyComment: string
    countdownTimer: number
    levelAnnouncementTimer: number
    autoPlayMode: boolean
    lastAutoTapTime: number
    lastFootstepTime: number
    lastHuffTime: number
    lastRollSoundTime: number
    birds: { x: number; y: number; vx: number; vy: number; flapPhase: number }[]
    clouds: { x: number; y: number; speed: number; size: number }[]
    prometheusDistance: number
    prometheusProximity: number
    prometheusGreeted: boolean
    prometheusDialogueIndex: number
    prometheusNextExchange: number
    prometheusActiveExchange: { speaker: string; text: string; timer: number; fadeIn: number } | null
    spaceshipX: number
    spaceshipY: number
    spaceshipActive: boolean
    spaceshipTimer: number
    obstacles: Obstacle[]
  }
  registerTap: () => void
  getAngleAtDistance: (dist: number) => number
  getLevelAtDistance: (dist: number) => number
  triggerBoulderExclamation: () => void
  triggerSisyphusExclamation: () => void
  declineContinue: () => void
  play8BitSound: (type: 'footstep' | 'huff' | 'push' | 'slip' | 'crush' | 'roll' | 'levelup' | 'bark' | 'thunder' | 'laser') => void
  render: () => void
  showGameOver: () => void
}

export function useGameLoop(deps: GameLoopDeps) {
  const {
    gameCanvas, gameState, score, displayScore, finalScore, intensity,
    currentLevel, displayLevel, levelAnnouncement, progressPercent, continueTimer, continueFromPeak,
    creditsY, world, registerTap, getAngleAtDistance, getLevelAtDistance,
    triggerBoulderExclamation, triggerSisyphusExclamation, declineContinue,
    play8BitSound, render, showGameOver,
  } = deps

  const { updateObstacles } = createObstacleUpdater({ world, play8BitSound })

  let animationId = 0

  /** Map boulderDistance to canonical 0→PEAK_DISTANCE for angle/level lookups */
  function effectiveDist(): number {
    return world.pushDir > 0 ? world.boulderDistance : 2 * PEAK_DISTANCE - world.boulderDistance
  }

  /** Clamp boulderDistance toward the current "bottom" */
  function clampToBottom(): void {
    if (world.pushDir > 0) {
      world.boulderDistance = Math.max(0, world.boulderDistance)
    } else {
      world.boulderDistance = Math.min(PEAK_DISTANCE * 2, world.boulderDistance)
    }
  }

  function spawnBird() {
    const canvas = gameCanvas.value
    if (!canvas) return
    world.birds.push({
      x: canvas.width + 50 + Math.random() * 200,
      y: 40 + Math.random() * 120,
      vx: -40 - Math.random() * 40,
      vy: Math.sin(Math.random() * Math.PI * 2) * 15,
      flapPhase: Math.random() * Math.PI * 2
    })
  }

  function checkLevelPhrase() {
    if (world.currentThought) return
    // Suppress level phrases during Prometheus dialogue
    if (world.prometheusActiveExchange) return

    const level = currentLevel.value
    const phrases = (dialogue.levelPhrases as Record<string, string[]>)[String(level)]
    if (!phrases || phrases.length === 0) return

    // Calculate progress through current level (0.0 to 1.0)
    const levelStart = LEVEL_DISTANCES[level - 1]
    const levelEnd = level < LEVEL_DISTANCES.length ? LEVEL_DISTANCES[level] : PEAK_DISTANCE
    const levelWidth = levelEnd - levelStart
    const eDist = effectiveDist()
    const progress = Math.max(0, Math.min(1, (eDist - levelStart) / levelWidth))

    if (!world.levelPhrasesSaid[level]) {
      world.levelPhrasesSaid[level] = new Set()
    }
    const said = world.levelPhrasesSaid[level]

    // Trigger phrases at evenly spaced positions: 1/(K+1), 2/(K+1), ...
    const K = phrases.length
    for (let i = 0; i < K; i++) {
      if (said.has(i)) continue
      const triggerAt = (i + 1) / (K + 1)
      if (progress >= triggerAt) {
        said.add(i)
        world.currentThought = { text: phrases[i], timer: 4, fadeIn: 0 }
        world.lastThoughtTime = world.gameTime
        return
      }
    }
  }

  function checkPrometheusDialogue() {
    const eDist = effectiveDist()
    const distTo = eDist - world.prometheusDistance

    // Trigger greeting when within proximity
    if (!world.prometheusGreeted && Math.abs(distTo) < world.prometheusProximity && gameState.value === 'playing') {
      world.prometheusGreeted = true
    }

    if (!world.prometheusGreeted) return

    // Advance through exchanges based on distance past Prometheus
    const dialogueSet = dialogue.prometheusDialogues[world.prometheusDialogueIndex]
    if (!dialogueSet || world.prometheusNextExchange >= dialogueSet.exchanges.length) return

    const nextExchange = dialogueSet.exchanges[world.prometheusNextExchange]
    if (distTo >= nextExchange.delay) {
      world.prometheusActiveExchange = {
        speaker: nextExchange.speaker,
        text: nextExchange.text,
        timer: 3.5,
        fadeIn: 0
      }
      world.prometheusNextExchange++
    }
  }

  function updatePrometheusExchange(dt: number) {
    if (!world.prometheusActiveExchange) return
    world.prometheusActiveExchange.fadeIn = Math.min(1, world.prometheusActiveExchange.fadeIn + dt * 3)
    world.prometheusActiveExchange.timer -= dt
    if (world.prometheusActiveExchange.timer <= 0) {
      world.prometheusActiveExchange = null
    }
  }

  function maybeSpawnEvents() {
    if (!world.spaceshipActive && world.worldDistance > 100 && Math.random() < 0.002) {
      world.spaceshipActive = true
      world.spaceshipX = -100
      world.spaceshipY = 60 + Math.random() * 80
      world.spaceshipTimer = 0
    }
    if (world.birds.length < 5 && Math.random() < 0.02) {
      spawnBird()
    }
  }

  function startCrushing() {
    gameState.value = 'crushing'
    world.crushTime = 0
    finalScore.value = score.value
    play8BitSound('crush')
    world.boulderVelocity = 0
    world.boulderRollingForward = false
    world.sisyphusCrushWorldX = world.worldDistance
    triggerBoulderExclamation()
  }

  function startRollingOver() {
    gameState.value = 'rolling_over'
    world.reachedPeak = true
    world.boulderVelocity = 80
    finalScore.value = score.value
    world.sisyphusTumbleRotation = 0
    world.sisyphusTumbleX = -70 * world.pushDir
    world.sisyphusFallen = false
    world.sisyphusRunning = true
    triggerBoulderExclamation()
  }

  function updatePlaying(dt: number) {
    const pd = world.pushDir

    // Drain meter based on current level
    const level = currentLevel.value
    const drainSeconds = METER_DRAIN_RATES[Math.min(level, METER_DRAIN_RATES.length) - 1] || METER_DRAIN_RATES[0]
    intensity.value -= (100 / drainSeconds) * dt

    if (intensity.value <= 0) {
      intensity.value = 0
      startCrushing()
      return
    }

    // Constant speed movement
    world.boulderDistance += CONSTANT_SPEED * dt * pd
    world.worldDistance = world.boulderDistance - 40 * pd
    score.value += CONSTANT_SPEED * dt * 0.125
    displayScore.value = score.value

    const canvas = gameCanvas.value
    const screenWidth = canvas?.width || 800
    world.worldScrollX = world.boulderDistance - (screenWidth * PLAYER_SCREEN_X_RATIO)

    const newLevel = getLevelAtDistance(effectiveDist())
    if (newLevel !== currentLevel.value) {
      if (newLevel > currentLevel.value) {
        levelAnnouncement.value = `LEVEL ${newLevel}!`
        world.levelAnnouncementTimer = 2
        play8BitSound('levelup')
      }
      currentLevel.value = newLevel
      displayLevel.value = newLevel
    }

    if ((world.boulderDistance - PEAK_DISTANCE) * pd >= 0) {
      startRollingOver()
      return
    }

    progressPercent.value = Math.min(100, Math.max(0, (effectiveDist() / PEAK_DISTANCE) * 100))

    checkPrometheusDialogue()
    checkLevelPhrase()
    maybeSpawnEvents()
  }

  function updateCrushing(dt: number) {
    const pd = world.pushDir
    world.crushTime += dt

    // Brief stagger (0.2s), then boulder rolls backward (downhill)
    if (world.crushTime > 0.2) {
      const elapsed = world.crushTime - 0.2
      const rollSpeed = 40 + elapsed * 200 // accelerating downhill
      world.boulderDistance -= rollSpeed * dt * pd
      clampToBottom()
      world.boulderRotation -= rollSpeed * dt * 0.02 * pd

      // Flatten Sisyphus when boulder rolls back over his position
      if ((world.sisyphusCrushWorldX - world.boulderDistance) * pd >= -30) {
        world.sisyphusFlattened = true
      }

      const canvas = gameCanvas.value
      const screenWidth = canvas?.width || 800
      world.worldScrollX = world.boulderDistance - (screenWidth * PLAYER_SCREEN_X_RATIO)
    }

    if (world.crushTime > 1.0) {
      gameState.value = 'rolling_back'
      world.boulderVelocity = 80
      triggerBoulderExclamation()
    }
  }

  function updateRollingBack(dt: number) {
    const pd = world.pushDir
    world.boulderVelocity += 150 * dt
    world.boulderDistance -= world.boulderVelocity * dt * pd
    clampToBottom()

    const eDist = effectiveDist()
    const startDist = finalScore.value / 5
    const scoreRatio = eDist / Math.max(startDist, 100)
    displayScore.value = Math.max(0, Math.floor(finalScore.value * scoreRatio))

    displayLevel.value = getLevelAtDistance(eDist)
    progressPercent.value = Math.min(100, Math.max(0, (eDist / PEAK_DISTANCE) * 100))

    const canvas = gameCanvas.value
    const screenWidth = canvas?.width || 800
    world.worldScrollX = world.boulderDistance - (screenWidth * PLAYER_SCREEN_X_RATIO)

    if (world.gameTime - world.lastRollSoundTime > 0.12 && world.boulderVelocity > 5) {
      play8BitSound('roll')
      world.lastRollSoundTime = world.gameTime
    }

    world.boulderRotation -= world.boulderVelocity * dt * 0.02 * pd

    world.boulderExclamationTimer -= dt
    if (world.boulderExclamationTimer <= 0 && world.boulderVelocity > 20) {
      triggerBoulderExclamation()
    }

    const atBottom = pd > 0 ? world.boulderDistance <= 5 : world.boulderDistance >= PEAK_DISTANCE * 2 - 5
    if (atBottom) {
      world.boulderDistance = pd > 0 ? 0 : PEAK_DISTANCE * 2
      world.boulderVelocity *= 0.7
      if (world.boulderVelocity < 20) {
        displayScore.value = 0
        continueFromPeak.value = false
        continueTimer.value = 5
        gameState.value = 'continue_prompt'
      }
    }
  }

  function updateRollingOver(dt: number) {
    const pd = world.pushDir
    const distFromPeak = (world.boulderDistance - PEAK_DISTANCE) * pd // always positive once past peak

    if (distFromPeak < PEAK_DISTANCE) {
      const eDist = Math.max(0, PEAK_DISTANCE - distFromPeak)
      const currentAngle = getAngleAtDistance(eDist)
      world.boulderVelocity += Math.sin(currentAngle * Math.PI / 180) * 200 * dt
    } else {
      world.boulderVelocity *= 0.94
      if (!world.sisyphusFallen) {
        world.sisyphusFallen = true
        world.sisyphusRunning = false
        triggerSisyphusExclamation()
      }
    }

    world.boulderDistance += world.boulderVelocity * dt * pd
    world.boulderBounce = Math.abs(Math.sin(world.boulderRotation * 3)) * Math.min(8, world.boulderVelocity * 0.008)

    const totalRollDistance = PEAK_DISTANCE + 500
    const scoreRatio = Math.max(0, 1 - (distFromPeak / totalRollDistance))
    displayScore.value = Math.floor(finalScore.value * scoreRatio)

    const effectiveDistance = Math.max(0, PEAK_DISTANCE - distFromPeak)
    displayLevel.value = getLevelAtDistance(effectiveDistance)
    progressPercent.value = Math.min(100, Math.max(0, (effectiveDistance / PEAK_DISTANCE) * 100))

    const canvas = gameCanvas.value
    const screenWidth = canvas?.width || 800
    world.worldScrollX = world.boulderDistance - (screenWidth * PLAYER_SCREEN_X_RATIO)

    if (world.gameTime - world.lastRollSoundTime > 0.1 && world.boulderVelocity > 5) {
      play8BitSound('roll')
      world.lastRollSoundTime = world.gameTime
    }

    world.boulderRotation += world.boulderVelocity * dt * 0.02 * pd

    if (world.sisyphusRunning) {
      world.sisyphusTumbleX = -70 * pd
      const halfwayDown = PEAK_DISTANCE / 2
      if (distFromPeak > halfwayDown && Math.random() < 0.02) {
        world.sisyphusRunning = false
        triggerSisyphusExclamation()
      }
    } else if (!world.sisyphusFallen) {
      world.sisyphusTumbleRotation += Math.PI * 4 * dt  // 2 rotations per second
      world.sisyphusTumbleX = -70 * pd - Math.sin(world.sisyphusTumbleRotation) * 10 * pd
    }

    world.boulderExclamationTimer -= dt
    world.sisyphusExclamationTimer -= dt

    if (world.boulderExclamationTimer <= 0 && world.boulderVelocity > 30) {
      triggerBoulderExclamation()
    }
    if (world.sisyphusExclamationTimer <= 0 && world.boulderVelocity > 20 && !world.sisyphusRunning) {
      triggerSisyphusExclamation()
    }

    if (distFromPeak > PEAK_DISTANCE && world.boulderVelocity < 5) {
      displayScore.value = 0
      continueFromPeak.value = true
      continueTimer.value = 5
      gameState.value = 'continue_prompt'
    }
  }

  function updateContinuePrompt(dt: number) {
    continueTimer.value -= dt
    if (continueTimer.value <= 0) {
      declineContinue()
    }
  }

  function startCountdown() {
    gameState.value = 'countdown'
    world.countdownTimer = 0
  }

  function updateCountdown(dt: number) {
    world.countdownTimer += dt
    // 3 numbers (1s each) + "PUSH!" (0.5s) = 3.5s total
    if (world.countdownTimer > 3.5) {
      gameState.value = 'playing'
      world.lastTapTime = Date.now()
    }
  }

  function updateGettingUp(dt: number) {
    world.gettingUpPhase += dt

    if (world.gettingUpPhase > 3) {
      // Flip direction if continuing from peak
      if (continueFromPeak.value) {
        world.pushDir = (world.pushDir * -1) as 1 | -1
      }

      // Set boulder to the current "bottom"
      const bottom = world.pushDir > 0 ? 0 : PEAK_DISTANCE * 2
      world.boulderDistance = bottom
      world.worldDistance = bottom - 40 * world.pushDir

      const canvas = gameCanvas.value
      const screenWidth = canvas?.width || 800
      world.worldScrollX = world.boulderDistance - (screenWidth * PLAYER_SCREEN_X_RATIO)

      world.boulderVelocity = 0
      intensity.value = 50
      world.lastTapTime = Date.now()
      score.value = 0
      displayScore.value = 0
      displayLevel.value = 1
      world.sisyphusFlattened = false
      world.sisyphusFallen = false
      world.sisyphusRunning = false
      world.reachedPeak = false
      startCountdown()
    }
  }

  function updateFinalThought(dt: number) {
    world.finalThoughtTimer += dt
    if (world.finalThoughtTimer > 4) {
      gameState.value = 'credits'
      creditsY.value = 500
    }
  }

  function updateCredits(dt: number) {
    creditsY.value -= 40 * dt
    if (creditsY.value < -1100) {
      showGameOver()
    }
  }

  function updateAnimations(dt: number) {
    world.gameTime += dt
    world.breathPhase += dt * 3

    if (gameState.value === 'playing') {
      world.legPhase += dt * 8
      world.boulderRotation += dt * (CONSTANT_SPEED / 26) * world.pushDir
      if (world.gameTime - world.lastFootstepTime > 0.25) {
        play8BitSound('footstep')
        world.lastFootstepTime = world.gameTime
      }
      if (world.gameTime - world.lastHuffTime > 0.7) {
        play8BitSound('huff')
        world.lastHuffTime = world.gameTime
      }
    }

    world.armPhase *= 0.88

    updatePrometheusExchange(dt)

    if (world.currentThought && gameState.value === 'playing') {
      world.currentThought.fadeIn = Math.min(1, world.currentThought.fadeIn + dt * 3)
      world.currentThought.timer -= dt
      if (world.currentThought.timer <= 0) world.currentThought = null
    }

    if (world.levelAnnouncementTimer > 0) {
      world.levelAnnouncementTimer -= dt
      if (world.levelAnnouncementTimer <= 0) levelAnnouncement.value = ''
    }
  }

  function updateEnvironment(dt: number) {
    world.clouds.forEach(cloud => {
      cloud.x -= cloud.speed * dt
      if (cloud.x < -100) cloud.x = 2000 + Math.random() * 500
    })

    world.birds = world.birds.filter(bird => {
      bird.x += bird.vx * dt
      bird.y += bird.vy * dt
      bird.vy += Math.sin(world.gameTime * 3 + bird.x * 0.01) * 20 * dt
      bird.flapPhase += dt * 12
      return bird.x > -100
    })

    if (world.spaceshipActive) {
      world.spaceshipTimer += dt
      world.spaceshipX += 120 * dt
      world.spaceshipY += Math.sin(world.spaceshipTimer * 2) * 15 * dt
      if (world.spaceshipX > (gameCanvas.value?.width || 1000) + 100) {
        world.spaceshipActive = false
      }
    }

    updateObstacles(dt)
  }

  function gameLoop() {
    const validStates = ['playing', 'countdown', 'crushing', 'rolling_back', 'rolling_over', 'continue_prompt', 'getting_up', 'final_thought', 'credits']
    if (!validStates.includes(gameState.value)) return

    const canvas = gameCanvas.value
    if (!canvas) return

    const now = performance.now()
    const dt = Math.min((now - world.lastFrameTime) / 1000, 0.05)
    world.lastFrameTime = now

    // Auto-play
    if (world.autoPlayMode && gameState.value === 'playing') {
      if (now - world.lastAutoTapTime > 120) {
        registerTap()
        world.lastAutoTapTime = now
      }
    }

    if (gameState.value === 'countdown') {
      updateCountdown(dt)
    } else if (gameState.value === 'playing') {
      updatePlaying(dt)
    } else if (gameState.value === 'crushing') {
      updateCrushing(dt)
    } else if (gameState.value === 'rolling_back') {
      updateRollingBack(dt)
    } else if (gameState.value === 'rolling_over') {
      updateRollingOver(dt)
    } else if (gameState.value === 'continue_prompt') {
      updateContinuePrompt(dt)
    } else if (gameState.value === 'getting_up') {
      updateGettingUp(dt)
    } else if (gameState.value === 'final_thought') {
      updateFinalThought(dt)
    } else if (gameState.value === 'credits') {
      updateCredits(dt)
    }

    updateAnimations(dt)
    updateEnvironment(dt)
    render()

    animationId = requestAnimationFrame(gameLoop)
  }

  function stopLoop() {
    cancelAnimationFrame(animationId)
  }

  return {
    gameLoop,
    stopLoop,
    spawnBird,
    startCountdown,
  }
}
