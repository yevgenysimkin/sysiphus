<template>
  <div class="overlay start-screen" v-if="visible">
    <div class="top-section">
      <h1>SISYPHUS</h1>
      <p class="subtitle">"One must imagine Sisyphus happy."</p>
    </div>

    <div class="carousel-section">
      <Transition name="fade" mode="out-in">
        <div v-if="showLeaderboard" key="leaderboard" class="leaderboard-page">
          <h2>LEADERBOARD</h2>
          <div class="leaderboard-entry" v-for="(entry, idx) in leaderboard.slice(0, 10)" :key="idx">
            <span class="rank">{{ idx + 1 }}.</span>
            <span class="name">{{ entry.initials }}</span>
            <span class="entry-score">{{ entry.score }}</span>
          </div>
        </div>
        <p v-else key="instructions" class="instructions">
          Push the boulder up the hill.<br>
          Tap [SPACE] rapidly to push.<br>
          Stop pushing and... well, you know.
        </p>
      </Transition>
    </div>

    <div class="bottom-section">
      <button @click="$emit('start')" class="start-btn">BEGIN YOUR ETERNAL TASK</button>
      <p class="sound-note">🔊 Sound effects included</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'

const CAROUSEL_INTERVAL_MS = 10_000

const props = defineProps<{
  visible: boolean
  leaderboard: { initials: string; score: number }[]
}>()

const emit = defineEmits<{ start: []; refresh: [] }>()

const currentPage = ref<'leaderboard' | 'instructions'>('leaderboard')
let intervalId: ReturnType<typeof setInterval> | null = null

const showLeaderboard = computed(() =>
  currentPage.value === 'leaderboard' && props.leaderboard.length > 0
)

function startCarousel() {
  stopCarousel()
  if (props.leaderboard.length === 0) {
    currentPage.value = 'instructions'
    return
  }
  currentPage.value = 'leaderboard'
  intervalId = setInterval(() => {
    const next = currentPage.value === 'leaderboard' ? 'instructions' : 'leaderboard'
    if (next === 'leaderboard') emit('refresh')
    currentPage.value = next
  }, CAROUSEL_INTERVAL_MS)
}

function stopCarousel() {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}

watch(() => props.visible, (vis) => {
  if (vis) {
    startCarousel()
  } else {
    stopCarousel()
  }
}, { immediate: true })

watch(() => props.leaderboard.length, () => {
  if (props.visible) startCarousel()
})

onUnmounted(stopCarousel)
</script>

<style scoped>
.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
}

.top-section {
  padding-top: 15vh;
  text-align: center;
}

.start-screen h1 { font-size: 72px; margin-bottom: 20px; letter-spacing: 20px; }
.subtitle { font-style: italic; color: #888; margin-bottom: 0; }

.carousel-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.leaderboard-page { text-align: center; }
.leaderboard-page h2 { font-size: 24px; margin-bottom: 20px; letter-spacing: 4px; color: #aaa; }

.leaderboard-entry {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin: 5px 0;
  font-size: 18px;
}

.rank { width: 30px; text-align: right; color: #888; }
.name { width: 50px; text-align: center; }
.entry-score { width: 60px; text-align: left; color: #4ade80; }

.instructions { text-align: center; line-height: 2; color: #aaa; }

.bottom-section {
  padding-bottom: 10vh;
  text-align: center;
}

.sound-note { margin-top: 20px; color: #666; font-size: 12px; }

.start-btn {
  background: transparent;
  border: 2px solid #fff;
  color: #fff;
  padding: 15px 30px;
  font-family: inherit;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.start-btn:hover {
  background: #fff;
  color: #000;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
