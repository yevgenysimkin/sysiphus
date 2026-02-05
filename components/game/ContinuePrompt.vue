<template>
  <div class="continue-prompt" v-if="visible">
    <div class="continue-box">
      <h2>CONTINUE?</h2>
      <div class="continue-timer">{{ Math.ceil(timer) }}</div>
      <div class="continue-buttons">
        <button @click="$emit('accept')" class="continue-btn yes-btn">YES</button>
        <button @click="$emit('decline')" class="continue-btn no-btn">NO</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean; timer: number }>()
defineEmits<{ accept: []; decline: [] }>()
</script>

<style scoped>
.continue-prompt {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.continue-box {
  background: rgba(0, 0, 0, 0.9);
  border: 3px solid #fff;
  padding: 30px 50px;
  text-align: center;
  color: #fff;
  font-family: inherit;
}

.continue-box h2 {
  font-size: 36px;
  margin-bottom: 15px;
  letter-spacing: 5px;
}

.continue-timer {
  font-size: 72px;
  color: #ffd700;
  margin: 20px 0;
}

.continue-buttons {
  display: flex;
  gap: 30px;
  justify-content: center;
  margin-top: 20px;
}

.continue-btn {
  padding: 15px 40px;
  font-size: 24px;
  font-family: inherit;
  cursor: pointer;
  border: 2px solid #fff;
  transition: all 0.2s;
}

.yes-btn { background: #2d5a2d; color: #fff; }
.yes-btn:hover { background: #4ade80; color: #000; }
.no-btn { background: #5a2d2d; color: #fff; }
.no-btn:hover { background: #ef4444; color: #fff; }
</style>
