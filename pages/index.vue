<template>
  <div class="game-container" @click="handleClick">
    <canvas ref="gameCanvas"></canvas>

    <GameUI
      :showGameUI="showGameUI"
      :intensity="intensity"
      :intensityColor="intensityColor"
      :autoPlay="autoPlay"
      :displayScore="displayScore"
      :displayLevel="displayLevel"
      :progressPercent="progressPercent"
      :levelAnnouncement="levelAnnouncement"
      :muted="muted"
      @toggle-mute="toggleMute"
    />

    <StartScreen
      :visible="gameState === 'start'"
      :leaderboard="leaderboard"
      @start="startGame"
      @refresh="fetchLeaderboard"
    />

    <ContinuePrompt
      :visible="gameState === 'continue_prompt'"
      :timer="continueTimer"
      @accept="acceptContinue"
      @decline="declineContinue"
    />

    <CreditsScreen
      :visible="gameState === 'credits'"
      :creditsY="creditsY"
      :finalScore="finalScore"
      @skip="showGameOver"
    />

    <GameOverScreen
      :visible="gameState === 'gameover'"
      :finalScore="finalScore"
      :initialsSubmitted="initialsSubmitted"
      :initials="initials"
      :canSubmit="canSubmit"
      :leaderboard="leaderboard"
      @submit="submitScore"
      @restart="restartGame"
      @update:initial="updateInitial"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import GameUI from '~/components/game/GameUI.vue'
import StartScreen from '~/components/game/StartScreen.vue'
import ContinuePrompt from '~/components/game/ContinuePrompt.vue'
import CreditsScreen from '~/components/game/CreditsScreen.vue'
import GameOverScreen from '~/components/game/GameOverScreen.vue'
import { useGameState } from '~/composables/useGameState'
import { usePhysics } from '~/composables/usePhysics'
import { useAudio } from '~/composables/useAudio'
import { useInput } from '~/composables/useInput'
import { useRenderer } from '~/composables/useRenderer'
import { useGameLoop } from '~/composables/useGameLoop'
import { useMusic } from '~/composables/useMusic'
import { SPAWNING } from '~/game/constants'

const gameCanvas = ref<HTMLCanvasElement | null>(null)

// Composables
const {
  gameState, autoPlay, score, displayScore, finalScore, intensity,
  leaderboard, continueTimer, continueFromPeak, currentLevel, displayLevel,
  levelAnnouncement, creditsY, initials, initialInputs, initialsSubmitted,
  canSubmit, intensityColor, progressPercent, showGameUI,
  world, resetGameState, triggerBoulderExclamation, triggerSisyphusExclamation,
  acceptContinue, declineContinue,
} = useGameState()

const { getLevelAtDistance, getAngleAtDistance, getHeightAtWorldDistance, getHillYAtScreenX } = usePhysics()
const { initAudio, play8BitSound, closeAudio, getAudioCtx, muted, toggleMute } = useAudio()
const { startMusic, stopMusic } = useMusic(getAudioCtx, muted)
const { handleClick, handleKeyDown, registerTap } = useInput(gameState, intensity, world)

// Map game states to music tracks
watch(gameState, (state) => {
  switch (state) {
    case 'countdown':
    case 'playing':
    case 'getting_up':
      startMusic('pushing')
      break
    case 'rolling_back':
    case 'rolling_over':
    case 'returning':
      startMusic('rolling')
      break
    case 'credits':
      startMusic('credits')
      break
    default:
      stopMusic()
  }
})

const { initCanvas, resizeCanvas, render } = useRenderer({
  gameCanvas,
  gameState,
  world,
  continueFromPeak,
  getHillYAtScreenX,
  getHeightAtWorldDistance,
  getAngleAtDistance,
})

function showGameOver() {
  gameState.value = 'gameover'
  loop.stopLoop()
  fetchLeaderboard()
}

const loop = useGameLoop({
  gameCanvas,
  gameState,
  score,
  displayScore,
  finalScore,
  intensity,
  currentLevel,
  displayLevel,
  levelAnnouncement,
  progressPercent,
  continueTimer,
  continueFromPeak,
  creditsY,
  world,
  registerTap,
  getAngleAtDistance,
  getLevelAtDistance,
  triggerBoulderExclamation,
  triggerSisyphusExclamation,
  declineContinue,
  play8BitSound,
  render,
  showGameOver,
})

function launchGame() {
  resetGameState(getLevelAtDistance)
  for (let i = 0; i < SPAWNING.initialBirdSpawnCount; i++) {
    loop.spawnBird()
  }
  world.lastFrameTime = performance.now()
  loop.startCountdown()
  loop.gameLoop()
}

function startGame() {
  initAudio()
  launchGame()
}

function restartGame() {
  initialsSubmitted.value = false
  initials.value = ['', '', '']
  launchGame()
}

async function submitScore() {
  if (!canSubmit.value || initialsSubmitted.value) return
  initialsSubmitted.value = true
  const initialsStr = initials.value.join('').toUpperCase()
  const submittedScore = Math.floor(finalScore.value)
  try {
    await $fetch('/api/leaderboard', {
      method: 'POST',
      body: { initials: initialsStr, score: submittedScore }
    })
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

function updateInitial(index: number, value: string) {
  initials.value[index] = value
}

onMounted(() => {
  initCanvas()

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    world.autoPlayMode = params.has('auto')
    autoPlay.value = world.autoPlayMode

    const startDistParam = params.get('startDistance')
    if (startDistParam) {
      const startDist = parseInt(startDistParam, 10)
      if (!isNaN(startDist) && startDist > 0) {
        console.log(`📍 Starting at distance: ${startDist}`)
        ;(window as any).__sisyphusStartDistance = startDist
      }
    }

    if (params.has('rightSide')) {
      console.log('📍 Starting on right side of peak')
      ;(window as any).__sisyphusRightSide = true
    }

    if (world.autoPlayMode) {
      console.log('🤖 Auto-play mode enabled')
      setTimeout(() => startGame(), SPAWNING.autoPlayStartDelay)
    }
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', resizeCanvas)
  fetchLeaderboard()
})

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'm' || e.key === 'M') {
    toggleMute()
    return
  }
  handleKeyDown(e)
}

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', resizeCanvas)
  loop.stopLoop()
  stopMusic()
  closeAudio()
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
</style>
