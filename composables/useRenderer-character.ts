import type { Ref } from 'vue'
import type { GameState } from './useGameState'
import { PEAK_DISTANCE } from './usePhysics'
import {
  BOULDER_RADIUS, BOULDER_GROUND_OFFSET, HEAD_RADIUS, BODY_LENGTH,
  UPPER_ARM, FOREARM, HIP_HEIGHT, THIGH_LENGTH, SHIN_LENGTH,
  SHOULDER_HEAD_GAP, RENDER_GAP_BASE,
  COLORS, FONTS, PHYSICS,
} from '~/game/constants'
import {
  FLAT_BODY, EXCLAMATION, THOUGHT_RENDER, FINAL_THOUGHT, COUNTDOWN,
  CONTINUE_BODY, GETTING_UP, RUNNING, TUMBLING, PUSHING, SWAT,
  EFFORT_LINES, DELIVERY_BIRD_RENDER, CARRIED_BODY, BOULDER_RENDER,
} from '~/game/constants-rendering'

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
    ctx.lineWidth = FLAT_BODY.lineWidth
    // Torso
    ctx.beginPath()
    ctx.moveTo(screenX + FLAT_BODY.torsoXStart, groundY + FLAT_BODY.torsoYStart)
    ctx.lineTo(screenX + FLAT_BODY.torsoXEnd, groundY + FLAT_BODY.torsoYEnd)
    ctx.stroke()
    // Head
    ctx.beginPath()
    ctx.arc(screenX + FLAT_BODY.headXOffset, groundY - FLAT_BODY.headRadius, FLAT_BODY.headRadius, 0, Math.PI * 2)
    ctx.stroke()
    // Arms
    ctx.beginPath()
    ctx.moveTo(screenX + FLAT_BODY.armLStartX, groundY + FLAT_BODY.torsoYEnd)
    ctx.lineTo(screenX - 12, groundY + FLAT_BODY.armLEndY)
    ctx.moveTo(screenX + FLAT_BODY.armRStartX, groundY + FLAT_BODY.torsoYEnd)
    ctx.lineTo(screenX + 5, groundY + FLAT_BODY.armREndY)
    ctx.stroke()
    // Legs
    ctx.beginPath()
    ctx.moveTo(screenX + FLAT_BODY.torsoXEnd, groundY + FLAT_BODY.torsoYEnd)
    ctx.lineTo(screenX + FLAT_BODY.legXEnd, groundY + FLAT_BODY.legStraightY)
    ctx.moveTo(screenX + FLAT_BODY.torsoXEnd, groundY + FLAT_BODY.torsoYEnd)
    ctx.lineTo(screenX + 25, groundY + FLAT_BODY.legBentY)
    ctx.stroke()
    ctx.restore()
  }

  function drawExclamations(width: number, height: number) {
    if (!getCtx()) return

    const boulderScreenX = world.boulderDistance - world.worldScrollX
    const boulderY = hillY(boulderScreenX, height) - EXCLAMATION.boulderYOffset

    if (world.currentBoulderExclamation && world.boulderExclamationTimer > 0) {
      const validStates: GameState[] = ['rolling_back', 'rolling_over', 'crushing', 'playing']
      if (validStates.includes(gameState.value)) {
        const alpha = Math.min(1, world.boulderExclamationTimer)
        const bubbleType = gameState.value === 'playing' ? 'thought' : 'speech'
        drawBubble(boulderScreenX, boulderY - 30, world.currentBoulderExclamation, bubbleType, {
          alpha, font: FONTS.exclamationBold, offsetX: EXCLAMATION.boulderBubbleXOffset, offsetY: EXCLAMATION.boulderBubbleYOffset
        })
      }
    }

    if (world.currentSisyphusExclamation && world.sisyphusExclamationTimer > 0 && gameState.value === 'rolling_over') {
      const sisScreenX = boulderScreenX + world.sisyphusTumbleX
      const sisY = hillY(sisScreenX, height) + EXCLAMATION.sisExclaimYOffset
      const alpha = Math.min(1, world.sisyphusExclamationTimer)
      drawBubble(sisScreenX, sisY, world.currentSisyphusExclamation, 'speech', {
        alpha, font: FONTS.lg, offsetX: EXCLAMATION.sisBubbleXOffset, offsetY: EXCLAMATION.sisBubbleYOffset
      })
    }
  }

  function drawThoughtBubble(width: number, height: number) {
    if (!getCtx() || !world.currentThought || gameState.value !== 'playing') return

    const playerScreenX = world.worldDistance - world.worldScrollX
    const playerY = hillY(playerScreenX, height)
    const headY = playerY + THOUGHT_RENDER.headYOffset

    const alpha = world.currentThought.timer < 0.5 ? world.currentThought.timer * FINAL_THOUGHT.alphaScale : world.currentThought.fadeIn
    drawBubble(playerScreenX, headY, world.currentThought.text, 'thought', {
      alpha, offsetX: THOUGHT_RENDER.bubbleXOffset, offsetY: THOUGHT_RENDER.bubbleYOffset
    })
  }

  function drawFinalThought(width: number, height: number) {
    if (!getCtx() || gameState.value !== 'final_thought') return

    const alpha = Math.min(1, world.finalThoughtTimer * FINAL_THOUGHT.alphaScale)
    const boulderScreenX = world.boulderDistance - world.worldScrollX
    const boulderY = hillY(boulderScreenX, height) + FINAL_THOUGHT.boulderYOffset

    drawBubble(boulderScreenX, boulderY, world.currentFinalThought, 'thought', {
      alpha, font: FONTS.xl, maxWidth: FINAL_THOUGHT.maxWidth, offsetX: FINAL_THOUGHT.xOffset, offsetY: FINAL_THOUGHT.yOffset
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
    const scale = phase < COUNTDOWN.popThreshold ? COUNTDOWN.popScaleStart + phase * COUNTDOWN.popScaleRate * COUNTDOWN.popScaleStart : 1
    // Fade out at end of each step
    const alpha = phase > COUNTDOWN.fadeStart ? 1 - (phase - COUNTDOWN.fadeStart) / COUNTDOWN.fadeWindow : 1

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(width / 2, height / 2 + COUNTDOWN.centerYOffset)
    ctx.scale(scale, scale)

    ctx.font = isNumber ? FONTS.countdownNumber : FONTS.countdownPush
    ctx.fillStyle = COLORS.stickFigure
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeStyle = COLORS.black
    ctx.lineWidth = COUNTDOWN.strokeWidth
    ctx.strokeText(text, 0, 0)
    ctx.fillText(text, 0, 0)

    ctx.restore()

    // Instruction text below
    if (t < 3) {
      ctx.save()
      ctx.globalAlpha = COUNTDOWN.instructionAlpha
      ctx.font = FONTS.ui
      ctx.fillStyle = COLORS.stickFigure
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('[press space or click to push]', width / 2, height / 2 + COUNTDOWN.instructionYOffset)
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
        feetScreenX = boulderScreenX - CONTINUE_BODY.boulderGap * world.pushDir
      } else {
        feetScreenX = boulderScreenX + CONTINUE_BODY.boulderGap * world.pushDir
      }
    } else {
      boulderScreenX = world.boulderDistance - world.worldScrollX
      feetScreenX = world.worldDistance - world.worldScrollX
    }

    const boulderBaseY = hillY(boulderScreenX, height) - boulderRadius - BOULDER_GROUND_OFFSET
    const slopeY1 = hillY(boulderScreenX - BOULDER_RENDER.slopeSampleDist, height)
    const slopeY2 = hillY(boulderScreenX + BOULDER_RENDER.slopeSampleDist, height)
    const slopeAngle = Math.atan2(slopeY1 - slopeY2, BOULDER_RENDER.slopeSampleDist * 2)
    const bounceX = Math.sin(slopeAngle) * world.boulderBounce
    const bounceY = Math.cos(slopeAngle) * world.boulderBounce
    const boulderX = boulderScreenX + bounceX
    const boulderY = boulderBaseY - bounceY
    const feetY = hillY(feetScreenX, height)

    // Draw boulder
    ctx.save()
    ctx.translate(boulderX, boulderY)
    ctx.rotate(world.boulderRotation)

    ctx.fillStyle = COLORS.boulderFill
    ctx.strokeStyle = COLORS.boulderStroke
    ctx.lineWidth = BOULDER_RENDER.lineWidth
    ctx.beginPath()
    ctx.arc(0, 0, boulderRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle = COLORS.boulderCrack
    ctx.lineWidth = BOULDER_RENDER.crackLineWidth
    ctx.beginPath()
    ctx.arc(boulderRadius * BOULDER_RENDER.crackXOffset, boulderRadius * BOULDER_RENDER.crackYOffset, boulderRadius * BOULDER_RENDER.crackRadiusScale, BOULDER_RENDER.crackArcStart, BOULDER_RENDER.crackArcEnd)
    ctx.stroke()

    ctx.restore()

    // Rollback - Sisyphus lying flat at crush position (hidden once delivery bird picks him up)
    if (gameState.value === 'rolling_back' && !world.deliveryBird.bodyPickedUp) {
      const crushScreenX = world.sisyphusCrushWorldX - world.worldScrollX
      if (crushScreenX > -PHYSICS.bodyOnScreenMargin && crushScreenX < (gameCanvas.value?.width || PHYSICS.defaultCanvasWidth) + PHYSICS.bodyOnScreenMargin) {
        drawFlattenedBody(ctx, crushScreenX, hillY(crushScreenX, height), world.pushDir)
      }
      return
    }
    if (gameState.value === 'final_thought') return
    if (feetScreenX < -PHYSICS.bodyOnScreenMargin) return

    // Flattened (crushed)
    if (world.sisyphusFlattened && gameState.value === 'crushing') {
      const crushScreenX = world.sisyphusCrushWorldX - world.worldScrollX
      drawFlattenedBody(ctx, crushScreenX, hillY(crushScreenX, height), world.pushDir)
      return
    }

    // Continue prompt - face-planted
    if (gameState.value === 'continue_prompt') {
      const groundY = hillY(feetScreenX, height)
      ctx.strokeStyle = COLORS.stickFigure
      ctx.lineWidth = FLAT_BODY.lineWidth

      const dir = world.pushDir

      ctx.beginPath()
      ctx.moveTo(feetScreenX + CONTINUE_BODY.torsoStartXOffset * dir, groundY + CONTINUE_BODY.torsoY)
      ctx.lineTo(feetScreenX + CONTINUE_BODY.torsoEndXOffset * dir, groundY + CONTINUE_BODY.torsoEndY)
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(feetScreenX + CONTINUE_BODY.headXOffset * dir, groundY + CONTINUE_BODY.headY, CONTINUE_BODY.headRadius, 0, Math.PI * 2)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(feetScreenX + CONTINUE_BODY.armLStartXOffset * dir, groundY + CONTINUE_BODY.armLY)
      ctx.lineTo(feetScreenX + CONTINUE_BODY.armLEndXOffset * dir, groundY + CONTINUE_BODY.armLEndY)
      ctx.moveTo(feetScreenX + CONTINUE_BODY.armRStartXOffset * dir, groundY + CONTINUE_BODY.armRY)
      ctx.lineTo(feetScreenX + CONTINUE_BODY.armREndXOffset * dir, groundY + CONTINUE_BODY.armREndY)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(feetScreenX + CONTINUE_BODY.legLStartXOffset * dir, groundY + CONTINUE_BODY.legLY)
      ctx.lineTo(feetScreenX + CONTINUE_BODY.legLEndXOffset * dir, groundY + CONTINUE_BODY.legLEndY)
      ctx.moveTo(feetScreenX + CONTINUE_BODY.legRStartXOffset * dir, groundY + CONTINUE_BODY.legRY)
      ctx.lineTo(feetScreenX + CONTINUE_BODY.legREndXOffset * dir, groundY + CONTINUE_BODY.legREndY)
      ctx.stroke()
      return
    }

    // Getting up animation
    if (gameState.value === 'getting_up') {
      const groundY = hillY(feetScreenX, height)
      ctx.strokeStyle = COLORS.stickFigure
      ctx.lineWidth = FLAT_BODY.lineWidth

      // Walk toward boulder: always walks toward the boulder
      const dir = continueFromPeak.value ? world.pushDir : -world.pushDir

      if (world.gettingUpPhase < GETTING_UP.standDuration) {
        // Standing with sassy comment
        const hipY = groundY + GETTING_UP.hipYOffset
        const shoulderY = hipY + GETTING_UP.shoulderYOffset

        ctx.beginPath()
        ctx.moveTo(feetScreenX, hipY)
        ctx.lineTo(feetScreenX, shoulderY)
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(feetScreenX, shoulderY - GETTING_UP.headGap, GETTING_UP.headRadius, 0, Math.PI * 2)
        ctx.stroke()

        ctx.fillStyle = COLORS.stickFigure
        ctx.beginPath()
        ctx.arc(feetScreenX + GETTING_UP.eyeXOffset, shoulderY + GETTING_UP.eyeYOffset, GETTING_UP.eyeRadius, 0, Math.PI * 2)
        ctx.arc(feetScreenX - GETTING_UP.eyeXOffset, shoulderY + GETTING_UP.eyeYOffset, GETTING_UP.eyeRadius, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(feetScreenX, shoulderY)
        ctx.lineTo(feetScreenX - GETTING_UP.armXOffset, shoulderY + GETTING_UP.armYOffset)
        ctx.moveTo(feetScreenX, shoulderY)
        ctx.lineTo(feetScreenX + GETTING_UP.armXOffset, shoulderY + GETTING_UP.armYOffset)
        ctx.stroke()

        ctx.beginPath()
        ctx.moveTo(feetScreenX, hipY)
        ctx.lineTo(feetScreenX - GETTING_UP.legXOffset, groundY)
        ctx.moveTo(feetScreenX, hipY)
        ctx.lineTo(feetScreenX + GETTING_UP.legXOffset, groundY)
        ctx.stroke()

        if (world.currentSassyComment) {
          drawBubble(feetScreenX, shoulderY, world.currentSassyComment, 'speech', {
            font: FONTS.lg, offsetX: GETTING_UP.sassyXOffset, offsetY: GETTING_UP.sassyYOffset
          })
        }
      } else {
        // Walking to boulder
        const walkProgress = world.gettingUpPhase - GETTING_UP.standDuration
        const walkCycle = walkProgress * GETTING_UP.walkCycleSpeed
        const bounce = Math.abs(Math.sin(walkCycle)) * GETTING_UP.walkBounce

        const walkX = feetScreenX + (walkProgress * GETTING_UP.walkDistanceScale * dir)
        const hipY = groundY + GETTING_UP.hipYOffset - bounce
        const shoulderY = hipY + GETTING_UP.shoulderYOffset

        ctx.beginPath()
        ctx.moveTo(walkX, hipY)
        ctx.lineTo(walkX + GETTING_UP.torsoXOffset * dir, shoulderY)
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(walkX + GETTING_UP.headXOffset * dir, shoulderY - GETTING_UP.headGap, GETTING_UP.headRadius, 0, Math.PI * 2)
        ctx.stroke()

        const armSwing = Math.sin(walkCycle) * GETTING_UP.armSwingScale
        ctx.beginPath()
        ctx.moveTo(walkX + GETTING_UP.torsoXOffset * dir, shoulderY)
        ctx.lineTo(walkX + GETTING_UP.torsoXOffset * dir - GETTING_UP.armSwingDist * armSwing, shoulderY + GETTING_UP.armSwingYOffset)
        ctx.moveTo(walkX + GETTING_UP.torsoXOffset * dir, shoulderY)
        ctx.lineTo(walkX + GETTING_UP.torsoXOffset * dir + GETTING_UP.armSwingDist * armSwing, shoulderY + GETTING_UP.armSwingYOffset)
        ctx.stroke()

        const legSwing = Math.sin(walkCycle)
        ctx.beginPath()
        ctx.moveTo(walkX, hipY)
        ctx.lineTo(walkX + legSwing * GETTING_UP.legSwingDist, groundY)
        ctx.moveTo(walkX, hipY)
        ctx.lineTo(walkX - legSwing * GETTING_UP.legSwingDist, groundY)
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
        ctx.strokeStyle = COLORS.stickFigure
        ctx.lineWidth = FLAT_BODY.lineWidth

        const runCycle = world.gameTime * RUNNING.cycleSpeed
        const bounce = Math.abs(Math.sin(runCycle)) * RUNNING.bounce

        const bodyX = feetScreenX
        const hipY = groundY + GETTING_UP.hipYOffset - bounce
        const shoulderY = hipY + GETTING_UP.shoulderYOffset
        const shoulderX = bodyX + RUNNING.shoulderXOffset

        ctx.beginPath()
        ctx.moveTo(bodyX, hipY)
        ctx.lineTo(shoulderX, shoulderY)
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(shoulderX + GETTING_UP.headXOffset, shoulderY - GETTING_UP.headGap, GETTING_UP.headRadius, 0, Math.PI * 2)
        ctx.stroke()

        const armSwing = Math.sin(runCycle) * RUNNING.armSwingScale
        ctx.beginPath()
        ctx.moveTo(shoulderX, shoulderY)
        ctx.lineTo(shoulderX + RUNNING.armSwingLX + armSwing * RUNNING.armSwingRX, shoulderY + RUNNING.armSwingLY - armSwing * RUNNING.armSwingRY)
        ctx.moveTo(shoulderX, shoulderY)
        ctx.lineTo(shoulderX + RUNNING.armSwingRX - armSwing * RUNNING.armSwingRY, shoulderY + RUNNING.armSwingRY + armSwing * RUNNING.armSwingRY)
        ctx.stroke()

        const legSwing = Math.sin(runCycle)
        ctx.beginPath()
        ctx.moveTo(bodyX, hipY)
        ctx.lineTo(bodyX + legSwing * RUNNING.legSwingDist, groundY)
        ctx.moveTo(bodyX, hipY)
        ctx.lineTo(bodyX - legSwing * RUNNING.legSwingDist, groundY)
        ctx.stroke()
        ctx.restore()
        return
      }

      // Tumbling
      ctx.save()
      ctx.translate(feetScreenX, groundY + TUMBLING.groundYOffset)
      ctx.scale(pd, 1)
      ctx.rotate(world.sisyphusTumbleRotation)

      ctx.strokeStyle = COLORS.stickFigure
      ctx.lineWidth = FLAT_BODY.lineWidth

      ctx.beginPath()
      ctx.moveTo(0, TUMBLING.torsoBottom)
      ctx.lineTo(0, TUMBLING.torsoTop)
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(0, TUMBLING.headY, TUMBLING.headRadius, 0, Math.PI * 2)
      ctx.stroke()

      const armFlail = Math.sin(world.sisyphusTumbleRotation * TUMBLING.armFlailMultiplier) * TUMBLING.armFlailScale
      ctx.beginPath()
      ctx.moveTo(0, TUMBLING.armStartY)
      ctx.lineTo(TUMBLING.armLX + armFlail * TUMBLING.armLFlailX, TUMBLING.armLY + armFlail * TUMBLING.armLFlailY)
      ctx.moveTo(0, TUMBLING.armStartY)
      ctx.lineTo(TUMBLING.armRX - armFlail * TUMBLING.armRFlailX, TUMBLING.armRY + armFlail * TUMBLING.armRFlailY)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(0, TUMBLING.legTop)
      ctx.lineTo(TUMBLING.legLX - armFlail * TUMBLING.legLFlailX, TUMBLING.legLY)
      ctx.moveTo(0, TUMBLING.legTop)
      ctx.lineTo(TUMBLING.legRX + armFlail * TUMBLING.legRFlailX, TUMBLING.legRY)
      ctx.stroke()

      ctx.restore()
      return
    }

    // Normal pushing state

    // Adjust feet position for consistent hip-to-boulder distance on steep slopes
    // At steeper angles, reduce horizontal gap so character stays close to boulder
    const renderGap = RENDER_GAP_BASE * Math.max(PUSHING.renderGapMinFactor, Math.pow(Math.cos(slopeAngle), PUSHING.renderGapPower))
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
    const leanAngle = PUSHING.leanAngleOffset - currentAngle * PUSHING.leanAngleScale
    const leanRad = leanAngle * Math.PI / 180

    const bodyLength = BODY_LENGTH
    const breathing = Math.sin(world.breathPhase) * PUSHING.breathingAmplitude

    ctx.strokeStyle = COLORS.white
    ctx.lineWidth = PUSHING.strokeWidth

    // Realistic walking stride — feet alternate: one forward, one back
    const stride = PUSHING.stride
    const legCycle = Math.sin(world.legPhase)
    const foot1X = feetScreenX + legCycle * stride
    const foot2X = feetScreenX - legCycle * stride
    // Lift foot slightly mid-stride for a natural step
    const foot1Lift = Math.max(0, Math.cos(world.legPhase)) * PUSHING.footLiftAmplitude
    const foot2Lift = Math.max(0, Math.cos(world.legPhase + Math.PI)) * PUSHING.footLiftAmplitude
    const foot1Y = renderFeetY - foot1Lift
    const foot2Y = renderFeetY - foot2Lift

    const hipX = feetScreenX
    const hipY = renderFeetY - HIP_HEIGHT

    const shoulderX = hipX + Math.sin(leanRad) * bodyLength
    const shoulderY = hipY - Math.cos(leanRad) * bodyLength + breathing

    const headRadius = HEAD_RADIUS
    const headBob = Math.sin(world.legPhase * PUSHING.headBobPhaseScale) * PUSHING.headBobAmplitude
    const headX = shoulderX + PUSHING.headXOffset + headBob
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
      const swatProgress = 1 - (world.swatPhase / PHYSICS.swatDuration) // 0→1 over animation
      const swatAngle = Math.sin(swatProgress * Math.PI) * SWAT.arcAmplitude + SWAT.arcOffset // arc overhead

      // Swatting arm (arm 0) — swipes above head
      const swatElbowX = shoulderX - Math.cos(swatAngle) * UPPER_ARM
      const swatElbowY = shoulderY - Math.sin(swatAngle) * UPPER_ARM
      const swatHandX = swatElbowX - Math.cos(swatAngle + SWAT.elbowAngleOffset) * FOREARM
      const swatHandY = swatElbowY - Math.sin(swatAngle + SWAT.elbowAngleOffset) * FOREARM

      ctx.beginPath()
      ctx.moveTo(shoulderX, shoulderY - SWAT.armYOffset)
      ctx.lineTo(swatElbowX, swatElbowY - SWAT.armYOffset)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(swatElbowX, swatElbowY - SWAT.armYOffset)
      ctx.lineTo(swatHandX, swatHandY - SWAT.armYOffset)
      ctx.stroke()

      // Other arm stays on boulder (arm 1, normal rendering)
      const bendAmount = PUSHING.elbowBendBase
      const elbowX = shoulderX + armDirX * UPPER_ARM + perpX * bendAmount
      const elbowY = shoulderY + armDirY * UPPER_ARM + perpY * bendAmount
      const eToBoulderDx = localBoulderCenterX - elbowX
      const eToBoulderDy = localBoulderCenterY - elbowY
      const eToBoulderDist = Math.sqrt(eToBoulderDx * eToBoulderDx + eToBoulderDy * eToBoulderDy) || 1
      const handX = elbowX + (eToBoulderDx / eToBoulderDist) * FOREARM
      const handY = elbowY + (eToBoulderDy / eToBoulderDist) * FOREARM
      ctx.beginPath()
      ctx.moveTo(shoulderX, shoulderY + PUSHING.armYOffset)
      ctx.lineTo(elbowX, elbowY + PUSHING.armYOffset)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(elbowX, elbowY + PUSHING.armYOffset)
      ctx.lineTo(handX, handY + PUSHING.armYOffset)
      ctx.stroke()
    } else {
      for (let armIdx = 0; armIdx < 2; armIdx++) {
        const phaseOffset = armIdx * Math.PI // opposite phase
        const bendAmount = armAnimating ? Math.max(PUSHING.elbowBendMin, PUSHING.elbowBendBase + Math.sin(world.gameTime * PUSHING.elbowBendFreq + phaseOffset) * PUSHING.elbowBendAmplitude) : PUSHING.elbowBendBase
        const yOffset = armIdx === 0 ? -PUSHING.armYOffset : PUSHING.armYOffset

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
      ctx.lineWidth = EFFORT_LINES.lineWidth
      ctx.strokeStyle = COLORS.stickFigure
      for (let i = 0; i < EFFORT_LINES.count; i++) {
        const ox = Math.sin(world.gameTime * EFFORT_LINES.freq + i) * EFFORT_LINES.offsetScale
        ctx.beginPath()
        ctx.moveTo(headX + EFFORT_LINES.xBase + ox, headY + EFFORT_LINES.yBase + i * EFFORT_LINES.yStep)
        ctx.lineTo(headX + EFFORT_LINES.xOffset + ox, headY + EFFORT_LINES.yBase + i * EFFORT_LINES.yStep)
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
        ctx.fillStyle = `rgba(139, 0, 0, ${drop.alpha})`  // bloodRed with dynamic alpha
        ctx.beginPath()
        // Teardrop shape
        ctx.ellipse(dropScreenX, dropY, CARRIED_BODY.bloodDrop2H, CARRIED_BODY.bloodDrop1H + 0.5, 0, 0, Math.PI * 2)
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
    ctx.strokeStyle = COLORS.stickFigure
    ctx.lineWidth = DELIVERY_BIRD_RENDER.lineWidth
    const flapPhase = world.gameTime * DELIVERY_BIRD_RENDER.flapFreq
    const wingY = Math.sin(flapPhase) * DELIVERY_BIRD_RENDER.wingAmp

    // Body
    ctx.beginPath()
    ctx.ellipse(0, 0, DELIVERY_BIRD_RENDER.bodyW, DELIVERY_BIRD_RENDER.bodyH, 0, 0, Math.PI * 2)
    ctx.stroke()

    // Wings — big sweeping
    ctx.lineWidth = DELIVERY_BIRD_RENDER.wingLineWidth
    ctx.beginPath()
    ctx.moveTo(-DELIVERY_BIRD_RENDER.wingInnerX, 0)
    ctx.quadraticCurveTo(-DELIVERY_BIRD_RENDER.wingCurveX, wingY - DELIVERY_BIRD_RENDER.wingCurveYOffset, -DELIVERY_BIRD_RENDER.wingEndX, wingY - DELIVERY_BIRD_RENDER.wingEndYOffset)
    ctx.moveTo(DELIVERY_BIRD_RENDER.wingInnerX, 0)
    ctx.quadraticCurveTo(DELIVERY_BIRD_RENDER.wingCurveX, wingY - DELIVERY_BIRD_RENDER.wingCurveYOffset, DELIVERY_BIRD_RENDER.wingEndX, wingY - DELIVERY_BIRD_RENDER.wingEndYOffset)
    ctx.stroke()

    // Beak — hooked
    const flyDir = bird.dropX > bird.x ? 1 : -1
    ctx.beginPath()
    ctx.moveTo(DELIVERY_BIRD_RENDER.beakStartX * flyDir, DELIVERY_BIRD_RENDER.beakStartY)
    ctx.lineTo(DELIVERY_BIRD_RENDER.beakEndX * flyDir, DELIVERY_BIRD_RENDER.beakEndY)
    ctx.lineTo(DELIVERY_BIRD_RENDER.tailStartX * flyDir, DELIVERY_BIRD_RENDER.beakBottomY)
    ctx.stroke()

    // Tail
    ctx.beginPath()
    ctx.moveTo(DELIVERY_BIRD_RENDER.tailStartX * -flyDir, 0)
    ctx.lineTo(DELIVERY_BIRD_RENDER.tailEndX * -flyDir, DELIVERY_BIRD_RENDER.tailUpY)
    ctx.moveTo(DELIVERY_BIRD_RENDER.tailStartX * -flyDir, 0)
    ctx.lineTo(DELIVERY_BIRD_RENDER.tailEndX * -flyDir, DELIVERY_BIRD_RENDER.tailDownY)
    ctx.stroke()

    // Long talons (always visible)
    ctx.strokeStyle = COLORS.talonColor
    ctx.lineWidth = DELIVERY_BIRD_RENDER.talonLineWidth
    ctx.beginPath()
    // Left talon — long segmented leg
    ctx.moveTo(-DELIVERY_BIRD_RENDER.talonInnerX, DELIVERY_BIRD_RENDER.talonMidY)
    ctx.lineTo(-DELIVERY_BIRD_RENDER.talonInnerX - 1, DELIVERY_BIRD_RENDER.talonKneeY)
    ctx.lineTo(-DELIVERY_BIRD_RENDER.talonInnerX + 1, DELIVERY_BIRD_RENDER.talonFootY)
    // Claw
    ctx.lineTo(-DELIVERY_BIRD_RENDER.clawOuterX, DELIVERY_BIRD_RENDER.clawOuterY)
    ctx.moveTo(-DELIVERY_BIRD_RENDER.talonInnerX + 1, DELIVERY_BIRD_RENDER.talonFootY)
    ctx.lineTo(-DELIVERY_BIRD_RENDER.clawInnerX, DELIVERY_BIRD_RENDER.clawInnerY)
    ctx.moveTo(-DELIVERY_BIRD_RENDER.talonInnerX + 1, DELIVERY_BIRD_RENDER.talonFootY)
    ctx.lineTo(-DELIVERY_BIRD_RENDER.clawMidX, DELIVERY_BIRD_RENDER.clawMidY)
    // Right talon
    ctx.moveTo(DELIVERY_BIRD_RENDER.talonInnerX, DELIVERY_BIRD_RENDER.talonMidY)
    ctx.lineTo(DELIVERY_BIRD_RENDER.talonInnerX + 1, DELIVERY_BIRD_RENDER.talonKneeY)
    ctx.lineTo(DELIVERY_BIRD_RENDER.talonInnerX - 1, DELIVERY_BIRD_RENDER.talonFootY)
    // Claw
    ctx.lineTo(DELIVERY_BIRD_RENDER.clawOuterX, DELIVERY_BIRD_RENDER.clawOuterY)
    ctx.moveTo(DELIVERY_BIRD_RENDER.talonInnerX - 1, DELIVERY_BIRD_RENDER.talonFootY)
    ctx.lineTo(DELIVERY_BIRD_RENDER.clawInnerX, DELIVERY_BIRD_RENDER.clawInnerY)
    ctx.moveTo(DELIVERY_BIRD_RENDER.talonInnerX - 1, DELIVERY_BIRD_RENDER.talonFootY)
    ctx.lineTo(DELIVERY_BIRD_RENDER.clawMidX, DELIVERY_BIRD_RENDER.clawMidY)
    ctx.stroke()

    // Carried Sisyphus body (horizontal, held by midriff, limbs dangling)
    if (bird.bodyPickedUp && !bird.dropComplete) {
      ctx.strokeStyle = COLORS.stickFigure
      ctx.lineWidth = FLAT_BODY.lineWidth
      const sway = Math.sin(world.gameTime * CARRIED_BODY.swayFreq) * CARRIED_BODY.swayAmp

      // Body is horizontal — talons grip the midriff
      const midY = CARRIED_BODY.midY

      // Torso — horizontal line
      ctx.beginPath()
      ctx.moveTo(-CARRIED_BODY.bodySpan + sway, midY)
      ctx.lineTo(CARRIED_BODY.bodySpan + sway, midY)
      ctx.stroke()

      // Head — at one end
      ctx.beginPath()
      ctx.arc(-CARRIED_BODY.bodySpan + sway - HEAD_RADIUS, midY + sway * CARRIED_BODY.headSwayScale, HEAD_RADIUS, 0, Math.PI * 2)
      ctx.stroke()

      // Arms dangling down from shoulders
      ctx.beginPath()
      ctx.moveTo(CARRIED_BODY.armLX + sway, midY)
      ctx.lineTo(CARRIED_BODY.armLX - 4 + sway, midY + CARRIED_BODY.armDangleY)
      ctx.moveTo(CARRIED_BODY.armRX + sway, midY)
      ctx.lineTo(CARRIED_BODY.armRX + 4 + sway, midY + CARRIED_BODY.armRDangleY)
      ctx.stroke()

      // Legs dangling down from hips
      ctx.beginPath()
      ctx.moveTo(CARRIED_BODY.legLX + sway, midY)
      ctx.lineTo(CARRIED_BODY.legLX - 4 + sway, midY + CARRIED_BODY.legLDangleY)
      ctx.moveTo(CARRIED_BODY.legRX + sway, midY)
      ctx.lineTo(CARRIED_BODY.legRX + 4 + sway, midY + CARRIED_BODY.legRDangleY)
      ctx.stroke()

      // Blood dripping from talons
      ctx.fillStyle = COLORS.bloodRed
      const drip1 = (world.gameTime * CARRIED_BODY.bloodDripSpeed) % 1
      const drip2 = (world.gameTime * CARRIED_BODY.bloodDripSpeed + CARRIED_BODY.bloodDripPhaseOffset) % 1
      ctx.beginPath()
      ctx.ellipse(CARRIED_BODY.bloodDrop1X, midY + drip1 * CARRIED_BODY.bloodDrop1Range, CARRIED_BODY.bloodDrop1W, CARRIED_BODY.bloodDrop1H, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(CARRIED_BODY.bloodDrop2X, midY + drip2 * CARRIED_BODY.bloodDrop2Range, CARRIED_BODY.bloodDrop1W, CARRIED_BODY.bloodDrop2H, 0, 0, Math.PI * 2)
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
