import type { Ref } from 'vue'
import type { GameState } from './useGameState'
import type { Obstacle } from './useGameState'
import { PEAK_DISTANCE, PLAYER_SCREEN_X_RATIO, CONSTANT_SPEED, METER_DRAIN_RATES, LEVEL_DISTANCES, FLAT_START } from './usePhysics'
import { createObstacleUpdater } from './useGameLoop-obstacles'
import { TIMING, PHYSICS, ENVIRONMENT, TUMBLE_OFFSET_X, BOULDER_RADIUS } from '~/game/constants'
import { louGaryDialogue, garyExitThought } from '~/game/content'
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
    flatIdleTime: number
    idleBirdSent: boolean
    idleBoulderThought: boolean
    isIdle: boolean
    swatPhase: number
    idleBird: { x: number; y: number; phase: number; swoopPhase: number; targetX: number; flyingAway: boolean; flyAwayX: number; flyAwayY: number } | null
    garyBird: { x: number; y: number; phase: number; landed: boolean; flyingAway: boolean; flyAwayX: number; flyAwayY: number; thought: string; thoughtTimer: number } | null
    garySent: boolean
    idleDialogue: { exchanges: { speaker: string; text: string }[]; currentIndex: number; timer: number; pauseTimer: number } | null
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
    prometheusExchangePauseTimer: number
    prometheusActiveExchange: { speaker: string; text: string; timer: number; fadeIn: number } | null
    spaceshipX: number
    spaceshipY: number
    spaceshipActive: boolean
    spaceshipTimer: number
    deliveryBird: {
      active: boolean
      phase: 'fetch' | 'grab' | 'carry' | 'drop' | 'exit'
      x: number
      y: number
      pickupX: number
      dropX: number
      grabTimer: number
      bodyPickedUp: boolean
      dropComplete: boolean
      bloodDrops: { x: number; y: number; vy: number; alpha: number }[]
    }
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

  /** Update camera scroll position based on boulder position */
  function updateScroll(): void {
    const screenWidth = gameCanvas.value?.width || 800
    world.worldScrollX = world.boulderDistance - (screenWidth * PLAYER_SCREEN_X_RATIO)
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

  function spawnIdleBird() {
    const canvas = gameCanvas.value
    if (!canvas) return
    const playerScreenX = world.worldDistance - world.worldScrollX
    world.idleBird = {
      x: canvas.width + 80,
      y: 40,
      phase: 0,
      swoopPhase: 0,
      targetX: playerScreenX,
      flyingAway: false,
      flyAwayX: 0,
      flyAwayY: 0,
    }
  }

  function spawnGaryBird() {
    const canvas = gameCanvas.value
    if (!canvas) return
    const playerScreenX = world.worldDistance - world.worldScrollX
    world.garyBird = {
      x: -80,        // flies in from left
      y: 40,
      phase: 0,
      landed: false,
      flyingAway: false,
      flyAwayX: 0,
      flyAwayY: 0,
      thought: '',
      thoughtTimer: 0,
    }
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
        world.currentThought = { text: phrases[i], timer: TIMING.thoughtDuration, fadeIn: 0 }
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
      // Start first exchange immediately
      advancePrometheusExchange()
    }
  }

  function advancePrometheusExchange() {
    const dialogueSet = dialogue.prometheusDialogues[world.prometheusDialogueIndex]
    if (!dialogueSet || world.prometheusNextExchange >= dialogueSet.exchanges.length) return

    const nextExchange = dialogueSet.exchanges[world.prometheusNextExchange]
    world.prometheusActiveExchange = {
      speaker: nextExchange.speaker,
      text: nextExchange.text,
      timer: TIMING.prometheusExchangeDuration,
      fadeIn: 0,
    }
    world.prometheusNextExchange++
  }

  function updatePrometheusExchange(dt: number) {
    // Handle pause between exchanges
    if (world.prometheusExchangePauseTimer > 0) {
      world.prometheusExchangePauseTimer -= dt
      if (world.prometheusExchangePauseTimer <= 0) {
        advancePrometheusExchange()
      }
      return
    }

    if (!world.prometheusActiveExchange) return
    world.prometheusActiveExchange.fadeIn = Math.min(1, world.prometheusActiveExchange.fadeIn + dt * 3)
    world.prometheusActiveExchange.timer -= dt
    if (world.prometheusActiveExchange.timer <= 0) {
      world.prometheusActiveExchange = null
      // Queue next exchange after a pause
      const dialogueSet = dialogue.prometheusDialogues[world.prometheusDialogueIndex]
      if (dialogueSet && world.prometheusNextExchange < dialogueSet.exchanges.length) {
        world.prometheusExchangePauseTimer = TIMING.prometheusExchangePause
      }
    }
  }

  function maybeSpawnEvents() {
    if (!world.spaceshipActive && world.worldDistance > ENVIRONMENT.spaceshipMinDistance && Math.random() < ENVIRONMENT.spaceshipSpawnChance) {
      world.spaceshipActive = true
      world.spaceshipX = -100
      world.spaceshipY = 60 + Math.random() * 80
      world.spaceshipTimer = 0
    }
    if (world.birds.length < ENVIRONMENT.maxBirds && Math.random() < ENVIRONMENT.birdSpawnChance) {
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

    const onFlat = effectiveDist() < FLAT_START

    // Flat terrain idle — track time, spawn events, prevent crushing
    if (onFlat) {
      world.flatIdleTime += dt

      // Harassment bird after idle threshold
      if (world.flatIdleTime > TIMING.idleBirdDelay && !world.idleBirdSent) {
        world.idleBirdSent = true
        spawnIdleBird()
      }

      // Boulder thought bubble after longer idle
      if (world.flatIdleTime > TIMING.idleBoulderThoughtDelay && !world.idleBoulderThought) {
        world.idleBoulderThought = true
        world.currentBoulderExclamation = 'Maybe I should push HIM up the hill?'
        world.boulderExclamationTimer = TIMING.thoughtDuration
      }

      // Gary arrives after extended idle
      if (world.flatIdleTime > TIMING.idleGaryDelay && !world.garySent && world.idleBird) {
        world.garySent = true
        spawnGaryBird()
      }

      if (intensity.value <= 0) {
        intensity.value = 0
        return  // idle on flat — no crush, no movement
      }
    } else {
      // Reset idle tracking when leaving flat terrain
      if (world.flatIdleTime > 0) {
        world.flatIdleTime = 0
        world.idleBirdSent = false
        world.idleBoulderThought = false
        world.garySent = false
        world.swatPhase = 0
        // Birds fly away (handled in updateEnvironment via flatIdleTime check)
      }

      if (intensity.value <= 0) {
        intensity.value = 0
        startCrushing()
        return
      }
    }

    // Constant speed movement (on flat terrain, only move if player is actively pushing)
    if (!onFlat || intensity.value > 0) {
      world.boulderDistance += CONSTANT_SPEED * dt * pd
      world.worldDistance = world.boulderDistance - 40 * pd
      score.value += CONSTANT_SPEED * dt * PHYSICS.scoreMultiplier
      displayScore.value = score.value
      updateScroll()
    }

    const newLevel = getLevelAtDistance(effectiveDist())
    if (newLevel !== currentLevel.value) {
      if (newLevel > currentLevel.value) {
        levelAnnouncement.value = `LEVEL ${newLevel}!`
        world.levelAnnouncementTimer = TIMING.levelAnnouncementDuration
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
    if (world.crushTime > TIMING.crushStaggerDelay) {
      const elapsed = world.crushTime - TIMING.crushStaggerDelay
      const rollSpeed = PHYSICS.crushRollAccelBase + elapsed * PHYSICS.crushRollAccelRate
      world.boulderDistance -= rollSpeed * dt * pd
      clampToBottom()
      world.boulderRotation -= rollSpeed * dt * PHYSICS.boulderRotationScale * pd

      // Flatten Sisyphus when boulder rolls back over his position
      if ((world.sisyphusCrushWorldX - world.boulderDistance) * pd >= PHYSICS.crushFlattenOffset) {
        world.sisyphusFlattened = true
      }

      updateScroll()
    }

    if (world.crushTime > TIMING.crushToRollbackDelay) {
      gameState.value = 'rolling_back'
      world.boulderVelocity = 80
      triggerBoulderExclamation()
    }
  }

  function updateRollingBack(dt: number) {
    const pd = world.pushDir

    // If delivery bird is active, animate it instead of the boulder
    if (world.deliveryBird.active) {
      updateDeliveryBird(dt)
      return
    }

    const eDist = effectiveDist()
    const onFlat = eDist < FLAT_START
    // Boulder has rolled past the world boundary (0 or 2*PEAK)
    const pastBottom = pd > 0 ? world.boulderDistance < 0 : world.boulderDistance > PEAK_DISTANCE * 2

    if (onFlat || pastBottom) {
      // Gradual friction deceleration on flat terrain and beyond
      world.boulderVelocity *= Math.pow(PHYSICS.rollbackFlatFriction, dt * 60)
    } else {
      // Accelerate downhill
      world.boulderVelocity += PHYSICS.rollbackAcceleration * dt
    }

    world.boulderDistance -= world.boulderVelocity * dt * pd
    // No clampToBottom — boulder is free to roll past the world edge

    const currentEDist = Math.max(0, effectiveDist())
    const startDist = finalScore.value / 5
    const scoreRatio = currentEDist / Math.max(startDist, 100)
    displayScore.value = Math.max(0, Math.floor(finalScore.value * scoreRatio))

    displayLevel.value = getLevelAtDistance(currentEDist)
    progressPercent.value = Math.min(100, Math.max(0, (currentEDist / PEAK_DISTANCE) * 100))

    // Freeze camera once boulder passes the world edge — let boulder roll across screen
    if (!pastBottom) {
      updateScroll()
    }

    if (world.gameTime - world.lastRollSoundTime > TIMING.rollSoundInterval && world.boulderVelocity > 5) {
      play8BitSound('roll')
      world.lastRollSoundTime = world.gameTime
    }

    world.boulderRotation -= world.boulderVelocity * dt * PHYSICS.boulderRotationScale * pd

    world.boulderExclamationTimer -= dt
    if (world.boulderExclamationTimer <= 0 && world.boulderVelocity > PHYSICS.rollbackBounceVelocityThreshold) {
      triggerBoulderExclamation()
    }

    // Check if boulder reached near screen edge or slowed to a stop
    const canvas = gameCanvas.value
    const screenWidth = canvas?.width || 800
    const boulderScreenX = world.boulderDistance - world.worldScrollX
    const nearEdge = pd > 0
      ? boulderScreenX < PHYSICS.rollbackScreenEdgeMargin
      : boulderScreenX > screenWidth - PHYSICS.rollbackScreenEdgeMargin

    if ((onFlat || pastBottom) && (world.boulderVelocity < 5 || nearEdge)) {
      world.boulderVelocity = 0
      displayScore.value = 0
      spawnDeliveryBird()
    }
  }

  function spawnDeliveryBird() {
    const canvas = gameCanvas.value
    if (!canvas) return
    const pd = world.pushDir
    const bird = world.deliveryBird
    const crushScreenX = world.sisyphusCrushWorldX - world.worldScrollX
    const bodyOnScreen = crushScreenX > -50 && crushScreenX < canvas.width + 50

    bird.active = true
    bird.pickupX = world.sisyphusCrushWorldX
    bird.dropX = world.boulderDistance + 50 * pd
    bird.bodyPickedUp = false
    bird.dropComplete = false
    bird.grabTimer = 0
    bird.bloodDrops = []

    if (bodyOnScreen) {
      // Fly to the existing body on screen
      bird.phase = 'fetch'
      bird.x = (pd > 0 ? canvas.width + 150 : -150) + world.worldScrollX
      bird.y = PHYSICS.deliveryBirdCruiseAltitude
    } else {
      // Body is off-screen — fly in already carrying it
      bird.phase = 'carry'
      bird.bodyPickedUp = true
      bird.x = (pd > 0 ? canvas.width + 150 : -150) + world.worldScrollX
      bird.y = PHYSICS.deliveryBirdCruiseAltitude
    }
  }

  function updateDeliveryBird(dt: number) {
    const bird = world.deliveryBird
    const canvas = gameCanvas.value
    if (!canvas) return
    const speed = PHYSICS.deliveryBirdSpeed

    // Update blood drops
    bird.bloodDrops = bird.bloodDrops.filter(drop => {
      drop.y += drop.vy * dt
      drop.vy += 200 * dt  // gravity
      drop.alpha -= 0.4 * dt
      return drop.alpha > 0
    })

    // Spawn new blood drops while carrying
    if ((bird.phase === 'carry' || bird.phase === 'fetch') && bird.bodyPickedUp && Math.random() < 8 * dt) {
      bird.bloodDrops.push({
        x: bird.x + (Math.random() - 0.5) * 10,
        y: bird.y + 60,   // below the carried body
        vy: 20 + Math.random() * 40,
        alpha: 0.8 + Math.random() * 0.2,
      })
    }

    if (bird.phase === 'fetch') {
      // Fly toward the crush body position
      const dx = bird.pickupX - bird.x
      if (Math.abs(dx) > 15) {
        bird.x += Math.sign(dx) * speed * dt
        // Descend as we approach
        const targetY = Math.abs(dx) < 200 ? -PHYSICS.deliveryBirdDropHeight : PHYSICS.deliveryBirdCruiseAltitude
        bird.y += (targetY - bird.y) * 2 * dt
      } else {
        bird.phase = 'grab'
        bird.grabTimer = 0
        bird.y = -PHYSICS.deliveryBirdDropHeight
      }
    } else if (bird.phase === 'grab') {
      // Brief pause to "pick up" the body
      bird.grabTimer += dt
      if (bird.grabTimer > 0.4) {
        bird.bodyPickedUp = true  // hides the crushed body from rolling_back renderer
        bird.phase = 'carry'
      }
    } else if (bird.phase === 'carry') {
      // Fly toward drop point near boulder
      const dx = bird.dropX - bird.x
      if (Math.abs(dx) > 15) {
        bird.x += Math.sign(dx) * speed * dt
        // Cruise high, descend near target
        const targetY = Math.abs(dx) < 150 ? -PHYSICS.deliveryBirdDropHeight : PHYSICS.deliveryBirdCruiseAltitude
        bird.y += (targetY - bird.y) * 2 * dt
      } else {
        bird.phase = 'drop'
        bird.dropComplete = true
      }
    } else if (bird.phase === 'drop') {
      bird.phase = 'exit'
    } else if (bird.phase === 'exit') {
      // Fly away off-screen — climb and exit
      const exitDir = world.pushDir > 0 ? -1 : 1
      bird.x += exitDir * speed * 1.5 * dt
      bird.y += (PHYSICS.deliveryBirdCruiseAltitude - bird.y) * 2 * dt

      const screenX = bird.x - world.worldScrollX
      if (screenX < -200 || screenX > (canvas.width || 800) + 200) {
        bird.active = false
        bird.dropComplete = false  // hand off to continue_prompt's own body renderer
        continueFromPeak.value = false
        continueTimer.value = TIMING.continueTimerDuration
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
      world.boulderVelocity += Math.sin(currentAngle * Math.PI / 180) * PHYSICS.rollingOverGravityScale * dt
    } else {
      world.boulderVelocity *= PHYSICS.rollingOverDeceleration
      if (!world.sisyphusFallen) {
        world.sisyphusFallen = true
        world.sisyphusRunning = false
        triggerSisyphusExclamation()
      }
    }

    world.boulderDistance += world.boulderVelocity * dt * pd
    world.boulderBounce = Math.abs(Math.sin(world.boulderRotation * 3)) * Math.min(PHYSICS.maxBounceAmplitude, world.boulderVelocity * PHYSICS.bounceVelocityScale)

    const totalRollDistance = PEAK_DISTANCE + 500
    const scoreRatio = Math.max(0, 1 - (distFromPeak / totalRollDistance))
    displayScore.value = Math.floor(finalScore.value * scoreRatio)

    const effectiveDistance = Math.max(0, PEAK_DISTANCE - distFromPeak)
    displayLevel.value = getLevelAtDistance(effectiveDistance)
    progressPercent.value = Math.min(100, Math.max(0, (effectiveDistance / PEAK_DISTANCE) * 100))
    updateScroll()

    if (world.gameTime - world.lastRollSoundTime > TIMING.rollSoundIntervalFast && world.boulderVelocity > 5) {
      play8BitSound('roll')
      world.lastRollSoundTime = world.gameTime
    }

    world.boulderRotation += world.boulderVelocity * dt * PHYSICS.boulderRotationScale * pd

    if (world.sisyphusRunning) {
      world.sisyphusTumbleX = -TUMBLE_OFFSET_X * pd
      const halfwayDown = PEAK_DISTANCE / 2
      if (distFromPeak > halfwayDown && Math.random() < 0.02) {
        world.sisyphusRunning = false
        triggerSisyphusExclamation()
      }
    } else if (!world.sisyphusFallen) {
      world.sisyphusTumbleRotation += Math.PI * 4 * dt  // 2 rotations per second
      world.sisyphusTumbleX = -TUMBLE_OFFSET_X * pd - Math.sin(world.sisyphusTumbleRotation) * 10 * pd
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
      continueTimer.value = TIMING.continueTimerDuration
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
    if (world.countdownTimer > TIMING.countdownTotal) {
      gameState.value = 'playing'
      world.lastTapTime = Date.now()
      // On hills, give a grace period before crush; on flat, meter stays at 0
      if (effectiveDist() >= FLAT_START) {
        intensity.value = PHYSICS.initialIntensity
      }
    }
  }

  function updateGettingUp(dt: number) {
    world.gettingUpPhase += dt

    if (world.gettingUpPhase > TIMING.gettingUpTotalDuration) {
      // Flip direction if continuing from peak
      if (continueFromPeak.value) {
        world.pushDir = (world.pushDir * -1) as 1 | -1
      }

      world.boulderVelocity = 0
      intensity.value = 0
      score.value = 0
      displayScore.value = 0
      displayLevel.value = 1
      world.sisyphusFlattened = false
      world.sisyphusFallen = false
      world.sisyphusRunning = false
      world.reachedPeak = false

      // Push boulder back to start instead of teleporting
      gameState.value = 'returning'
    }
  }

  function updateReturning(dt: number) {
    const pd = world.pushDir
    const bottom = pd > 0 ? 0 : PEAK_DISTANCE * 2

    // Push boulder toward start position
    world.boulderDistance += PHYSICS.returnPushSpeed * dt * pd
    world.worldDistance = world.boulderDistance - 40 * pd

    // Animate walking
    world.legPhase += dt * 8
    world.boulderRotation += dt * (PHYSICS.returnPushSpeed / BOULDER_RADIUS) * pd

    // Update camera — but once we reach start, freeze
    const reached = pd > 0
      ? world.boulderDistance >= bottom
      : world.boulderDistance <= bottom

    if (reached) {
      world.boulderDistance = bottom
      world.worldDistance = bottom - 40 * pd
      updateScroll()
      world.lastTapTime = Date.now()
      startCountdown()
    } else {
      updateScroll()
    }
  }

  function updateFinalThought(dt: number) {
    world.finalThoughtTimer += dt
    if (world.finalThoughtTimer > TIMING.finalThoughtDuration) {
      gameState.value = 'credits'
      creditsY.value = 500
    }
  }

  function updateCredits(dt: number) {
    creditsY.value -= TIMING.creditsScrollSpeed * dt
    if (creditsY.value < TIMING.creditsEndY) {
      showGameOver()
    }
  }

  function updateAnimations(dt: number) {
    world.gameTime += dt
    world.breathPhase += dt * 3

    // Animate legs/sounds only when actually moving (not idle on flat)
    const isMoving = gameState.value === 'returning' || (gameState.value === 'playing' && (effectiveDist() >= FLAT_START || intensity.value > 0))
    world.isIdle = gameState.value === 'playing' && !isMoving
    if (isMoving) {
      world.legPhase += dt * 8
      world.boulderRotation += dt * (CONSTANT_SPEED / 26) * world.pushDir
      if (world.gameTime - world.lastFootstepTime > TIMING.footstepInterval) {
        play8BitSound('footstep')
        world.lastFootstepTime = world.gameTime
      }
      if (world.gameTime - world.lastHuffTime > TIMING.huffInterval) {
        play8BitSound('huff')
        world.lastHuffTime = world.gameTime
      }
    }

    world.armPhase *= 0.88

    // Decrement boulder exclamation timer during playing (for idle harassment thoughts)
    if (gameState.value === 'playing' && world.boulderExclamationTimer > 0) {
      world.boulderExclamationTimer -= dt
    }

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
      world.spaceshipX += PHYSICS.spaceshipSpeed * dt
      world.spaceshipY += Math.sin(world.spaceshipTimer * 2) * 15 * dt
      if (world.spaceshipX > (gameCanvas.value?.width || 1000) + 100) {
        world.spaceshipActive = false
      }
    }

    // Idle harassment bird (Lou) — flies in, swoops at Sisyphus's head, circles
    if (world.idleBird) {
      const bird = world.idleBird
      const canvas = gameCanvas.value
      const playerScreenX = world.worldDistance - world.worldScrollX

      if (bird.flyingAway) {
        // Lou flies away — up and to the right, leisurely
        bird.x += PHYSICS.louFlyAwaySpeedX * dt
        bird.y += PHYSICS.louFlyAwaySpeedY * dt
        bird.swoopPhase += dt * 6
        if (bird.x > (canvas?.width || 800) + 200) {
          world.idleBird = null
        }
      } else {
        bird.phase += dt
        bird.swoopPhase += dt * 2.5

        if (bird.phase < 2.5) {
          // Approach: fly from right toward player
          bird.x += (playerScreenX - bird.x) * PHYSICS.louApproachRate * dt
          bird.y = 30 + Math.sin(bird.swoopPhase) * 10
        } else {
          // Circle and dive-bomb around player's head
          const circleTime = bird.phase - 2.5
          const radius = 60 + Math.sin(circleTime * 0.7) * 25
          bird.x = playerScreenX + Math.cos(circleTime * 2.5) * radius
          bird.y = 20 + Math.sin(circleTime * 2.5) * 30 + Math.max(0, Math.sin(circleTime * 5)) * 40

          // Sisyphus swats periodically
          if (Math.sin(circleTime * 2.5) > 0.8 && world.swatPhase <= 0) {
            world.swatPhase = 0.4  // swat animation duration
          }
        }

        // When Sis starts moving, Lou flies away (not instant disappear)
        if (world.flatIdleTime <= 0 && !world.idleDialogue) {
          bird.flyingAway = true
        }
      }
    }

    // Sisyphus swat animation countdown
    if (world.swatPhase > 0) {
      world.swatPhase -= dt
      if (world.swatPhase < 0) world.swatPhase = 0
    }

    // Gary bird — flies in, lands, triggers dialogue
    if (world.garyBird) {
      const gary = world.garyBird
      const canvas = gameCanvas.value
      const playerScreenX = world.worldDistance - world.worldScrollX

      if (gary.flyingAway) {
        // Gary flies away — up and to the left, leisurely
        gary.x -= PHYSICS.garyFlyAwaySpeedX * dt
        gary.y += PHYSICS.garyFlyAwaySpeedY * dt
        gary.landed = false
        gary.phase += dt * 6
        if (gary.thoughtTimer > 0) gary.thoughtTimer -= dt
        if (gary.x < -200) {
          world.garyBird = null
        }
      } else if (!gary.landed) {
        // Fly in from left toward a spot near the player
        gary.phase += dt
        const landingX = playerScreenX - PHYSICS.garyLandingOffset
        gary.x += (landingX - gary.x) * PHYSICS.garyApproachRate * dt
        gary.y += (0 - gary.y) * PHYSICS.garyApproachRate * dt
        if (Math.abs(gary.x - landingX) < 5 && gary.phase > PHYSICS.garyLandingPhaseMin) {
          gary.landed = true
          gary.x = landingX
          gary.y = 0
          // Start the dialogue exchange
          world.idleDialogue = {
            exchanges: [...louGaryDialogue],
            currentIndex: 0,
            timer: TIMING.idleDialogueLineDuration,
            pauseTimer: 0,
          }
        }
      }
    }

    // Idle dialogue exchange (Lou & Gary)
    if (world.idleDialogue) {
      const dlg = world.idleDialogue
      if (dlg.pauseTimer > 0) {
        dlg.pauseTimer -= dt
        if (dlg.pauseTimer <= 0) {
          dlg.currentIndex++
          if (dlg.currentIndex >= dlg.exchanges.length) {
            // Dialogue finished — Gary flies off with departing thought
            world.idleDialogue = null
            if (world.garyBird) {
              world.garyBird.flyingAway = true
              world.garyBird.thought = garyExitThought
              world.garyBird.thoughtTimer = TIMING.garyExitThoughtDuration
            }
          } else {
            dlg.timer = TIMING.idleDialogueLineDuration
          }
        }
      } else {
        dlg.timer -= dt
        if (dlg.timer <= 0) {
          dlg.pauseTimer = TIMING.idleDialoguePause
        }
      }

      // If player starts moving during dialogue, end it — birds fly away
      if (world.flatIdleTime <= 0) {
        world.idleDialogue = null
        if (world.idleBird && !world.idleBird.flyingAway) {
          world.idleBird.flyingAway = true
        }
        if (world.garyBird && !world.garyBird.flyingAway) {
          world.garyBird.flyingAway = true
        }
      }
    }

    updateObstacles(dt)
  }

  function gameLoop() {
    const validStates = ['playing', 'countdown', 'crushing', 'rolling_back', 'rolling_over', 'continue_prompt', 'getting_up', 'returning', 'final_thought', 'credits']
    if (!validStates.includes(gameState.value)) return

    const canvas = gameCanvas.value
    if (!canvas) return

    const now = performance.now()
    const dt = Math.min((now - world.lastFrameTime) / 1000, 0.05)
    world.lastFrameTime = now

    // Auto-play
    if (world.autoPlayMode && gameState.value === 'playing') {
      if (now - world.lastAutoTapTime > TIMING.autoTapInterval) {
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
    } else if (gameState.value === 'returning') {
      updateReturning(dt)
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
