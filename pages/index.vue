<template>
  <div class="game-container" @click="handleClick">
    <canvas ref="gameCanvas"></canvas>

    <!-- Intensity Meter -->
    <div class="ui-overlay">
      <div class="intensity-meter" v-if="gameState === 'playing' || gameState === 'crushing'">
        <div class="meter-label">PUSH INTENSITY</div>
        <div class="meter-bar">
          <div class="meter-fill" :style="{ width: intensity + '%', backgroundColor: intensityColor }"></div>
          <div class="meter-threshold"></div>
        </div>
        <div class="meter-hint">{{ autoPlay ? '🤖 AUTO-PLAY MODE' : 'TAP [SPACE] TO PUSH' }}</div>
      </div>

      <div class="score" v-if="gameState === 'playing' || gameState === 'crushing' || gameState === 'rolling_back'">
        SCORE: {{ Math.floor(score) }}
      </div>
    </div>

    <!-- Start Screen -->
    <div class="overlay start-screen" v-if="gameState === 'start'">
      <h1>SISYPHUS</h1>
      <p class="subtitle">"One must imagine Sisyphus happy."</p>
      <p class="instructions">
        Push the boulder up the hill.<br>
        Tap [SPACE] rapidly to push.<br>
        Stop pushing and... well, you know.
      </p>
      <button @click="startGame" class="start-btn">BEGIN YOUR ETERNAL TASK</button>
      <p class="sound-note">🔊 Sound effects included</p>
    </div>

    <!-- Credits Roll -->
    <div class="overlay credits-screen" v-if="gameState === 'credits'">
      <div class="credits-scroll" :style="{ transform: `translateY(${creditsY}px)` }">
        <h1>THE END</h1>
        <p class="credits-subtitle">(for now)</p>

        <div class="credits-section">
          <h2>CAST</h2>
          <div v-for="(item, idx) in creditsData.cast" :key="'cast-'+idx" class="credit-line">
            <span class="credit-role">{{ item.role }}</span>
            <span class="credit-dots"></span>
            <span class="credit-name">{{ item.actor }}</span>
          </div>
        </div>

        <div class="credits-section">
          <h2>CREW</h2>
          <div v-for="(item, idx) in creditsData.crew" :key="'crew-'+idx" class="credit-line">
            <span class="credit-role">{{ item.role }}</span>
            <span class="credit-dots"></span>
            <span class="credit-name">{{ item.name }}</span>
          </div>
        </div>

        <div class="credits-section">
          <p class="credits-quote">"The struggle itself toward the heights is enough to fill a man's heart."</p>
          <p class="credits-author">- Albert Camus</p>
        </div>

        <div class="credits-section">
          <p class="final-score-credits">Final Score: {{ Math.floor(finalScore) }}</p>
          <p class="credits-note">(Same as everyone else's)</p>
        </div>
      </div>

      <button @click="showGameOver" class="skip-btn">SKIP</button>
    </div>

    <!-- Game Over Screen -->
    <div class="overlay game-over" v-if="gameState === 'gameover'">
      <h1>THE BOULDER WINS</h1>
      <p class="final-score">Final Score: {{ Math.floor(finalScore) }}</p>

      <div class="initials-entry" v-if="!initialsSubmitted">
        <p>Enter your initials:</p>
        <div class="initials-input">
          <input
            v-for="i in 3"
            :key="i"
            :ref="el => initialInputs[i-1] = el"
            type="text"
            maxlength="1"
            v-model="initials[i-1]"
            @input="handleInitialInput(i-1)"
            @keydown="handleInitialKeydown($event, i-1)"
            class="initial-box"
          />
        </div>
        <button @click="submitScore" class="submit-btn" :disabled="!canSubmit">SUBMIT</button>
      </div>

      <div class="leaderboard" v-if="leaderboard.length > 0">
        <h2>LEADERBOARD</h2>
        <div class="leaderboard-entry" v-for="(entry, idx) in leaderboard" :key="idx">
          <span class="rank">{{ idx + 1 }}.</span>
          <span class="name">{{ entry.initials }}</span>
          <span class="entry-score">{{ entry.score }}</span>
        </div>
        <p class="leaderboard-note" v-if="leaderboard.every(e => e.score === 0)">
          "We must imagine them all happy."
        </p>
      </div>

      <button @click="restartGame" class="restart-btn">PUSH AGAIN</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const gameCanvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let animationId: number = 0

// Audio context
let audioCtx: AudioContext | null = null

// Auto-play mode (for testing) - activate with ?auto in URL
let autoPlayMode = false
let lastAutoTapTime = 0

// Credits data
const creditsData = ref<any>({ cast: [], crew: [], thoughts: { normal: [], desperate: [], final: [] } })
const creditsY = ref(600)

// Game state
const gameState = ref<'start' | 'playing' | 'crushing' | 'rolling_back' | 'final_thought' | 'credits' | 'gameover'>('start')
const autoPlay = ref(false)
const score = ref(0)
const finalScore = ref(0)
const intensity = ref(50)
const leaderboard = ref<{ initials: string; score: number }[]>([])

// Initials
const initials = ref(['', '', ''])
const initialInputs = ref<(HTMLInputElement | null)[]>([null, null, null])
const initialsSubmitted = ref(false)

const canSubmit = computed(() => initials.value.every(i => i.length === 1))

const intensityColor = computed(() => {
  if (intensity.value > 60) return '#4ade80'
  if (intensity.value > 30) return '#fbbf24'
  return '#ef4444'
})

// World state
let worldX = 0
let totalDistance = 0
let hillAngle = 12 // Gentler starting angle
let pushPower = 0
let lastTapTime = 0
let tapTimes: number[] = []
let gameTime = 0
let lastFrameTime = 0

// Player position on hill (0 = bottom, increases as climbing)
let playerHillPosition = 0

// Animation
let legPhase = 0
let armPhase = 0
let boulderRotation = 0
let breathPhase = 0
let sweatDrops: { x: number; y: number; vy: number; life: number }[] = []

// Game over states
let isCrushed = false
let crushTime = 0
let sisyphusFlattened = false
let boulderWorldX = 0
let boulderVelocity = 0
let rollbackComplete = false
let finalThoughtShown = false
let finalThoughtTimer = 0
let currentFinalThought = ''

// Thoughts
let currentThought: { text: string; timer: number; fadeIn: number } | null = null
let lastThoughtTime = 0
let isDesperateMode = false

// Environment
interface Bird { x: number; y: number; vx: number; vy: number; flapPhase: number; type: 'bird' | 'vulture' }
interface Tree { worldX: number; height: number; type: number }
interface Cloud { x: number; y: number; speed: number; size: number }

let birds: Bird[] = []
let trees: Tree[] = []
let clouds: Cloud[] = []
let prometheusWorldX = -1
let spaceshipX = -200
let spaceshipY = 100
let spaceshipActive = false
let spaceshipTimer = 0
let vultureAttacking = false
let vultureAttackTimer = 0
let swattingVulture = false

// Sound timing
let lastFootstepTime = 0
let lastHuffTime = 0
let lastRollSoundTime = 0

async function loadCredits() {
  try {
    const data = await fetch('/credits.json').then(r => r.json())
    creditsData.value = data
  } catch (e) {
    console.error('Failed to load credits:', e)
  }
}

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
}

function play8BitSound(type: 'footstep' | 'huff' | 'push' | 'slip' | 'crush' | 'roll' | 'swoosh') {
  if (!audioCtx) return

  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.connect(gain)
  gain.connect(audioCtx.destination)

  const now = audioCtx.currentTime

  switch (type) {
    case 'footstep':
      osc.type = 'square'
      osc.frequency.setValueAtTime(80 + Math.random() * 40, now)
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.05)
      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05)
      osc.start(now)
      osc.stop(now + 0.05)
      break

    case 'huff':
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(150 + Math.random() * 50, now)
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.15)
      gain.gain.setValueAtTime(0.04, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
      osc.start(now)
      osc.stop(now + 0.15)
      break

    case 'push':
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(100, now)
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.03)
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.08)
      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08)
      osc.start(now)
      osc.stop(now + 0.08)
      break

    case 'slip':
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(200, now)
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.2)
      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
      osc.start(now)
      osc.stop(now + 0.2)
      break

    case 'crush':
      osc.type = 'square'
      osc.frequency.setValueAtTime(100, now)
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.5)
      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5)
      osc.start(now)
      osc.stop(now + 0.5)
      break

    case 'roll':
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(50 + Math.random() * 30, now)
      gain.gain.setValueAtTime(0.06, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08)
      osc.start(now)
      osc.stop(now + 0.08)
      break

    case 'swoosh':
      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, now)
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.3)
      gain.gain.setValueAtTime(0.05, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3)
      osc.start(now)
      osc.stop(now + 0.3)
      break
  }
}

function startGame() {
  initAudio()
  gameState.value = 'playing'
  resetGameState()
  lastFrameTime = performance.now()
  gameLoop()
}

function resetGameState() {
  score.value = 0
  intensity.value = 50
  worldX = 0
  totalDistance = 0
  hillAngle = 12
  pushPower = 0
  lastTapTime = Date.now()
  tapTimes = []
  gameTime = 0
  playerHillPosition = 0
  legPhase = 0
  armPhase = 0
  boulderRotation = 0
  breathPhase = 0
  sweatDrops = []
  isCrushed = false
  crushTime = 0
  sisyphusFlattened = false
  rollbackComplete = false
  finalThoughtShown = false
  finalThoughtTimer = 0
  currentThought = null
  lastThoughtTime = 0
  isDesperateMode = false
  prometheusWorldX = -1
  spaceshipActive = false
  vultureAttacking = false
  swattingVulture = false

  // Generate trees
  trees = []
  for (let i = 0; i < 100; i++) {
    trees.push({
      worldX: i * 150 + Math.random() * 80 + 300,
      height: 30 + Math.random() * 50,
      type: Math.floor(Math.random() * 3)
    })
  }

  // Generate clouds
  clouds = []
  for (let i = 0; i < 10; i++) {
    clouds.push({
      x: Math.random() * 2000,
      y: 40 + Math.random() * 100,
      speed: 8 + Math.random() * 15,
      size: 25 + Math.random() * 35
    })
  }

  // Initialize birds
  birds = []
  for (let i = 0; i < 4; i++) {
    spawnBird()
  }
}

function spawnBird(isVulture = false) {
  const canvas = gameCanvas.value
  if (!canvas) return

  birds.push({
    x: canvas.width + 50 + Math.random() * 200,
    y: 40 + Math.random() * 120,
    vx: -40 - Math.random() * 40,
    vy: Math.sin(Math.random() * Math.PI * 2) * 15,
    flapPhase: Math.random() * Math.PI * 2,
    type: isVulture ? 'vulture' : 'bird'
  })
}

function restartGame() {
  initialsSubmitted.value = false
  initials.value = ['', '', '']
  gameState.value = 'playing'
  resetGameState()
  lastFrameTime = performance.now()
  gameLoop()
}

function showGameOver() {
  gameState.value = 'gameover'
  cancelAnimationFrame(animationId)
  fetchLeaderboard()
}

async function submitScore() {
  if (!canSubmit.value) return
  const initialsStr = initials.value.join('').toUpperCase()
  try {
    await $fetch('/api/leaderboard', {
      method: 'POST',
      body: { initials: initialsStr, score: Math.floor(finalScore.value) }
    })
    initialsSubmitted.value = true
    await fetchLeaderboard()
  } catch (e) {
    console.error('Failed to submit score:', e)
  }
}

async function fetchLeaderboard() {
  try {
    const data = await $fetch('/api/leaderboard')
    leaderboard.value = data as { initials: string; score: number }[]
  } catch (e) {
    console.error('Failed to fetch leaderboard:', e)
  }
}

function handleInitialInput(index: number) {
  const val = initials.value[index]
  if (val && /[a-zA-Z]/.test(val)) {
    initials.value[index] = val.toUpperCase()
    if (index < 2 && initialInputs.value[index + 1]) {
      initialInputs.value[index + 1]?.focus()
    }
  } else {
    initials.value[index] = ''
  }
}

function handleInitialKeydown(e: KeyboardEvent, index: number) {
  if (e.key === 'Backspace' && !initials.value[index] && index > 0) {
    initialInputs.value[index - 1]?.focus()
  }
}

function handleClick() {
  if (gameState.value === 'playing') {
    initAudio()
    registerTap()
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.code === 'Space') {
    e.preventDefault()
    if (gameState.value === 'playing') {
      initAudio()
      registerTap()
    }
  }
}

function registerTap() {
  if (swattingVulture) return

  const now = Date.now()
  tapTimes.push(now)
  tapTimes = tapTimes.filter(t => now - t < 2000)

  const tapsPerSecond = tapTimes.length / 2
  const pushAmount = 0.5 + (tapsPerSecond * 0.2)
  pushPower += pushAmount
  lastTapTime = now

  armPhase = Math.PI * 0.4
  play8BitSound('push')

  if (pushPower > 1.5 && Math.random() > 0.6) {
    sweatDrops.push({ x: Math.random() * 10 - 5, y: 0, vy: -2 - Math.random() * 2, life: 1 })
  }
}

function getThought(type: 'normal' | 'desperate' | 'final'): string {
  const thoughts = creditsData.value.thoughts?.[type] || []
  if (thoughts.length === 0) {
    if (type === 'final') return "Well... that happened."
    if (type === 'desperate') return "I can't hold on..."
    return "..."
  }
  return thoughts[Math.floor(Math.random() * thoughts.length)]
}

function maybeShowThought() {
  if (currentThought) return
  if (gameTime - lastThoughtTime < 6) return

  // Check if desperate mode
  if (intensity.value < 25 && !isDesperateMode) {
    isDesperateMode = true
    currentThought = { text: getThought('desperate'), timer: 3, fadeIn: 0 }
    lastThoughtTime = gameTime
    return
  }

  if (intensity.value > 40) {
    isDesperateMode = false
  }

  if (Math.random() > 0.015) return

  const thought = isDesperateMode ? getThought('desperate') : getThought('normal')
  currentThought = { text: thought, timer: 4, fadeIn: 0 }
  lastThoughtTime = gameTime
}

function maybeSpawnEvents() {
  // Prometheus appears after distance 200
  if (prometheusWorldX < 0 && totalDistance > 200) {
    prometheusWorldX = worldX + 600
  }

  // Spaceship - more frequent
  if (!spaceshipActive && totalDistance > 100 && Math.random() < 0.002) {
    spaceshipActive = true
    spaceshipX = -100
    spaceshipY = 60 + Math.random() * 80
    spaceshipTimer = 0
  }

  // Vulture attack - more frequent
  if (!vultureAttacking && totalDistance > 150 && Math.random() < 0.002) {
    vultureAttacking = true
    vultureAttackTimer = 0
    spawnBird(true)
  }

  // Regular birds
  if (birds.filter(b => b.type === 'bird').length < 5 && Math.random() < 0.02) {
    spawnBird()
  }
}

function gameLoop() {
  const validStates = ['playing', 'crushing', 'rolling_back', 'final_thought', 'credits']
  if (!validStates.includes(gameState.value)) return

  const canvas = gameCanvas.value
  if (!canvas || !ctx) return

  const now = performance.now()
  const dt = Math.min((now - lastFrameTime) / 1000, 0.05)
  lastFrameTime = now

  // Auto-play mode: simulate tapping at optimal rate
  if (autoPlayMode && gameState.value === 'playing') {
    const autoTapInterval = 120 // ms between auto-taps (adjust for speed)
    if (now - lastAutoTapTime > autoTapInterval) {
      registerTap()
      lastAutoTapTime = now
    }
  }

  if (gameState.value === 'playing') {
    updatePhysics(dt)
    maybeShowThought()
    maybeSpawnEvents()
  } else if (gameState.value === 'crushing') {
    updateCrushing(dt)
  } else if (gameState.value === 'rolling_back') {
    updateRollingBack(dt)
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

function updatePhysics(dt: number) {
  const now = Date.now()
  const timeSinceLastTap = (now - lastTapTime) / 1000

  // Vulture attack handling
  if (vultureAttacking) {
    vultureAttackTimer += dt
    if (vultureAttackTimer > 0.5 && vultureAttackTimer < 2) {
      swattingVulture = true
      pushPower *= 0.92
    } else if (vultureAttackTimer > 2) {
      swattingVulture = false
      vultureAttacking = false
    }
  }

  // Decay push power
  pushPower *= 0.93

  // Required force based on angle
  const requiredForce = Math.sin(hillAngle * Math.PI / 180) * 2.2

  // Net force
  const netForce = pushPower - requiredForce

  if (netForce > 0) {
    // Moving up
    const moveAmount = netForce * dt * 0.025
    playerHillPosition += moveAmount
    totalDistance += moveAmount * 100
    score.value += netForce * dt * 10
    worldX += moveAmount * 400
  } else {
    // Slipping back
    playerHillPosition += netForce * dt * 0.03
    if (Math.random() > 0.85) play8BitSound('slip')
  }

  // Clamp position
  playerHillPosition = Math.max(0, playerHillPosition)

  // Update intensity meter
  const pushRatio = pushPower / (requiredForce + 0.2)
  intensity.value = Math.min(100, Math.max(0, pushRatio * 50))

  // Check for failure
  if (timeSinceLastTap > 1.2 && pushPower < 0.15) {
    startCrushing()
    return
  }

  // Gradually increase difficulty
  if (hillAngle < 45) {
    hillAngle += dt * 0.15
  }
}

function startCrushing() {
  gameState.value = 'crushing'
  isCrushed = true
  crushTime = 0
  finalScore.value = score.value
  play8BitSound('crush')

  // Set boulder starting position for rollback
  boulderWorldX = worldX
  boulderVelocity = 0
}

function updateCrushing(dt: number) {
  crushTime += dt

  if (crushTime > 0.4) {
    sisyphusFlattened = true
  }

  if (crushTime > 1.2) {
    gameState.value = 'rolling_back'
    boulderVelocity = 30
  }
}

function updateRollingBack(dt: number) {
  // Boulder accelerates as it rolls back
  boulderVelocity += 150 * dt
  boulderWorldX -= boulderVelocity * dt

  // Camera follows boulder
  const targetWorldX = Math.max(0, boulderWorldX - 200)
  worldX += (targetWorldX - worldX) * 3 * dt

  // Rolling sound
  if (gameTime - lastRollSoundTime > 0.12) {
    play8BitSound('roll')
    lastRollSoundTime = gameTime
  }

  // Boulder rotation
  boulderRotation -= boulderVelocity * dt * 0.015

  // Check if reached bottom
  if (boulderWorldX <= 50) {
    boulderWorldX = 50
    boulderVelocity *= 0.7

    if (boulderVelocity < 20) {
      // Boulder stopped - show final thought
      gameState.value = 'final_thought'
      currentFinalThought = getThought('final')
      finalThoughtTimer = 0
    }
  }
}

function updateFinalThought(dt: number) {
  finalThoughtTimer += dt

  if (finalThoughtTimer > 4) {
    // Start credits
    gameState.value = 'credits'
    creditsY.value = 500
  }
}

function updateCredits(dt: number) {
  creditsY.value -= 40 * dt

  if (creditsY.value < -800) {
    showGameOver()
  }
}

function updateAnimations(dt: number) {
  gameTime += dt
  breathPhase += dt * 3

  if (pushPower > 0.3 && gameState.value === 'playing') {
    legPhase += dt * pushPower * 10

    if (gameTime - lastFootstepTime > 0.2 / Math.max(0.5, pushPower)) {
      play8BitSound('footstep')
      lastFootstepTime = gameTime
    }

    if (gameTime - lastHuffTime > 0.7) {
      play8BitSound('huff')
      lastHuffTime = gameTime
    }
  }

  armPhase *= 0.88

  if (gameState.value === 'playing') {
    if (pushPower > 0.3) {
      boulderRotation += dt * pushPower * 2.5
    }
  }

  // Sweat drops
  sweatDrops = sweatDrops.filter(drop => {
    drop.y += drop.vy * 60 * dt
    drop.vy += 8 * dt
    drop.life -= dt
    return drop.life > 0
  })

  // Thought bubble
  if (currentThought && gameState.value === 'playing') {
    currentThought.fadeIn = Math.min(1, currentThought.fadeIn + dt * 3)
    currentThought.timer -= dt
    if (currentThought.timer <= 0) {
      currentThought = null
    }
  }
}

function updateEnvironment(dt: number) {
  // Clouds
  clouds.forEach(cloud => {
    cloud.x -= cloud.speed * dt
    if (cloud.x < -100) cloud.x = 2000 + Math.random() * 500
  })

  // Birds
  birds = birds.filter(bird => {
    bird.x += bird.vx * dt
    bird.y += bird.vy * dt
    bird.vy += Math.sin(gameTime * 3 + bird.x * 0.01) * 20 * dt
    bird.flapPhase += dt * 12

    // Vulture attack behavior
    if (bird.type === 'vulture' && vultureAttacking && vultureAttackTimer > 0.3) {
      const targetY = 150
      bird.vy += (targetY - bird.y) * dt
    }

    return bird.x > -100
  })

  // Spaceship
  if (spaceshipActive) {
    spaceshipTimer += dt
    spaceshipX += 120 * dt
    spaceshipY += Math.sin(spaceshipTimer * 2) * 15 * dt

    if (spaceshipTimer > 0.3 && spaceshipTimer < 0.5) {
      play8BitSound('swoosh')
    }

    const canvas = gameCanvas.value
    if (spaceshipX > (canvas?.width || 1000) + 100) {
      spaceshipActive = false
    }
  }
}

// Get Y position on hill for a given world X position
function getHillY(worldPosX: number, canvasHeight: number): number {
  const hillBaseY = canvasHeight - 60
  const angleRad = hillAngle * Math.PI / 180

  // Simple linear slope that starts from the left
  const heightGain = worldPosX * Math.tan(angleRad) * 0.4
  return hillBaseY - heightGain
}

function getScreenX(worldPosX: number): number {
  // Player stays at ~35% of screen, world scrolls
  const canvas = gameCanvas.value
  if (!canvas) return 100

  const playerScreenX = canvas.width * 0.35
  const playerWorldX = worldX

  return playerScreenX + (worldPosX - playerWorldX)
}

function render() {
  const canvas = gameCanvas.value
  if (!canvas || !ctx) return

  const width = canvas.width
  const height = canvas.height

  // Sky gradient
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height)
  const phase = Math.min(10, totalDistance / 80)

  if (phase < 3) {
    skyGradient.addColorStop(0, '#1a1a2e')
    skyGradient.addColorStop(1, '#16213e')
  } else if (phase < 6) {
    skyGradient.addColorStop(0, '#1a1a4e')
    skyGradient.addColorStop(0.5, '#2d1b4e')
    skyGradient.addColorStop(1, '#16213e')
  } else {
    skyGradient.addColorStop(0, '#0f0f23')
    skyGradient.addColorStop(0.3, '#1e1a4e')
    skyGradient.addColorStop(0.7, '#2d1b4e')
    skyGradient.addColorStop(1, '#1e3a5f')
  }

  ctx.fillStyle = skyGradient
  ctx.fillRect(0, 0, width, height)

  drawStars(width, height)
  drawMoon(width, height)
  drawClouds(width)
  drawDistantMountains(width, height)
  drawTrees(width, height)
  drawHill(width, height)
  drawPrometheus(width, height)
  drawSpaceship()
  drawBirds()
  drawSisyphusAndBoulder(width, height)
  drawThoughtBubble(width, height)
  drawFinalThought(width, height)
}

function drawStars(width: number, height: number) {
  if (!ctx) return
  const phase = Math.min(10, totalDistance / 80)
  if (phase < 1) return

  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < Math.min(phase * 20, 180); i++) {
    const baseX = (Math.sin(i * 123.456) * 0.5 + 0.5) * width * 2
    const x = ((baseX - worldX * 0.02) % (width + 100))
    const y = (Math.cos(i * 789.012) * 0.5 + 0.5) * height * 0.5
    const twinkle = Math.sin(gameTime * 2 + i) * 0.5 + 0.5
    const size = twinkle * 1.5 + 0.5
    ctx.globalAlpha = 0.3 + twinkle * 0.7
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawMoon(width: number, height: number) {
  if (!ctx) return
  const phase = Math.min(10, totalDistance / 80)
  if (phase < 2) return

  const moonX = width - 100 - (worldX * 0.01) % 50
  const moonY = 70 + Math.sin(gameTime * 0.1) * 5

  const glow = ctx.createRadialGradient(moonX, moonY, 25, moonX, moonY, 70)
  glow.addColorStop(0, 'rgba(255, 255, 200, 0.3)')
  glow.addColorStop(1, 'rgba(255, 255, 200, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(moonX, moonY, 70, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#f0f0d0'
  ctx.beginPath()
  ctx.arc(moonX, moonY, 30, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#d0d0b0'
  ctx.beginPath()
  ctx.arc(moonX - 8, moonY - 6, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(moonX + 6, moonY + 4, 3, 0, Math.PI * 2)
  ctx.fill()
}

function drawClouds(width: number) {
  if (!ctx) return

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
  clouds.forEach(cloud => {
    const x = ((cloud.x - worldX * 0.05) % (width + 200))
    ctx.beginPath()
    ctx.arc(x, cloud.y, cloud.size * 0.5, 0, Math.PI * 2)
    ctx.arc(x + cloud.size * 0.35, cloud.y - cloud.size * 0.15, cloud.size * 0.4, 0, Math.PI * 2)
    ctx.arc(x + cloud.size * 0.7, cloud.y, cloud.size * 0.45, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawDistantMountains(width: number, height: number) {
  if (!ctx) return
  const phase = Math.min(10, totalDistance / 80)
  if (phase < 2) return

  ctx.fillStyle = '#2a2a4a'
  ctx.beginPath()
  ctx.moveTo(0, height * 0.6)
  for (let x = 0; x <= width; x += 25) {
    const wx = x + worldX * 0.03
    const y = height * 0.6 - Math.sin(wx * 0.004) * 50 - Math.cos(wx * 0.006) * 35
    ctx.lineTo(x, y)
  }
  ctx.lineTo(width, height)
  ctx.lineTo(0, height)
  ctx.fill()

  if (phase > 3) {
    ctx.fillStyle = '#222238'
    ctx.beginPath()
    ctx.moveTo(0, height * 0.68)
    for (let x = 0; x <= width; x += 20) {
      const wx = x + worldX * 0.06
      const y = height * 0.68 - Math.sin(wx * 0.005) * 40 - Math.cos(wx * 0.003) * 25
      ctx.lineTo(x, y)
    }
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.fill()
  }
}

function drawTrees(width: number, height: number) {
  if (!ctx) return
  const phase = Math.min(10, totalDistance / 80)
  if (phase < 3) return

  ctx.fillStyle = '#1a1a3a'
  trees.forEach(tree => {
    const screenX = getScreenX(tree.worldX)
    if (screenX < -50 || screenX > width + 50) return

    const treeY = getHillY(tree.worldX, height)
    drawTreeShape(screenX, treeY, tree.height, tree.type)
  })
}

function drawTreeShape(x: number, baseY: number, treeHeight: number, type: number) {
  if (!ctx) return

  if (type === 0) {
    ctx.beginPath()
    ctx.moveTo(x, baseY - treeHeight)
    ctx.lineTo(x - treeHeight * 0.35, baseY)
    ctx.lineTo(x + treeHeight * 0.35, baseY)
    ctx.closePath()
    ctx.fill()
  } else if (type === 1) {
    ctx.beginPath()
    ctx.arc(x, baseY - treeHeight * 0.55, treeHeight * 0.35, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(x - 2, baseY - treeHeight * 0.25, 4, treeHeight * 0.25)
  } else {
    ctx.strokeStyle = '#1a1a3a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, baseY)
    ctx.lineTo(x, baseY - treeHeight)
    ctx.moveTo(x, baseY - treeHeight * 0.7)
    ctx.lineTo(x - 12, baseY - treeHeight * 0.5)
    ctx.moveTo(x, baseY - treeHeight * 0.85)
    ctx.lineTo(x + 10, baseY - treeHeight * 0.65)
    ctx.stroke()
    ctx.fillStyle = '#1a1a3a'
  }
}

function drawHill(width: number, height: number) {
  if (!ctx) return

  const hillBaseY = height - 60

  // Draw hill surface
  ctx.fillStyle = '#3d3d3d'
  ctx.beginPath()

  // Start from left edge
  const leftWorldX = worldX - 100
  const leftScreenX = getScreenX(leftWorldX)
  ctx.moveTo(leftScreenX, getHillY(leftWorldX, height))

  // Draw the slope line across the screen
  for (let screenX = -50; screenX <= width + 50; screenX += 15) {
    const wx = worldX + (screenX - width * 0.35)
    const y = getHillY(wx, height)
    ctx.lineTo(screenX, y)
  }

  ctx.lineTo(width + 50, height)
  ctx.lineTo(-50, height)
  ctx.closePath()
  ctx.fill()

  // Hill outline
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  ctx.beginPath()

  let started = false
  for (let screenX = -50; screenX <= width + 50; screenX += 15) {
    const wx = worldX + (screenX - width * 0.35)
    const y = getHillY(wx, height)
    if (!started) {
      ctx.moveTo(screenX, y)
      started = true
    } else {
      ctx.lineTo(screenX, y)
    }
  }
  ctx.stroke()

  // Flat ground at the very start
  if (worldX < 200) {
    ctx.beginPath()
    ctx.moveTo(0, hillBaseY)
    const groundEnd = getScreenX(0)
    if (groundEnd > 0) {
      ctx.lineTo(groundEnd, hillBaseY)
      ctx.stroke()
    }
  }

  // Draw flowers
  const flowerPhase = Math.min(10, totalDistance / 80)
  if (flowerPhase > 4) {
    for (let i = 0; i < 20; i++) {
      const flowerWX = i * 120 + 150
      const screenX = getScreenX(flowerWX)
      if (screenX < -20 || screenX > width + 20) continue
      const flowerY = getHillY(flowerWX, height) - 3
      drawFlower(screenX, flowerY, i)
    }
  }
}

function drawFlower(x: number, y: number, seed: number) {
  if (!ctx) return
  const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6b9d']
  ctx.fillStyle = colors[seed % colors.length]
  const size = 3 + (seed % 2)

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + gameTime * 0.2
    const px = x + Math.cos(angle) * size
    const py = y + Math.sin(angle) * size * 0.5
    ctx.beginPath()
    ctx.arc(px, py, size * 0.5, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = '#ffd700'
  ctx.beginPath()
  ctx.arc(x, y, size * 0.3, 0, Math.PI * 2)
  ctx.fill()
}

function drawPrometheus(width: number, height: number) {
  if (!ctx || prometheusWorldX < 0) return

  const screenX = getScreenX(prometheusWorldX)
  if (screenX < -50 || screenX > width + 100) return

  const hillY = getHillY(prometheusWorldX, height)

  // Rock
  ctx.fillStyle = '#444'
  ctx.beginPath()
  ctx.ellipse(screenX, hillY - 15, 22, 18, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2

  // Torso
  ctx.beginPath()
  ctx.moveTo(screenX, hillY - 35)
  ctx.lineTo(screenX, hillY - 12)
  ctx.stroke()

  // Arms chained out
  ctx.beginPath()
  ctx.moveTo(screenX - 22, hillY - 30)
  ctx.lineTo(screenX, hillY - 30)
  ctx.lineTo(screenX + 22, hillY - 30)
  ctx.stroke()

  // Chains
  ctx.strokeStyle = '#666'
  ctx.setLineDash([2, 2])
  ctx.beginPath()
  ctx.moveTo(screenX - 22, hillY - 30)
  ctx.lineTo(screenX - 26, hillY - 20)
  ctx.moveTo(screenX + 22, hillY - 30)
  ctx.lineTo(screenX + 26, hillY - 20)
  ctx.stroke()
  ctx.setLineDash([])

  // Head
  ctx.strokeStyle = '#fff'
  ctx.beginPath()
  ctx.arc(screenX, hillY - 42, 7, 0, Math.PI * 2)
  ctx.stroke()

  // Legs
  ctx.beginPath()
  ctx.moveTo(screenX, hillY - 12)
  ctx.lineTo(screenX - 8, hillY + 2)
  ctx.moveTo(screenX, hillY - 12)
  ctx.lineTo(screenX + 8, hillY + 2)
  ctx.stroke()

  // Label
  ctx.fillStyle = '#666'
  ctx.font = '9px monospace'
  ctx.fillText('Prometheus', screenX - 28, hillY + 15)
}

function drawSpaceship() {
  if (!ctx || !spaceshipActive) return

  const x = spaceshipX
  const y = spaceshipY

  ctx.fillStyle = '#555'
  ctx.beginPath()
  ctx.ellipse(x, y, 28, 9, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#88f'
  ctx.beginPath()
  ctx.ellipse(x, y - 7, 13, 10, 0, Math.PI, 0)
  ctx.fill()

  ctx.fillStyle = '#ff0'
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI + gameTime * 6
    const lx = x + Math.cos(angle) * 22
    ctx.beginPath()
    ctx.arc(lx, y + 2, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }

  if (Math.sin(gameTime * 12) > 0.7) {
    ctx.fillStyle = 'rgba(100, 255, 100, 0.15)'
    ctx.beginPath()
    ctx.moveTo(x - 12, y + 9)
    ctx.lineTo(x + 12, y + 9)
    ctx.lineTo(x + 35, y + 120)
    ctx.lineTo(x - 35, y + 120)
    ctx.closePath()
    ctx.fill()
  }
}

function drawBirds() {
  if (!ctx) return

  birds.forEach(bird => {
    const flapY = Math.sin(bird.flapPhase) * 4

    if (bird.type === 'vulture') {
      ctx.strokeStyle = '#800'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(bird.x - 12, bird.y)
      ctx.lineTo(bird.x + 8, bird.y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(bird.x, bird.y)
      ctx.lineTo(bird.x - 18, bird.y - 12 + flapY)
      ctx.moveTo(bird.x, bird.y)
      ctx.lineTo(bird.x + 18, bird.y - 12 + flapY)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(bird.x + 10, bird.y - 2, 4, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(bird.x + 14, bird.y - 2)
      ctx.lineTo(bird.x + 20, bird.y)
      ctx.stroke()
    } else {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(bird.x - 4, bird.y + flapY)
      ctx.lineTo(bird.x, bird.y)
      ctx.lineTo(bird.x + 4, bird.y + flapY)
      ctx.stroke()
    }
  })
}

function drawSisyphusAndBoulder(width: number, height: number) {
  if (!ctx) return

  const playerScreenX = width * 0.35
  const playerWorldPosX = worldX
  const playerY = getHillY(playerWorldPosX, height)

  // Boulder
  let boulderScreenX: number
  let boulderY: number
  const boulderRadius = 26 + hillAngle * 0.12

  if (gameState.value === 'rolling_back' || gameState.value === 'final_thought') {
    boulderScreenX = getScreenX(boulderWorldX)
    boulderY = getHillY(boulderWorldX, height) - boulderRadius - 3
  } else {
    boulderScreenX = playerScreenX + 38
    boulderY = playerY - boulderRadius - 3
  }

  // Draw boulder
  ctx.save()
  ctx.translate(boulderScreenX, boulderY)
  ctx.rotate(boulderRotation)

  ctx.fillStyle = '#505050'
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, boulderRadius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.strokeStyle = '#6a6a6a'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(-boulderRadius * 0.25, -boulderRadius * 0.2, boulderRadius * 0.28, 0.5, 2.5)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(boulderRadius * 0.15, boulderRadius * 0.2, boulderRadius * 0.22, 1, 3.5)
  ctx.stroke()

  ctx.restore()

  // Don't draw Sisyphus during rollback/final thought
  if (gameState.value === 'rolling_back' || gameState.value === 'final_thought') return

  // Sisyphus
  if (sisyphusFlattened) {
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(playerScreenX - 18, playerY)
    ctx.lineTo(playerScreenX + 18, playerY)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(playerScreenX - 4, playerY - 4)
    ctx.lineTo(playerScreenX + 4, playerY + 4)
    ctx.moveTo(playerScreenX + 4, playerY - 4)
    ctx.lineTo(playerScreenX - 4, playerY + 4)
    ctx.stroke()
    return
  }

  const angleRad = hillAngle * Math.PI / 180
  const lean = Math.min(32, hillAngle * 0.85 + armPhase * 18)
  const leanRad = lean * Math.PI / 180

  const bodyLength = 30
  const breathing = Math.sin(breathPhase) * 1.5

  const footY = playerY
  const hipX = playerScreenX
  const hipY = footY - 14

  const shoulderX = hipX + Math.sin(angleRad + leanRad) * bodyLength
  const shoulderY = hipY - Math.cos(angleRad + leanRad) * bodyLength + breathing

  const headRadius = 6
  const headX = shoulderX + Math.sin(angleRad + leanRad) * (headRadius + 2)
  const headY = shoulderY - Math.cos(angleRad + leanRad) * (headRadius + 2)

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2.5

  // Legs
  const legSpread = 10 + Math.abs(Math.sin(legPhase)) * 7

  const backLegX = hipX - Math.cos(angleRad) * legSpread - Math.sin(legPhase) * 4
  const backLegY = footY + Math.abs(Math.sin(legPhase + Math.PI)) * 2
  ctx.beginPath()
  ctx.moveTo(hipX, hipY)
  ctx.lineTo(backLegX, backLegY)
  ctx.stroke()

  const frontLegX = hipX + Math.cos(angleRad) * (legSpread * 0.5) + Math.sin(legPhase) * 4
  const frontLegY = footY + Math.abs(Math.sin(legPhase)) * 2
  ctx.beginPath()
  ctx.moveTo(hipX, hipY)
  ctx.lineTo(frontLegX, frontLegY)
  ctx.stroke()

  // Torso
  ctx.beginPath()
  ctx.moveTo(hipX, hipY)
  ctx.lineTo(shoulderX, shoulderY)
  ctx.stroke()

  // Arms
  const armPush = armPhase * 8
  const handX = boulderScreenX - boulderRadius + 4
  const handY = boulderY

  ctx.beginPath()
  ctx.moveTo(shoulderX, shoulderY - 2)
  ctx.quadraticCurveTo(shoulderX + 10 + armPush * 0.4, shoulderY - 6, handX, handY - 4)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(shoulderX, shoulderY + 2)
  ctx.quadraticCurveTo(shoulderX + 10 + armPush * 0.4, shoulderY + 4, handX, handY + 4)
  ctx.stroke()

  // Head
  ctx.beginPath()
  ctx.arc(headX, headY, headRadius, 0, Math.PI * 2)
  ctx.stroke()

  // Swatting vulture
  if (swattingVulture) {
    ctx.beginPath()
    ctx.moveTo(shoulderX, shoulderY - 8)
    const swatAngle = Math.sin(gameTime * 16) * 0.5
    ctx.lineTo(shoulderX - 18 * Math.cos(swatAngle), shoulderY - 28 - 8 * Math.sin(swatAngle))
    ctx.stroke()

    ctx.lineWidth = 1
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo(shoulderX - 12 + i * 6, shoulderY - 36 + Math.sin(gameTime * 18 + i) * 8)
      ctx.lineTo(shoulderX - 16 + i * 6, shoulderY - 44 + Math.sin(gameTime * 18 + i) * 8)
      ctx.stroke()
    }
  }

  // Effort lines
  if (pushPower > 1) {
    ctx.lineWidth = 1
    for (let i = 0; i < 3; i++) {
      const offset = Math.sin(gameTime * 10 + i * 2) * 2
      ctx.beginPath()
      ctx.moveTo(headX - 12 + offset, headY - 6 + i * 5)
      ctx.lineTo(headX - 18 + offset, headY - 6 + i * 5)
      ctx.stroke()
    }
  }

  // Sweat
  sweatDrops.forEach(drop => {
    ctx.fillStyle = '#88f'
    ctx.beginPath()
    ctx.arc(headX + drop.x - 4, headY + drop.y - 12, 1.5, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawThoughtBubble(width: number, height: number) {
  if (!ctx || !currentThought || gameState.value !== 'playing') return

  const playerScreenX = width * 0.35
  const playerY = getHillY(worldX, height)

  // Head position (approximate)
  const angleRad = hillAngle * Math.PI / 180
  const leanRad = Math.min(32, hillAngle * 0.85) * Math.PI / 180
  const headX = playerScreenX + Math.sin(angleRad + leanRad) * 36
  const headY = playerY - 45

  // Bubble position - above and to right of head
  const bubbleX = headX + 30
  const bubbleY = headY - 70

  const alpha = currentThought.timer < 0.5 ? currentThought.timer * 2 : currentThought.fadeIn
  ctx.globalAlpha = alpha

  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 2

  // Measure text for bubble size
  ctx.font = '11px monospace'
  const words = currentThought.text.split(' ')
  const maxLineWidth = 200
  let lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine + word + ' '
    if (ctx.measureText(testLine).width > maxLineWidth && currentLine) {
      lines.push(currentLine.trim())
      currentLine = word + ' '
    } else {
      currentLine = testLine
    }
  }
  lines.push(currentLine.trim())

  const bubbleWidth = Math.min(220, Math.max(...lines.map(l => ctx!.measureText(l).width)) + 24)
  const bubbleHeight = lines.length * 15 + 18

  // Rounded rectangle bubble
  const radius = 12
  ctx.beginPath()
  ctx.moveTo(bubbleX + radius, bubbleY)
  ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY)
  ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius)
  ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius)
  ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight)
  ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight)
  ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius)
  ctx.lineTo(bubbleX, bubbleY + radius)
  ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY)
  ctx.fill()
  ctx.stroke()

  // Thought dots leading to head
  ctx.beginPath()
  ctx.arc(bubbleX - 8, bubbleY + bubbleHeight + 12, 7, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(bubbleX - 18, bubbleY + bubbleHeight + 25, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(headX + 10, headY - 10, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Text
  ctx.fillStyle = '#000'
  lines.forEach((line, i) => {
    ctx!.fillText(line, bubbleX + 10, bubbleY + 16 + i * 15)
  })

  ctx.globalAlpha = 1
}

function drawFinalThought(width: number, height: number) {
  if (!ctx || gameState.value !== 'final_thought') return

  const boulderScreenX = getScreenX(boulderWorldX)

  // Thought bubble near the stopped boulder
  const bubbleX = boulderScreenX + 50
  const bubbleY = 150

  const alpha = Math.min(1, finalThoughtTimer * 2)
  ctx.globalAlpha = alpha

  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 2
  ctx.font = '12px monospace'

  const words = currentFinalThought.split(' ')
  const maxLineWidth = 220
  let lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine + word + ' '
    if (ctx.measureText(testLine).width > maxLineWidth && currentLine) {
      lines.push(currentLine.trim())
      currentLine = word + ' '
    } else {
      currentLine = testLine
    }
  }
  lines.push(currentLine.trim())

  const bubbleWidth = Math.min(240, Math.max(...lines.map(l => ctx!.measureText(l).width)) + 28)
  const bubbleHeight = lines.length * 16 + 20

  // Bubble
  const radius = 14
  ctx.beginPath()
  ctx.moveTo(bubbleX + radius, bubbleY)
  ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY)
  ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius)
  ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius)
  ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight)
  ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight)
  ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius)
  ctx.lineTo(bubbleX, bubbleY + radius)
  ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY)
  ctx.fill()
  ctx.stroke()

  // Dots to boulder
  ctx.beginPath()
  ctx.arc(bubbleX - 10, bubbleY + bubbleHeight + 15, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(bubbleX - 25, bubbleY + bubbleHeight + 35, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Text
  ctx.fillStyle = '#000'
  lines.forEach((line, i) => {
    ctx!.fillText(line, bubbleX + 12, bubbleY + 18 + i * 16)
  })

  // "THE BOULDER" label
  ctx.fillStyle = '#fff'
  ctx.font = '10px monospace'
  ctx.fillText('- The Boulder', bubbleX + bubbleWidth - 85, bubbleY + bubbleHeight - 5)

  ctx.globalAlpha = 1
}

function resizeCanvas() {
  const canvas = gameCanvas.value
  if (!canvas) return
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}

onMounted(() => {
  const canvas = gameCanvas.value
  if (canvas) {
    ctx = canvas.getContext('2d')
    resizeCanvas()
  }

  // Check for auto-play mode (?auto in URL)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    autoPlayMode = params.has('auto')
    autoPlay.value = autoPlayMode
    if (autoPlayMode) {
      console.log('🤖 Auto-play mode enabled. Sit back and watch!')
      // Auto-start the game after a short delay
      setTimeout(() => {
        startGame()
      }, 1000)
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('resize', resizeCanvas)

  loadCredits()
  fetchLeaderboard()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('resize', resizeCanvas)
  cancelAnimationFrame(animationId)
  if (audioCtx) audioCtx.close()
})
</script>

<style scoped>
.game-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.ui-overlay {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  pointer-events: none;
}

.intensity-meter { width: 200px; }

.meter-label {
  color: #fff;
  font-size: 12px;
  margin-bottom: 5px;
}

.meter-bar {
  height: 20px;
  background: #333;
  border: 2px solid #fff;
  position: relative;
}

.meter-fill {
  height: 100%;
  transition: width 0.1s, background-color 0.3s;
}

.meter-threshold {
  position: absolute;
  left: 30%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #fff;
  opacity: 0.5;
}

.meter-hint {
  color: #888;
  font-size: 10px;
  margin-top: 5px;
}

.score {
  position: absolute;
  top: 0;
  right: 0;
  color: #fff;
  font-size: 24px;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
}

.start-screen h1 {
  font-size: 72px;
  margin-bottom: 20px;
  letter-spacing: 20px;
}

.subtitle {
  font-style: italic;
  color: #888;
  margin-bottom: 40px;
}

.instructions {
  text-align: center;
  line-height: 2;
  margin-bottom: 40px;
  color: #aaa;
}

.sound-note {
  margin-top: 20px;
  color: #666;
  font-size: 12px;
}

.start-btn, .restart-btn, .submit-btn, .skip-btn {
  background: transparent;
  border: 2px solid #fff;
  color: #fff;
  padding: 15px 30px;
  font-family: inherit;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.start-btn:hover, .restart-btn:hover, .submit-btn:hover, .skip-btn:hover {
  background: #fff;
  color: #000;
}

.submit-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.game-over h1 {
  font-size: 48px;
  margin-bottom: 20px;
}

.final-score {
  font-size: 24px;
  margin-bottom: 10px;
}

.initials-entry {
  margin-bottom: 30px;
  text-align: center;
}

.initials-entry p { margin-bottom: 15px; }

.initials-input {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 20px;
}

.initial-box {
  width: 50px;
  height: 60px;
  font-size: 36px;
  text-align: center;
  background: #000;
  border: 2px solid #fff;
  color: #fff;
  font-family: inherit;
  text-transform: uppercase;
}

.initial-box:focus {
  outline: none;
  border-color: #4ade80;
}

.leaderboard {
  margin: 30px 0;
  text-align: center;
}

.leaderboard h2 {
  font-size: 24px;
  margin-bottom: 15px;
}

.leaderboard-entry {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin: 5px 0;
  font-size: 18px;
}

.rank { width: 30px; text-align: right; }
.name { width: 50px; text-align: center; }
.entry-score { width: 60px; text-align: left; }

.leaderboard-note {
  color: #666;
  font-style: italic;
  margin-top: 15px;
  font-size: 12px;
}

.restart-btn { margin-top: 20px; }

/* Credits styles */
.credits-screen {
  overflow: hidden;
}

.credits-scroll {
  text-align: center;
  transition: transform 0.1s linear;
}

.credits-scroll h1 {
  font-size: 48px;
  margin-bottom: 10px;
}

.credits-subtitle {
  color: #666;
  margin-bottom: 60px;
}

.credits-section {
  margin: 40px 0;
}

.credits-section h2 {
  font-size: 24px;
  margin-bottom: 20px;
  color: #888;
}

.credit-line {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin: 8px 0;
  font-size: 16px;
}

.credit-role {
  text-align: right;
  min-width: 150px;
}

.credit-dots {
  flex: 0 0 30px;
  border-bottom: 1px dotted #666;
  margin-bottom: 5px;
}

.credit-name {
  text-align: left;
  min-width: 200px;
  color: #aaa;
}

.credits-quote {
  font-style: italic;
  color: #888;
  max-width: 400px;
  margin: 0 auto;
}

.credits-author {
  color: #666;
  margin-top: 10px;
}

.final-score-credits {
  font-size: 20px;
  margin-top: 40px;
}

.credits-note {
  color: #666;
  font-size: 12px;
}

.skip-btn {
  position: absolute;
  bottom: 30px;
  right: 30px;
  padding: 10px 20px;
  font-size: 14px;
}
</style>
