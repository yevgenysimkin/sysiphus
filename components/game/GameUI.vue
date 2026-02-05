<template>
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
</template>

<script setup lang="ts">
defineProps<{
  showGameUI: boolean
  intensity: number
  intensityColor: string
  autoPlay: boolean
  displayScore: number
  displayLevel: number
  progressPercent: number
  levelAnnouncement: string
}>()
</script>

<style scoped>
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
</style>
