<template>
  <div class="game-container" @click="handleClick">
    <canvas ref="gameCanvas"></canvas>

    <!-- UI Overlay -->
    <div class="ui-overlay">
      <!-- Intensity Meter -->
      <div class="intensity-meter" v-if="showGameUI">
        <div class="meter-label">PUSH INTENSITY</div>
        <div class="meter-bar">
          <div class="meter-fill" :style="{ width: intensity + '%', backgroundColor: intensityColor }"></div>
          <div class="meter-threshold"></div>
        </div>
        <div class="meter-hint">{{ autoPlay ? '🤖 AUTO-PLAY MODE' : 'TAP [SPACE] TO PUSH' }}</div>
      </div>

      <!-- Score & Level -->
      <div class="stats-panel" v-if="showGameUI">
        <div class="score">SCORE: {{ Math.floor(displayScore) }}</div>
        <div class="level">LEVEL: {{ displayLevel }}</div>
      </div>

      <!-- Progress to Peak -->
      <div class="progress-bar" v-if="showGameUI">
        <div class="progress-label">PROGRESS TO PEAK</div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          <div class="progress-marker" v-for="i in 5" :key="i" :style="{ left: (i * 16.67) + '%' }"></div>
        </div>
        <div class="progress-levels">
          <span v-for="i in 6" :key="i">L{{ i }}</span>
        </div>
      </div>

      <!-- Level Announcement -->
      <div class="level-announcement" v-if="levelAnnouncement">
        <div class="level-text">{{ levelAnnouncement }}</div>
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
          <div class="credit-line" v-for="(item, idx) in castList" :key="'cast-'+idx">
            <span class="credit-role">{{ item.role }}</span>
            <span class="credit-dots">........</span>
            <span class="credit-name">{{ item.actor }}</span>
          </div>
        </div>

        <div class="credits-section">
          <h2>CREW</h2>
          <div class="credit-line" v-for="(item, idx) in crewList" :key="'crew-'+idx">
            <span class="credit-role">{{ item.role }}</span>
            <span class="credit-dots">........</span>
            <span class="credit-name">{{ item.name }}</span>
          </div>
        </div>

        <div class="credits-section">
          <p class="credits-quote">"The struggle itself toward the heights is enough to fill a man's heart."</p>
          <p class="credits-author">- Albert Camus</p>
        </div>

        <div class="credits-section final-section">
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
      </div>

      <button @click="restartGame" class="restart-btn">PUSH AGAIN</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const gameCanvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let animationId: number = 0
let audioCtx: AudioContext | null = null

// Auto-play mode
let autoPlayMode = false
let lastAutoTapTime = 0

// Game state
const gameState = ref<'start' | 'playing' | 'crushing' | 'rolling_back' | 'rolling_over' | 'final_thought' | 'credits' | 'gameover'>('start')
const autoPlay = ref(false)
const score = ref(0)
const displayScore = ref(0)
const finalScore = ref(0)
const intensity = ref(50)
const leaderboard = ref<{ initials: string; score: number }[]>([])

// Level system - 6 levels with increasing angles
const LEVEL_ANGLES = [10, 20, 30, 40, 50, 60] // degrees
const LEVEL_DISTANCES = [0, 100, 220, 360, 520, 700] // world distance where each level starts
const PEAK_DISTANCE = 900 // where the peak is

const currentLevel = ref(1)
const displayLevel = ref(1)
const levelAnnouncement = ref('')
let levelAnnouncementTimer = 0

// Progress (based on boulder position)
const progressPercent = computed(() => {
  return Math.min(100, Math.max(0, (boulderDistance / PEAK_DISTANCE) * 100))
})

const showGameUI = computed(() => {
  return ['playing', 'crushing', 'rolling_back', 'rolling_over'].includes(gameState.value)
})

// Credits data
const castList = ref([
  { role: 'Sisyphus', actor: 'Stick Figure' },
  { role: 'The Boulder', actor: 'Stick Circle' },
  { role: 'Bird #1', actor: 'Vladimir Putin' },
  { role: 'Bird #2', actor: 'Also Vladimir Putin' },
  { role: 'Bird #3', actor: "Look - they're all VP, ok?" },
  { role: 'Vulture', actor: 'Vladimir Putin (in a wig)' },
  { role: 'Gravity', actor: 'E=MC²' },
  { role: 'The Hill', actor: 'An Unreasonable Incline' },
  { role: 'Prometheus', actor: 'That Other Guy' },
  { role: 'The Moon', actor: 'Definitely Not Cheese' },
  { role: 'UFO Pilot', actor: 'Classified' },
  { role: 'Hope', actor: 'Not Appearing In This Game' },
  { role: 'The Top of the Hill', actor: 'Also Not Appearing' },
  { role: 'Zeus', actor: 'Executive Producer' }
])

const crewList = ref([
  { role: 'Director', name: 'Albert Camus (posthumously)' },
  { role: 'Physics Consultant', name: "Sir Isaac Newton's Ghost" },
  { role: 'Motivational Coach', name: 'Position Eliminated' },
  { role: 'Catering', name: 'There Is No Catering' },
  { role: 'Best Boy', name: 'There Is No Best Boy' },
  { role: 'Existential Dread', name: 'Complimentary' }
])

const creditsY = ref(600)

// Thoughts
const normalThoughts = [
  "Not much further... I think I can see the plateau",
  "Wait, is it 'plateau' or 'plateu'? Or 'plato'?",
  "What even is a hamburger? Why did I just think of that?",
  "At least I'm getting a good workout",
  "I wonder what Zeus is doing right now",
  "This boulder seems heavier today",
  "The view up here is quite nice actually",
  "One more push... just one more...",
  "Is that Prometheus over there? Poor guy.",
  "I wonder if anyone is keeping score"
]

const desperateThoughts = [
  "I don't know if I can go on much further...",
  "My arms... they're giving out...",
  "Is this how it ends? Again?",
  "No no no no no...",
  "Everything is going dark..."
]

const finalThoughts = [
  "I had my doubts about that guy",
  "What did I do to deserve this?",
  "I was really hoping to see what's at the top... c'est la vie",
  "See you tomorrow, I guess"
]

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
let worldDistance = 0 // Sisyphus position (0 to PEAK_DISTANCE and beyond)
let boulderDistance = 0 // Boulder position (tracked separately - can go over peak before Sisyphus)
let worldScrollX = 0 // Camera scroll position
let pushPower = 0
let lastTapTime = 0
let tapTimes: number[] = []
let gameTime = 0
let lastFrameTime = 0

// Animation
let legPhase = 0
let armPhase = 0
let boulderRotation = 0
let breathPhase = 0

// Game over states
let crushTime = 0
let sisyphusFlattened = false
let boulderVelocity = 0
let finalThoughtTimer = 0
let currentFinalThought = ''
let reachedPeak = false
let sisyphusChasesAtPeak = false // Random: does he chase or fall?
let sisyphusFallY = 0 // For falling animation

// Thoughts
let currentThought: { text: string; timer: number; fadeIn: number } | null = null
let lastThoughtTime = 0

// Environment
interface Bird { x: number; y: number; vx: number; vy: number; flapPhase: number }
interface Cloud { x: number; y: number; speed: number; size: number }

let birds: Bird[] = []
let clouds: Cloud[] = []
let prometheusDistance = 350
let prometheusGreeted = false
let spaceshipX = -200
let spaceshipY = 100
let spaceshipActive = false
let spaceshipTimer = 0

// Sound
let lastFootstepTime = 0
let lastHuffTime = 0
let lastRollSoundTime = 0

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
}

function play8BitSound(type: 'footstep' | 'huff' | 'push' | 'slip' | 'crush' | 'roll' | 'levelup') {
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
      osc.frequency.setValueAtTime(150, now)
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
    case 'levelup':
      osc.type = 'square'
      osc.frequency.setValueAtTime(440, now)
      osc.frequency.setValueAtTime(554, now + 0.1)
      osc.frequency.setValueAtTime(659, now + 0.2)
      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
      osc.start(now)
      osc.stop(now + 0.4)
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
  displayScore.value = 0
  intensity.value = 50

  // Check for startDistance override (for testing)
  const startDist = (typeof window !== 'undefined' && (window as any).__sisyphusStartDistance) || 0
  boulderDistance = startDist
  worldDistance = Math.max(0, startDist - 40)
  worldScrollX = Math.max(0, boulderDistance - 150)

  // Set initial level based on start position
  if (startDist > 0) {
    currentLevel.value = getLevelAtDistance(startDist)
    displayLevel.value = currentLevel.value
    score.value = startDist * 5 // Approximate score for position
    displayScore.value = score.value
  }

  pushPower = 0
  lastTapTime = Date.now()
  tapTimes = []
  gameTime = 0
  currentLevel.value = 1
  displayLevel.value = 1
  levelAnnouncement.value = ''
  levelAnnouncementTimer = 0
  legPhase = 0
  armPhase = 0
  boulderRotation = 0
  breathPhase = 0
  crushTime = 0
  sisyphusFlattened = false
  boulderVelocity = 0
  currentThought = null
  lastThoughtTime = 0
  reachedPeak = false
  spaceshipActive = false
  prometheusGreeted = false

  clouds = []
  for (let i = 0; i < 10; i++) {
    clouds.push({
      x: Math.random() * 2000,
      y: 40 + Math.random() * 100,
      speed: 8 + Math.random() * 15,
      size: 25 + Math.random() * 35
    })
  }

  birds = []
  for (let i = 0; i < 4; i++) {
    spawnBird()
  }
}

function spawnBird() {
  const canvas = gameCanvas.value
  if (!canvas) return
  birds.push({
    x: canvas.width + 50 + Math.random() * 200,
    y: 40 + Math.random() * 120,
    vx: -40 - Math.random() * 40,
    vy: Math.sin(Math.random() * Math.PI * 2) * 15,
    flapPhase: Math.random() * Math.PI * 2
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
  const now = Date.now()
  tapTimes.push(now)
  tapTimes = tapTimes.filter(t => now - t < 2000)
  const tapsPerSecond = tapTimes.length / 2
  pushPower += 0.5 + (tapsPerSecond * 0.2)
  lastTapTime = now
  armPhase = Math.PI * 0.4
  play8BitSound('push')
}

function getLevelAtDistance(dist: number): number {
  for (let i = LEVEL_DISTANCES.length - 1; i >= 0; i--) {
    if (dist >= LEVEL_DISTANCES[i]) return i + 1
  }
  return 1
}

function getAngleAtDistance(dist: number): number {
  const level = getLevelAtDistance(dist)
  const levelStart = LEVEL_DISTANCES[level - 1]
  const levelEnd = level < 6 ? LEVEL_DISTANCES[level] : PEAK_DISTANCE
  const currentAngle = LEVEL_ANGLES[level - 1]

  // Smooth transition at level boundaries (first 30 units of each level)
  const transitionZone = 30
  const distIntoLevel = dist - levelStart

  if (level > 1 && distIntoLevel < transitionZone) {
    const prevAngle = LEVEL_ANGLES[level - 2]
    const t = distIntoLevel / transitionZone
    // Ease-in-out smoothing
    const smoothT = t * t * (3 - 2 * t)
    return prevAngle + (currentAngle - prevAngle) * smoothT
  }

  return currentAngle
}

function maybeShowThought() {
  if (currentThought) return
  if (gameTime - lastThoughtTime < 6) return
  if (Math.random() > 0.02) return

  const thoughts = intensity.value < 25 ? desperateThoughts : normalThoughts
  currentThought = {
    text: thoughts[Math.floor(Math.random() * thoughts.length)],
    timer: 4,
    fadeIn: 0
  }
  lastThoughtTime = gameTime
}

function maybeSpawnEvents() {
  if (!spaceshipActive && worldDistance > 100 && Math.random() < 0.002) {
    spaceshipActive = true
    spaceshipX = -100
    spaceshipY = 60 + Math.random() * 80
    spaceshipTimer = 0
  }
  if (birds.length < 5 && Math.random() < 0.02) {
    spawnBird()
  }
}

function gameLoop() {
  const validStates = ['playing', 'crushing', 'rolling_back', 'rolling_over', 'final_thought', 'credits']
  if (!validStates.includes(gameState.value)) return

  const canvas = gameCanvas.value
  if (!canvas || !ctx) return

  const now = performance.now()
  const dt = Math.min((now - lastFrameTime) / 1000, 0.05)
  lastFrameTime = now

  // Auto-play
  if (autoPlayMode && gameState.value === 'playing') {
    if (now - lastAutoTapTime > 120) {
      registerTap()
      lastAutoTapTime = now
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

function updatePlaying(dt: number) {
  const now = Date.now()
  const timeSinceLastTap = (now - lastTapTime) / 1000

  pushPower *= 0.93

  // Physics based on BOULDER position (not Sisyphus)
  const currentAngle = getAngleAtDistance(boulderDistance)
  const requiredForce = Math.sin(currentAngle * Math.PI / 180) * 2.5
  const netForce = pushPower - requiredForce

  if (netForce > 0) {
    const moveAmount = netForce * dt * 15
    boulderDistance += moveAmount
    worldDistance = boulderDistance - 40 // Sisyphus stays behind the boulder
    score.value += netForce * dt * 10
    displayScore.value = score.value
  } else {
    // Boulder rolls back
    boulderDistance += netForce * dt * 20
    boulderDistance = Math.max(0, boulderDistance)
    worldDistance = Math.max(0, boulderDistance - 40)
    if (Math.random() > 0.85) play8BitSound('slip')
  }

  // Update camera scroll - follow the boulder
  worldScrollX = Math.max(0, boulderDistance - 150)

  // Check level changes based on boulder position
  const newLevel = getLevelAtDistance(boulderDistance)
  if (newLevel !== currentLevel.value) {
    if (newLevel > currentLevel.value) {
      levelAnnouncement.value = `LEVEL ${newLevel}!`
      levelAnnouncementTimer = 2
      play8BitSound('levelup')
    }
    currentLevel.value = newLevel
    displayLevel.value = newLevel
  }

  // Update intensity
  const pushRatio = pushPower / (requiredForce + 0.2)
  intensity.value = Math.min(100, Math.max(0, pushRatio * 50))

  // Check for failure - boulder rolls back onto Sisyphus
  if (timeSinceLastTap > 1.2 && pushPower < 0.15) {
    startCrushing()
    return
  }

  // Check for BOULDER reaching peak (not Sisyphus!)
  if (boulderDistance >= PEAK_DISTANCE) {
    startRollingOver()
    return
  }

  maybeShowThought()
  maybeSpawnEvents()
}

function startCrushing() {
  gameState.value = 'crushing'
  crushTime = 0
  finalScore.value = score.value
  play8BitSound('crush')
  boulderVelocity = 0
}

function updateCrushing(dt: number) {
  crushTime += dt
  if (crushTime > 0.4) sisyphusFlattened = true
  if (crushTime > 1.2) {
    gameState.value = 'rolling_back'
    boulderVelocity = 30
  }
}

function updateRollingBack(dt: number) {
  boulderVelocity += 150 * dt
  boulderDistance -= boulderVelocity * dt * 0.15
  boulderDistance = Math.max(0, boulderDistance)

  // Score decreases as boulder rolls back!
  displayScore.value = Math.max(0, score.value * (boulderDistance / (finalScore.value / 10 + 1)))

  // Update level display based on boulder position
  displayLevel.value = getLevelAtDistance(boulderDistance)

  // Camera follows boulder
  worldScrollX = Math.max(0, boulderDistance - 150)

  if (gameTime - lastRollSoundTime > 0.12) {
    play8BitSound('roll')
    lastRollSoundTime = gameTime
  }

  boulderRotation -= boulderVelocity * dt * 0.02

  if (boulderDistance <= 5) {
    boulderDistance = 0
    boulderVelocity *= 0.7
    if (boulderVelocity < 20) {
      displayScore.value = 0
      finalScore.value = 0
      gameState.value = 'final_thought'
      currentFinalThought = finalThoughts[Math.floor(Math.random() * finalThoughts.length)]
      finalThoughtTimer = 0
    }
  }
}

function startRollingOver() {
  gameState.value = 'rolling_over'
  reachedPeak = true
  boulderVelocity = 50
  finalScore.value = score.value
  // Randomly decide: does Sisyphus chase or fall?
  sisyphusChasesAtPeak = Math.random() > 0.5
  sisyphusFallY = 0
}

function updateRollingOver(dt: number) {
  const flatGroundDistance = PEAK_DISTANCE * 2

  // Accelerate downhill, decelerate on flat ground
  if (boulderDistance < flatGroundDistance) {
    // Still on the descent - accelerate
    boulderVelocity += 100 * dt
  } else {
    // On flat ground - apply friction to slow down
    boulderVelocity *= 0.92 // Strong friction on flat ground
  }

  boulderDistance += boulderVelocity * dt * 0.1

  // Score stays the same when going over (you made it!)
  // But then resets as it rolls away
  const overPeakDist = boulderDistance - PEAK_DISTANCE
  if (overPeakDist > 200) {
    displayScore.value = Math.max(0, finalScore.value * (1 - (overPeakDist - 200) / 300))
  }

  // Level counts back down on other side (symmetric hill)
  const effectiveDistance = Math.max(0, PEAK_DISTANCE - (boulderDistance - PEAK_DISTANCE))
  displayLevel.value = getLevelAtDistance(effectiveDistance)

  // Camera follows boulder
  worldScrollX = boulderDistance - 150

  if (gameTime - lastRollSoundTime > 0.1 && boulderVelocity > 5) {
    play8BitSound('roll')
    lastRollSoundTime = gameTime
  }

  boulderRotation += boulderVelocity * dt * 0.02

  // End game when boulder comes to rest on flat ground
  if (boulderDistance > flatGroundDistance && boulderVelocity < 5) {
    displayScore.value = 0
    finalScore.value = 0
    gameState.value = 'final_thought'
    currentFinalThought = "Well, there it goes..."
    finalThoughtTimer = 0
  }
}

function updateFinalThought(dt: number) {
  finalThoughtTimer += dt
  if (finalThoughtTimer > 4) {
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

  if (gameState.value === 'playing' && pushPower > 0.3) {
    boulderRotation += dt * pushPower * 2.5
  }

  if (currentThought && gameState.value === 'playing') {
    currentThought.fadeIn = Math.min(1, currentThought.fadeIn + dt * 3)
    currentThought.timer -= dt
    if (currentThought.timer <= 0) currentThought = null
  }

  if (levelAnnouncementTimer > 0) {
    levelAnnouncementTimer -= dt
    if (levelAnnouncementTimer <= 0) levelAnnouncement.value = ''
  }
}

function updateEnvironment(dt: number) {
  clouds.forEach(cloud => {
    cloud.x -= cloud.speed * dt
    if (cloud.x < -100) cloud.x = 2000 + Math.random() * 500
  })

  birds = birds.filter(bird => {
    bird.x += bird.vx * dt
    bird.y += bird.vy * dt
    bird.vy += Math.sin(gameTime * 3 + bird.x * 0.01) * 20 * dt
    bird.flapPhase += dt * 12
    return bird.x > -100
  })

  if (spaceshipActive) {
    spaceshipTimer += dt
    spaceshipX += 120 * dt
    spaceshipY += Math.sin(spaceshipTimer * 2) * 15 * dt
    if (spaceshipX > (gameCanvas.value?.width || 1000) + 100) {
      spaceshipActive = false
    }
  }
}

function getHillYAtScreenX(screenX: number, height: number): number {
  const worldX = screenX + worldScrollX
  const hillBaseY = height - 60

  if (worldX <= PEAK_DISTANCE) {
    // ASCENT SIDE: Calculate cumulative height through all levels
    let y = hillBaseY
    for (let level = 1; level <= 6; level++) {
      const segmentStart = LEVEL_DISTANCES[level - 1]
      const segmentEnd = level < 6 ? LEVEL_DISTANCES[level] : PEAK_DISTANCE
      const angle = LEVEL_ANGLES[level - 1]

      if (worldX >= segmentStart) {
        const distInSegment = Math.min(worldX, segmentEnd) - segmentStart
        y -= Math.tan(angle * Math.PI / 180) * distInSegment * 0.5
      }
    }
    return y
  } else {
    // DESCENT SIDE: Mirror the ascent
    // Distance past peak mirrors back to ascent distance
    const overPeak = worldX - PEAK_DISTANCE
    const mirrorDist = PEAK_DISTANCE - overPeak // As if walking backwards on ascent

    if (mirrorDist <= 0) {
      // Past the symmetric point - flat ground at base level
      return hillBaseY
    }

    // Use same calculation as ascent, but for the mirror distance
    let y = hillBaseY
    for (let level = 1; level <= 6; level++) {
      const segmentStart = LEVEL_DISTANCES[level - 1]
      const segmentEnd = level < 6 ? LEVEL_DISTANCES[level] : PEAK_DISTANCE
      const angle = LEVEL_ANGLES[level - 1]

      if (mirrorDist >= segmentStart) {
        const distInSegment = Math.min(mirrorDist, segmentEnd) - segmentStart
        y -= Math.tan(angle * Math.PI / 180) * distInSegment * 0.5
      }
    }
    return y
  }
}

function render() {
  const canvas = gameCanvas.value
  if (!canvas || !ctx) return

  const width = canvas.width
  const height = canvas.height

  // Sky
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height)
  skyGradient.addColorStop(0, '#1a1a2e')
  skyGradient.addColorStop(0.5, '#1a1a4e')
  skyGradient.addColorStop(1, '#16213e')
  ctx.fillStyle = skyGradient
  ctx.fillRect(0, 0, width, height)

  drawStars(width, height)
  drawMoon(width, height)
  drawClouds(width)
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
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 100; i++) {
    const x = ((Math.sin(i * 123.456) * 0.5 + 0.5) * width * 2 - worldScrollX * 0.02) % width
    const y = (Math.cos(i * 789.012) * 0.5 + 0.5) * height * 0.5
    const twinkle = Math.sin(gameTime * 2 + i) * 0.5 + 0.5
    ctx.globalAlpha = 0.3 + twinkle * 0.7
    ctx.beginPath()
    ctx.arc(x, y, twinkle * 1.5 + 0.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawMoon(width: number, height: number) {
  if (!ctx) return
  const moonX = width - 100
  const moonY = 70

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
}

function drawClouds(width: number) {
  if (!ctx) return
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
  clouds.forEach(cloud => {
    const x = ((cloud.x - worldScrollX * 0.05) % (width + 200))
    ctx!.beginPath()
    ctx!.arc(x, cloud.y, cloud.size * 0.5, 0, Math.PI * 2)
    ctx!.arc(x + cloud.size * 0.35, cloud.y - cloud.size * 0.15, cloud.size * 0.4, 0, Math.PI * 2)
    ctx!.arc(x + cloud.size * 0.7, cloud.y, cloud.size * 0.45, 0, Math.PI * 2)
    ctx!.fill()
  })
}

function drawHill(width: number, height: number) {
  if (!ctx) return

  // Draw hill extending off-screen to the right (peak is far away, not visible initially)
  const peakScreenX = PEAK_DISTANCE - worldScrollX
  // Always draw at least to edge of screen + buffer, peak only shows when close
  const drawRightEdge = width + 100

  // Draw hill with distinct angle segments
  ctx.fillStyle = '#3d3d3d'
  ctx.beginPath()
  ctx.moveTo(0, getHillYAtScreenX(0, height))

  for (let x = 0; x <= drawRightEdge; x += 5) {
    ctx.lineTo(x, getHillYAtScreenX(x, height))
  }

  ctx.lineTo(drawRightEdge, height)
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fill()

  // Hill outline
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, getHillYAtScreenX(0, height))
  for (let x = 0; x <= drawRightEdge; x += 5) {
    ctx.lineTo(x, getHillYAtScreenX(x, height))
  }
  ctx.stroke()

  // Draw angle change markers
  ctx.strokeStyle = '#666'
  ctx.lineWidth = 1
  for (let level = 2; level <= 6; level++) {
    const markerWorldX = LEVEL_DISTANCES[level - 1]
    const screenX = markerWorldX - worldScrollX
    if (screenX > 0 && screenX < width) {
      const y = getHillYAtScreenX(screenX, height)
      ctx.beginPath()
      ctx.moveTo(screenX, y)
      ctx.lineTo(screenX, y - 20)
      ctx.stroke()

      ctx.fillStyle = '#666'
      ctx.font = '10px monospace'
      ctx.fillText(`L${level}`, screenX - 8, y - 25)
    }
  }

  // Peak marker (peakScreenX already calculated above)
  if (peakScreenX > 0 && peakScreenX < width) {
    ctx.fillStyle = '#ffd700'
    ctx.beginPath()
    ctx.moveTo(peakScreenX, getHillYAtScreenX(peakScreenX, height) - 10)
    ctx.lineTo(peakScreenX - 8, getHillYAtScreenX(peakScreenX, height) + 5)
    ctx.lineTo(peakScreenX + 8, getHillYAtScreenX(peakScreenX, height) + 5)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = '#ffd700'
    ctx.font = '12px monospace'
    ctx.fillText('PEAK', peakScreenX - 18, getHillYAtScreenX(peakScreenX, height) - 15)
  }
}

function drawPrometheus(width: number, height: number) {
  if (!ctx) return
  const screenX = prometheusDistance - worldScrollX
  if (screenX < -100 || screenX > width + 150) return

  const hillY = getHillYAtScreenX(screenX, height)

  // Prometheus is embedded deep IN the mountainside, chained to a rock
  const embedX = screenX + 40 // Further into the mountain
  const embedY = hillY + 25 // Deeper below surface
  const scale = 1.5 // Larger figure

  // Rock he's chained to (larger, jutting out of hillside)
  ctx.fillStyle = '#555'
  ctx.beginPath()
  ctx.moveTo(embedX - 40 * scale, hillY)
  ctx.lineTo(embedX + 30 * scale, hillY - 10)
  ctx.lineTo(embedX + 40 * scale, embedY + 25 * scale)
  ctx.lineTo(embedX - 30 * scale, embedY + 35 * scale)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#777'
  ctx.lineWidth = 1
  ctx.stroke()

  // Prometheus - arms stretched out, chained (scaled up)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2.5

  // Head
  ctx.beginPath()
  ctx.arc(embedX, embedY - 12 * scale, 8 * scale, 0, Math.PI * 2)
  ctx.stroke()

  // Body (torso)
  ctx.beginPath()
  ctx.moveTo(embedX, embedY - 4 * scale)
  ctx.lineTo(embedX, embedY + 22 * scale)
  ctx.stroke()

  // Arms stretched out and chained
  ctx.beginPath()
  ctx.moveTo(embedX - 25 * scale, embedY)
  ctx.lineTo(embedX, embedY + 5 * scale)
  ctx.lineTo(embedX + 25 * scale, embedY)
  ctx.stroke()

  // Chains (to rock)
  ctx.strokeStyle = '#888'
  ctx.lineWidth = 1.5
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(embedX - 25 * scale, embedY)
  ctx.lineTo(embedX - 35 * scale, embedY - 15)
  ctx.moveTo(embedX + 25 * scale, embedY)
  ctx.lineTo(embedX + 35 * scale, embedY - 15)
  ctx.stroke()
  ctx.setLineDash([])

  // Legs (dangling)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(embedX, embedY + 22 * scale)
  ctx.lineTo(embedX - 8 * scale, embedY + 40 * scale)
  ctx.moveTo(embedX, embedY + 22 * scale)
  ctx.lineTo(embedX + 8 * scale, embedY + 40 * scale)
  ctx.stroke()

  // Blood rivulets running from belly
  ctx.strokeStyle = '#8b0000'
  ctx.lineWidth = 1.5
  const bloodDrip = (gameTime * 20) % 30
  for (let i = 0; i < 3; i++) {
    const startY = embedY + 10 * scale + i * 5
    const dripLength = 15 + Math.sin(gameTime * 2 + i) * 5
    ctx.beginPath()
    ctx.moveTo(embedX - 3 + i * 3, startY)
    ctx.quadraticCurveTo(
      embedX - 5 + i * 3 + Math.sin(gameTime + i) * 2,
      startY + dripLength / 2,
      embedX - 4 + i * 3,
      startY + dripLength + (bloodDrip + i * 10) % 20
    )
    ctx.stroke()
  }

  // Vulture/eagle (eating his liver - the myth!) - larger
  const vultureBob = Math.sin(gameTime * 3) * 3
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  // Body
  ctx.beginPath()
  ctx.ellipse(embedX - 18 * scale, embedY + 14 * scale + vultureBob, 10 * scale, 6 * scale, -0.3, 0, Math.PI * 2)
  ctx.stroke()
  // Head pecking
  ctx.beginPath()
  ctx.arc(embedX - 6 * scale, embedY + 10 * scale + vultureBob, 5 * scale, 0, Math.PI * 2)
  ctx.stroke()
  // Beak (pecking at belly)
  ctx.beginPath()
  ctx.moveTo(embedX - 3 * scale, embedY + 10 * scale + vultureBob)
  ctx.lineTo(embedX + 2, embedY + 12 * scale + vultureBob)
  ctx.stroke()
  // Wings
  ctx.beginPath()
  ctx.moveTo(embedX - 30 * scale, embedY + 6 * scale + vultureBob)
  ctx.lineTo(embedX - 18 * scale, embedY + 14 * scale + vultureBob)
  ctx.lineTo(embedX - 30 * scale, embedY + 22 * scale + vultureBob)
  ctx.stroke()

  // "ouch..." text - repeating
  const ouchPhase = Math.floor(gameTime * 2) % 4
  const ouchTexts = ['ouch...', 'ow...', 'ouch...', 'ugh...']
  ctx.fillStyle = '#fff'
  ctx.font = '11px monospace'
  const ouchAlpha = 0.5 + Math.sin(gameTime * 4) * 0.3
  ctx.globalAlpha = ouchAlpha
  ctx.fillText(ouchTexts[ouchPhase], embedX - 45, embedY - 25 * scale)
  ctx.globalAlpha = 1

  // Check if Sisyphus is passing by - show greeting
  const sisyphusNearby = Math.abs(boulderDistance - prometheusDistance) < 80
  if (sisyphusNearby && !prometheusGreeted && gameState.value === 'playing') {
    prometheusGreeted = true
  }

  // Show greeting speech bubble when Sisyphus passes
  if (prometheusGreeted && boulderDistance > prometheusDistance && boulderDistance < prometheusDistance + 200) {
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2

    const bubbleX = embedX - 80
    const bubbleY = embedY - 50 * scale
    const bubbleW = 140
    const bubbleH = 35

    ctx.beginPath()
    ctx.roundRect(bubbleX, bubbleY, bubbleW, bubbleH, 8)
    ctx.fill()
    ctx.stroke()

    // Speech bubble tail
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(bubbleX + 60, bubbleY + bubbleH)
    ctx.lineTo(bubbleX + 70, bubbleY + bubbleH + 10)
    ctx.lineTo(bubbleX + 80, bubbleY + bubbleH)
    ctx.fill()

    ctx.fillStyle = '#000'
    ctx.font = '10px monospace'
    ctx.fillText("Hey pal... hope you're", bubbleX + 8, bubbleY + 14)
    ctx.fillText("taking care of yourself!", bubbleX + 8, bubbleY + 26)
  }

  ctx.fillStyle = '#666'
  ctx.font = '10px monospace'
  ctx.fillText('Prometheus', screenX + 10, hillY + 70)
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
    ctx.beginPath()
    ctx.arc(x + Math.cos(angle) * 22, y + 2, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawBirds() {
  if (!ctx) return
  birds.forEach(bird => {
    const flapY = Math.sin(bird.flapPhase) * 4
    ctx!.strokeStyle = '#fff'
    ctx!.lineWidth = 1
    ctx!.beginPath()
    ctx!.moveTo(bird.x - 4, bird.y + flapY)
    ctx!.lineTo(bird.x, bird.y)
    ctx!.lineTo(bird.x + 4, bird.y + flapY)
    ctx!.stroke()
  })
}

function drawSisyphusAndBoulder(width: number, height: number) {
  if (!ctx) return

  const boulderRadius = 26

  // Boulder and Sisyphus positions
  let boulderScreenX: number
  let feetScreenX: number // Where Sisyphus's feet are planted

  if (gameState.value === 'rolling_back' || gameState.value === 'final_thought') {
    boulderScreenX = boulderDistance - worldScrollX
    feetScreenX = -100 // Off screen
  } else if (gameState.value === 'rolling_over') {
    boulderScreenX = boulderDistance - worldScrollX
    if (sisyphusChasesAtPeak) {
      // Chasing after the boulder but falling behind
      const lag = Math.min(250, (boulderDistance - PEAK_DISTANCE) * 2)
      feetScreenX = boulderScreenX - 70 - lag
    } else {
      // Fell down at the peak - stays at peak position
      feetScreenX = PEAK_DISTANCE - worldScrollX
    }
  } else {
    // Normal playing: boulder position from boulderDistance, Sisyphus behind it
    boulderScreenX = boulderDistance - worldScrollX
    feetScreenX = worldDistance - worldScrollX // Sisyphus at his tracked position
  }

  const boulderY = getHillYAtScreenX(boulderScreenX, height) - boulderRadius - 3
  const feetY = getHillYAtScreenX(feetScreenX, height)

  // Draw boulder first
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

  // Boulder texture
  ctx.strokeStyle = '#6a6a6a'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(-boulderRadius * 0.25, -boulderRadius * 0.2, boulderRadius * 0.28, 0.5, 2.5)
  ctx.stroke()

  ctx.restore()

  // Don't draw player during rollback
  if (gameState.value === 'rolling_back' || gameState.value === 'final_thought') return
  if (feetScreenX < -50) return

  // Flattened state (crushed)
  if (sisyphusFlattened && gameState.value === 'crushing') {
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(feetScreenX - 18, feetY)
    ctx.lineTo(feetScreenX + 18, feetY)
    ctx.stroke()
    return
  }

  // Fallen at peak (didn't chase)
  if (gameState.value === 'rolling_over' && !sisyphusChasesAtPeak) {
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    // Draw collapsed/sitting figure at the peak
    const sitY = feetY - 5
    // Body slumped
    ctx.beginPath()
    ctx.moveTo(feetScreenX - 8, sitY)
    ctx.lineTo(feetScreenX + 5, sitY - 15)
    ctx.stroke()
    // Head drooped
    ctx.beginPath()
    ctx.arc(feetScreenX + 8, sitY - 20, 6, 0, Math.PI * 2)
    ctx.stroke()
    // Legs out front
    ctx.beginPath()
    ctx.moveTo(feetScreenX - 8, sitY)
    ctx.lineTo(feetScreenX + 15, sitY + 5)
    ctx.stroke()
    // Arm reaching toward boulder (defeated)
    ctx.beginPath()
    ctx.moveTo(feetScreenX + 5, sitY - 10)
    ctx.lineTo(feetScreenX + 25, sitY - 5)
    ctx.stroke()
    return
  }

  // === SISYPHUS - Pushing from the LEFT ===
  // He faces RIGHT, leaning into the boulder
  // Arms animate independently (not glued to boulder)

  const currentAngle = getAngleAtDistance(worldDistance)

  // Body leans forward based on effort
  const leanAngle = 35 + (currentAngle * 0.3) // degrees leaning right
  const leanRad = leanAngle * Math.PI / 180

  const bodyLength = 28
  const breathing = Math.sin(breathPhase) * 1

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2.5

  // FEET position - planted on the ground
  const legCycle = Math.sin(legPhase)
  const footBackX = feetScreenX - 10 - Math.abs(legCycle) * 8
  const footFrontX = feetScreenX + 8 + Math.abs(Math.sin(legPhase + Math.PI)) * 6
  const footY = feetY

  // HIPS - above the feet
  const hipX = feetScreenX
  const hipY = feetY - 18

  // SHOULDERS - leaning RIGHT toward the boulder
  const shoulderX = hipX + Math.sin(leanRad) * bodyLength
  const shoulderY = hipY - Math.cos(leanRad) * bodyLength + breathing

  // HEAD - above the shoulders, tilted forward slightly toward boulder
  const headRadius = 6
  const headBob = Math.sin(legPhase * 0.5) * 1.5 // Subtle bob with walking
  const headX = shoulderX + 2 + headBob // Slightly forward of shoulders
  const headY = shoulderY - headRadius - 4 + breathing // Above shoulders

  // ARM ANIMATION - independent pushing motion with bent elbows
  const armPushCycle = Math.sin(gameTime * 6) * 0.3 + armPhase * 0.5 // Pumping motion
  const armExtension = 18 + armPushCycle * 8 // How far arms extend

  // Elbow position (bent arm)
  const elbowOffsetX = 12
  const elbowOffsetY = 4 + Math.sin(gameTime * 6) * 3
  const elbowX = shoulderX + elbowOffsetX
  const elbowY = shoulderY + elbowOffsetY

  // Hand position (pushing forward, NOT attached to boulder)
  const handX = shoulderX + armExtension
  const handY = shoulderY + 2 + Math.sin(gameTime * 6 + 0.5) * 4

  // Draw LEGS (from hips down to feet)
  // Back leg - planted behind for leverage
  ctx.beginPath()
  ctx.moveTo(hipX, hipY)
  ctx.lineTo(footBackX, footY)
  ctx.stroke()

  // Front leg - stepping forward
  ctx.beginPath()
  ctx.moveTo(hipX, hipY)
  ctx.lineTo(footFrontX, footY)
  ctx.stroke()

  // Draw TORSO (from hips to shoulders, leaning right)
  ctx.beginPath()
  ctx.moveTo(hipX, hipY)
  ctx.lineTo(shoulderX, shoulderY)
  ctx.stroke()

  // Draw ARMS with bent elbows (two arms, slight offset)
  // Upper arm (shoulder to elbow)
  ctx.beginPath()
  ctx.moveTo(shoulderX, shoulderY - 3)
  ctx.lineTo(elbowX, elbowY - 4)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(shoulderX, shoulderY + 3)
  ctx.lineTo(elbowX, elbowY + 4)
  ctx.stroke()

  // Forearm (elbow to hand)
  ctx.beginPath()
  ctx.moveTo(elbowX, elbowY - 4)
  ctx.lineTo(handX, handY - 4)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(elbowX, elbowY + 4)
  ctx.lineTo(handX, handY + 4)
  ctx.stroke()

  // Draw HEAD
  ctx.beginPath()
  ctx.arc(headX, headY, headRadius, 0, Math.PI * 2)
  ctx.stroke()

  // Effort lines when pushing hard
  if (pushPower > 1) {
    ctx.lineWidth = 1
    ctx.strokeStyle = '#fff'
    for (let i = 0; i < 3; i++) {
      const ox = Math.sin(gameTime * 10 + i) * 2
      ctx.beginPath()
      ctx.moveTo(headX - 10 + ox, headY - 5 + i * 4)
      ctx.lineTo(headX - 16 + ox, headY - 5 + i * 4)
      ctx.stroke()
    }
  }
}

function drawThoughtBubble(width: number, height: number) {
  if (!ctx || !currentThought || gameState.value !== 'playing') return

  const playerScreenX = worldDistance - worldScrollX // Sisyphus position
  const playerY = getHillYAtScreenX(playerScreenX, height)
  const headY = playerY - 50

  const bubbleX = playerScreenX + 50
  const bubbleY = headY - 60

  const alpha = currentThought.timer < 0.5 ? currentThought.timer * 2 : currentThought.fadeIn
  ctx.globalAlpha = alpha

  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 2
  ctx.font = '11px monospace'

  const words = currentThought.text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  for (const word of words) {
    const testLine = currentLine + word + ' '
    if (ctx.measureText(testLine).width > 180 && currentLine) {
      lines.push(currentLine.trim())
      currentLine = word + ' '
    } else {
      currentLine = testLine
    }
  }
  lines.push(currentLine.trim())

  const bubbleWidth = Math.min(200, Math.max(...lines.map(l => ctx!.measureText(l).width)) + 24)
  const bubbleHeight = lines.length * 15 + 18

  // Bubble
  ctx.beginPath()
  ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 12)
  ctx.fill()
  ctx.stroke()

  // Thought dots
  ctx.beginPath()
  ctx.arc(bubbleX - 5, bubbleY + bubbleHeight + 10, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(bubbleX - 12, bubbleY + bubbleHeight + 22, 4, 0, Math.PI * 2)
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

  const bubbleX = width / 2 - 100
  const bubbleY = height / 2 - 50

  const alpha = Math.min(1, finalThoughtTimer * 2)
  ctx.globalAlpha = alpha

  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 2
  ctx.font = '14px monospace'

  ctx.beginPath()
  ctx.roundRect(bubbleX, bubbleY, 250, 60, 12)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#000'
  ctx.fillText(currentFinalThought, bubbleX + 15, bubbleY + 35)
  ctx.fillStyle = '#666'
  ctx.font = '10px monospace'
  ctx.fillText('- The Boulder', bubbleX + 150, bubbleY + 50)

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

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    autoPlayMode = params.has('auto')
    autoPlay.value = autoPlayMode

    // Check for startDistance param to skip ahead for testing
    const startDistParam = params.get('startDistance')
    if (startDistParam) {
      const startDist = parseInt(startDistParam, 10)
      if (!isNaN(startDist) && startDist > 0) {
        console.log(`📍 Starting at distance: ${startDist}`)
        // Will be applied when game starts
        ;(window as any).__sisyphusStartDistance = startDist
      }
    }

    if (autoPlayMode) {
      console.log('🤖 Auto-play mode enabled')
      setTimeout(() => startGame(), 1000)
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('resize', resizeCanvas)
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
  font-family: 'Courier New', monospace;
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
.meter-label { color: #fff; font-size: 12px; margin-bottom: 5px; }
.meter-bar { height: 20px; background: #333; border: 2px solid #fff; position: relative; }
.meter-fill { height: 100%; transition: width 0.1s, background-color 0.3s; }
.meter-threshold { position: absolute; left: 30%; top: 0; bottom: 0; width: 2px; background: #fff; opacity: 0.5; }
.meter-hint { color: #888; font-size: 10px; margin-top: 5px; }

.stats-panel {
  position: absolute;
  top: 0;
  right: 0;
  text-align: right;
}

.score { color: #fff; font-size: 24px; }
.level { color: #ffd700; font-size: 18px; margin-top: 5px; }

.progress-bar {
  position: absolute;
  top: 70px;
  left: 0;
  width: 200px;
}

.progress-label { color: #888; font-size: 10px; margin-bottom: 3px; }
.progress-track { height: 12px; background: #333; border: 1px solid #666; position: relative; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #4ade80, #ffd700); transition: width 0.2s; }
.progress-marker { position: absolute; top: 0; bottom: 0; width: 1px; background: #666; }
.progress-levels { display: flex; justify-content: space-between; font-size: 8px; color: #666; margin-top: 2px; }

.level-announcement {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.level-text {
  font-size: 48px;
  color: #ffd700;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  animation: levelPulse 0.5s ease-out;
}

@keyframes levelPulse {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
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

.start-screen h1 { font-size: 72px; margin-bottom: 20px; letter-spacing: 20px; }
.subtitle { font-style: italic; color: #888; margin-bottom: 40px; }
.instructions { text-align: center; line-height: 2; margin-bottom: 40px; color: #aaa; }
.sound-note { margin-top: 20px; color: #666; font-size: 12px; }

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

.submit-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.game-over h1 { font-size: 48px; margin-bottom: 20px; }
.final-score { font-size: 24px; margin-bottom: 10px; }

.initials-entry { margin-bottom: 30px; text-align: center; }
.initials-entry p { margin-bottom: 15px; }
.initials-input { display: flex; gap: 10px; justify-content: center; margin-bottom: 20px; }

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

.initial-box:focus { outline: none; border-color: #4ade80; }

.leaderboard { margin: 30px 0; text-align: center; }
.leaderboard h2 { font-size: 24px; margin-bottom: 15px; }
.leaderboard-entry { display: flex; gap: 20px; justify-content: center; margin: 5px 0; font-size: 18px; }
.rank { width: 30px; text-align: right; }
.name { width: 50px; text-align: center; }
.entry-score { width: 60px; text-align: left; }

.restart-btn { margin-top: 20px; }

/* Credits */
.credits-screen { overflow: hidden; }
.credits-scroll { text-align: center; }
.credits-scroll h1 { font-size: 48px; margin-bottom: 10px; }
.credits-subtitle { color: #666; margin-bottom: 60px; }
.credits-section { margin: 40px 0; }
.credits-section h2 { font-size: 24px; margin-bottom: 20px; color: #888; }

.credit-line {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin: 8px 0;
  font-size: 14px;
}

.credit-role { text-align: right; min-width: 150px; color: #fff; }
.credit-dots { color: #444; letter-spacing: 2px; }
.credit-name { text-align: left; min-width: 200px; color: #aaa; }

.credits-quote { font-style: italic; color: #888; max-width: 400px; margin: 0 auto; }
.credits-author { color: #666; margin-top: 10px; }
.final-section { margin-top: 60px; }
.final-score-credits { font-size: 20px; }
.credits-note { color: #666; font-size: 12px; margin-top: 5px; }

.skip-btn {
  position: absolute;
  bottom: 30px;
  right: 30px;
  padding: 10px 20px;
  font-size: 14px;
}
</style>
