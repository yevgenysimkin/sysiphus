import type { Ref } from 'vue'
import type { GameState } from './useGameState'
import type { Bird, Cloud, Tree, GrassTuft, Obstacle, SmokeParticle, AttackBird, Raindrop, FallingRock } from './useGameState'
import { PEAK_DISTANCE, LEVEL_DISTANCES, LEVEL_ANGLES, GROUND_SCREEN_Y_OFFSET } from './usePhysics'
import { createObstacleRenderer } from './useRenderer-obstacles'
import { createCharacterRenderer } from './useRenderer-character'
import { drawParallaxBackground as drawParallaxBg } from './useRenderer-background'
import { COLORS, FONTS, TIMING, BUBBLE_DEFAULTS, fontSizePx } from '~/game/constants'
import {
  SKY, STARS, MOON, PINE, OAK, DEAD_TREE_SHAPE, GRASS_RENDER, CLOUD_SHAPE,
  HILL_RENDER, TREE_CULL_DISTANCE, PROMETHEUS, SPACESHIP, ENV_BIRD, LOU_BIRD, GARY_BIRD,
  IDLE_BUBBLES,
} from '~/game/constants-rendering'

interface BubbleOptions {
  alpha?: number
  font?: string
  maxWidth?: number
  offsetX?: number
  offsetY?: number
}

interface RendererDeps {
  gameCanvas: Ref<HTMLCanvasElement | null>
  gameState: Ref<GameState>
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
    birds: Bird[]
    clouds: Cloud[]
    trees: Tree[]
    grass: GrassTuft[]
    obstacles: Obstacle[]
    prometheusDistance: number
    prometheusGreeted: boolean
    prometheusActiveExchange: { speaker: string; text: string; timer: number; fadeIn: number } | null
    spaceshipX: number
    spaceshipY: number
    spaceshipActive: boolean
    spaceshipTimer: number
    flatIdleTime: number
    isIdle: boolean
    swatPhase: number
    idleBird: { x: number; y: number; phase: number; swoopPhase: number; targetX: number; flyingAway: boolean; flyAwayX: number; flyAwayY: number } | null
    garyBird: { x: number; y: number; phase: number; landed: boolean; flyingAway: boolean; flyAwayX: number; flyAwayY: number; thought: string; thoughtTimer: number } | null
    idleDialogue: { exchanges: { speaker: string; text: string }[]; currentIndex: number; timer: number; pauseTimer: number } | null
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
  continueFromPeak: Ref<boolean>
  getHillYAtScreenX: (screenX: number, canvasHeight: number, worldScrollX: number, boulderDistance: number) => number
  getHeightAtWorldDistance: (worldDist: number) => number
  getAngleAtDistance: (dist: number) => number
}

export function useRenderer(deps: RendererDeps) {
  const { gameCanvas, gameState, world, continueFromPeak, getHillYAtScreenX, getHeightAtWorldDistance, getAngleAtDistance } = deps
  let ctx: CanvasRenderingContext2D | null = null

  function initCanvas() {
    const canvas = gameCanvas.value
    if (canvas) {
      ctx = canvas.getContext('2d')
      resizeCanvas()
    }
  }

  function resizeCanvas() {
    const canvas = gameCanvas.value
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }

  // Helper to get hill Y using current world state
  function hillY(screenX: number, height: number): number {
    return getHillYAtScreenX(screenX, height, world.worldScrollX, world.boulderDistance)
  }

  function drawBubble(
    speakerX: number,
    speakerY: number,
    text: string,
    type: 'speech' | 'thought',
    options?: BubbleOptions
  ) {
    if (!ctx) return
    const canvas = gameCanvas.value
    if (!canvas) return

    const alpha = options?.alpha ?? 1
    const font = options?.font ?? FONTS.md
    const maxWidth = options?.maxWidth ?? BUBBLE_DEFAULTS.maxWidth
    const offsetX = options?.offsetX ?? BUBBLE_DEFAULTS.offsetX
    const offsetY = options?.offsetY ?? BUBBLE_DEFAULTS.offsetY
    const padding = BUBBLE_DEFAULTS.padding
    const edgeMargin = BUBBLE_DEFAULTS.edgeMargin

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.font = font

    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''
    for (const word of words) {
      const testLine = currentLine + word + ' '
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine.trim())
        currentLine = word + ' '
      } else {
        currentLine = testLine
      }
    }
    lines.push(currentLine.trim())

    const lineHeight = fontSizePx(font) + BUBBLE_DEFAULTS.lineHeightPadding
    const bubbleWidth = Math.min(maxWidth + padding * 2 + 4, Math.max(...lines.map(l => ctx!.measureText(l).width)) + padding * 2 + 4)
    const bubbleHeight = lines.length * lineHeight + padding * 2

    let bubbleX = speakerX + offsetX
    let bubbleY = speakerY + offsetY - bubbleHeight

    if (bubbleX + bubbleWidth > canvas.width - edgeMargin) {
      bubbleX = canvas.width - bubbleWidth - edgeMargin
    }
    if (bubbleX < edgeMargin) bubbleX = edgeMargin
    if (bubbleY < edgeMargin) bubbleY = edgeMargin
    if (bubbleY + bubbleHeight > canvas.height - edgeMargin) {
      bubbleY = canvas.height - bubbleHeight - edgeMargin
    }

    const B = BUBBLE_DEFAULTS
    ctx.fillStyle = COLORS.bubbleFill
    ctx.strokeStyle = COLORS.bubbleStroke
    ctx.lineWidth = B.strokeWidth
    ctx.beginPath()
    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, type === 'thought' ? B.thoughtRadius : B.speechRadius)
    ctx.fill()
    ctx.stroke()

    if (type === 'speech') {
      const tailBaseX = Math.max(bubbleX + B.tailInset, Math.min(bubbleX + bubbleWidth - B.tailInset, speakerX + offsetX))
      const tailBaseY = bubbleY + bubbleHeight
      ctx.fillStyle = COLORS.bubbleFill
      ctx.beginPath()
      ctx.moveTo(tailBaseX - B.tailHalfWidth, tailBaseY - B.tailGap)
      ctx.lineTo(speakerX + B.tailSpeakerOffset, speakerY - B.tailSpeakerOffset)
      ctx.lineTo(tailBaseX + B.tailHalfWidth, tailBaseY - B.tailGap)
      ctx.fill()
      ctx.strokeStyle = COLORS.bubbleStroke
      ctx.beginPath()
      ctx.moveTo(tailBaseX - B.tailHalfWidth, tailBaseY)
      ctx.lineTo(speakerX + B.tailSpeakerOffset, speakerY - B.tailSpeakerOffset)
      ctx.lineTo(tailBaseX + B.tailHalfWidth, tailBaseY)
      ctx.stroke()
    } else {
      const dotStartX = bubbleX + B.dotStartOffset
      const dotStartY = bubbleY + bubbleHeight + B.dotStartOffset
      const dx = speakerX - dotStartX
      const dy = speakerY - dotStartY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const ux = dx / (dist || 1)
      const uy = dy / (dist || 1)

      ctx.fillStyle = COLORS.bubbleFill
      ctx.strokeStyle = COLORS.bubbleStroke
      ctx.beginPath()
      ctx.arc(dotStartX + ux * B.dotNearDist, dotStartY + uy * B.dotNearDist, B.dotNearRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(dotStartX + ux * B.dotFarDist, dotStartY + uy * B.dotFarDist, B.dotFarRadius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }

    ctx.fillStyle = COLORS.textBlack
    lines.forEach((line, i) => {
      ctx!.fillText(line, bubbleX + padding, bubbleY + padding + lineHeight * (i + B.textLineOffset))
    })

    ctx.restore()
  }

  // Create sub-renderers with shared deps
  const obstacleRenderer = createObstacleRenderer({
    ctx: () => ctx,
    gameCanvas,
    world,
    hillY,
    drawBubble,
  })

  const characterRenderer = createCharacterRenderer({
    ctx: () => ctx,
    gameCanvas,
    gameState,
    continueFromPeak,
    world,
    hillY,
    drawBubble,
    getAngleAtDistance,
  })

  function drawStars(width: number, height: number, altitude: number) {
    if (!ctx) return
    const altBrightness = Math.min(1, altitude / STARS.altitudeScale)
    const starCount = STARS.baseCount + Math.floor(altBrightness * STARS.altitudeBonus)
    ctx.fillStyle = COLORS.starFill
    for (let i = 0; i < starCount; i++) {
      const x = ((Math.sin(i * STARS.seedX) * 0.5 + 0.5) * width * 2 - world.worldScrollX * STARS.parallaxRate) % width
      const y = (Math.cos(i * STARS.seedY) * 0.5 + 0.5) * height * STARS.heightScale
      const twinkle = Math.sin(world.gameTime * STARS.twinkleFreq + i) * 0.5 + 0.5
      ctx.globalAlpha = (STARS.baseAlpha + altBrightness * STARS.altitudeAlphaBonus) + twinkle * (STARS.twinkleAlphaBase + altBrightness * STARS.twinkleAltitudeBonus)
      ctx.beginPath()
      ctx.arc(x, y, twinkle * STARS.sizeBase + STARS.sizeOffset + altBrightness * STARS.sizeAltitudeBonus, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  function drawMoon(width: number, height: number) {
    if (!ctx) return
    const moonX = width - MOON.xFromRight
    const moonY = MOON.y

    const glow = ctx.createRadialGradient(moonX, moonY, MOON.glowInnerRadius, moonX, moonY, MOON.glowOuterRadius)
    glow.addColorStop(0, COLORS.moonGradientInner)
    glow.addColorStop(1, COLORS.moonGradientOuter)
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(moonX, moonY, MOON.arcRadius, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = COLORS.moonGlow
    ctx.beginPath()
    ctx.arc(moonX, moonY, MOON.fillRadius, 0, Math.PI * 2)
    ctx.fill()
  }

  function drawParallaxBackground(width: number, height: number, altitude: number) {
    if (!ctx) return
    drawParallaxBg(ctx, world.worldScrollX, world.gameTime, getHeightAtWorldDistance, width, height, altitude)
  }

  function drawTrees(width: number, height: number, layer?: 'bg' | 'fg') {
    if (!ctx) return
    const c = ctx!

    world.trees.forEach(tree => {
      if (layer && tree.layer !== layer) return
      const screenX = tree.worldX - world.worldScrollX
      if (screenX < -TREE_CULL_DISTANCE || screenX > width + TREE_CULL_DISTANCE) return

      const groundY = hillY(screenX, height)
      const size = tree.size

      if (tree.type === 'pine') {
        // Textured trunk
        c.strokeStyle = COLORS.trunkBrown
        c.lineWidth = size * PINE.trunkWidth
        c.beginPath()
        c.moveTo(screenX, groundY)
        c.lineTo(screenX, groundY - size * PINE.trunkHeight)
        c.stroke()

        // Three layered canopy tiers
        c.fillStyle = COLORS.pineGreen
        for (let tier = 0; tier < PINE.tierCount; tier++) {
          const tierY = groundY - size * (PINE.tierYBase + tier * PINE.tierYStride)
          const tierW = size * (PINE.tierWidthBase - tier * PINE.tierWidthDecrement)
          const tierH = size * PINE.tierHeight
          c.beginPath()
          c.moveTo(screenX, tierY - tierH)
          c.lineTo(screenX - tierW, tierY)
          c.lineTo(screenX + tierW, tierY)
          c.closePath()
          c.fill()
        }

        // Highlight edges
        c.strokeStyle = COLORS.pineHighlight
        c.lineWidth = PINE.highlightWidth
        for (let tier = 0; tier < PINE.tierCount; tier++) {
          const tierY = groundY - size * (PINE.tierYBase + tier * PINE.tierYStride)
          const tierW = size * (PINE.tierWidthBase - tier * PINE.tierWidthDecrement)
          const tierH = size * PINE.tierHeight
          c.beginPath()
          c.moveTo(screenX, tierY - tierH)
          c.lineTo(screenX - tierW, tierY)
          c.lineTo(screenX + tierW, tierY)
          c.closePath()
          c.stroke()
        }
      } else if (tree.type === 'oak') {
        // Thick trunk with bark texture
        c.strokeStyle = COLORS.trunkBrown
        c.lineWidth = size * OAK.trunkWidth
        c.beginPath()
        c.moveTo(screenX, groundY)
        c.lineTo(screenX, groundY - size * OAK.trunkHeight)
        c.stroke()

        // Main branches
        c.lineWidth = size * OAK.branchWidth
        c.beginPath()
        c.moveTo(screenX, groundY - size * OAK.branchY)
        c.lineTo(screenX - size * OAK.branchLeftX, groundY - size * OAK.branchLeftY)
        c.moveTo(screenX, groundY - size * OAK.branchY)
        c.lineTo(screenX + size * OAK.branchRightX, groundY - size * OAK.branchRightY)
        c.stroke()

        // Layered canopy (multiple overlapping circles)
        c.fillStyle = COLORS.oakGreen
        const cx = screenX
        const cy = groundY - size * OAK.canopyY
        const r = size * OAK.canopyRadius
        c.beginPath()
        c.arc(cx - r * OAK.canopyLeftX, cy + r * OAK.canopyLeftY, r * OAK.canopyLeftRadius, 0, Math.PI * 2)
        c.fill()
        c.beginPath()
        c.arc(cx + r * OAK.canopyRightX, cy + r * OAK.canopyRightY, r * OAK.canopyRightRadius, 0, Math.PI * 2)
        c.fill()
        c.beginPath()
        c.arc(cx, cy - r * OAK.canopyCenterY, r * OAK.canopyCenterRadius, 0, Math.PI * 2)
        c.fill()
        // Lighter highlight
        c.fillStyle = COLORS.grassGreen
        c.beginPath()
        c.arc(cx + r * OAK.highlightX, cy - r * OAK.highlightY, r * OAK.highlightRadius, 0, Math.PI * 2)
        c.fill()
      } else {
        // Dead tree — gnarled trunk with multiple branches
        c.strokeStyle = COLORS.deadBranch
        c.lineWidth = size * DEAD_TREE_SHAPE.trunkWidth
        c.beginPath()
        c.moveTo(screenX, groundY)
        c.lineTo(screenX + size * DEAD_TREE_SHAPE.trunk[1][0], groundY - size * Math.abs(DEAD_TREE_SHAPE.trunk[1][1]))
        c.lineTo(screenX + size * DEAD_TREE_SHAPE.trunk[2][0], groundY - size * Math.abs(DEAD_TREE_SHAPE.trunk[2][1]))
        c.stroke()

        // Branches
        c.lineWidth = size * DEAD_TREE_SHAPE.branchWidth
        c.beginPath()
        for (const branch of DEAD_TREE_SHAPE.branches) {
          c.moveTo(screenX + size * branch[0][0], groundY + size * branch[0][1])
          for (let i = 1; i < branch.length; i++) {
            c.lineTo(screenX + size * branch[i][0], groundY + size * branch[i][1])
          }
        }
        c.stroke()
      }
    })
  }

  function drawGrass(width: number, height: number) {
    if (!ctx) return
    ctx.strokeStyle = COLORS.grassGreen
    ctx.lineWidth = GRASS_RENDER.lineWidth

    world.grass.forEach(tuft => {
      const screenX = tuft.worldX - world.worldScrollX
      if (screenX < -20 || screenX > width + 20) return

      const groundY = hillY(screenX, height)
      const sway = Math.sin(world.gameTime * GRASS_RENDER.swaySpeed + tuft.worldX * GRASS_RENDER.swayWorldScale) * GRASS_RENDER.swayAmp

      for (let i = 0; i < tuft.blades; i++) {
        const bladeX = screenX + (i - tuft.blades / 2) * GRASS_RENDER.bladeSpacing
        ctx!.beginPath()
        ctx!.moveTo(bladeX, groundY)
        ctx!.quadraticCurveTo(
          bladeX + sway,
          groundY - tuft.height * GRASS_RENDER.curveY,
          bladeX + sway * GRASS_RENDER.swayCurveMult,
          groundY - tuft.height
        )
        ctx!.stroke()
      }
    })
  }

  function drawClouds(width: number) {
    if (!ctx) return
    ctx.fillStyle = COLORS.cloudFill
    world.clouds.forEach(cloud => {
      const x = ((cloud.x - world.worldScrollX * CLOUD_SHAPE.parallax) % (width + CLOUD_SHAPE.wrapOffset))
      ctx!.beginPath()
      ctx!.arc(x, cloud.y, cloud.size * CLOUD_SHAPE.size1, 0, Math.PI * 2)
      ctx!.arc(x + cloud.size * CLOUD_SHAPE.xOffset2, cloud.y - cloud.size * CLOUD_SHAPE.yOffset2, cloud.size * CLOUD_SHAPE.size2, 0, Math.PI * 2)
      ctx!.arc(x + cloud.size * CLOUD_SHAPE.xOffset3, cloud.y, cloud.size * CLOUD_SHAPE.size3, 0, Math.PI * 2)
      ctx!.fill()
    })
  }

  function drawHill(width: number, height: number) {
    if (!ctx) return

    const peakScreenX = PEAK_DISTANCE - world.worldScrollX
    const drawRightEdge = width + HILL_RENDER.rightEdgeExtension

    ctx.fillStyle = COLORS.hillFill
    ctx.beginPath()
    ctx.moveTo(0, hillY(0, height))
    for (let x = 0; x <= drawRightEdge; x += HILL_RENDER.stepSize) {
      ctx.lineTo(x, hillY(x, height))
    }
    ctx.lineTo(drawRightEdge, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = COLORS.hillStroke
    ctx.lineWidth = HILL_RENDER.strokeWidth
    ctx.beginPath()
    ctx.moveTo(0, hillY(0, height))
    for (let x = 0; x <= drawRightEdge; x += HILL_RENDER.stepSize) {
      ctx.lineTo(x, hillY(x, height))
    }
    ctx.stroke()

    ctx.strokeStyle = COLORS.levelMarker
    ctx.lineWidth = HILL_RENDER.markerWidth
    for (let level = 2; level <= 6; level++) {
      const markerWorldX = LEVEL_DISTANCES[level - 1]
      // Draw on both sides of the peak
      const positions = [markerWorldX, 2 * PEAK_DISTANCE - markerWorldX]
      for (const wx of positions) {
        const screenX = wx - world.worldScrollX
        if (screenX > 0 && screenX < width) {
          const y = hillY(screenX, height)
          ctx.beginPath()
          ctx.moveTo(screenX, y)
          ctx.lineTo(screenX, y - HILL_RENDER.markerHeight)
          ctx.stroke()

          ctx.fillStyle = COLORS.levelMarker
          ctx.font = FONTS.base
          ctx.fillText(`L${level}`, screenX - HILL_RENDER.levelTextXOffset, y - HILL_RENDER.levelTextYOffset)
        }
      }
    }

    if (peakScreenX > 0 && peakScreenX < width) {
      ctx.fillStyle = COLORS.peakGold
      ctx.beginPath()
      ctx.moveTo(peakScreenX, hillY(peakScreenX, height) - HILL_RENDER.peakMarkerHeight)
      ctx.lineTo(peakScreenX - HILL_RENDER.peakMarkerLeftX, hillY(peakScreenX, height) + HILL_RENDER.peakMarkerY)
      ctx.lineTo(peakScreenX + HILL_RENDER.peakMarkerRightX, hillY(peakScreenX, height) + HILL_RENDER.peakMarkerY)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = COLORS.peakGold
      ctx.font = FONTS.lg
      ctx.fillText('PEAK', peakScreenX - HILL_RENDER.peakTextXOffset, hillY(peakScreenX, height) - HILL_RENDER.peakTextYOffset)
    }
  }

  function drawPrometheus(width: number, height: number) {
    if (!ctx) return
    const P = PROMETHEUS
    const screenX = world.prometheusDistance - world.worldScrollX
    if (screenX < -100 || screenX > width + 150) return

    const groundY = hillY(screenX, height)

    const embedX = screenX + P.embedX
    const embedY = groundY + P.embedY
    const scale = P.scale

    // Rock (organic bezier shape)
    ctx.fillStyle = COLORS.rockFill
    ctx.beginPath()
    ctx.moveTo(embedX + P.rock.leftX * scale, groundY + 5)
    ctx.bezierCurveTo(
      embedX + P.rock.topBezLeftX * scale, groundY + P.rock.topBezLeftY,
      embedX + P.rock.topPeakX * scale, groundY + P.rock.topPeakY,
      embedX + P.rock.rightX * scale, groundY + P.rock.rightY
    )
    ctx.bezierCurveTo(
      embedX + P.rock.rightBezX * scale, groundY,
      embedX + P.rock.bodyRightX * scale, embedY + P.rock.bodyRightY * scale,
      embedX + P.rock.bottomRightX * scale, embedY + P.rock.bottomRightY * scale
    )
    ctx.bezierCurveTo(
      embedX + P.rock.bottomMidX * scale, embedY + P.rock.bottomMidY * scale,
      embedX + P.rock.bottomLeftX * scale, embedY + P.rock.bottomLeftY * scale,
      embedX + P.rock.leftX * scale, groundY + 5
    )
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = COLORS.rockStroke
    ctx.lineWidth = 1
    ctx.stroke()

    // Prometheus figure
    ctx.strokeStyle = COLORS.stickFigure
    ctx.lineWidth = P.lineWidth

    // Head
    ctx.beginPath()
    ctx.arc(embedX, embedY + P.headY * scale, P.headRadius * scale, 0, Math.PI * 2)
    ctx.stroke()

    // Body
    ctx.beginPath()
    ctx.moveTo(embedX, embedY + P.bodyTopY * scale)
    ctx.lineTo(embedX, embedY + P.bodyBottomY * scale)
    ctx.stroke()

    // Arms
    ctx.beginPath()
    ctx.moveTo(embedX - P.armX * scale, embedY)
    ctx.lineTo(embedX, embedY + P.armY * scale)
    ctx.lineTo(embedX + P.armX * scale, embedY)
    ctx.stroke()

    // Chains
    ctx.strokeStyle = COLORS.chainColor
    ctx.lineWidth = P.chainLineWidth
    ctx.setLineDash([P.chainDash, P.chainDash])
    ctx.beginPath()
    ctx.moveTo(embedX - P.chainStartX * scale, embedY)
    ctx.lineTo(embedX - P.chainEndX * scale, embedY - P.chainY)
    ctx.moveTo(embedX + P.chainStartX * scale, embedY)
    ctx.lineTo(embedX + P.chainEndX * scale, embedY - P.chainY)
    ctx.stroke()
    ctx.setLineDash([])

    // Legs
    ctx.strokeStyle = COLORS.stickFigure
    ctx.lineWidth = P.lineWidth
    ctx.beginPath()
    ctx.moveTo(embedX, embedY + P.bodyBottomY * scale)
    ctx.lineTo(embedX - P.legX * scale, embedY + P.legY * scale)
    ctx.moveTo(embedX, embedY + P.bodyBottomY * scale)
    ctx.lineTo(embedX + P.legX * scale, embedY + P.legY * scale)
    ctx.stroke()

    // Blood
    ctx.strokeStyle = COLORS.bloodRed
    ctx.lineWidth = P.bloodLineWidth
    const bloodDrip = (world.gameTime * P.bloodDripSpeed) % P.bloodDripCycle
    for (let i = 0; i < P.bloodDripCount; i++) {
      const startY = embedY + P.bloodDripYOffset * scale + i * P.bloodDripYSpacing
      const dripLength = P.bloodDripLengthBase + Math.sin(world.gameTime * P.bloodDripWaveSpeed + i) * P.bloodDripLengthAmp
      ctx.beginPath()
      ctx.moveTo(embedX - P.bloodXStride + i * P.bloodXStride, startY)
      ctx.quadraticCurveTo(
        embedX - P.bloodCurveXAmp + i * P.bloodXStride + Math.sin(world.gameTime + i) * P.bloodCurveXSpeed,
        startY + dripLength / 2,
        embedX - P.bloodXStride - 1 + i * P.bloodXStride,
        startY + dripLength + (bloodDrip + i * P.bloodCycleStride) % P.bloodBaseYOffset
      )
      ctx.stroke()
    }

    // Vulture
    const vultureBob = Math.sin(world.gameTime * P.vultureBobSpeed) * P.vultureBobAmp
    ctx.strokeStyle = COLORS.stickFigure
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(embedX + P.vultureBodyX * scale, embedY + P.vultureBodyY * scale + vultureBob, P.vultureBodyW * scale, P.vultureBodyH * scale, P.vultureBodyRot, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(embedX + P.vultureHeadX * scale, embedY + P.vultureHeadY * scale + vultureBob, P.vultureHeadR * scale, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(embedX + P.vultureBeakStartX * scale, embedY + P.vultureHeadY * scale + vultureBob)
    ctx.lineTo(embedX + P.vultureBeakEndX, embedY + P.vultureBeakY * scale + vultureBob)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(embedX + P.vultureWingLeftStartX * scale, embedY + P.vultureWingLeftStartY * scale + vultureBob)
    ctx.lineTo(embedX + P.vultureWingLeftBodyX * scale, embedY + P.vultureWingLeftBodyY * scale + vultureBob)
    ctx.lineTo(embedX + P.vultureWingLeftEndX * scale, embedY + P.vultureWingLeftEndY * scale + vultureBob)
    ctx.stroke()

    // Ouch text
    const ouchPhase = Math.floor(world.gameTime * 2) % P.ouchCycleLength
    ctx.fillStyle = COLORS.stickFigure
    ctx.font = FONTS.md
    const ouchAlpha = P.ouchAlphaBase + Math.sin(world.gameTime * P.ouchBlinkSpeed) * P.ouchAlphaVar
    ctx.globalAlpha = ouchAlpha
    ctx.fillText(P.ouchTexts[ouchPhase], embedX + P.ouchTextX, embedY - P.chainStartX * scale)
    ctx.globalAlpha = 1

    // Dialogue exchange
    if (world.prometheusActiveExchange) {
      const ex = world.prometheusActiveExchange
      const alpha = ex.timer < TIMING.prometheusExchangePause ? ex.timer * 2 : ex.fadeIn
      if (ex.speaker === 'prometheus') {
        drawBubble(embedX, embedY - 15 * scale, ex.text, 'speech', {
          alpha, font: FONTS.base, maxWidth: P.bubbleMaxWidth, offsetX: P.bubbleXOffset, offsetY: P.bubbleYOffset
        })
      } else {
        // Sisyphus speech — draw near the player position
        const playerScreenX = world.worldDistance - world.worldScrollX
        const playerY = hillY(playerScreenX, height) + P.playerBubbleYOffset
        drawBubble(playerScreenX, playerY, ex.text, 'speech', {
          alpha, font: FONTS.base, maxWidth: P.bubbleMaxWidth, offsetX: P.playerBubbleXOffset, offsetY: P.playerBubbleYOffset2
        })
      }
    }

    ctx.fillStyle = COLORS.uiDimmer
    ctx.font = FONTS.base
    ctx.fillText('Prometheus', screenX + P.labelX, groundY + P.labelY)
  }

  function drawSpaceship() {
    if (!ctx || !world.spaceshipActive) return
    const x = world.spaceshipX
    const y = world.spaceshipY
    const S = SPACESHIP

    ctx.fillStyle = COLORS.ufoBody
    ctx.beginPath()
    ctx.ellipse(x, y, S.bodyW, S.bodyH, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = COLORS.ufoDome
    ctx.beginPath()
    ctx.ellipse(x, y - S.domeY, S.domeW, S.domeH, 0, Math.PI, 0)
    ctx.fill()

    ctx.fillStyle = '#ff0'
    for (let i = 0; i < S.lightCount; i++) {
      const angle = (i / S.lightCount) * Math.PI + world.gameTime * S.lightRotSpeed
      ctx.beginPath()
      ctx.arc(x + Math.cos(angle) * S.lightCircleRadius, y + S.lightY, S.lightPointRadius, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  function drawBirds(width: number, height: number) {
    if (!ctx) return
    world.birds.forEach(bird => {
      const flapY = Math.sin(bird.flapPhase) * ENV_BIRD.flapAmp
      ctx!.strokeStyle = COLORS.stickFigure
      ctx!.lineWidth = ENV_BIRD.lineWidth
      ctx!.beginPath()
      ctx!.moveTo(bird.x - ENV_BIRD.wingSpan, bird.y + flapY)
      ctx!.lineTo(bird.x, bird.y)
      ctx!.lineTo(bird.x + ENV_BIRD.wingSpan, bird.y + flapY)
      ctx!.stroke()
    })

    // Idle harassment bird (Lou) — large, menacing
    if (world.idleBird) {
      const bird = world.idleBird
      const L = LOU_BIRD
      const groundY = hillY(bird.x, height)
      const birdY = groundY - L.groundOffset - bird.y

      ctx!.save()
      ctx!.translate(bird.x, birdY)

      ctx!.strokeStyle = COLORS.stickFigure
      ctx!.lineWidth = L.lineWidth
      const flapY = Math.sin(bird.swoopPhase * L.swoopFreqMult) * L.swoopAmp

      // Body
      ctx!.beginPath()
      ctx!.ellipse(0, 0, L.bodyW, L.bodyH, 0, 0, Math.PI * 2)
      ctx!.stroke()

      // Wings
      ctx!.lineWidth = L.wingLineWidth
      ctx!.beginPath()
      ctx!.moveTo(-L.wingStartX, 0)
      ctx!.quadraticCurveTo(-L.wingCurveX, flapY - L.wingFlapCurveY, -L.wingEndX, flapY - L.wingFlapEndY)
      ctx!.moveTo(L.wingStartX, 0)
      ctx!.quadraticCurveTo(L.wingCurveX, flapY - L.wingFlapCurveY, L.wingEndX, flapY - L.wingFlapEndY)
      ctx!.stroke()

      // Talons
      ctx!.strokeStyle = COLORS.talonColor
      ctx!.lineWidth = L.talonLineWidth
      ctx!.beginPath()
      ctx!.moveTo(-L.talonLeftStartX, 5)
      ctx!.lineTo(-L.talonLeftStartX - 1, L.talonLength)
      ctx!.lineTo(-L.talonSpread, L.talonBottomY)
      ctx!.moveTo(-L.talonLeftStartX - 1, L.talonLength)
      ctx!.lineTo(-L.talonLeftStartX + 1, L.talonBottomY + 1)
      ctx!.moveTo(L.talonLeftStartX, 5)
      ctx!.lineTo(L.talonLeftStartX + 1, L.talonLength)
      ctx!.lineTo(L.talonSpread, L.talonBottomY)
      ctx!.moveTo(L.talonLeftStartX + 1, L.talonLength)
      ctx!.lineTo(L.talonLeftStartX - 1, L.talonBottomY + 1)
      ctx!.stroke()

      // Beak — hooked
      ctx!.strokeStyle = COLORS.stickFigure
      ctx!.lineWidth = 2
      ctx!.beginPath()
      ctx!.moveTo(L.beakStartX, L.beakStartY)
      ctx!.lineTo(L.beakEndX, L.beakEndY)
      ctx!.lineTo(L.beakEndX - 2, L.beakBottomY)
      ctx!.stroke()

      // Angry eye
      ctx!.fillStyle = COLORS.stickFigure
      ctx!.beginPath()
      ctx!.arc(L.eyeX, L.eyeY, L.eyeRadius, 0, Math.PI * 2)
      ctx!.fill()
      ctx!.fillStyle = COLORS.black
      ctx!.beginPath()
      ctx!.arc(L.pupilX, L.pupilY, L.pupilRadius, 0, Math.PI * 2)
      ctx!.fill()

      ctx!.restore()

    }

    // Gary bird (second idle bird — lands near player)
    if (world.garyBird) {
      const gary = world.garyBird
      const G = GARY_BIRD
      const playerScreenX = world.worldDistance - world.worldScrollX
      const groundY = hillY(gary.x, height)
      const garyY = gary.landed ? groundY : (groundY - LOU_BIRD.groundOffset - gary.y)

      ctx!.save()
      ctx!.translate(gary.x, garyY)

      ctx!.strokeStyle = COLORS.stickFigure
      ctx!.lineWidth = G.lineWidth

      if (gary.landed && !gary.flyingAway) {
        // Standing bird on ground — body pointing right, wings folded
        ctx!.beginPath()
        ctx!.ellipse(0, G.landedBodyY, G.landedBodyW, G.landedBodyH, G.landedBodyRot, 0, Math.PI * 2)
        ctx!.stroke()
        // Head
        ctx!.beginPath()
        ctx!.arc(G.landedHeadX, G.landedHeadY, G.landedHeadR, 0, Math.PI * 2)
        ctx!.stroke()
        // Beak
        ctx!.beginPath()
        ctx!.moveTo(G.landedBeakStartX, G.landedBeakStartY)
        ctx!.lineTo(G.landedBeakEndX, G.landedBeakEndY)
        ctx!.lineTo(G.landedBeakStartX, G.landedBeakBottomY)
        ctx!.stroke()
        // Legs
        ctx!.strokeStyle = COLORS.talonColor
        ctx!.lineWidth = LOU_BIRD.talonLineWidth
        ctx!.beginPath()
        ctx!.moveTo(G.landedTalonLeftStartX, 0)
        ctx!.lineTo(G.landedTalonLeftX, G.landedTalonLength)
        ctx!.lineTo(-G.landedTalonSpread, G.landedTalonBottomY)
        ctx!.moveTo(G.landedTalonLeftX, G.landedTalonLength)
        ctx!.lineTo(-1, G.landedTalonBottomY)
        ctx!.moveTo(G.landedTalonRightStartX, 0)
        ctx!.lineTo(G.landedTalonRightX, G.landedTalonLength)
        ctx!.lineTo(G.landedTalonSpread - 4, G.landedTalonBottomY)
        ctx!.moveTo(G.landedTalonRightX, G.landedTalonLength)
        ctx!.lineTo(G.landedTalonSpread + 2, G.landedTalonBottomY)
        ctx!.stroke()
        // Eye
        ctx!.fillStyle = COLORS.stickFigure
        ctx!.beginPath()
        ctx!.arc(G.landedEyeX, G.landedEyeY, G.landedEyeRadius, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.fillStyle = COLORS.black
        ctx!.beginPath()
        ctx!.arc(G.landedPupilX, G.landedPupilY, G.landedPupilRadius, 0, Math.PI * 2)
        ctx!.fill()
      } else {
        // Flying Gary
        const flapY = Math.sin(gary.phase * G.flyingSwoopFreqMult) * G.flyingSwoopAmp
        ctx!.beginPath()
        ctx!.ellipse(0, 0, G.flyingBodyW, G.flyingBodyH, 0, 0, Math.PI * 2)
        ctx!.stroke()
        ctx!.lineWidth = 2
        ctx!.beginPath()
        ctx!.moveTo(-G.flyingWingStartX, 0)
        ctx!.quadraticCurveTo(-G.flyingWingCurveX, flapY - G.flyingWingFlapCurveY, -G.flyingWingEndX, flapY - G.flyingWingFlapEndY)
        ctx!.moveTo(G.flyingWingStartX, 0)
        ctx!.quadraticCurveTo(G.flyingWingCurveX, flapY - G.flyingWingFlapCurveY, G.flyingWingEndX, flapY - G.flyingWingFlapEndY)
        ctx!.stroke()
        // Beak
        ctx!.lineWidth = 2
        const flyDir = gary.flyingAway ? -1 : 1
        ctx!.beginPath()
        ctx!.moveTo(G.flyingBeakStartX * flyDir, G.flyingBeakStartY)
        ctx!.lineTo(G.flyingBeakEndX * flyDir, G.flyingBeakEndY)
        ctx!.lineTo(G.flyingBeakStartX * flyDir, G.flyingBeakBottomY)
        ctx!.stroke()
      }

      ctx!.restore()

    }
  }

  /** Draw idle bird dialogue bubbles — called after fg trees for proper z-order */
  function drawIdleBubbles(width: number, height: number) {
    if (!ctx) return

    // Gary departing thought bubble
    if (world.garyBird && world.garyBird.flyingAway && world.garyBird.thought && world.garyBird.thoughtTimer > 0) {
      const gary = world.garyBird
      const garyGroundY = hillY(gary.x, height)
      const garyY = garyGroundY - LOU_BIRD.groundOffset - gary.y
      const alpha = Math.min(1, gary.thoughtTimer)
      drawBubble(gary.x, garyY - GARY_BIRD.departingBubbleYOffset, gary.thought, 'thought', {
        alpha, font: FONTS.sm, maxWidth: IDLE_BUBBLES.garyMaxWidth, offsetX: IDLE_BUBBLES.garyXOffset, offsetY: IDLE_BUBBLES.garyYOffset
      })
    }

    // Idle dialogue bubbles (Lou & Gary exchange)
    if (world.idleDialogue && world.idleDialogue.pauseTimer <= 0) {
      const dlg = world.idleDialogue
      if (dlg.currentIndex < dlg.exchanges.length) {
        const line = dlg.exchanges[dlg.currentIndex]
        const alpha = Math.min(1, dlg.timer, (TIMING.idleDialogueLineDuration - dlg.timer) * 3)

        if (line.speaker === 'lou' && world.idleBird) {
          const birdGroundY = hillY(world.idleBird.x, height)
          const birdY = birdGroundY - LOU_BIRD.groundOffset - world.idleBird.y
          drawBubble(world.idleBird.x, birdY - IDLE_BUBBLES.louBubbleYOffset, line.text, 'speech', {
            alpha, font: FONTS.sm, maxWidth: IDLE_BUBBLES.dialogueMaxWidth, offsetX: IDLE_BUBBLES.dialogueXOffset, offsetY: IDLE_BUBBLES.dialogueYOffset
          })
        } else if (line.speaker === 'gary' && world.garyBird) {
          const garyGroundY = hillY(world.garyBird.x, height)
          const garyY = world.garyBird.landed ? garyGroundY - GARY_BIRD.landedGroundOffset : (garyGroundY - LOU_BIRD.groundOffset - world.garyBird.y)
          drawBubble(world.garyBird.x, garyY, line.text, 'speech', {
            alpha, font: FONTS.sm, maxWidth: IDLE_BUBBLES.garyDialogueMaxWidth, offsetX: IDLE_BUBBLES.garyDialogueXOffset, offsetY: IDLE_BUBBLES.garyDialogueYOffset
          })
        }
      }
    }
  }

  function render() {
    const canvas = gameCanvas.value
    if (!canvas || !ctx) return

    const width = canvas.width
    const height = canvas.height

    const currentAltitude = getHeightAtWorldDistance(world.boulderDistance)

    const skyGradient = ctx.createLinearGradient(0, 0, 0, height)
    const altitudeRatio = Math.min(1, currentAltitude / SKY.altitudeScale)
    const r = Math.floor(SKY.topR + altitudeRatio * SKY.topRBonus)
    const g = Math.floor(SKY.topG + altitudeRatio * SKY.topGBonus)
    const b = Math.floor(SKY.topB + altitudeRatio * SKY.topBBonus)
    skyGradient.addColorStop(0, `rgb(${r}, ${g}, ${b})`)
    skyGradient.addColorStop(SKY.midStop, `rgb(${SKY.midR + altitudeRatio * SKY.midRBonus}, ${SKY.midG + altitudeRatio * SKY.midGBonus}, ${SKY.midB + altitudeRatio * SKY.midBBonus})`)
    // Warm horizon band
    const horizonR = Math.floor(SKY.horizonR + altitudeRatio * SKY.horizonRBonus)
    const horizonG = Math.floor(SKY.horizonG + altitudeRatio * SKY.horizonGBonus)
    const horizonB = Math.floor(SKY.horizonB + altitudeRatio * SKY.horizonBBonus)
    skyGradient.addColorStop(SKY.horizonStop, `rgb(${horizonR}, ${horizonG}, ${horizonB})`)
    skyGradient.addColorStop(1, `rgb(${horizonR + SKY.farOffsetR}, ${horizonG + SKY.farOffsetG}, ${horizonB + SKY.farOffsetB})`)
    ctx.fillStyle = skyGradient
    ctx.fillRect(0, 0, width, height)

    drawStars(width, height, currentAltitude)
    drawMoon(width, height)
    drawParallaxBackground(width, height, currentAltitude)
    drawClouds(width)
    drawTrees(width, height, 'bg')
    drawGrass(width, height)
    obstacleRenderer.drawLandmarks(width, height)
    drawHill(width, height)
    drawPrometheus(width, height)
    drawSpaceship()
    drawBirds(width, height)
    characterRenderer.drawSisyphusAndBoulder(width, height)
    characterRenderer.drawDeliveryBird(width, height)
    drawTrees(width, height, 'fg')
    obstacleRenderer.drawOverlayObstacles(width, height)
    characterRenderer.drawExclamations(width, height)
    characterRenderer.drawThoughtBubble(width, height)
    characterRenderer.drawFinalThought(width, height)
    drawIdleBubbles(width, height)
    obstacleRenderer.drawLandmarkBubbles(width, height)
    characterRenderer.drawCountdown(width, height)
  }

  return {
    initCanvas,
    resizeCanvas,
    render,
  }
}
