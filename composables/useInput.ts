import type { Ref } from 'vue'
import type { GameState } from './useGameState'
import { useAudio } from './useAudio'
import { INPUT } from '~/game/constants'

export function useInput(
  gameState: Ref<GameState>,
  intensity: Ref<number>,
  world: { lastTapTime: number; armPhase: number },
) {
  const { initAudio, play8BitSound } = useAudio()

  function registerTap() {
    intensity.value = INPUT.tapIntensity
    world.lastTapTime = Date.now()
    world.armPhase = INPUT.tapArmPhase
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

  return {
    registerTap,
    handleClick,
    handleKeyDown,
  }
}
