import type { Ref } from 'vue'
import type { GameState } from './useGameState'
import { useAudio } from './useAudio'

export function useInput(
  gameState: Ref<GameState>,
  world: { pushPower: number; lastTapTime: number; tapTimes: number[]; armPhase: number },
) {
  const { initAudio, play8BitSound } = useAudio()

  function registerTap() {
    const now = Date.now()
    world.tapTimes.push(now)
    world.tapTimes = world.tapTimes.filter(t => now - t < 2000)
    const tapsPerSecond = world.tapTimes.length / 2
    world.pushPower += 0.5 + (tapsPerSecond * 0.2)
    world.lastTapTime = now
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
    if (e.code === 'Space') {
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
