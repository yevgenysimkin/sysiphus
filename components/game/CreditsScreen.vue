<template>
  <div class="overlay credits-screen" v-if="visible">
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

    <button @click="$emit('skip')" class="skip-btn">SKIP</button>
  </div>
</template>

<script setup lang="ts">
import { castList, crewList } from '~/game/content'

defineProps<{ visible: boolean; creditsY: number; finalScore: number }>()
defineEmits<{ skip: [] }>()
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
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  color: #fff;
}

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
  background: transparent;
  border: 2px solid #fff;
  color: #fff;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.3s;
}

.skip-btn:hover {
  background: #fff;
  color: #000;
}
</style>
