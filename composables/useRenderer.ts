import type { Ref } from 'vue'
import type { GameState } from './useGameState'
import type { Bird, Cloud, Tree, GrassTuft, Obstacle, SmokeParticle, AttackBird, Raindrop, FallingRock } from './useGameState'
import { PEAK_DISTANCE, LEVEL_DISTANCES, LEVEL_ANGLES, GROUND_SCREEN_Y_OFFSET } from './usePhysics'
import { createObstacleRenderer } from './useRenderer-obstacles'
import { createCharacterRenderer } from './useRenderer-character'
import { COLORS, FONTS, ENVIRONMENT, TIMING, BUBBLE_DEFAULTS, fontSizePx } from '~/game/constants'

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
    const altBrightness = Math.min(1, altitude / 2500)
    const starCount = 100 + Math.floor(altBrightness * 80)
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < starCount; i++) {
      const x = ((Math.sin(i * 123.456) * 0.5 + 0.5) * width * 2 - world.worldScrollX * 0.02) % width
      const y = (Math.cos(i * 789.012) * 0.5 + 0.5) * height * 0.55
      const twinkle = Math.sin(world.gameTime * 2 + i) * 0.5 + 0.5
      ctx.globalAlpha = (0.2 + altBrightness * 0.4) + twinkle * (0.4 + altBrightness * 0.3)
      ctx.beginPath()
      ctx.arc(x, y, twinkle * 1.5 + 0.5 + altBrightness * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  function drawMoon(width: number, height: number) {
    if (!ctx) return
    const moonX = width - 100
    const moonY = 70

    const glow = ctx.createRadialGradient(moonX, moonY, 25, moonX, moonY, 70)
    glow.addColorStop(0, 'rgba(255, 255, 200, 0.3)')
    glow.addColorStop(1, 'rgba(255, 255, 200, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(moonX, moonY, 70, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#f0f0d0'
    ctx.beginPath()
    ctx.arc(moonX, moonY, 30, 0, Math.PI * 2)
    ctx.fill()
  }

  function drawParallaxBackground(width: number, height: number, altitude: number) {
    if (!ctx) return

    // Ground line on screen
    const groundY = height - GROUND_SCREEN_Y_OFFSET
    // Progress ratio: 0 at base, 1 at peak
    const maxAlt = getHeightAtWorldDistance(PEAK_DISTANCE)
    const t = Math.min(1, altitude / (maxAlt || 1))

    // --- f) Mountains (furthest, drawn first) ---
    const mtRise = t * 320
    const mtBase = groundY - mtRise
    const mtScroll = world.worldScrollX * 0.008
    ctx.fillStyle = '#2e2850'
    ctx.beginPath()
    ctx.moveTo(0, mtBase + 10)
    for (let x = 0; x <= width; x += 40) {
      const h = Math.sin((x + mtScroll) * 0.008) * 90 +
                Math.sin((x + mtScroll) * 0.015 + 2) * 50 +
                Math.sin((x + mtScroll) * 0.003) * 60
      ctx.lineTo(x, mtBase - Math.max(0, h))
    }
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fill()

    // --- e) Hills ---
    const hlRise = t * 240
    const hlBase = groundY - hlRise
    const hlScroll = world.worldScrollX * 0.02
    ctx.fillStyle = '#1e3328'
    ctx.beginPath()
    ctx.moveTo(0, hlBase + 10)
    for (let x = 0; x <= width; x += 25) {
      const h = Math.sin((x + hlScroll) * 0.012) * 55 +
                Math.sin((x + hlScroll) * 0.025 + 1) * 30 +
                Math.cos((x + hlScroll) * 0.007) * 35
      ctx.lineTo(x, hlBase - Math.max(0, h))
    }
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fill()

    // --- d) Trees (far) ---
    const tf3Rise = t * 170
    const tf3Base = groundY - tf3Rise
    const tf3Scroll = world.worldScrollX * 0.04
    ctx.fillStyle = '#152a18'
    ctx.beginPath()
    ctx.moveTo(0, tf3Base + 5)
    for (let x = 0; x <= width; x += 12) {
      const h = Math.abs(Math.sin((x + tf3Scroll) * 0.06)) * 25 +
                Math.abs(Math.sin((x + tf3Scroll) * 0.09 + 0.5)) * 15
      ctx.lineTo(x, tf3Base - h)
    }
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fill()

    // --- c) River ---
    const rvRise = t * 110
    const rvBase = groundY - rvRise
    const rvScroll = world.worldScrollX * 0.06

    // River band — a flat-ish water surface
    ctx.fillStyle = '#1a2a3a'
    ctx.beginPath()
    ctx.moveTo(0, rvBase + 5)
    for (let x = 0; x <= width; x += 20) {
      const ripple = Math.sin((x + rvScroll) * 0.04 + world.gameTime * 0.8) * 3
      ctx.lineTo(x, rvBase + ripple)
    }
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fill()

    // Moonlight shimmer on water
    ctx.strokeStyle = 'rgba(180, 200, 220, 0.12)'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 8; i++) {
      const sx = ((i * 137 + rvScroll * 0.5) % width)
      const sy = rvBase + Math.sin(world.gameTime * 1.2 + i) * 2
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.lineTo(sx + 15 + Math.sin(world.gameTime + i) * 5, sy)
      ctx.stroke()
    }

    // --- b) Trees (mid) ---
    const tf2Rise = t * 60
    const tf2Base = groundY - tf2Rise
    const tf2Scroll = world.worldScrollX * 0.1
    ctx.fillStyle = '#0d1f10'
    ctx.beginPath()
    ctx.moveTo(0, tf2Base + 5)
    for (let x = 0; x <= width; x += 10) {
      const h = Math.abs(Math.sin((x + tf2Scroll) * 0.08)) * 20 +
                Math.abs(Math.sin((x + tf2Scroll) * 0.12 + 1)) * 12
      ctx.lineTo(x, tf2Base - h)
    }
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fill()

    // --- a) Trees (nearest, drawn last) ---
    const tf1Rise = t * 20
    const tf1Base = groundY - tf1Rise
    const tf1Scroll = world.worldScrollX * 0.18
    ctx.fillStyle = '#0a170c'
    ctx.beginPath()
    ctx.moveTo(0, tf1Base + 3)
    for (let x = 0; x <= width; x += 8) {
      const h = Math.abs(Math.sin((x + tf1Scroll) * 0.1)) * 18 +
                Math.abs(Math.cos((x + tf1Scroll) * 0.14 + 0.7)) * 10
      ctx.lineTo(x, tf1Base - h)
    }
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fill()
  }

  function drawTrees(width: number, height: number, layer?: 'bg' | 'fg') {
    if (!ctx) return
    const c = ctx!

    world.trees.forEach(tree => {
      if (layer && tree.layer !== layer) return
      const screenX = tree.worldX - world.worldScrollX
      if (screenX < -300 || screenX > width + 300) return

      const groundY = hillY(screenX, height)
      const size = tree.size

      if (tree.type === 'pine') {
        // Textured trunk
        c.strokeStyle = COLORS.trunkBrown
        c.lineWidth = size * 0.08
        c.beginPath()
        c.moveTo(screenX, groundY)
        c.lineTo(screenX, groundY - size * 0.45)
        c.stroke()

        // Three layered canopy tiers
        c.fillStyle = COLORS.pineGreen
        for (let tier = 0; tier < 3; tier++) {
          const tierY = groundY - size * (0.35 + tier * 0.22)
          const tierW = size * (0.35 - tier * 0.08)
          const tierH = size * 0.3
          c.beginPath()
          c.moveTo(screenX, tierY - tierH)
          c.lineTo(screenX - tierW, tierY)
          c.lineTo(screenX + tierW, tierY)
          c.closePath()
          c.fill()
        }

        // Highlight edges
        c.strokeStyle = '#2a5a2a'
        c.lineWidth = 1
        for (let tier = 0; tier < 3; tier++) {
          const tierY = groundY - size * (0.35 + tier * 0.22)
          const tierW = size * (0.35 - tier * 0.08)
          const tierH = size * 0.3
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
        c.lineWidth = size * 0.1
        c.beginPath()
        c.moveTo(screenX, groundY)
        c.lineTo(screenX, groundY - size * 0.45)
        c.stroke()

        // Main branches
        c.lineWidth = size * 0.05
        c.beginPath()
        c.moveTo(screenX, groundY - size * 0.4)
        c.lineTo(screenX - size * 0.25, groundY - size * 0.6)
        c.moveTo(screenX, groundY - size * 0.4)
        c.lineTo(screenX + size * 0.2, groundY - size * 0.55)
        c.stroke()

        // Layered canopy (multiple overlapping circles)
        c.fillStyle = COLORS.oakGreen
        const cx = screenX
        const cy = groundY - size * 0.65
        const r = size * 0.3
        c.beginPath()
        c.arc(cx - r * 0.4, cy + r * 0.1, r * 0.7, 0, Math.PI * 2)
        c.fill()
        c.beginPath()
        c.arc(cx + r * 0.4, cy + r * 0.15, r * 0.65, 0, Math.PI * 2)
        c.fill()
        c.beginPath()
        c.arc(cx, cy - r * 0.2, r * 0.75, 0, Math.PI * 2)
        c.fill()
        // Lighter highlight
        c.fillStyle = '#3a5a3a'
        c.beginPath()
        c.arc(cx + r * 0.1, cy - r * 0.3, r * 0.4, 0, Math.PI * 2)
        c.fill()
      } else {
        // Dead tree — gnarled trunk with multiple branches
        c.strokeStyle = COLORS.deadBranch
        c.lineWidth = size * 0.07
        c.beginPath()
        c.moveTo(screenX, groundY)
        c.lineTo(screenX + size * 0.03, groundY - size * 0.5)
        c.lineTo(screenX - size * 0.02, groundY - size * 0.8)
        c.stroke()

        // Branches
        c.lineWidth = size * 0.04
        c.beginPath()
        c.moveTo(screenX - size * 0.02, groundY - size * 0.6)
        c.lineTo(screenX - size * 0.25, groundY - size * 0.75)
        c.lineTo(screenX - size * 0.3, groundY - size * 0.85)
        c.moveTo(screenX + size * 0.03, groundY - size * 0.5)
        c.lineTo(screenX + size * 0.2, groundY - size * 0.6)
        c.moveTo(screenX - size * 0.02, groundY - size * 0.8)
        c.lineTo(screenX + size * 0.15, groundY - size * 0.92)
        c.moveTo(screenX - size * 0.02, groundY - size * 0.8)
        c.lineTo(screenX - size * 0.12, groundY - size * 0.95)
        c.stroke()
      }
    })
  }

  function drawGrass(width: number, height: number) {
    if (!ctx) return
    ctx.strokeStyle = '#3a5a3a'
    ctx.lineWidth = 1

    world.grass.forEach(tuft => {
      const screenX = tuft.worldX - world.worldScrollX
      if (screenX < -20 || screenX > width + 20) return

      const groundY = hillY(screenX, height)
      const sway = Math.sin(world.gameTime * 2 + tuft.worldX * 0.1) * 2

      for (let i = 0; i < tuft.blades; i++) {
        const bladeX = screenX + (i - tuft.blades / 2) * 3
        ctx!.beginPath()
        ctx!.moveTo(bladeX, groundY)
        ctx!.quadraticCurveTo(
          bladeX + sway,
          groundY - tuft.height * 0.6,
          bladeX + sway * 1.5,
          groundY - tuft.height
        )
        ctx!.stroke()
      }
    })
  }

  function drawClouds(width: number) {
    if (!ctx) return
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
    world.clouds.forEach(cloud => {
      const x = ((cloud.x - world.worldScrollX * 0.05) % (width + 200))
      ctx!.beginPath()
      ctx!.arc(x, cloud.y, cloud.size * 0.5, 0, Math.PI * 2)
      ctx!.arc(x + cloud.size * 0.35, cloud.y - cloud.size * 0.15, cloud.size * 0.4, 0, Math.PI * 2)
      ctx!.arc(x + cloud.size * 0.7, cloud.y, cloud.size * 0.45, 0, Math.PI * 2)
      ctx!.fill()
    })
  }

  function drawHill(width: number, height: number) {
    if (!ctx) return

    const peakScreenX = PEAK_DISTANCE - world.worldScrollX
    const drawRightEdge = width + 100

    ctx.fillStyle = '#3d3d3d'
    ctx.beginPath()
    ctx.moveTo(0, hillY(0, height))
    for (let x = 0; x <= drawRightEdge; x += 5) {
      ctx.lineTo(x, hillY(x, height))
    }
    ctx.lineTo(drawRightEdge, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(0, hillY(0, height))
    for (let x = 0; x <= drawRightEdge; x += 5) {
      ctx.lineTo(x, hillY(x, height))
    }
    ctx.stroke()

    ctx.strokeStyle = '#666'
    ctx.lineWidth = 1
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
          ctx.lineTo(screenX, y - 20)
          ctx.stroke()

          ctx.fillStyle = '#666'
          ctx.font = FONTS.base
          ctx.fillText(`L${level}`, screenX - 8, y - 25)
        }
      }
    }

    if (peakScreenX > 0 && peakScreenX < width) {
      ctx.fillStyle = '#ffd700'
      ctx.beginPath()
      ctx.moveTo(peakScreenX, hillY(peakScreenX, height) - 10)
      ctx.lineTo(peakScreenX - 8, hillY(peakScreenX, height) + 5)
      ctx.lineTo(peakScreenX + 8, hillY(peakScreenX, height) + 5)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = '#ffd700'
      ctx.font = FONTS.lg
      ctx.fillText('PEAK', peakScreenX - 18, hillY(peakScreenX, height) - 15)
    }
  }

  function drawPrometheus(width: number, height: number) {
    if (!ctx) return
    const screenX = world.prometheusDistance - world.worldScrollX
    if (screenX < -100 || screenX > width + 150) return

    const groundY = hillY(screenX, height)

    const embedX = screenX + 40
    const embedY = groundY + 25
    const scale = 1.5

    // Rock (organic bezier shape)
    ctx.fillStyle = '#555'
    ctx.beginPath()
    ctx.moveTo(embedX - 40 * scale, groundY + 5)
    ctx.bezierCurveTo(
      embedX - 45 * scale, groundY - 20,
      embedX - 10 * scale, groundY - 25,
      embedX + 30 * scale, groundY - 10
    )
    ctx.bezierCurveTo(
      embedX + 45 * scale, groundY,
      embedX + 42 * scale, embedY + 20 * scale,
      embedX + 30 * scale, embedY + 30 * scale
    )
    ctx.bezierCurveTo(
      embedX + 10 * scale, embedY + 40 * scale,
      embedX - 25 * scale, embedY + 38 * scale,
      embedX - 40 * scale, groundY + 5
    )
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#777'
    ctx.lineWidth = 1
    ctx.stroke()

    // Prometheus figure
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2.5

    // Head
    ctx.beginPath()
    ctx.arc(embedX, embedY - 12 * scale, 8 * scale, 0, Math.PI * 2)
    ctx.stroke()

    // Body
    ctx.beginPath()
    ctx.moveTo(embedX, embedY - 4 * scale)
    ctx.lineTo(embedX, embedY + 22 * scale)
    ctx.stroke()

    // Arms
    ctx.beginPath()
    ctx.moveTo(embedX - 25 * scale, embedY)
    ctx.lineTo(embedX, embedY + 5 * scale)
    ctx.lineTo(embedX + 25 * scale, embedY)
    ctx.stroke()

    // Chains
    ctx.strokeStyle = '#888'
    ctx.lineWidth = 1.5
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(embedX - 25 * scale, embedY)
    ctx.lineTo(embedX - 35 * scale, embedY - 15)
    ctx.moveTo(embedX + 25 * scale, embedY)
    ctx.lineTo(embedX + 35 * scale, embedY - 15)
    ctx.stroke()
    ctx.setLineDash([])

    // Legs
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(embedX, embedY + 22 * scale)
    ctx.lineTo(embedX - 8 * scale, embedY + 40 * scale)
    ctx.moveTo(embedX, embedY + 22 * scale)
    ctx.lineTo(embedX + 8 * scale, embedY + 40 * scale)
    ctx.stroke()

    // Blood
    ctx.strokeStyle = '#8b0000'
    ctx.lineWidth = 1.5
    const bloodDrip = (world.gameTime * 20) % 30
    for (let i = 0; i < 3; i++) {
      const startY = embedY + 10 * scale + i * 5
      const dripLength = 15 + Math.sin(world.gameTime * 2 + i) * 5
      ctx.beginPath()
      ctx.moveTo(embedX - 3 + i * 3, startY)
      ctx.quadraticCurveTo(
        embedX - 5 + i * 3 + Math.sin(world.gameTime + i) * 2,
        startY + dripLength / 2,
        embedX - 4 + i * 3,
        startY + dripLength + (bloodDrip + i * 10) % 20
      )
      ctx.stroke()
    }

    // Vulture
    const vultureBob = Math.sin(world.gameTime * 3) * 3
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(embedX - 18 * scale, embedY + 14 * scale + vultureBob, 10 * scale, 6 * scale, -0.3, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(embedX - 6 * scale, embedY + 10 * scale + vultureBob, 5 * scale, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(embedX - 3 * scale, embedY + 10 * scale + vultureBob)
    ctx.lineTo(embedX + 2, embedY + 12 * scale + vultureBob)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(embedX - 30 * scale, embedY + 6 * scale + vultureBob)
    ctx.lineTo(embedX - 18 * scale, embedY + 14 * scale + vultureBob)
    ctx.lineTo(embedX - 30 * scale, embedY + 22 * scale + vultureBob)
    ctx.stroke()

    // Ouch text
    const ouchPhase = Math.floor(world.gameTime * 2) % 4
    const ouchTexts = ['ouch...', 'ow...', 'ouch...', 'ugh...']
    ctx.fillStyle = '#fff'
    ctx.font = FONTS.md
    const ouchAlpha = 0.5 + Math.sin(world.gameTime * 4) * 0.3
    ctx.globalAlpha = ouchAlpha
    ctx.fillText(ouchTexts[ouchPhase], embedX - 45, embedY - 25 * scale)
    ctx.globalAlpha = 1

    // Dialogue exchange
    if (world.prometheusActiveExchange) {
      const ex = world.prometheusActiveExchange
      const alpha = ex.timer < 0.5 ? ex.timer * 2 : ex.fadeIn
      if (ex.speaker === 'prometheus') {
        drawBubble(embedX, embedY - 15 * scale, ex.text, 'speech', {
          alpha, font: FONTS.base, maxWidth: 150, offsetX: -60, offsetY: -40
        })
      } else {
        // Sisyphus speech — draw near the player position
        const playerScreenX = world.worldDistance - world.worldScrollX
        const playerY = hillY(playerScreenX, height) - 50
        drawBubble(playerScreenX, playerY, ex.text, 'speech', {
          alpha, font: FONTS.base, maxWidth: 150, offsetX: 20, offsetY: -30
        })
      }
    }

    ctx.fillStyle = '#666'
    ctx.font = FONTS.base
    ctx.fillText('Prometheus', screenX + 10, groundY + 70)
  }

  function drawSpaceship() {
    if (!ctx || !world.spaceshipActive) return
    const x = world.spaceshipX
    const y = world.spaceshipY

    ctx.fillStyle = '#555'
    ctx.beginPath()
    ctx.ellipse(x, y, 28, 9, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#88f'
    ctx.beginPath()
    ctx.ellipse(x, y - 7, 13, 10, 0, Math.PI, 0)
    ctx.fill()

    ctx.fillStyle = '#ff0'
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI + world.gameTime * 6
      ctx.beginPath()
      ctx.arc(x + Math.cos(angle) * 22, y + 2, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  function drawBirds(width: number, height: number) {
    if (!ctx) return
    world.birds.forEach(bird => {
      const flapY = Math.sin(bird.flapPhase) * 4
      ctx!.strokeStyle = '#fff'
      ctx!.lineWidth = 1
      ctx!.beginPath()
      ctx!.moveTo(bird.x - 4, bird.y + flapY)
      ctx!.lineTo(bird.x, bird.y)
      ctx!.lineTo(bird.x + 4, bird.y + flapY)
      ctx!.stroke()
    })

    // Idle harassment bird (Lou) — large, menacing
    if (world.idleBird) {
      const bird = world.idleBird
      const groundY = hillY(bird.x, height)
      const birdY = groundY - 60 - bird.y

      ctx!.save()
      ctx!.translate(bird.x, birdY)

      ctx!.strokeStyle = '#fff'
      ctx!.lineWidth = 2.5
      const flapY = Math.sin(bird.swoopPhase * 6) * 15

      // Body
      ctx!.beginPath()
      ctx!.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2)
      ctx!.stroke()

      // Wings
      ctx!.lineWidth = 2
      ctx!.beginPath()
      ctx!.moveTo(-6, 0)
      ctx!.quadraticCurveTo(-16, flapY - 12, -26, flapY - 6)
      ctx!.moveTo(6, 0)
      ctx!.quadraticCurveTo(16, flapY - 12, 26, flapY - 6)
      ctx!.stroke()

      // Talons
      ctx!.strokeStyle = '#ccc'
      ctx!.lineWidth = 1.5
      ctx!.beginPath()
      ctx!.moveTo(-3, 5)
      ctx!.lineTo(-4, 12)
      ctx!.lineTo(-7, 15)
      ctx!.moveTo(-4, 12)
      ctx!.lineTo(-2, 16)
      ctx!.moveTo(3, 5)
      ctx!.lineTo(4, 12)
      ctx!.lineTo(7, 15)
      ctx!.moveTo(4, 12)
      ctx!.lineTo(2, 16)
      ctx!.stroke()

      // Beak — hooked
      ctx!.strokeStyle = '#fff'
      ctx!.lineWidth = 2
      ctx!.beginPath()
      ctx!.moveTo(14, -2)
      ctx!.lineTo(22, 1)
      ctx!.lineTo(20, 5)
      ctx!.stroke()

      // Angry eye
      ctx!.fillStyle = '#fff'
      ctx!.beginPath()
      ctx!.arc(8, -3, 2, 0, Math.PI * 2)
      ctx!.fill()
      ctx!.fillStyle = '#000'
      ctx!.beginPath()
      ctx!.arc(8.5, -2.5, 1, 0, Math.PI * 2)
      ctx!.fill()

      ctx!.restore()

    }

    // Gary bird (second idle bird — lands near player)
    if (world.garyBird) {
      const gary = world.garyBird
      const playerScreenX = world.worldDistance - world.worldScrollX
      const groundY = hillY(gary.x, height)
      const garyY = gary.landed ? groundY : (groundY - 60 - gary.y)

      ctx!.save()
      ctx!.translate(gary.x, garyY)

      ctx!.strokeStyle = '#fff'
      ctx!.lineWidth = 2.5

      if (gary.landed && !gary.flyingAway) {
        // Standing bird on ground — body pointing right, wings folded
        ctx!.beginPath()
        ctx!.ellipse(0, -5, 12, 5, 0.2, 0, Math.PI * 2)
        ctx!.stroke()
        // Head
        ctx!.beginPath()
        ctx!.arc(10, -10, 4, 0, Math.PI * 2)
        ctx!.stroke()
        // Beak
        ctx!.beginPath()
        ctx!.moveTo(14, -10)
        ctx!.lineTo(19, -9)
        ctx!.lineTo(14, -8)
        ctx!.stroke()
        // Legs
        ctx!.strokeStyle = '#ccc'
        ctx!.lineWidth = 1.5
        ctx!.beginPath()
        ctx!.moveTo(-2, 0)
        ctx!.lineTo(-4, 8)
        ctx!.lineTo(-7, 10)
        ctx!.moveTo(-4, 8)
        ctx!.lineTo(-1, 10)
        ctx!.moveTo(4, 0)
        ctx!.lineTo(6, 8)
        ctx!.lineTo(3, 10)
        ctx!.moveTo(6, 8)
        ctx!.lineTo(9, 10)
        ctx!.stroke()
        // Eye
        ctx!.fillStyle = '#fff'
        ctx!.beginPath()
        ctx!.arc(11, -11, 1.5, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.fillStyle = '#000'
        ctx!.beginPath()
        ctx!.arc(11.5, -11, 0.8, 0, Math.PI * 2)
        ctx!.fill()
      } else {
        // Flying Gary
        const flapY = Math.sin(gary.phase * 6) * 15
        ctx!.beginPath()
        ctx!.ellipse(0, 0, 12, 5, 0, 0, Math.PI * 2)
        ctx!.stroke()
        ctx!.lineWidth = 2
        ctx!.beginPath()
        ctx!.moveTo(-5, 0)
        ctx!.quadraticCurveTo(-14, flapY - 10, -22, flapY - 5)
        ctx!.moveTo(5, 0)
        ctx!.quadraticCurveTo(14, flapY - 10, 22, flapY - 5)
        ctx!.stroke()
        // Beak
        ctx!.lineWidth = 2
        const flyDir = gary.flyingAway ? -1 : 1
        ctx!.beginPath()
        ctx!.moveTo(12 * flyDir, -2)
        ctx!.lineTo(18 * flyDir, 0)
        ctx!.lineTo(12 * flyDir, 2)
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
      const garyY = garyGroundY - 60 - gary.y
      const alpha = Math.min(1, gary.thoughtTimer)
      drawBubble(gary.x, garyY - 20, gary.thought, 'thought', {
        alpha, font: FONTS.sm, maxWidth: 160, offsetX: -20, offsetY: -30
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
          const birdY = birdGroundY - 60 - world.idleBird.y
          drawBubble(world.idleBird.x, birdY - 10, line.text, 'speech', {
            alpha, font: FONTS.sm, maxWidth: 180, offsetX: -30, offsetY: -35
          })
        } else if (line.speaker === 'gary' && world.garyBird) {
          const garyGroundY = hillY(world.garyBird.x, height)
          const garyY = world.garyBird.landed ? garyGroundY - 18 : (garyGroundY - 60 - world.garyBird.y)
          drawBubble(world.garyBird.x, garyY, line.text, 'speech', {
            alpha, font: FONTS.sm, maxWidth: 180, offsetX: -30, offsetY: -35
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
    const altitudeRatio = Math.min(1, currentAltitude / 3000)
    const r = Math.floor(15 + altitudeRatio * 25)
    const g = Math.floor(10 + altitudeRatio * 20)
    const b = Math.floor(40 + altitudeRatio * 50)
    skyGradient.addColorStop(0, `rgb(${r}, ${g}, ${b})`)
    skyGradient.addColorStop(0.45, `rgb(${20 + altitudeRatio * 10}, ${15 + altitudeRatio * 10}, ${55 + altitudeRatio * 20})`)
    // Warm horizon band
    const horizonR = Math.floor(40 + altitudeRatio * 30)
    const horizonG = Math.floor(20 + altitudeRatio * 15)
    const horizonB = Math.floor(45 + altitudeRatio * 10)
    skyGradient.addColorStop(0.85, `rgb(${horizonR}, ${horizonG}, ${horizonB})`)
    skyGradient.addColorStop(1, `rgb(${horizonR + 15}, ${horizonG + 10}, ${horizonB - 10})`)
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
    characterRenderer.drawCountdown(width, height)
  }

  return {
    initCanvas,
    resizeCanvas,
    render,
  }
}
