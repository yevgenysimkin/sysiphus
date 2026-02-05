<template>
  <div class="overlay start-screen" v-if="visible">
    <h1>SISYPHUS</h1>
    <p class="subtitle">"One must imagine Sisyphus happy."</p>
    <p class="instructions">
      Push the boulder up the hill.<br>
      Tap [SPACE] rapidly to push.<br>
      Stop pushing and... well, you know.
    </p>
    <button @click="$emit('start')" class="start-btn">BEGIN YOUR ETERNAL TASK</button>
    <p class="sound-note">🔊 Sound effects included</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean }>()
defineEmits<{ start: [] }>()
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

.start-screen h1 { font-size: 72px; margin-bottom: 20px; letter-spacing: 20px; }
.subtitle { font-style: italic; color: #888; margin-bottom: 40px; }
.instructions { text-align: center; line-height: 2; margin-bottom: 40px; color: #aaa; }
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
</style>
