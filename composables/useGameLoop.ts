import type { Ref } from 'vue'
import type { GameState } from './useGameState'
import { PEAK_DISTANCE, PLAYER_SCREEN_X_RATIO, GRAVITY_MULT, PUSH_MULT, SLIDE_MULT, PUSH_DECAY } from './usePhysics'
import { normalThoughts, desperateThoughts } from '~/game/content'

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
  continueTimer: Ref<number>
  continueFromPeak: Ref<boolean>
  creditsY: Ref<number>
  world: {
    worldDistance: number
    boulderDistance: number
    worldScrollX: number
    pushPower: number
    lastTapTime: number
    tapTimes: number[]
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
    gettingUpPhase: number
    currentSassyComment: string
    levelAnnouncementTimer: number
    autoPlayMode: boolean
    lastAutoTapTime: number
    lastFootstepTime: number
    lastHuffTime: number
    lastRollSoundTime: number
    birds: { x: number; y: number; vx: number; vy: number; flapPhase: number }[]
    clouds: { x: number; y: number; speed: number; size: number }[]
    spaceshipX: number
    spaceshipY: number
    spaceshipActive: boolean
    spaceshipTimer: number
  }
  registerTap: () => void
  getAngleAtDistance: (dist: number) => number
  getLevelAtDistance: (dist: number) => number
  triggerBoulderExclamation: () => void
  triggerSisyphusExclamation: () => void
  declineContinue: () => void
  play8BitSound: (type: 'footstep' | 'huff' | 'push' | 'slip' | 'crush' | 'roll' | 'levelup') => void
  render: () => void
  showGameOver: () => void
}

export function useGameLoop(deps: GameLoopDeps) {
  const {
    gameCanvas, gameState, score, displayScore, finalScore, intensity,
    currentLevel, displayLevel, levelAnnouncement, continueTimer, continueFromPeak,
    creditsY, world, registerTap, getAngleAtDistance, getLevelAtDistance,
    triggerBoulderExclamation, triggerSisyphusExclamation, declineContinue,
    play8BitSound, render, showGameOver,
  } = deps

  let animationId = 0

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

  function maybeShowThought() {
    if (world.currentThought) return
    if (world.gameTime - world.lastThoughtTime < 6) return
    if (Math.random() > 0.02) return

    const thoughts = intensity.value < 25 ? desperateThoughts : normalThoughts
    world.currentThought = {
      text: thoughts[Math.floor(Math.random() * thoughts.length)],
      timer: 4,
      fadeIn: 0
    }
    world.lastThoughtTime = world.gameTime
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
    world.sisyphusTumbleX = -70
    world.sisyphusFallen = false
    world.sisyphusRunning = true
    triggerBoulderExclamation()
  }

  function updatePlaying(dt: number) {
    const now = Date.now()
    const timeSinceLastTap = (now - world.lastTapTime) / 1000

    world.pushPower *= PUSH_DECAY

    const currentAngle = getAngleAtDistance(world.boulderDistance)
    const requiredForce = Math.sin(currentAngle * Math.PI / 180) * GRAVITY_MULT
    const netForce = world.pushPower - requiredForce

    if (netForce > 0) {
      const moveAmount = netForce * dt * PUSH_MULT
      world.boulderDistance += moveAmount
      world.worldDistance = world.boulderDistance - 40
      score.value += netForce * dt * 10
      displayScore.value = score.value
    } else {
      world.boulderDistance += netForce * dt * SLIDE_MULT
      world.boulderDistance = Math.max(0, world.boulderDistance)
      world.worldDistance = Math.max(0, world.boulderDistance - 40)
      if (Math.random() > 0.85) play8BitSound('slip')
    }

    const canvas = gameCanvas.value
    const screenWidth = canvas?.width || 800
    world.worldScrollX = Math.max(0, world.boulderDistance - (screenWidth * PLAYER_SCREEN_X_RATIO))

    const newLevel = getLevelAtDistance(world.boulderDistance)
    if (newLevel !== currentLevel.value) {
      if (newLevel > currentLevel.value) {
        levelAnnouncement.value = `LEVEL ${newLevel}!`
        world.levelAnnouncementTimer = 2
        play8BitSound('levelup')
      }
      currentLevel.value = newLevel
      displayLevel.value = newLevel
    }

    const pushRatio = world.pushPower / (requiredForce + 0.2)
    intensity.value = Math.min(100, Math.max(0, pushRatio * 50))

    if (timeSinceLastTap > 1.2 && world.pushPower < 0.15) {
      startCrushing()
      return
    }

    if (world.boulderDistance >= PEAK_DISTANCE) {
      startRollingOver()
      return
    }

    maybeShowThought()
    maybeSpawnEvents()
  }

  function updateCrushing(dt: number) {
    world.crushTime += dt

    // Brief stagger (0.2s), then boulder rolls backward (downhill)
    if (world.crushTime > 0.2) {
      const elapsed = world.crushTime - 0.2
      const rollSpeed = 40 + elapsed * 200 // accelerating downhill
      world.boulderDistance -= rollSpeed * dt
      world.boulderDistance = Math.max(0, world.boulderDistance)
      world.boulderRotation -= rollSpeed * dt * 0.02

      // Flatten Sisyphus when boulder rolls back over his position
      if (world.boulderDistance <= world.sisyphusCrushWorldX + 30) {
        world.sisyphusFlattened = true
      }

      const canvas = gameCanvas.value
      const screenWidth = canvas?.width || 800
      world.worldScrollX = Math.max(0, world.boulderDistance - (screenWidth * PLAYER_SCREEN_X_RATIO))
    }

    if (world.crushTime > 1.0) {
      gameState.value = 'rolling_back'
      world.boulderVelocity = 80
      triggerBoulderExclamation()
    }
  }

  function updateRollingBack(dt: number) {
    world.boulderVelocity += 150 * dt
    world.boulderDistance -= world.boulderVelocity * dt * 0.15
    world.boulderDistance = Math.max(0, world.boulderDistance)

    const startDist = finalScore.value / 5
    const scoreRatio = world.boulderDistance / Math.max(startDist, 100)
    displayScore.value = Math.max(0, Math.floor(finalScore.value * scoreRatio))

    displayLevel.value = getLevelAtDistance(world.boulderDistance)

    const canvas = gameCanvas.value
    const screenWidth = canvas?.width || 800
    world.worldScrollX = Math.max(0, world.boulderDistance - (screenWidth * PLAYER_SCREEN_X_RATIO))

    if (world.gameTime - world.lastRollSoundTime > 0.12 && world.boulderVelocity > 5) {
      play8BitSound('roll')
      world.lastRollSoundTime = world.gameTime
    }

    world.boulderRotation -= world.boulderVelocity * dt * 0.02

    world.boulderExclamationTimer -= dt
    if (world.boulderExclamationTimer <= 0 && world.boulderVelocity > 20) {
      triggerBoulderExclamation()
    }

    if (world.boulderDistance <= 5) {
      world.boulderDistance = 0
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
    const flatGroundDistance = PEAK_DISTANCE * 2
    const halfwayDown = PEAK_DISTANCE + (PEAK_DISTANCE / 2)

    if (world.boulderDistance < flatGroundDistance) {
      const effectiveDist = Math.max(0, PEAK_DISTANCE - (world.boulderDistance - PEAK_DISTANCE))
      const currentAngle = getAngleAtDistance(effectiveDist)
      world.boulderVelocity += Math.sin(currentAngle * Math.PI / 180) * 200 * dt
    } else {
      world.boulderVelocity *= 0.94
      if (!world.sisyphusFallen) {
        world.sisyphusFallen = true
        world.sisyphusRunning = false
        triggerSisyphusExclamation()
      }
    }

    world.boulderDistance += world.boulderVelocity * dt * 0.1
    world.boulderBounce = Math.abs(Math.sin(world.boulderRotation * 3)) * Math.min(8, world.boulderVelocity * 0.008)

    const totalRollDistance = flatGroundDistance - PEAK_DISTANCE + 500
    const distanceRolled = world.boulderDistance - PEAK_DISTANCE
    const scoreRatio = Math.max(0, 1 - (distanceRolled / totalRollDistance))
    displayScore.value = Math.floor(finalScore.value * scoreRatio)

    const effectiveDistance = Math.max(0, PEAK_DISTANCE - (world.boulderDistance - PEAK_DISTANCE))
    displayLevel.value = getLevelAtDistance(effectiveDistance)

    const canvas = gameCanvas.value
    const screenWidth = canvas?.width || 800
    world.worldScrollX = Math.max(0, world.boulderDistance - (screenWidth * PLAYER_SCREEN_X_RATIO))

    if (world.gameTime - world.lastRollSoundTime > 0.1 && world.boulderVelocity > 5) {
      play8BitSound('roll')
      world.lastRollSoundTime = world.gameTime
    }

    world.boulderRotation += world.boulderVelocity * dt * 0.02

    if (world.sisyphusRunning) {
      world.sisyphusTumbleX = -70
      if (world.boulderDistance > halfwayDown && Math.random() < 0.02) {
        world.sisyphusRunning = false
        triggerSisyphusExclamation()
      }
    } else if (!world.sisyphusFallen) {
      world.sisyphusTumbleRotation += world.boulderVelocity * dt * 0.05
      world.sisyphusTumbleX = -70 - Math.sin(world.sisyphusTumbleRotation) * 10
    }

    world.boulderExclamationTimer -= dt
    world.sisyphusExclamationTimer -= dt

    if (world.boulderExclamationTimer <= 0 && world.boulderVelocity > 30) {
      triggerBoulderExclamation()
    }
    if (world.sisyphusExclamationTimer <= 0 && world.boulderVelocity > 20 && !world.sisyphusRunning) {
      triggerSisyphusExclamation()
    }

    if (world.boulderDistance > flatGroundDistance && world.boulderVelocity < 5) {
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

  function updateGettingUp(dt: number) {
    world.gettingUpPhase += dt

    if (world.gettingUpPhase > 4) {
      world.boulderDistance = 0
      world.worldDistance = 0
      world.worldScrollX = 0
      world.boulderVelocity = 0
      world.pushPower = 0.5
      world.lastTapTime = Date.now()
      score.value = 0
      displayScore.value = 0
      displayLevel.value = 1
      world.sisyphusFlattened = false
      world.sisyphusFallen = false
      world.sisyphusRunning = false
      world.reachedPeak = false
      gameState.value = 'playing'
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
    if (creditsY.value < -900) {
      showGameOver()
    }
  }

  function updateAnimations(dt: number) {
    world.gameTime += dt
    world.breathPhase += dt * 3

    if (world.pushPower > 0.3 && gameState.value === 'playing') {
      world.legPhase += dt * world.pushPower * 10
      if (world.gameTime - world.lastFootstepTime > 0.2 / Math.max(0.5, world.pushPower)) {
        play8BitSound('footstep')
        world.lastFootstepTime = world.gameTime
      }
      if (world.gameTime - world.lastHuffTime > 0.7) {
        play8BitSound('huff')
        world.lastHuffTime = world.gameTime
      }
    }

    world.armPhase *= 0.88

    if (gameState.value === 'playing' && world.pushPower > 0.3) {
      world.boulderRotation += dt * world.pushPower * 2.5
    }

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
  }

  function gameLoop() {
    const validStates = ['playing', 'crushing', 'rolling_back', 'rolling_over', 'continue_prompt', 'getting_up', 'final_thought', 'credits']
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

    if (gameState.value === 'playing') {
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
  }
}
