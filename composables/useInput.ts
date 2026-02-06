import type { Ref } from 'vue'
import type { GameState } from './useGameState'
import { useAudio } from './useAudio'

export function useInput(
  gameState: Ref<GameState>,
  intensity: Ref<number>,
  world: { lastTapTime: number; armPhase: number },
) {
  const { initAudio, play8BitSound } = useAudio()

  function registerTap() {
    intensity.value = 100
    world.lastTapTime = Date.now()
    world.armPhase = Math.PI * 0.4
    play8BitSound('push')
  }

  function handleClick() {
    if (gameState.value === 'playing') {
      initAudio()
      registerTap()
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
      e.preventDefault()
      if (gameState.value === 'playing') {
        initAudio()
        registerTap()
      }
    }
  }

  function handleInitialInput(index: number, initials: Ref<string[]>, initialInputs: Ref<(HTMLInputElement | null)[]>) {
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

  function handleInitialKeydown(e: KeyboardEvent, index: number, initialInputs: Ref<(HTMLInputElement | null)[]>) {
    if (e.key === 'Backspace' && !((e.target as HTMLInputElement)?.value) && index > 0) {
      initialInputs.value[index - 1]?.focus()
    }
  }

  return {
    registerTap,
    handleClick,
    handleKeyDown,
    handleInitialInput,
    handleInitialKeydown,
  }
}
