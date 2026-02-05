<template>
  <div class="overlay game-over" v-if="visible">
    <h1>THE BOULDER WINS</h1>
    <p class="final-score">Final Score: {{ Math.floor(finalScore) }}</p>

    <div class="initials-entry" v-if="!initialsSubmitted">
      <p>Enter your initials:</p>
      <div class="initials-input">
        <input
          v-for="i in 3"
          :key="i"
          :ref="el => setInputRef(i - 1, el as HTMLInputElement | null)"
          type="text"
          maxlength="1"
          :value="initials[i-1]"
          @input="handleInput(i-1, ($event.target as HTMLInputElement).value)"
          @keydown="handleKeydown($event, i-1)"
          class="initial-box"
        />
      </div>
      <button @click="$emit('submit')" class="submit-btn" :disabled="!canSubmit">SUBMIT</button>
    </div>

    <div class="leaderboard" v-if="leaderboard.length > 0">
      <h2>LEADERBOARD</h2>
      <div class="leaderboard-entry" v-for="(entry, idx) in leaderboard" :key="idx">
        <span class="rank">{{ idx + 1 }}.</span>
        <span class="name">{{ entry.initials }}</span>
        <span class="entry-score">{{ entry.score }}</span>
      </div>
    </div>

    <button @click="$emit('restart')" class="restart-btn">PUSH AGAIN</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  finalScore: number
  initialsSubmitted: boolean
  initials: string[]
  canSubmit: boolean
  leaderboard: { initials: string; score: number }[]
}>()

const emit = defineEmits<{
  submit: []
  restart: []
  'update:initial': [index: number, value: string]
}>()

const inputRefs: (HTMLInputElement | null)[] = [null, null, null]

function setInputRef(index: number, el: HTMLInputElement | null) {
  inputRefs[index] = el
}

function handleInput(index: number, val: string) {
  if (val && /[a-zA-Z]/.test(val)) {
    emit('update:initial', index, val.toUpperCase())
    if (index < 2 && inputRefs[index + 1]) {
      inputRefs[index + 1]?.focus()
    }
  } else {
    emit('update:initial', index, '')
  }
}

function handleKeydown(e: KeyboardEvent, index: number) {
  if (e.key === 'Backspace' && !(e.target as HTMLInputElement)?.value && index > 0) {
    inputRefs[index - 1]?.focus()
  }
}
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

.submit-btn, .restart-btn {
  background: transparent;
  border: 2px solid #fff;
  color: #fff;
  padding: 15px 30px;
  font-family: inherit;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
}

.submit-btn:hover, .restart-btn:hover {
  background: #fff;
  color: #000;
}

.submit-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.restart-btn { margin-top: 20px; }
</style>
