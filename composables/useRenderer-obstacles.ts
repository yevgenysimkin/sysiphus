import type { Ref } from 'vue'
import type { Obstacle } from './useGameState'
import { drawAncientRuins as drawAncientRuinsStandalone } from './useRenderer-ruins'
import { philosopherThoughts, stormThoughts, attackBirdsSisExclamation, attackBirdsBoulderThought } from '~/game/content'
import {
  COLORS, FONTS, DEFAULT_CULL_MARGIN, STRAY_DOG_CULL_MARGIN,
  TIMING, OBSTACLE_BEHAVIOR,
} from '~/game/constants'
import {
  SOUVLAKI, SIGN_RENDER, BENCH, ROCK_RENDER, STRAY_DOG, CAMPFIRE,
  SASQUATCH, PHILOSOPHER, MOUNTAIN_GOAT, AVALANCHE_RENDER, MUSES,
  OVERLAY_CULL, ATTACK_BIRDS_RENDER, STORM, ALIEN,
} from '~/game/constants-rendering'

interface ObstacleRendererDeps {
  ctx: () => CanvasRenderingContext2D | null
  gameCanvas: Ref<HTMLCanvasElement | null>
  world: {
    worldScrollX: number
    gameTime: number
    boulderDistance: number
    obstacles: Obstacle[]
  }
  hillY: (screenX: number, height: number) => number
  drawBubble: (
    speakerX: number,
    speakerY: number,
    text: string,
    type: 'speech' | 'thought',
    options?: { alpha?: number; font?: string; maxWidth?: number; offsetX?: number; offsetY?: number }
  ) => void
}
export function createObstacleRenderer(deps: ObstacleRendererDeps) {
  const { ctx: getCtx, gameCanvas, world, hillY, drawBubble } = deps

  function drawSouvlaki(screenX: number, groundY: number) {
    const ctx = getCtx()!
    ctx.fillStyle = COLORS.souvlakiBuilding
    ctx.fillRect(screenX + SOUVLAKI.xOffset, groundY + SOUVLAKI.height, SOUVLAKI.width, -SOUVLAKI.height)
    ctx.fillStyle = COLORS.souvlakiAwning
    ctx.beginPath()
    ctx.moveTo(screenX + SOUVLAKI.awningXMin, groundY + SOUVLAKI.height)
    ctx.lineTo(screenX + SOUVLAKI.awningXMax, groundY + SOUVLAKI.height)
    ctx.lineTo(screenX + SOUVLAKI.awningPeakXMax, groundY + SOUVLAKI.awningPeakY)
    ctx.lineTo(screenX + SOUVLAKI.awningPeakXMin, groundY + SOUVLAKI.awningPeakY)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = COLORS.stickFigure
    ctx.font = FONTS.xs
    ctx.fillText('SOUVLAKI', screenX + SOUVLAKI.textX, groundY + SOUVLAKI.textY)
    ctx.fillText('(closed)', screenX + SOUVLAKI.textX2, groundY + SOUVLAKI.textY2)
  }
  function drawSign(screenX: number, groundY: number, worldX: number) {
    const ctx = getCtx()!
    ctx.fillStyle = COLORS.signPost
    ctx.fillRect(screenX + SIGN_RENDER.postXOffset, groundY + SIGN_RENDER.postHeight, SIGN_RENDER.postWidth, -SIGN_RENDER.postHeight)
    ctx.fillRect(screenX + SIGN_RENDER.boardXOffset, groundY + SIGN_RENDER.boardYOffset, SIGN_RENDER.boardWidth, -SIGN_RENDER.boardYOffset - SIGN_RENDER.postHeight)
    ctx.fillStyle = COLORS.stickFigure
    ctx.font = FONTS.tiny
    const signs = ['KEEP GOING', 'ALMOST THERE', 'NO REFUNDS', 'WHY?']
    ctx.fillText(signs[Math.floor(worldX / SIGN_RENDER.cycleDistance) % signs.length], screenX - 20, groundY - 38)
  }
  function drawBench(screenX: number, groundY: number) {
    const ctx = getCtx()!
    ctx.fillStyle = COLORS.woodBrown
    ctx.fillRect(screenX + BENCH.seatXOffset, groundY + BENCH.seatY, BENCH.seatWidth, BENCH.seatHeight)
    ctx.fillRect(screenX + BENCH.legLX, groundY + BENCH.seatY, 3, BENCH.legHeight)
    ctx.fillRect(screenX + BENCH.legRX, groundY + BENCH.seatY, 3, BENCH.legHeight)
    ctx.fillRect(screenX + BENCH.seatXOffset, groundY + BENCH.backY, BENCH.seatWidth, BENCH.backHeight)
  }
  function drawRock(screenX: number, groundY: number) {
    const ctx = getCtx()!
    ctx.fillStyle = COLORS.rockGray
    ctx.beginPath()
    ctx.ellipse(screenX, groundY + ROCK_RENDER.yOffset, ROCK_RENDER.width, ROCK_RENDER.height, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = COLORS.rockDark
    ctx.beginPath()
    ctx.ellipse(screenX + ROCK_RENDER.shadowXOffset, groundY + ROCK_RENDER.shadowYOffset, ROCK_RENDER.shadowW, ROCK_RENDER.shadowH, ROCK_RENDER.shadowRot, 0, Math.PI * 2)
    ctx.fill()
  }
  function drawStrayDog(screenX: number, origGroundY: number, obstacle: Obstacle) {
    const ctx = getCtx()!
    const s = obstacle.state
    const dogOffsetX = s.dogX || 0
    const x = screenX + dogOffsetX
    const fled = s.dogFled

    if (fled && Math.abs(dogOffsetX) > STRAY_DOG.fledCullDist) return

    // Recompute ground Y at dog's actual screen position so it follows the hill contour
    const canvas = gameCanvas.value
    const groundY = (canvas && dogOffsetX !== 0) ? hillY(x, canvas.height) : origGroundY

    ctx.save()

    // Flip dog to face its run direction
    if (fled && dogOffsetX < 0) {
      ctx.translate(x, 0)
      ctx.scale(-1, 1)
      ctx.translate(-x, 0)
    }

    ctx.strokeStyle = COLORS.dogStroke
    ctx.lineWidth = STRAY_DOG.lineWidth

    const legAnim = fled
      ? Math.sin(s.animTimer * STRAY_DOG.legAnimFreqFlee) * STRAY_DOG.legAnimAmpFlee
      : Math.sin(s.animTimer * STRAY_DOG.legAnimFreqIdle) * STRAY_DOG.legAnimAmpIdle
    const tailWag = Math.sin(s.animTimer * (fled ? STRAY_DOG.tailWagFreqFlee : STRAY_DOG.tailWagFreqIdle)) * STRAY_DOG.tailWagAmplitude

    // Body
    ctx.beginPath()
    ctx.moveTo(x + STRAY_DOG.bodyXMin, groundY + STRAY_DOG.bodyY)
    ctx.lineTo(x + STRAY_DOG.bodyXMax, groundY + STRAY_DOG.bodyY)
    ctx.stroke()

    // Head
    ctx.beginPath()
    ctx.arc(x + STRAY_DOG.headX, groundY + STRAY_DOG.headY, STRAY_DOG.headRadius, 0, Math.PI * 2)
    ctx.stroke()

    // Ears
    ctx.beginPath()
    ctx.moveTo(x + STRAY_DOG.earLX, groundY + STRAY_DOG.earLY)
    ctx.lineTo(x + STRAY_DOG.earLEndX, groundY + STRAY_DOG.earLEndY)
    ctx.moveTo(x + STRAY_DOG.earRX, groundY + STRAY_DOG.earRY)
    ctx.lineTo(x + STRAY_DOG.earREndX, groundY + STRAY_DOG.earREndY)
    ctx.stroke()

    // Snout
    ctx.beginPath()
    ctx.moveTo(x + STRAY_DOG.snoutStartX, groundY + STRAY_DOG.snoutStartY)
    ctx.lineTo(x + STRAY_DOG.snoutEndX, groundY + STRAY_DOG.snoutEndY)
    ctx.stroke()

    // Front legs
    ctx.beginPath()
    ctx.moveTo(x + STRAY_DOG.frontLegLX, groundY + STRAY_DOG.legY)
    ctx.lineTo(x + STRAY_DOG.frontLegLX + legAnim, groundY)
    ctx.moveTo(x + STRAY_DOG.frontLegRX, groundY + STRAY_DOG.legY)
    ctx.lineTo(x + STRAY_DOG.frontLegRX - legAnim, groundY)
    ctx.stroke()

    // Back legs
    ctx.beginPath()
    ctx.moveTo(x + STRAY_DOG.backLegLX, groundY + STRAY_DOG.legY)
    ctx.lineTo(x + STRAY_DOG.backLegLX + legAnim, groundY)
    ctx.moveTo(x + STRAY_DOG.backLegRX, groundY + STRAY_DOG.legY)
    ctx.lineTo(x + STRAY_DOG.backLegRX - legAnim, groundY)
    ctx.stroke()

    // Tail
    ctx.beginPath()
    ctx.moveTo(x + STRAY_DOG.tailStartX, groundY + STRAY_DOG.tailStartY)
    ctx.quadraticCurveTo(
      x + STRAY_DOG.tailCtrlX, groundY + STRAY_DOG.tailCtrlY + Math.sin(tailWag) * STRAY_DOG.tailWagScale1,
      x + STRAY_DOG.tailEndX, groundY + STRAY_DOG.tailEndY + Math.sin(tailWag) * STRAY_DOG.tailWagScale2
    )
    ctx.stroke()

    // Bark indicator drawn in drawLandmarkBubbles for top Z-order

    ctx.restore()
  }
  function drawCampfire(screenX: number, groundY: number, obstacle: Obstacle) {
    const ctx = getCtx()!
    const s = obstacle.state

    // Logs
    ctx.strokeStyle = COLORS.woodBrown
    ctx.lineWidth = CAMPFIRE.logLineWidth
    ctx.beginPath()
    ctx.moveTo(screenX + CAMPFIRE.logLStartX, groundY)
    ctx.lineTo(screenX + CAMPFIRE.logLEndX, groundY + CAMPFIRE.logLY)
    ctx.moveTo(screenX + CAMPFIRE.logRStartX, groundY)
    ctx.lineTo(screenX + CAMPFIRE.logREndX, groundY + CAMPFIRE.logRY)
    ctx.stroke()

    // Flames
    const t = s.animTimer
    for (let i = 0; i < CAMPFIRE.flameCount; i++) {
      const flicker = Math.sin(t * CAMPFIRE.flickerFreq + i * CAMPFIRE.flickerPhaseOffset) * CAMPFIRE.flickerAmp
      const h = CAMPFIRE.flameHeightBase + Math.sin(t * CAMPFIRE.flameHeightFreq + i * CAMPFIRE.flameHeightPhaseOffset) * CAMPFIRE.flameHeightAmp
      const fx = screenX + CAMPFIRE.flameXBase + i * CAMPFIRE.flameXStep + flicker
      ctx.fillStyle = COLORS.campfireFlames[i]
      ctx.beginPath()
      ctx.moveTo(fx - 3, groundY + CAMPFIRE.flameYBase)
      ctx.quadraticCurveTo(fx + flicker, groundY + CAMPFIRE.flameYBase - h, fx + 3, groundY + CAMPFIRE.flameYBase)
      ctx.fill()
    }

    // Glow
    const glow = ctx.createRadialGradient(screenX, groundY + CAMPFIRE.glowY, CAMPFIRE.glowInnerRadius, screenX, groundY + CAMPFIRE.glowY, CAMPFIRE.glowOuterRadius)
    glow.addColorStop(0, COLORS.campfireGlowInner)
    glow.addColorStop(1, COLORS.campfireGlowOuter)
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(screenX, groundY + CAMPFIRE.glowY, CAMPFIRE.glowOuterRadius, 0, Math.PI * 2)
    ctx.fill()

    // Smoke particles
    if (s.smokeParticles) {
      ctx.fillStyle = COLORS.smokeColor
      for (const p of s.smokeParticles) {
        ctx.globalAlpha = p.alpha
        ctx.beginPath()
        ctx.arc(screenX + p.x, groundY + CAMPFIRE.smokeY + p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
  }
  function drawSasquatch(screenX: number, groundY: number, obstacle: Obstacle) {
    const ctx = getCtx()!
    const s = obstacle.state
    const peek = s.squatchPeekAmount || 0

    if (peek <= 0.05) return

    // Find nearest tree to hide behind (draw sasquatch partially behind a trunk area)
    const treeX = screenX + SASQUATCH.treeXOffset
    const bodyReveal = peek // 0 to 1

    ctx.save()
    // Clip to only show revealed portion
    ctx.beginPath()
    ctx.rect(treeX + SASQUATCH.clipXOffset - bodyReveal * SASQUATCH.clipWidthMin, 0, bodyReveal * SASQUATCH.clipWidthMax, gameCanvas.value?.height || 800)
    ctx.clip()

    ctx.strokeStyle = '#8B4513'
    ctx.lineWidth = SASQUATCH.lineWidth

    const headX = treeX + SASQUATCH.headXOffset
    const headY = groundY + SASQUATCH.headYOffset

    // Big furry body
    ctx.fillStyle = COLORS.sasquatchBody
    ctx.beginPath()
    ctx.ellipse(headX, groundY - 25, SASQUATCH.bodyW, SASQUATCH.bodyH, 0, 0, Math.PI * 2)
    ctx.fill()

    // Head
    ctx.beginPath()
    ctx.arc(headX, headY, SASQUATCH.headRadius, 0, Math.PI * 2)
    ctx.fill()

    // Eyes
    ctx.fillStyle = COLORS.white
    ctx.beginPath()
    ctx.arc(headX + SASQUATCH.eyeLX, headY + SASQUATCH.eyeY, SASQUATCH.eyeRadius, 0, Math.PI * 2)
    ctx.arc(headX + SASQUATCH.eyeRX, headY + SASQUATCH.eyeY, SASQUATCH.eyeRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = COLORS.black
    ctx.beginPath()
    ctx.arc(headX + SASQUATCH.eyeLX, headY + SASQUATCH.eyeY, SASQUATCH.pupilRadius, 0, Math.PI * 2)
    ctx.arc(headX + SASQUATCH.eyeRX, headY + SASQUATCH.eyeY, SASQUATCH.pupilRadius, 0, Math.PI * 2)
    ctx.fill()

    // Legs
    ctx.strokeStyle = COLORS.sasquatchBody
    ctx.lineWidth = SASQUATCH.legLineWidth
    ctx.beginPath()
    ctx.moveTo(headX + SASQUATCH.legLX, groundY + SASQUATCH.legY)
    ctx.lineTo(headX + SASQUATCH.legEndLX, groundY)
    ctx.moveTo(headX + SASQUATCH.legRX, groundY + SASQUATCH.legY)
    ctx.lineTo(headX + SASQUATCH.legEndRX, groundY)
    ctx.stroke()

    ctx.restore()

    // "Tree trunk" to hide behind (drawn on top for layering)
    ctx.fillStyle = COLORS.sasquatchTreeTrunk
    ctx.fillRect(treeX + SASQUATCH.trunkXOffset, groundY + SASQUATCH.trunkHeight, SASQUATCH.trunkWidth, -SASQUATCH.trunkHeight)
    ctx.fillStyle = COLORS.sasquatchTreeFoliage
    ctx.beginPath()
    ctx.moveTo(treeX + SASQUATCH.foliageApexX, groundY + SASQUATCH.foliageApexY)
    ctx.lineTo(treeX + SASQUATCH.foliageBaseXMin, groundY + SASQUATCH.foliageBaseY)
    ctx.lineTo(treeX + SASQUATCH.foliageBaseXMax, groundY + SASQUATCH.foliageBaseY)
    ctx.closePath()
    ctx.fill()
  }
  function drawAncientRuins(screenX: number, groundY: number) {
    const ctx = getCtx()!
    drawAncientRuinsStandalone(ctx, screenX, groundY)
  }
  function drawPhilosopher(screenX: number, groundY: number, obstacle: Obstacle) {
    const ctx = getCtx()!
    const s = obstacle.state
    ctx.strokeStyle = COLORS.stickFigure
    ctx.lineWidth = PHILOSOPHER.lineWidth

    // Seated position
    const headX = screenX
    const headY = groundY + PHILOSOPHER.headY

    // Head
    ctx.beginPath()
    ctx.arc(headX, headY, PHILOSOPHER.headRadius, 0, Math.PI * 2)
    ctx.stroke()

    // Beard
    ctx.beginPath()
    ctx.moveTo(headX + PHILOSOPHER.beardLX, headY + PHILOSOPHER.beardLY)
    ctx.lineTo(headX + PHILOSOPHER.beardMidX, headY + PHILOSOPHER.beardMidY)
    ctx.lineTo(headX + PHILOSOPHER.beardRX, headY + PHILOSOPHER.beardLY)
    ctx.stroke()

    // Body (seated, leaning forward thoughtfully)
    ctx.beginPath()
    ctx.moveTo(headX, headY + PHILOSOPHER.headRadius)
    ctx.lineTo(headX + PHILOSOPHER.bodyX, groundY + PHILOSOPHER.bodyY)
    ctx.stroke()

    // Arm on chin (thinking pose)
    ctx.beginPath()
    ctx.moveTo(headX + PHILOSOPHER.armThinkStartX, groundY + PHILOSOPHER.armRestY)
    ctx.lineTo(headX + PHILOSOPHER.armThinkMidX, groundY + PHILOSOPHER.armThinkMidY)
    ctx.lineTo(headX + PHILOSOPHER.armThinkEndX, headY + PHILOSOPHER.armThinkEndYOffset)
    ctx.stroke()

    // Other arm resting
    ctx.beginPath()
    ctx.moveTo(headX + PHILOSOPHER.armRestStartX, groundY + PHILOSOPHER.armRestY)
    ctx.lineTo(headX + PHILOSOPHER.armRestEndX, groundY + PHILOSOPHER.armRestEndY)
    ctx.stroke()

    // Legs (seated on rock)
    ctx.beginPath()
    ctx.moveTo(headX + PHILOSOPHER.legLStartX, groundY + PHILOSOPHER.legLStartY)
    ctx.lineTo(headX + PHILOSOPHER.legLMidX, groundY + PHILOSOPHER.legLMidY)
    ctx.lineTo(headX + PHILOSOPHER.legLEndX, groundY)
    ctx.moveTo(headX + PHILOSOPHER.legRStartX, groundY + PHILOSOPHER.legRStartY)
    ctx.lineTo(headX + PHILOSOPHER.legRMidX, groundY + PHILOSOPHER.legRMidY)
    ctx.lineTo(headX + PHILOSOPHER.legREndX, groundY)
    ctx.stroke()

    // Small sitting rock
    ctx.fillStyle = COLORS.rockGray
    ctx.beginPath()
    ctx.ellipse(headX + PHILOSOPHER.rockX, groundY + PHILOSOPHER.rockY, PHILOSOPHER.rockW, PHILOSOPHER.rockH, 0, 0, Math.PI * 2)
    ctx.fill()

    // Thought bubble drawn in drawLandmarkBubbles for top Z-order

    // Label
    ctx.fillStyle = COLORS.uiDimmer
    ctx.font = FONTS.sm
    ctx.fillText('Socrates', screenX + PHILOSOPHER.labelX, groundY + PHILOSOPHER.labelY)
  }
  function drawMountainGoat(screenX: number, groundY: number, obstacle: Obstacle) {
    const ctx = getCtx()!
    const s = obstacle.state

    // Ledge
    ctx.fillStyle = COLORS.rockDark
    ctx.beginPath()
    ctx.moveTo(screenX + MOUNTAIN_GOAT.ledgeXMin, groundY + MOUNTAIN_GOAT.ledgeYMin)
    ctx.lineTo(screenX + MOUNTAIN_GOAT.ledgeCornerXMin, groundY + MOUNTAIN_GOAT.ledgeYMax)
    ctx.lineTo(screenX + MOUNTAIN_GOAT.ledgeCornerXMax, groundY + MOUNTAIN_GOAT.ledgeYMax)
    ctx.lineTo(screenX + MOUNTAIN_GOAT.ledgeXMax, groundY + MOUNTAIN_GOAT.ledgeYMin)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = COLORS.dogStroke
    ctx.lineWidth = MOUNTAIN_GOAT.lineWidth

    const goatX = screenX
    const goatY = groundY + MOUNTAIN_GOAT.yOffset

    // Body
    ctx.beginPath()
    ctx.ellipse(goatX, goatY + MOUNTAIN_GOAT.bodyY, MOUNTAIN_GOAT.bodyW, MOUNTAIN_GOAT.bodyH, 0, 0, Math.PI * 2)
    ctx.stroke()

    // Head
    ctx.beginPath()
    ctx.arc(goatX + MOUNTAIN_GOAT.headX, goatY + MOUNTAIN_GOAT.headY, MOUNTAIN_GOAT.headRadius, 0, Math.PI * 2)
    ctx.stroke()

    // Horns
    ctx.beginPath()
    ctx.moveTo(goatX + MOUNTAIN_GOAT.hornLStartX, goatY + MOUNTAIN_GOAT.hornLStartY)
    ctx.quadraticCurveTo(goatX + MOUNTAIN_GOAT.hornLCtrlX, goatY + MOUNTAIN_GOAT.hornLCtrlY, goatX + MOUNTAIN_GOAT.hornLEndX, goatY + MOUNTAIN_GOAT.hornLEndY)
    ctx.moveTo(goatX + MOUNTAIN_GOAT.hornRStartX, goatY + MOUNTAIN_GOAT.hornRStartY)
    ctx.quadraticCurveTo(goatX + MOUNTAIN_GOAT.hornRCtrlX, goatY + MOUNTAIN_GOAT.hornRCtrlY, goatX + MOUNTAIN_GOAT.hornREndX, goatY + MOUNTAIN_GOAT.hornREndY)
    ctx.stroke()

    // Eyes (with blink)
    if (!s.blinking) {
      ctx.fillStyle = COLORS.white
      ctx.beginPath()
      ctx.arc(goatX + MOUNTAIN_GOAT.eyeX, goatY + MOUNTAIN_GOAT.eyeY, MOUNTAIN_GOAT.eyeRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = COLORS.black
      ctx.beginPath()
      ctx.arc(goatX + MOUNTAIN_GOAT.eyeX, goatY + MOUNTAIN_GOAT.eyeY, MOUNTAIN_GOAT.pupilRadius, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.moveTo(goatX + MOUNTAIN_GOAT.blinkStartX, goatY + MOUNTAIN_GOAT.blinkY)
      ctx.lineTo(goatX + MOUNTAIN_GOAT.blinkEndX, goatY + MOUNTAIN_GOAT.blinkY)
      ctx.stroke()
    }

    // Goatee
    ctx.beginPath()
    ctx.moveTo(goatX + MOUNTAIN_GOAT.goateeStartX, goatY + MOUNTAIN_GOAT.goateeStartY)
    ctx.lineTo(goatX + MOUNTAIN_GOAT.goateeEndX, goatY + MOUNTAIN_GOAT.goateeEndY)
    ctx.stroke()

    // Legs
    ctx.beginPath()
    for (const legX of MOUNTAIN_GOAT.legXPositions) {
      ctx.moveTo(goatX + legX, goatY + MOUNTAIN_GOAT.legTopY)
      ctx.lineTo(goatX + legX, goatY)
    }
    ctx.stroke()

    // Tail
    ctx.beginPath()
    ctx.moveTo(goatX + MOUNTAIN_GOAT.tailStartX, goatY + MOUNTAIN_GOAT.tailStartY)
    ctx.lineTo(goatX + MOUNTAIN_GOAT.tailEndX, goatY + MOUNTAIN_GOAT.tailEndY)
    ctx.stroke()
  }
  function drawAvalancheWarning(screenX: number, groundY: number, obstacle: Obstacle) {
    const ctx = getCtx()!
    const s = obstacle.state

    // Danger sign
    ctx.fillStyle = COLORS.dangerRed
    ctx.beginPath()
    ctx.moveTo(screenX, groundY + AVALANCHE_RENDER.signTopY)
    ctx.lineTo(screenX + AVALANCHE_RENDER.signXMin, groundY + AVALANCHE_RENDER.signBottomY)
    ctx.lineTo(screenX + AVALANCHE_RENDER.signXMax, groundY + AVALANCHE_RENDER.signBottomY)
    ctx.closePath()
    ctx.fill()

    // Sign border
    ctx.strokeStyle = COLORS.warningYellow
    ctx.lineWidth = AVALANCHE_RENDER.borderWidth
    ctx.beginPath()
    ctx.moveTo(screenX, groundY + AVALANCHE_RENDER.borderTopY)
    ctx.lineTo(screenX - AVALANCHE_RENDER.borderX, groundY + AVALANCHE_RENDER.borderBottomY)
    ctx.lineTo(screenX + AVALANCHE_RENDER.borderX, groundY + AVALANCHE_RENDER.borderBottomY)
    ctx.closePath()
    ctx.stroke()

    // Exclamation mark
    ctx.fillStyle = COLORS.warningYellow
    ctx.font = FONTS.exclamationBold
    ctx.fillText('!', screenX + AVALANCHE_RENDER.exclamationX, groundY + AVALANCHE_RENDER.exclamationY)

    // Sign post
    ctx.fillStyle = COLORS.signPost
    ctx.fillRect(screenX + AVALANCHE_RENDER.postXOffset, groundY + AVALANCHE_RENDER.postYOffset, AVALANCHE_RENDER.postWidth, AVALANCHE_RENDER.postHeight)

    // Falling rocks
    if (s.fallingRocks) {
      ctx.fillStyle = COLORS.fallingRockFill
      for (const rock of s.fallingRocks) {
        ctx.save()
        ctx.translate(screenX + rock.x, groundY + rock.y)
        ctx.rotate(rock.rotation)
        ctx.beginPath()
        ctx.ellipse(0, 0, rock.size, rock.size * AVALANCHE_RENDER.fallingRockHeightScale, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    // Text label
    ctx.fillStyle = COLORS.dangerRed
    ctx.font = FONTS.tiny
    ctx.fillText('DANGER', screenX + AVALANCHE_RENDER.labelX, groundY + AVALANCHE_RENDER.labelY)
  }
  function drawTheMuses(screenX: number, groundY: number, obstacle: Obstacle) {
    const ctx = getCtx()!
    const s = obstacle.state
    const laugh = s.laughPhase || 0

    // Ledge
    ctx.fillStyle = COLORS.rockDark
    ctx.beginPath()
    ctx.moveTo(screenX + MUSES.ledgeXMin, groundY + MUSES.ledgeYMin)
    ctx.lineTo(screenX + MUSES.ledgeCornerXMin, groundY + MUSES.ledgeYMax)
    ctx.lineTo(screenX + MUSES.ledgeCornerXMax, groundY + MUSES.ledgeYMax)
    ctx.lineTo(screenX + MUSES.ledgeXMax, groundY + MUSES.ledgeYMin)
    ctx.closePath()
    ctx.fill()

    // Three muse figures
    for (let i = 0; i < 3; i++) {
      const mx = screenX + MUSES.xBase + i * MUSES.xSpacing
      const bounce = Math.sin(laugh + i * MUSES.bouncePhaseOffset) * 3
      const headY = groundY + MUSES.headYOffset + bounce
      const armAngle = Math.sin(laugh + i * MUSES.armAnglePhaseOffset) * MUSES.armAngleAmplitude

      ctx.strokeStyle = COLORS.stickFigure
      ctx.lineWidth = MUSES.lineWidth

      // Head
      ctx.beginPath()
      ctx.arc(mx, headY, MUSES.headRadius, 0, Math.PI * 2)
      ctx.stroke()

      // Body
      ctx.beginPath()
      ctx.moveTo(mx, headY + MUSES.bodyYOffsetHead)
      ctx.lineTo(mx, groundY + MUSES.bodyYOffsetFoot)
      ctx.stroke()

      // Pointing arm (toward player direction)
      ctx.beginPath()
      ctx.moveTo(mx, headY + 10)
      ctx.lineTo(mx + MUSES.armPointXOffset - Math.sin(armAngle) * MUSES.armPointSwingX, headY + MUSES.armPointYOffset + Math.cos(armAngle) * MUSES.armPointSwingY)
      ctx.stroke()

      // Other arm (on hip or gesturing)
      ctx.beginPath()
      ctx.moveTo(mx, headY + 10)
      ctx.lineTo(mx + MUSES.armOtherXOffset, groundY + MUSES.armOtherYOffset + bounce)
      ctx.stroke()

      // Legs
      ctx.beginPath()
      ctx.moveTo(mx, groundY + MUSES.bodyYOffsetFoot)
      ctx.lineTo(mx - MUSES.legXOffset, groundY + MUSES.legYOffset)
      ctx.moveTo(mx, groundY + MUSES.bodyYOffsetFoot)
      ctx.lineTo(mx + MUSES.legXOffset, groundY + MUSES.legYOffset)
      ctx.stroke()

      // Laughing mouth (open)
      const mouthOpen = Math.abs(Math.sin(laugh * MUSES.laughAmpMult + i)) * 3
      ctx.beginPath()
      ctx.arc(mx, headY + MUSES.mouthRadius, MUSES.mouthRadius, 0, Math.PI)
      ctx.stroke()
      if (mouthOpen > 1) {
        ctx.fillStyle = COLORS.black
        ctx.beginPath()
        ctx.ellipse(mx, headY + MUSES.mouthRadius, MUSES.mouthRadius, mouthOpen * MUSES.mouthFillHeightScale, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // "HA HA HA" text drawn in drawLandmarkBubbles for top Z-order

    // Label
    ctx.fillStyle = COLORS.uiDimmer
    ctx.font = FONTS.sm
    ctx.fillText('The Muses', screenX + MUSES.labelX, groundY + MUSES.labelY)
  }
  function drawLandmarks(width: number, height: number) {
    if (!getCtx()) return

    world.obstacles.forEach(obstacle => {
      const screenX = obstacle.worldX - world.worldScrollX
      // Wider culling for stray_dog since it runs far from its origin
      const cullMargin = obstacle.type === 'stray_dog' ? STRAY_DOG_CULL_MARGIN : DEFAULT_CULL_MARGIN
      if (screenX < -cullMargin || screenX > width + cullMargin) return

      const groundY = hillY(screenX, height)

      switch (obstacle.type) {
        case 'souvlaki':
          drawSouvlaki(screenX, groundY)
          break
        case 'sign':
          drawSign(screenX, groundY, obstacle.worldX)
          break
        case 'bench':
          drawBench(screenX, groundY)
          break
        case 'rock':
          drawRock(screenX, groundY)
          break
        case 'stray_dog':
          drawStrayDog(screenX, groundY, obstacle)
          break
        case 'campfire':
          drawCampfire(screenX, groundY, obstacle)
          break
        case 'sasquatch':
          drawSasquatch(screenX, groundY, obstacle)
          break
        case 'ancient_ruins':
          drawAncientRuins(screenX, groundY)
          break
        case 'philosopher':
          drawPhilosopher(screenX, groundY, obstacle)
          break
        case 'mountain_goat':
          drawMountainGoat(screenX, groundY, obstacle)
          break
        case 'avalanche_warning':
          drawAvalancheWarning(screenX, groundY, obstacle)
          break
        case 'the_muses':
          drawTheMuses(screenX, groundY, obstacle)
          break
        // attack_birds, storm_cloud, alien_laser drawn in overlay
      }
    })
  }
  function drawOverlayObstacles(width: number, height: number) {
    const ctx = getCtx()
    if (!ctx) return

    world.obstacles.forEach(obstacle => {
      const screenX = obstacle.worldX - world.worldScrollX
      if (screenX < OVERLAY_CULL.xMin || screenX > width - OVERLAY_CULL.xMin) return

      const groundY = hillY(screenX, height)
      const s = obstacle.state

      switch (obstacle.type) {
        case 'attack_birds': {
          if (!s.triggered || s.triggerComplete || !s.attackBirds) break
          ctx.strokeStyle = COLORS.stickFigure
          ctx.lineWidth = ATTACK_BIRDS_RENDER.lineWidth
          for (const bird of s.attackBirds) {
            const bx = screenX + bird.x
            const by = groundY + bird.y
            const flapY = Math.sin(bird.phase) * ATTACK_BIRDS_RENDER.flapAmp
            ctx.beginPath()
            ctx.moveTo(bx + ATTACK_BIRDS_RENDER.wingXMin, by + flapY)
            ctx.lineTo(bx, by)
            ctx.lineTo(bx + ATTACK_BIRDS_RENDER.wingXMax, by + flapY)
            ctx.stroke()
          }
          // Droppings
          if (s.attackBirdDroppings) {
            for (const drop of s.attackBirdDroppings) {
              const dx = screenX + drop.x
              const dy = groundY + drop.y
              if (!drop.landed) {
                // Falling dropping — white ellipse
                ctx.fillStyle = '#eee'
                ctx.beginPath()
                ctx.ellipse(dx, dy, ATTACK_BIRDS_RENDER.droppingW, ATTACK_BIRDS_RENDER.droppingH, 0, 0, Math.PI * 2)
                ctx.fill()
              } else {
                // Landed splat
                ctx.fillStyle = '#ddd'
                ctx.beginPath()
                ctx.ellipse(dx, dy, ATTACK_BIRDS_RENDER.droppingW + 1, 2, 0, 0, Math.PI * 2)
                ctx.fill()
                // Splat star effect
                if (drop.splatTimer > 0) {
                  const splatAlpha = drop.splatTimer / ATTACK_BIRDS_RENDER.splatDuration
                  ctx.strokeStyle = `rgba(220, 220, 220, ${splatAlpha})`
                  ctx.lineWidth = 1
                  const r = ATTACK_BIRDS_RENDER.splatRadius * (1 - drop.splatTimer / ATTACK_BIRDS_RENDER.splatDuration + 0.5)
                  for (let a = 0; a < 6; a++) {
                    const angle = (a / 6) * Math.PI * 2
                    ctx.beginPath()
                    ctx.moveTo(dx, dy)
                    ctx.lineTo(dx + Math.cos(angle) * r, dy + Math.sin(angle) * r * 0.5)
                    ctx.stroke()
                  }
                }
              }
            }
          }
          // Squawk text and bubbles drawn in drawLandmarkBubbles for top Z-order
          break
        }
        case 'storm_cloud': {
          if (!s.triggered || s.triggerComplete) break

          const cloudOffsetX = s.stormCloudX || 0
          const cloudHeight = s.stormCloudY || 0
          const cloudCenterX = screenX + cloudOffsetX
          const cloudCenterY = groundY - cloudHeight

          // Dark cloud (larger, more menacing)
          ctx.fillStyle = COLORS.stormCloud
          ctx.beginPath()
          ctx.arc(cloudCenterX, cloudCenterY, 45, 0, Math.PI * 2)
          ctx.arc(cloudCenterX - 35, cloudCenterY + 8, 32, 0, Math.PI * 2)
          ctx.arc(cloudCenterX + 40, cloudCenterY + 5, 35, 0, Math.PI * 2)
          ctx.arc(cloudCenterX - 15, cloudCenterY - 20, 28, 0, Math.PI * 2)
          ctx.arc(cloudCenterX + 18, cloudCenterY - 18, 30, 0, Math.PI * 2)
          ctx.fill()

          // Rain (only during active phase)
          if (s.stormPhase === 'active' && s.raindrops) {
            ctx.strokeStyle = COLORS.rainBlue
            ctx.lineWidth = STORM.rainLineWidth
            for (const drop of s.raindrops) {
              ctx.beginPath()
              ctx.moveTo(cloudCenterX + drop.x, groundY + drop.y)
              ctx.lineTo(cloudCenterX + drop.x - 1, groundY + drop.y + STORM.rainDropLength)
              ctx.stroke()
            }
          }
          // Drain remaining rain during departure
          if (s.stormPhase === 'departing' && s.raindrops) {
            ctx.strokeStyle = COLORS.rainBlue
            ctx.lineWidth = STORM.rainLineWidth
            for (const drop of s.raindrops) {
              ctx.beginPath()
              ctx.moveTo(cloudCenterX + drop.x, groundY + drop.y)
              ctx.lineTo(cloudCenterX + drop.x - 1, groundY + drop.y + STORM.rainDropLength)
              ctx.stroke()
            }
          }

          // Lightning
          if (s.lightningFlash && s.lightningFlash > 0) {
            ctx.strokeStyle = `rgba(255, 255, 200, ${s.lightningFlash})`
            ctx.lineWidth = STORM.lightningLineWidth
            ctx.beginPath()
            const lx = cloudCenterX + (Math.random() - STORM.lightningRandomScale) * 30
            ctx.moveTo(lx, cloudCenterY + 30)
            ctx.lineTo(lx - 10, cloudCenterY + 80)
            ctx.lineTo(lx + 5, cloudCenterY + 90)
            ctx.lineTo(lx - 8, groundY - 5)
            ctx.stroke()

            // Screen flash
            ctx.fillStyle = `rgba(255, 255, 255, ${s.lightningFlash * STORM.flashAlphaScale})`
            ctx.fillRect(0, 0, width, height)
          }

          // Storm thought bubble drawn in drawLandmarkBubbles for top Z-order
          break
        }
        case 'alien_laser': {
          if (!s.triggered || s.triggerComplete) break

          const ufoY = s.ufoY || OBSTACLE_BEHAVIOR.ufoDefaultY
          const ufoOffsetX = s.ufoX || 0
          const ufoScreenX = screenX + ufoOffsetX

          // UFO body
          ctx.fillStyle = COLORS.ufoBody
          ctx.beginPath()
          ctx.ellipse(ufoScreenX, groundY - ufoY, ALIEN.ufoBodyW, ALIEN.ufoBodyH, 0, 0, Math.PI * 2)
          ctx.fill()

          // UFO dome
          ctx.fillStyle = COLORS.ufoDome
          ctx.beginPath()
          ctx.ellipse(ufoScreenX, groundY - ufoY - ALIEN.ufoDomeY, ALIEN.ufoDomeW, ALIEN.ufoDomeH, 0, Math.PI, 0)
          ctx.fill()

          // Rotating lights
          ctx.fillStyle = COLORS.ufoLights
          for (let i = 0; i < ALIEN.lightCount; i++) {
            const angle = (i / ALIEN.lightCount) * Math.PI + s.animTimer * ALIEN.lightRotSpeed
            ctx.beginPath()
            ctx.arc(ufoScreenX + Math.cos(angle) * ALIEN.lightCircleRadius, groundY - ufoY + ALIEN.lightY, ALIEN.lightRadius, 0, Math.PI * 2)
            ctx.fill()
          }

          // Laser beam (only during active phase)
          if (s.laserActive && s.ufoPhase === 'active') {
            const laserAngle = s.laserAngle || 0
            const sweepX = Math.sin(laserAngle) * ALIEN.laserSweepDist
            ctx.save()
            ctx.strokeStyle = COLORS.laserGreen
            ctx.lineWidth = ALIEN.laserLineWidth
            ctx.shadowColor = COLORS.ufoLights
            ctx.shadowBlur = ALIEN.laserShadowBlur
            ctx.beginPath()
            ctx.moveTo(ufoScreenX, groundY - ufoY + ALIEN.laserBeamYOffset)
            ctx.lineTo(ufoScreenX + sweepX, groundY)
            ctx.stroke()

            // Ground impact glow
            const impactGlow = ctx.createRadialGradient(ufoScreenX + sweepX, groundY, 0, ufoScreenX + sweepX, groundY, ALIEN.impactGlowRadius)
            impactGlow.addColorStop(0, COLORS.laserImpactInner)
            impactGlow.addColorStop(1, COLORS.laserImpactOuter)
            ctx.fillStyle = impactGlow
            ctx.beginPath()
            ctx.arc(ufoScreenX + sweepX, groundY, ALIEN.impactGlowRadius, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
          }
          break
        }
      }
    })
  }

  /** Draws all landmark text, thought bubbles, and speech bubbles at top Z-order */
  function drawLandmarkBubbles(width: number, height: number) {
    const ctx = getCtx()
    if (!ctx) return

    world.obstacles.forEach(obstacle => {
      const screenX = obstacle.worldX - world.worldScrollX
      const cullMargin = obstacle.type === 'stray_dog' ? STRAY_DOG_CULL_MARGIN : DEFAULT_CULL_MARGIN
      if (screenX < -cullMargin || screenX > width + cullMargin) return

      const groundY = hillY(screenX, height)
      const s = obstacle.state

      switch (obstacle.type) {
        case 'stray_dog': {
          const dogOffsetX = s.dogX || 0
          const x = screenX + dogOffsetX
          const fled = s.dogFled
          if (fled && Math.abs(dogOffsetX) > STRAY_DOG.fledCullDist) break
          const canvas = gameCanvas.value
          const dogGroundY = (canvas && dogOffsetX !== 0) ? hillY(x, canvas.height) : groundY
          if (!fled && s.dogBarkTimer !== undefined && s.dogBarkTimer < STRAY_DOG.barkThreshold) {
            ctx.fillStyle = COLORS.stickFigure
            ctx.font = FONTS.base
            ctx.fillText('WOOF!', x + 5, dogGroundY + STRAY_DOG.barkTextY)
          }
          break
        }
        case 'philosopher': {
          const headX = screenX
          const headY = groundY + PHILOSOPHER.headY
          const idx = (s.thoughtIndex || 0) % philosopherThoughts.length
          const fadePhase = (s.thoughtTimer || 0) % TIMING.philosopherThoughtCycle
          let alpha = 1
          if (fadePhase < PHILOSOPHER.thoughtFadeIn) alpha = fadePhase * 2
          else if (fadePhase > PHILOSOPHER.thoughtFadeOutStart) alpha = (PHILOSOPHER.thoughtFadeOutDuration - fadePhase) * 2
          drawBubble(headX, headY, philosopherThoughts[idx], 'thought', {
            alpha: alpha * PHILOSOPHER.thoughtAlpha, font: FONTS.sm, maxWidth: PHILOSOPHER.thoughtMaxWidth, offsetX: 15, offsetY: PHILOSOPHER.thoughtYOffset
          })
          break
        }
        case 'the_muses': {
          const laugh = s.laughPhase || 0
          const haAlpha = (Math.sin(laugh * MUSES.laughTextAlphaSineScale) + 1) * MUSES.laughTextAlphaOffset + MUSES.laughTextAlphaMin
          ctx.fillStyle = COLORS.stickFigure
          ctx.globalAlpha = haAlpha
          ctx.font = FONTS.sm
          const haY = groundY - 50 + Math.sin(laugh * MUSES.laughTextFloatFreq) * MUSES.laughTextFloatAmp
          ctx.fillText('HA HA HA!', screenX + MUSES.laughTextXOffset, haY)
          ctx.globalAlpha = 1
          break
        }
        case 'attack_birds': {
          if (!s.triggered || s.triggerComplete) break
          // Per-bird squawk text
          if (s.attackBirds) {
            ctx.fillStyle = COLORS.stickFigure
            ctx.font = FONTS.sm
            for (const bird of s.attackBirds) {
              if (bird.squawking > 0) {
                const bx = screenX + bird.x
                const by = groundY + bird.y
                ctx.globalAlpha = Math.min(1, bird.squawking / ATTACK_BIRDS_RENDER.squawkTextDuration * 2)
                ctx.fillText('SQUAWK!', bx + ATTACK_BIRDS_RENDER.squawkTextXOffset, by + ATTACK_BIRDS_RENDER.squawkTextYOffset)
              }
            }
            ctx.globalAlpha = 1
          }
          // Sisyphus speech bubble
          if (s.attackBirdSisExclaimed && (s.triggerTimer || 0) < ATTACK_BIRDS_RENDER.shitStart) {
            const sisScreenX = world.boulderDistance - world.worldScrollX
            const sisGroundY = hillY(sisScreenX, height)
            drawBubble(sisScreenX, sisGroundY - 50, attackBirdsSisExclamation, 'speech', {
              font: FONTS.sm, maxWidth: 150, offsetX: ATTACK_BIRDS_RENDER.sisBubbleXOffset, offsetY: ATTACK_BIRDS_RENDER.sisBubbleYOffset,
            })
          }
          // Boulder thought bubble
          if (s.attackBirdBoulderThought && (s.triggerTimer || 0) < TIMING.attackBirdsDuration - 0.5) {
            const boulderScreenX = world.boulderDistance - world.worldScrollX
            const boulderGroundY = hillY(boulderScreenX, height)
            drawBubble(boulderScreenX, boulderGroundY - 30, attackBirdsBoulderThought, 'thought', {
              font: FONTS.sm, maxWidth: 160, offsetX: ATTACK_BIRDS_RENDER.boulderBubbleXOffset, offsetY: ATTACK_BIRDS_RENDER.boulderBubbleYOffset,
            })
          }
          break
        }
        case 'storm_cloud': {
          if (!s.triggered || s.triggerComplete) break
          if (s.stormPhase === 'active' && s.stormThoughtTimer !== undefined) {
            const thoughtIdx = (s.stormThoughtIndex || 0) % stormThoughts.length
            const thoughtText = stormThoughts[thoughtIdx]
            const timeSinceSwitch = TIMING.stormThoughtInterval - (s.stormThoughtTimer || 0)
            let alpha = 1
            if (timeSinceSwitch < PHILOSOPHER.thoughtFadeIn) alpha = timeSinceSwitch * 2
            else if ((s.stormThoughtTimer || 0) < PHILOSOPHER.thoughtFadeIn) alpha = (s.stormThoughtTimer || 0) * 2
            drawBubble(screenX, groundY - 30, thoughtText, 'thought', {
              alpha: alpha * 0.9, font: FONTS.sm, maxWidth: 160, offsetX: 25, offsetY: -20
            })
          }
          break
        }
      }
    })
  }

  return {
    drawLandmarks,
    drawOverlayObstacles,
    drawLandmarkBubbles,
  }
}
