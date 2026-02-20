import type { Ref } from 'vue'
import type { GameState } from './useGameState'
import { PEAK_DISTANCE } from './usePhysics'
import {
  BOULDER_RADIUS, BOULDER_GROUND_OFFSET, HEAD_RADIUS, BODY_LENGTH,
  UPPER_ARM, FOREARM, HIP_HEIGHT, THIGH_LENGTH, SHIN_LENGTH,
  SHOULDER_HEAD_GAP, RENDER_GAP_BASE,
  TUMBLE_OFFSET_X, COLORS, FONTS, TIMING,
} from '~/game/constants'

interface CharacterRendererDeps {
  ctx: () => CanvasRenderingContext2D | null
  gameCanvas: Ref<HTMLCanvasElement | null>
  gameState: Ref<GameState>
  continueFromPeak: Ref<boolean>
  world: {
    worldDistance: number
    boulderDistance: number
    worldScrollX: number
    pushDir: 1 | -1
    gameTime: number
    legPhase: number
    armPhase: number
    boulderRotation: number
    breathPhase: number
    crushTime: number
    sisyphusFlattened: boolean
    boulderVelocity: number
    boulderBounce: number
    finalThoughtTimer: number
    currentFinalThought: string
    reachedPeak: boolean
    sisyphusTumbleRotation: number
    sisyphusTumbleX: number
    sisyphusFallen: boolean
    sisyphusRunning: boolean
    sisyphusCrushWorldX: number
    boulderRollingForward: boolean
    currentBoulderExclamation: string
    boulderExclamationTimer: number
    currentSisyphusExclamation: string
    sisyphusExclamationTimer: number
    currentThought: { text: string; timer: number; fadeIn: number } | null
    gettingUpPhase: number
    currentSassyComment: string
    countdownTimer: number
    flatIdleTime: number
    isIdle: boolean
    swatPhase: number
    deliveryBird: {
      active: boolean
      phase: 'fetch' | 'grab' | 'carry' | 'drop' | 'exit'
      x: number
      y: number
      pickupX: number
      dropX: number
      grabTimer: number
      bodyPickedUp: boolean
      dropComplete: boolean
      bloodDrops: { x: number; y: number; vy: number; alpha: number }[]
    }
  }
  hillY: (screenX: number, height: number) => number
  drawBubble: (
    speakerX: number,
    speakerY: number,
    text: string,
    type: 'speech' | 'thought',
    options?: { alpha?: number; font?: string; maxWidth?: number; offsetX?: number; offsetY?: number }
  ) => void
  getAngleAtDistance: (dist: number) => number
}

export function createCharacterRenderer(deps: CharacterRendererDeps) {
  const { ctx: getCtx, gameCanvas, gameState, continueFromPeak, world, hillY, drawBubble, getAngleAtDistance } = deps

  /** Draw Sisyphus flattened on the ground (used after crushing, rolling_over fall, and rollback) */
  function drawFlattenedBody(ctx: CanvasRenderingContext2D, screenX: number, groundY: number, dir: 1 | -1) {
    ctx.save()
    ctx.translate(screenX, 0)
    ctx.scale(dir, 1)
    ctx.translate(-screenX, 0)
    ctx.strokeStyle = COLORS.stickFigure
    ctx.lineWidth = 2
    // Torso
    ctx.beginPath()
    ctx.moveTo(screenX - 15, groundY - 3)
    ctx.lineTo(screenX + 18, groundY - 4)
    ctx.stroke()
    // Head
    ctx.beginPath()
    ctx.arc(screenX - 20, groundY - 5, 5, 0, Math.PI * 2)
    ctx.stroke()
    // Arms
    ctx.beginPath()
    ctx.moveTo(screenX - 5, groundY - 4)
    ctx.lineTo(screenX - 12, groundY - 14)
    ctx.moveTo(screenX + 8, groundY - 4)
    ctx.lineTo(screenX + 5, groundY - 16)
    ctx.stroke()
    // Legs
    ctx.beginPath()
    ctx.moveTo(screenX + 18, groundY - 4)
    ctx.lineTo(screenX + 28, groundY - 2)
    ctx.moveTo(screenX + 18, groundY - 4)
    ctx.lineTo(screenX + 25, groundY + 5)
    ctx.stroke()
    ctx.restore()
  }

  function drawExclamations(width: number, height: number) {
    if (!getCtx()) return

    const boulderScreenX = world.boulderDistance - world.worldScrollX
    const boulderY = hillY(boulderScreenX, height) - 29

    if (world.currentBoulderExclamation && world.boulderExclamationTimer > 0) {
      const validStates: GameState[] = ['rolling_back', 'rolling_over', 'crushing', 'playing']
      if (validStates.includes(gameState.value)) {
        const alpha = Math.min(1, world.boulderExclamationTimer)
        const bubbleType = gameState.value === 'playing' ? 'thought' : 'speech'
        drawBubble(boulderScreenX, boulderY - 30, world.currentBoulderExclamation, bubbleType, {
          alpha, font: FONTS.exclamationBold, offsetX: -20, offsetY: -50
        })
      }
    }

    if (world.currentSisyphusExclamation && world.sisyphusExclamationTimer > 0 && gameState.value === 'rolling_over') {
      const sisScreenX = boulderScreenX + world.sisyphusTumbleX
      const sisY = hillY(sisScreenX, height) - 30
      const alpha = Math.min(1, world.sisyphusExclamationTimer)
      drawBubble(sisScreenX, sisY, world.currentSisyphusExclamation, 'speech', {
        alpha, font: FONTS.lg, offsetX: -10, offsetY: -40
      })
    }
  }

  function drawThoughtBubble(width: number, height: number) {
    if (!getCtx() || !world.currentThought || gameState.value !== 'playing') return

    const playerScreenX = world.worldDistance - world.worldScrollX
    const playerY = hillY(playerScreenX, height)
    const headY = playerY - 50

    const alpha = world.currentThought.timer < 0.5 ? world.currentThought.timer * 2 : world.currentThought.fadeIn
    drawBubble(playerScreenX, headY, world.currentThought.text, 'thought', {
      alpha, offsetX: 30, offsetY: -40
    })
  }

  function drawFinalThought(width: number, height: number) {
    if (!getCtx() || gameState.value !== 'final_thought') return

    const alpha = Math.min(1, world.finalThoughtTimer * 2)
    const boulderScreenX = world.boulderDistance - world.worldScrollX
    const boulderY = hillY(boulderScreenX, height) - 29

    drawBubble(boulderScreenX, boulderY, world.currentFinalThought, 'thought', {
      alpha, font: FONTS.xl, maxWidth: 220, offsetX: -60, offsetY: -60
    })
  }

  function drawCountdown(width: number, height: number) {
    const ctx = getCtx()
    if (!ctx || gameState.value !== 'countdown') return

    const t = world.countdownTimer
    let text: string
    let isNumber = true
    if (t < 1) text = '3'
    else if (t < 2) text = '2'
    else if (t < 3) text = '1'
    else { text = 'PUSH!'; isNumber = false }

    // Phase within current step (0-1)
    const phase = t % 1

    // Scale: pop in then settle
    const scale = phase < 0.15 ? 0.5 + phase * (1 / 0.15) * 0.5 : 1
    // Fade out at end of each step
    const alpha = phase > 0.8 ? 1 - (phase - 0.8) / 0.2 : 1

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(width / 2, height / 2 - 30)
    ctx.scale(scale, scale)

    ctx.font = isNumber ? FONTS.countdownNumber : FONTS.countdownPush
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 4
    ctx.strokeText(text, 0, 0)
    ctx.fillText(text, 0, 0)

    ctx.restore()

    // Instruction text below
    if (t < 3) {
      ctx.save()
      ctx.globalAlpha = 0.6
      ctx.font = FONTS.ui
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('[press space or click to push]', width / 2, height / 2 + 50)
      ctx.restore()
    }
  }

  function drawSisyphusAndBoulder(width: number, height: number) {
    const ctx = getCtx()
    if (!ctx) return

    const boulderRadius = BOULDER_RADIUS

    let boulderScreenX: number
    let feetScreenX: number

    if (gameState.value === 'rolling_back' || gameState.value === 'final_thought') {
      boulderScreenX = world.boulderDistance - world.worldScrollX
      feetScreenX = -100
    } else if (gameState.value === 'rolling_over') {
      boulderScreenX = world.boulderDistance - world.worldScrollX
      feetScreenX = boulderScreenX + world.sisyphusTumbleX
    } else if (gameState.value === 'continue_prompt' || gameState.value === 'getting_up') {
      boulderScreenX = world.boulderDistance - world.worldScrollX
      if (continueFromPeak.value) {
        feetScreenX = boulderScreenX - 50 * world.pushDir
      } else {
        feetScreenX = boulderScreenX + 50 * world.pushDir
      }
    } else {
      boulderScreenX = world.boulderDistance - world.worldScrollX
      feetScreenX = world.worldDistance - world.worldScrollX
    }

    const boulderBaseY = hillY(boulderScreenX, height) - boulderRadius - BOULDER_GROUND_OFFSET
    const slopeY1 = hillY(boulderScreenX - 5, height)
    const slopeY2 = hillY(boulderScreenX + 5, height)
    const slopeAngle = Math.atan2(slopeY1 - slopeY2, 10)
    const bounceX = Math.sin(slopeAngle) * world.boulderBounce
    const bounceY = Math.cos(slopeAngle) * world.boulderBounce
    const boulderX = boulderScreenX + bounceX
    const boulderY = boulderBaseY - bounceY
    const feetY = hillY(feetScreenX, height)

    // Draw boulder
    ctx.save()
    ctx.translate(boulderX, boulderY)
    ctx.rotate(world.boulderRotation)

    ctx.fillStyle = '#505050'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(0, 0, boulderRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle = '#6a6a6a'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(-boulderRadius * 0.25, -boulderRadius * 0.2, boulderRadius * 0.28, 0.5, 2.5)
    ctx.stroke()

    ctx.restore()

    // Rollback - Sisyphus lying flat at crush position (hidden once delivery bird picks him up)
    if (gameState.value === 'rolling_back' && !world.deliveryBird.bodyPickedUp) {
      const crushScreenX = world.sisyphusCrushWorldX - world.worldScrollX
      if (crushScreenX > -50 && crushScreenX < (gameCanvas.value?.width || 800) + 50) {
        drawFlattenedBody(ctx, crushScreenX, hillY(crushScreenX, height), world.pushDir)
      }
      return
    }
    if (gameState.value === 'final_thought') return
    if (feetScreenX < -50) return

    // Flattened (crushed)
    if (world.sisyphusFlattened && gameState.value === 'crushing') {
      const crushScreenX = world.sisyphusCrushWorldX - world.worldScrollX
      drawFlattenedBody(ctx, crushScreenX, hillY(crushScreenX, height), world.pushDir)
      return
    }

    // Continue prompt - face-planted
    if (gameState.value === 'continue_prompt') {
      const groundY = hillY(feetScreenX, height)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2

      const dir = world.pushDir

      ctx.beginPath()
      ctx.moveTo(feetScreenX - 15 * dir, groundY - 5)
      ctx.lineTo(feetScreenX + 20 * dir, groundY - 3)
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(feetScreenX + 25 * dir, groundY - 5, 6, 0, Math.PI * 2)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(feetScreenX, groundY - 5)
      ctx.lineTo(feetScreenX - 10 * dir, groundY - 15)
      ctx.moveTo(feetScreenX + 10 * dir, groundY - 4)
      ctx.lineTo(feetScreenX + 15 * dir, groundY - 18)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(feetScreenX - 15 * dir, groundY - 5)
      ctx.lineTo(feetScreenX - 25 * dir, groundY - 2)
      ctx.moveTo(feetScreenX - 15 * dir, groundY - 5)
      ctx.lineTo(feetScreenX - 20 * dir, groundY + 5)
      ctx.stroke()
      return
    }

    // Getting up animation
    if (gameState.value === 'getting_up') {
      const groundY = hillY(feetScreenX, height)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2

      // Walk toward boulder: always walks toward the boulder
      const dir = continueFromPeak.value ? world.pushDir : -world.pushDir

      if (world.gettingUpPhase < 1.5) {
        // Standing with sassy comment
        const hipY = groundY - 18
        const shoulderY = hipY - 25

        ctx.beginPath()
        ctx.moveTo(feetScreenX, hipY)
        ctx.lineTo(feetScreenX, shoulderY)
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(feetScreenX, shoulderY - 8, 6, 0, Math.PI * 2)
        ctx.stroke()

        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(feetScreenX - 2, shoulderY - 9, 1.5, 0, Math.PI * 2)
        ctx.arc(feetScreenX + 2, shoulderY - 9, 1.5, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(feetScreenX, shoulderY)
        ctx.lineTo(feetScreenX - 12, shoulderY + 10)
        ctx.moveTo(feetScreenX, shoulderY)
        ctx.lineTo(feetScreenX + 12, shoulderY + 10)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(feetScreenX, hipY)
        ctx.lineTo(feetScreenX - 8, groundY)
        ctx.moveTo(feetScreenX, hipY)
        ctx.lineTo(feetScreenX + 8, groundY)
        ctx.stroke()

        if (world.currentSassyComment) {
          drawBubble(feetScreenX, shoulderY, world.currentSassyComment, 'speech', {
            font: FONTS.lg, offsetX: -20, offsetY: -50
          })
        }
      } else {
        // Walking to boulder
        const walkProgress = world.gettingUpPhase - 1.5
        const walkCycle = walkProgress * 8
        const bounce = Math.abs(Math.sin(walkCycle)) * 2

        const walkX = feetScreenX + (walkProgress * 50 * dir)
        const hipY = groundY - 18 - bounce
        const shoulderY = hipY - 25

        ctx.beginPath()
        ctx.moveTo(walkX, hipY)
        ctx.lineTo(walkX + 3 * dir, shoulderY)
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(walkX + 5 * dir, shoulderY - 8, 6, 0, Math.PI * 2)
        ctx.stroke()

        const armSwing = Math.sin(walkCycle) * 0.5
        ctx.beginPath()
        ctx.moveTo(walkX + 3 * dir, shoulderY)
        ctx.lineTo(walkX + 3 * dir - 10 * armSwing, shoulderY + 15)
        ctx.moveTo(walkX + 3 * dir, shoulderY)
        ctx.lineTo(walkX + 3 * dir + 10 * armSwing, shoulderY + 15)
        ctx.stroke()

        const legSwing = Math.sin(walkCycle)
        ctx.beginPath()
        ctx.moveTo(walkX, hipY)
        ctx.lineTo(walkX + legSwing * 10, groundY)
        ctx.moveTo(walkX, hipY)
        ctx.lineTo(walkX - legSwing * 10, groundY)
        ctx.stroke()
      }
      return
    }

    // Rolling over - following boulder down
    if (gameState.value === 'rolling_over') {
      const groundY = hillY(feetScreenX, height)
      const pd = world.pushDir

      if (world.sisyphusFallen) {
        drawFlattenedBody(ctx, feetScreenX, groundY, pd)
        return
      }

      if (world.sisyphusRunning) {
        ctx.save()
        ctx.translate(feetScreenX, 0)
        ctx.scale(pd, 1)
        ctx.translate(-feetScreenX, 0)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2

        const runCycle = world.gameTime * 15
        const bounce = Math.abs(Math.sin(runCycle)) * 3

        const bodyX = feetScreenX
        const hipY = groundY - 18 - bounce
        const shoulderY = hipY - 25
        const shoulderX = bodyX + 10

        ctx.beginPath()
        ctx.moveTo(bodyX, hipY)
        ctx.lineTo(shoulderX, shoulderY)
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(shoulderX + 5, shoulderY - 8, 6, 0, Math.PI * 2)
        ctx.stroke()

        const armSwing = Math.sin(runCycle) * 0.6
        ctx.beginPath()
        ctx.moveTo(shoulderX, shoulderY)
        ctx.lineTo(shoulderX - 10 + armSwing * 15, shoulderY + 15 - armSwing * 10)
        ctx.moveTo(shoulderX, shoulderY)
        ctx.lineTo(shoulderX + 15 - armSwing * 10, shoulderY + 10 + armSwing * 10)
        ctx.stroke()

        const legSwing = Math.sin(runCycle)
        ctx.beginPath()
        ctx.moveTo(bodyX, hipY)
        ctx.lineTo(bodyX + legSwing * 15, groundY)
        ctx.moveTo(bodyX, hipY)
        ctx.lineTo(bodyX - legSwing * 15, groundY)
        ctx.stroke()
        ctx.restore()
        return
      }

      // Tumbling
      ctx.save()
      ctx.translate(feetScreenX, groundY - 20)
      ctx.scale(pd, 1)
      ctx.rotate(world.sisyphusTumbleRotation)

      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2

      ctx.beginPath()
      ctx.moveTo(0, 15)
      ctx.lineTo(0, -10)
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(0, -16, 6, 0, Math.PI * 2)
      ctx.stroke()

      const armFlail = Math.sin(world.sisyphusTumbleRotation * 3) * 0.5
      ctx.beginPath()
      ctx.moveTo(0, -5)
      ctx.lineTo(-15 + armFlail * 10, -10 + armFlail * 5)
      ctx.moveTo(0, -5)
      ctx.lineTo(15 - armFlail * 10, 0 + armFlail * 5)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(0, 15)
      ctx.lineTo(-10 - armFlail * 8, 25)
      ctx.moveTo(0, 15)
      ctx.lineTo(10 + armFlail * 8, 28)
      ctx.stroke()

      ctx.restore()
      return
    }

    // Normal pushing state

    // Adjust feet position for consistent hip-to-boulder distance on steep slopes
    // At steeper angles, reduce horizontal gap so character stays close to boulder
    const renderGap = RENDER_GAP_BASE * Math.max(0.25, Math.pow(Math.cos(slopeAngle), 1.5))
    feetScreenX = boulderScreenX - renderGap * world.pushDir
    const renderFeetY = hillY(feetScreenX, height)

    // Mirror when pushDir < 0
    ctx.save()
    ctx.translate(feetScreenX, 0)
    ctx.scale(world.pushDir, 1)
    ctx.translate(-feetScreenX, 0)

    const effectiveWorldDist = world.pushDir > 0 ? world.worldDistance : 2 * PEAK_DISTANCE - world.worldDistance
    const currentAngle = getAngleAtDistance(effectiveWorldDist)
    // Lean less than the slope — at steep angles, body leans back significantly
    const leanAngle = 20 - currentAngle * 0.17
    const leanRad = leanAngle * Math.PI / 180

    const bodyLength = BODY_LENGTH
    const breathing = Math.sin(world.breathPhase) * 1

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.5

    // Realistic walking stride — feet alternate: one forward, one back
    const stride = 14
    const legCycle = Math.sin(world.legPhase)
    const foot1X = feetScreenX + legCycle * stride
    const foot2X = feetScreenX - legCycle * stride
    // Lift foot slightly mid-stride for a natural step
    const foot1Lift = Math.max(0, Math.cos(world.legPhase)) * 4
    const foot2Lift = Math.max(0, Math.cos(world.legPhase + Math.PI)) * 4
    const foot1Y = renderFeetY - foot1Lift
    const foot2Y = renderFeetY - foot2Lift

    const hipX = feetScreenX
    const hipY = renderFeetY - HIP_HEIGHT

    const shoulderX = hipX + Math.sin(leanRad) * bodyLength
    const shoulderY = hipY - Math.cos(leanRad) * bodyLength + breathing

    const headRadius = HEAD_RADIUS
    const headBob = Math.sin(world.legPhase * 0.5) * 1.5
    const headX = shoulderX + 2 + headBob
    const headY = shoulderY - headRadius - SHOULDER_HEAD_GAP + breathing

    // Boulder center in local (mirrored) coordinate space
    const localBoulderCenterX = feetScreenX + (boulderX - feetScreenX) * world.pushDir
    const localBoulderCenterY = boulderY

    // Fixed-length arms aimed toward boulder center
    const toBoulderDx = localBoulderCenterX - shoulderX
    const toBoulderDy = localBoulderCenterY - shoulderY
    const toBoulderDist = Math.sqrt(toBoulderDx * toBoulderDx + toBoulderDy * toBoulderDy) || 1
    const armDirX = toBoulderDx / toBoulderDist
    const armDirY = toBoulderDy / toBoulderDist

    // Perpendicular to arm direction (for elbow bend)
    const perpX = -armDirY
    const perpY = armDirX

    // Legs with knee bend (two-bone IK)
    const feet = [{ x: foot1X, y: foot1Y }, { x: foot2X, y: foot2Y }]
    for (const foot of feet) {
      const dx = foot.x - hipX
      const dy = foot.y - hipY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const totalLen = THIGH_LENGTH + SHIN_LENGTH

      let kneeX: number, kneeY: number
      if (dist >= totalLen) {
        // Fully extended — knee at midpoint along line
        const midRatio = THIGH_LENGTH / totalLen
        kneeX = hipX + dx * midRatio
        kneeY = hipY + dy * midRatio
      } else {
        // Two-bone IK: compute knee position
        const cosAngle = (THIGH_LENGTH * THIGH_LENGTH + dist * dist - SHIN_LENGTH * SHIN_LENGTH) / (2 * THIGH_LENGTH * dist)
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)))
        const baseAngle = Math.atan2(dy, dx)
        // Knee bends forward (positive X in local/mirrored space = toward boulder)
        // Subtract angle so knee pushes toward +X (forward), not backward
        kneeX = hipX + Math.cos(baseAngle - angle) * THIGH_LENGTH
        kneeY = hipY + Math.sin(baseAngle - angle) * THIGH_LENGTH
      }

      ctx.beginPath()
      ctx.moveTo(hipX, hipY)
      ctx.lineTo(kneeX, kneeY)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(kneeX, kneeY)
      ctx.lineTo(foot.x, foot.y)
      ctx.stroke()
    }

    // Torso
    ctx.beginPath()
    ctx.moveTo(hipX, hipY)
    ctx.lineTo(shoulderX, shoulderY)
    ctx.stroke()

    // Arms — two arms with alternating push/pull motion (frozen when not moving)
    const armAnimating = gameState.value === 'playing' && !world.isIdle
    const isSwatting = world.swatPhase > 0

    if (isSwatting) {
      // Swatting at bird — one arm swipes overhead, other stays on boulder
      const swatProgress = 1 - (world.swatPhase / 0.4) // 0→1 over animation
      const swatAngle = Math.sin(swatProgress * Math.PI) * 1.8 - 0.5 // arc overhead

      // Swatting arm (arm 0) — swipes above head
      const swatElbowX = shoulderX - Math.cos(swatAngle) * UPPER_ARM
      const swatElbowY = shoulderY - Math.sin(swatAngle) * UPPER_ARM
      const swatHandX = swatElbowX - Math.cos(swatAngle + 0.5) * FOREARM
      const swatHandY = swatElbowY - Math.sin(swatAngle + 0.5) * FOREARM

      ctx.beginPath()
      ctx.moveTo(shoulderX, shoulderY - 3)
      ctx.lineTo(swatElbowX, swatElbowY - 3)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(swatElbowX, swatElbowY - 3)
      ctx.lineTo(swatHandX, swatHandY - 3)
      ctx.stroke()

      // Other arm stays on boulder (arm 1, normal rendering)
      const bendAmount = 4
      const elbowX = shoulderX + armDirX * UPPER_ARM + perpX * bendAmount
      const elbowY = shoulderY + armDirY * UPPER_ARM + perpY * bendAmount
      const eToBoulderDx = localBoulderCenterX - elbowX
      const eToBoulderDy = localBoulderCenterY - elbowY
      const eToBoulderDist = Math.sqrt(eToBoulderDx * eToBoulderDx + eToBoulderDy * eToBoulderDy) || 1
      const handX = elbowX + (eToBoulderDx / eToBoulderDist) * FOREARM
      const handY = elbowY + (eToBoulderDy / eToBoulderDist) * FOREARM
      ctx.beginPath()
      ctx.moveTo(shoulderX, shoulderY + 3)
      ctx.lineTo(elbowX, elbowY + 3)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(elbowX, elbowY + 3)
      ctx.lineTo(handX, handY + 3)
      ctx.stroke()
    } else {
      for (let armIdx = 0; armIdx < 2; armIdx++) {
        const phaseOffset = armIdx * Math.PI // opposite phase
        const bendAmount = armAnimating ? Math.max(1, 4 + Math.sin(world.gameTime * 6 + phaseOffset) * 5) : 4
        const yOffset = armIdx === 0 ? -3 : 3

        const elbowX = shoulderX + armDirX * UPPER_ARM + perpX * bendAmount
        const elbowY = shoulderY + armDirY * UPPER_ARM + perpY * bendAmount

        const eToBoulderDx = localBoulderCenterX - elbowX
        const eToBoulderDy = localBoulderCenterY - elbowY
        const eToBoulderDist = Math.sqrt(eToBoulderDx * eToBoulderDx + eToBoulderDy * eToBoulderDy) || 1
        const handX = elbowX + (eToBoulderDx / eToBoulderDist) * FOREARM
        const handY = elbowY + (eToBoulderDy / eToBoulderDist) * FOREARM

        ctx.beginPath()
        ctx.moveTo(shoulderX, shoulderY + yOffset)
        ctx.lineTo(elbowX, elbowY + yOffset)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(elbowX, elbowY + yOffset)
        ctx.lineTo(handX, handY + yOffset)
        ctx.stroke()
      }
    }

    // Head
    ctx.beginPath()
    ctx.arc(headX, headY, headRadius, 0, Math.PI * 2)
    ctx.stroke()

    // Effort lines
    if (world.armPhase > 0.1) {
      ctx.lineWidth = 1
      ctx.strokeStyle = '#fff'
      for (let i = 0; i < 3; i++) {
        const ox = Math.sin(world.gameTime * 10 + i) * 2
        ctx.beginPath()
        ctx.moveTo(headX - 10 + ox, headY - 5 + i * 4)
        ctx.lineTo(headX - 16 + ox, headY - 5 + i * 4)
        ctx.stroke()
      }
    }

    ctx.restore()
  }

  function drawDeliveryBird(width: number, height: number) {
    const ctx = getCtx()
    if (!ctx) return

    const bird = world.deliveryBird

    // Draw dropped body on ground (persists after drop until continue_prompt)
    if (bird.dropComplete) {
      const dropScreenX = bird.dropX - world.worldScrollX
      const dropGroundY = hillY(dropScreenX, height)
      drawFlattenedBody(ctx, dropScreenX, dropGroundY, world.pushDir)
    }

    // Draw blood drops (world-space, rendered even after bird exits)
    if (bird.bloodDrops.length > 0) {
      bird.bloodDrops.forEach(drop => {
        const dropScreenX = drop.x - world.worldScrollX
        const groundY = hillY(dropScreenX, height)
        const dropY = groundY + drop.y
        ctx.fillStyle = `rgba(139, 0, 0, ${drop.alpha})`
        ctx.beginPath()
        // Teardrop shape
        ctx.ellipse(dropScreenX, dropY, 1.5, 2.5, 0, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    if (!bird.active) return

    const screenX = bird.x - world.worldScrollX
    const groundY = hillY(screenX, height)
    const birdY = groundY + bird.y  // bird.y is negative = above ground

    ctx.save()
    ctx.translate(screenX, birdY)

    // Large bird
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2.5
    const flapPhase = world.gameTime * 6
    const wingY = Math.sin(flapPhase) * 20

    // Body
    ctx.beginPath()
    ctx.ellipse(0, 0, 18, 7, 0, 0, Math.PI * 2)
    ctx.stroke()

    // Wings — big sweeping
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-8, 0)
    ctx.quadraticCurveTo(-22, wingY - 16, -34, wingY - 10)
    ctx.moveTo(8, 0)
    ctx.quadraticCurveTo(22, wingY - 16, 34, wingY - 10)
    ctx.stroke()

    // Beak — hooked
    const flyDir = bird.dropX > bird.x ? 1 : -1
    ctx.beginPath()
    ctx.moveTo(16 * flyDir, -3)
    ctx.lineTo(24 * flyDir, 0)
    ctx.lineTo(22 * flyDir, 4)
    ctx.stroke()

    // Tail
    ctx.beginPath()
    ctx.moveTo(14 * -flyDir, 0)
    ctx.lineTo(22 * -flyDir, -6)
    ctx.moveTo(14 * -flyDir, 0)
    ctx.lineTo(22 * -flyDir, 3)
    ctx.stroke()

    // Long talons (always visible)
    ctx.strokeStyle = '#ccc'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    // Left talon — long segmented leg
    ctx.moveTo(-5, 7)
    ctx.lineTo(-6, 20)
    ctx.lineTo(-4, 30)
    // Claw
    ctx.lineTo(-8, 34)
    ctx.moveTo(-4, 30)
    ctx.lineTo(-1, 35)
    ctx.moveTo(-4, 30)
    ctx.lineTo(-5, 36)
    // Right talon
    ctx.moveTo(5, 7)
    ctx.lineTo(6, 20)
    ctx.lineTo(4, 30)
    // Claw
    ctx.lineTo(8, 34)
    ctx.moveTo(4, 30)
    ctx.lineTo(1, 35)
    ctx.moveTo(4, 30)
    ctx.lineTo(5, 36)
    ctx.stroke()

    // Carried Sisyphus body (horizontal, held by midriff, limbs dangling)
    if (bird.bodyPickedUp && !bird.dropComplete) {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      const sway = Math.sin(world.gameTime * 3) * 2

      // Body is horizontal — talons grip the midriff (y=36 below bird)
      const midY = 36

      // Torso — horizontal line
      ctx.beginPath()
      ctx.moveTo(-18 + sway, midY)
      ctx.lineTo(18 + sway, midY)
      ctx.stroke()

      // Head — at one end
      ctx.beginPath()
      ctx.arc(-18 + sway - HEAD_RADIUS, midY + sway * 0.3, HEAD_RADIUS, 0, Math.PI * 2)
      ctx.stroke()

      // Arms dangling down from shoulders
      ctx.beginPath()
      ctx.moveTo(-10 + sway, midY)
      ctx.lineTo(-14 + sway, midY + 18)
      ctx.moveTo(4 + sway, midY)
      ctx.lineTo(8 + sway, midY + 20)
      ctx.stroke()

      // Legs dangling down from hips
      ctx.beginPath()
      ctx.moveTo(14 + sway, midY)
      ctx.lineTo(10 + sway, midY + 22)
      ctx.moveTo(18 + sway, midY)
      ctx.lineTo(22 + sway, midY + 20)
      ctx.stroke()

      // Blood dripping from talons
      ctx.fillStyle = COLORS.bloodRed
      const drip1 = (world.gameTime * 2) % 1
      const drip2 = (world.gameTime * 2 + 0.5) % 1
      ctx.beginPath()
      ctx.ellipse(-4, midY + drip1 * 8, 1, 2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(5, midY + drip2 * 6, 1, 1.5, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  return {
    drawSisyphusAndBoulder,
    drawDeliveryBird,
    drawExclamations,
    drawThoughtBubble,
    drawFinalThought,
    drawCountdown,
  }
}
