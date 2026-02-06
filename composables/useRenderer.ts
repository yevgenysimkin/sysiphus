import type { Ref } from 'vue'
import type { GameState } from './useGameState'
import type { Bird, Cloud, Tree, GrassTuft, Obstacle, SmokeParticle, AttackBird, Raindrop, FallingRock } from './useGameState'
import { PEAK_DISTANCE, LEVEL_DISTANCES, LEVEL_ANGLES, GROUND_SCREEN_Y_OFFSET } from './usePhysics'

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
    const font = options?.font ?? '11px monospace'
    const maxWidth = options?.maxWidth ?? 180
    const offsetX = options?.offsetX ?? 20
    const offsetY = options?.offsetY ?? -20

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

    const lineHeight = parseInt(font) + 4
    const padding = 10
    const bubbleWidth = Math.min(maxWidth + 24, Math.max(...lines.map(l => ctx!.measureText(l).width)) + padding * 2 + 4)
    const bubbleHeight = lines.length * lineHeight + padding * 2

    let bubbleX = speakerX + offsetX
    let bubbleY = speakerY + offsetY - bubbleHeight

    if (bubbleX + bubbleWidth > canvas.width - 5) {
      bubbleX = canvas.width - bubbleWidth - 5
    }
    if (bubbleX < 5) bubbleX = 5
    if (bubbleY < 5) bubbleY = 5
    if (bubbleY + bubbleHeight > canvas.height - 5) {
      bubbleY = canvas.height - bubbleHeight - 5
    }

    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, type === 'thought' ? 12 : 8)
    ctx.fill()
    ctx.stroke()

    if (type === 'speech') {
      const tailBaseX = Math.max(bubbleX + 10, Math.min(bubbleX + bubbleWidth - 10, speakerX + offsetX))
      const tailBaseY = bubbleY + bubbleHeight
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.moveTo(tailBaseX - 6, tailBaseY - 1)
      ctx.lineTo(speakerX + 5, speakerY - 5)
      ctx.lineTo(tailBaseX + 6, tailBaseY - 1)
      ctx.fill()
      ctx.strokeStyle = '#333'
      ctx.beginPath()
      ctx.moveTo(tailBaseX - 6, tailBaseY)
      ctx.lineTo(speakerX + 5, speakerY - 5)
      ctx.lineTo(tailBaseX + 6, tailBaseY)
      ctx.stroke()
    } else {
      const dotStartX = bubbleX + 5
      const dotStartY = bubbleY + bubbleHeight + 5
      const dx = speakerX - dotStartX
      const dy = speakerY - dotStartY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const ux = dx / (dist || 1)
      const uy = dy / (dist || 1)

      ctx.fillStyle = '#fff'
      ctx.strokeStyle = '#333'
      ctx.beginPath()
      ctx.arc(dotStartX + ux * 10, dotStartY + uy * 10, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(dotStartX + ux * 22, dotStartY + uy * 22, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }

    ctx.fillStyle = '#000'
    lines.forEach((line, i) => {
      ctx!.fillText(line, bubbleX + padding, bubbleY + padding + lineHeight * (i + 0.8))
    })

    ctx.restore()
  }

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

    // 6 layers back-to-front, each with:
    //   color, maxRise (how far it rises at t=1), silhouetteHeight, scrollFactor, drawFn
    // At t=0 every layer's bottom sits at groundY (stacked, only nearest visible)
    // At t=1 each layer has risen by maxRise pixels, revealing distant layers above nearer ones

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
                Math.sin((x + tf3Scroll) * 0.03 + 3) * 12 +
                Math.abs(Math.sin((x + tf3Scroll) * 0.1)) * 10
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
    ctx.fillStyle = '#1a2e42'
    ctx.beginPath()
    ctx.moveTo(0, rvBase + 5)
    for (let x = 0; x <= width; x += 20) {
      const ripple = Math.sin((x + rvScroll) * 0.04 + world.gameTime * 1.5) * 3
      ctx.lineTo(x, rvBase - 8 + ripple)
    }
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fill()
    // Moonlight shimmer on water
    ctx.strokeStyle = 'rgba(180, 200, 220, 0.15)'
    ctx.lineWidth = 1
    for (let x = 0; x < width; x += 30) {
      const shimX = (x + rvScroll * 0.5 + Math.sin(world.gameTime * 0.8 + x * 0.05) * 8) % width
      const shimW = 8 + Math.sin(world.gameTime + x) * 4
      ctx.beginPath()
      ctx.moveTo(shimX, rvBase - 5)
      ctx.lineTo(shimX + shimW, rvBase - 5)
      ctx.stroke()
    }

    // --- b) Trees (mid) ---
    const tf2Rise = t * 60
    const tf2Base = groundY - tf2Rise
    const tf2Scroll = world.worldScrollX * 0.1
    ctx.fillStyle = '#122218'
    ctx.beginPath()
    ctx.moveTo(0, tf2Base + 5)
    for (let x = 0; x <= width; x += 10) {
      const h = Math.abs(Math.sin((x + tf2Scroll) * 0.08 + 1)) * 22 +
                Math.sin((x + tf2Scroll) * 0.04) * 10 +
                Math.abs(Math.sin((x + tf2Scroll) * 0.13)) * 8
      ctx.lineTo(x, tf2Base - h)
    }
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fill()

    // --- a) Trees (nearest, drawn last) ---
    const tf1Rise = t * 20
    const tf1Base = groundY - tf1Rise
    const tf1Scroll = world.worldScrollX * 0.15
    ctx.fillStyle = '#0e1a10'
    ctx.beginPath()
    ctx.moveTo(0, tf1Base + 5)
    for (let x = 0; x <= width; x += 8) {
      const h = Math.abs(Math.sin((x + tf1Scroll) * 0.1 + 2)) * 18 +
                Math.abs(Math.sin((x + tf1Scroll) * 0.15)) * 10
      ctx.lineTo(x, tf1Base - h)
    }
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
    ctx.closePath()
    ctx.fill()
  }

  function drawTrees(width: number, height: number) {
    if (!ctx) return

    world.trees.forEach(tree => {
      const screenX = tree.worldX - world.worldScrollX
      if (screenX < -50 || screenX > width + 50) return

      const groundY = hillY(screenX, height)
      const size = tree.size

      ctx!.strokeStyle = '#3d2817'
      ctx!.lineWidth = size * 0.15

      if (tree.type === 'pine') {
        ctx!.beginPath()
        ctx!.moveTo(screenX, groundY)
        ctx!.lineTo(screenX, groundY - size * 0.4)
        ctx!.stroke()
        ctx!.fillStyle = '#1a3d1a'
        ctx!.beginPath()
        ctx!.moveTo(screenX, groundY - size)
        ctx!.lineTo(screenX - size * 0.3, groundY - size * 0.3)
        ctx!.lineTo(screenX + size * 0.3, groundY - size * 0.3)
        ctx!.closePath()
        ctx!.fill()
      } else if (tree.type === 'oak') {
        ctx!.beginPath()
        ctx!.moveTo(screenX, groundY)
        ctx!.lineTo(screenX, groundY - size * 0.5)
        ctx!.stroke()
        ctx!.fillStyle = '#2d4a2d'
        ctx!.beginPath()
        ctx!.arc(screenX, groundY - size * 0.7, size * 0.35, 0, Math.PI * 2)
        ctx!.fill()
      } else {
        ctx!.strokeStyle = '#4a3a2a'
        ctx!.beginPath()
        ctx!.moveTo(screenX, groundY)
        ctx!.lineTo(screenX, groundY - size * 0.8)
        ctx!.lineTo(screenX - size * 0.2, groundY - size * 0.9)
        ctx!.moveTo(screenX, groundY - size * 0.6)
        ctx!.lineTo(screenX + size * 0.25, groundY - size * 0.75)
        ctx!.stroke()
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

  function drawLandmarks(width: number, height: number) {
    if (!ctx) return

    world.obstacles.forEach(obstacle => {
      const screenX = obstacle.worldX - world.worldScrollX
      if (screenX < -150 || screenX > width + 150) return

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

  function drawSouvlaki(screenX: number, groundY: number) {
    ctx!.fillStyle = '#8b4513'
    ctx!.fillRect(screenX - 25, groundY - 50, 50, 50)
    ctx!.fillStyle = '#c41e3a'
    ctx!.beginPath()
    ctx!.moveTo(screenX - 35, groundY - 50)
    ctx!.lineTo(screenX + 35, groundY - 50)
    ctx!.lineTo(screenX + 30, groundY - 65)
    ctx!.lineTo(screenX - 30, groundY - 65)
    ctx!.closePath()
    ctx!.fill()
    ctx!.fillStyle = '#fff'
    ctx!.font = '8px monospace'
    ctx!.fillText('SOUVLAKI', screenX - 22, groundY - 30)
    ctx!.fillText('(closed)', screenX - 18, groundY - 20)
  }

  function drawSign(screenX: number, groundY: number, worldX: number) {
    ctx!.fillStyle = '#5c4033'
    ctx!.fillRect(screenX - 2, groundY - 40, 4, 40)
    ctx!.fillRect(screenX - 25, groundY - 50, 50, 20)
    ctx!.fillStyle = '#fff'
    ctx!.font = '7px monospace'
    const signs = ['KEEP GOING', 'ALMOST THERE', 'NO REFUNDS', 'WHY?']
    ctx!.fillText(signs[Math.floor(worldX / 5000) % signs.length], screenX - 20, groundY - 38)
  }

  function drawBench(screenX: number, groundY: number) {
    ctx!.fillStyle = '#654321'
    ctx!.fillRect(screenX - 20, groundY - 15, 40, 5)
    ctx!.fillRect(screenX - 18, groundY - 15, 3, 15)
    ctx!.fillRect(screenX + 15, groundY - 15, 3, 15)
    ctx!.fillRect(screenX - 20, groundY - 25, 40, 3)
  }

  function drawRock(screenX: number, groundY: number) {
    ctx!.fillStyle = '#5a5a5a'
    ctx!.beginPath()
    ctx!.ellipse(screenX, groundY - 10, 20, 12, 0, 0, Math.PI * 2)
    ctx!.fill()
    ctx!.fillStyle = '#4a4a4a'
    ctx!.beginPath()
    ctx!.ellipse(screenX - 5, groundY - 12, 8, 6, 0.3, 0, Math.PI * 2)
    ctx!.fill()
  }

  function drawStrayDog(screenX: number, groundY: number, obstacle: Obstacle) {
    const s = obstacle.state
    const dogOffsetX = s.dogX || 0
    const x = screenX + dogOffsetX
    const fled = s.dogFled

    if (fled && Math.abs(dogOffsetX) > 300) return // offscreen

    ctx!.save()
    ctx!.strokeStyle = '#ddd'
    ctx!.lineWidth = 2

    const legAnim = fled ? Math.sin(s.animTimer * 20) * 6 : Math.sin(s.animTimer * 3) * 2
    const tailWag = Math.sin(s.animTimer * (fled ? 15 : 5)) * 0.4

    // Body
    ctx!.beginPath()
    ctx!.moveTo(x - 12, groundY - 18)
    ctx!.lineTo(x + 12, groundY - 18)
    ctx!.stroke()

    // Head
    ctx!.beginPath()
    ctx!.arc(x + 16, groundY - 22, 6, 0, Math.PI * 2)
    ctx!.stroke()

    // Ears
    ctx!.beginPath()
    ctx!.moveTo(x + 13, groundY - 27)
    ctx!.lineTo(x + 11, groundY - 33)
    ctx!.moveTo(x + 19, groundY - 27)
    ctx!.lineTo(x + 21, groundY - 33)
    ctx!.stroke()

    // Snout
    ctx!.beginPath()
    ctx!.moveTo(x + 22, groundY - 22)
    ctx!.lineTo(x + 26, groundY - 20)
    ctx!.stroke()

    // Front legs
    ctx!.beginPath()
    ctx!.moveTo(x + 8, groundY - 18)
    ctx!.lineTo(x + 8 + legAnim, groundY)
    ctx!.moveTo(x + 4, groundY - 18)
    ctx!.lineTo(x + 4 - legAnim, groundY)
    ctx!.stroke()

    // Back legs
    ctx!.beginPath()
    ctx!.moveTo(x - 8, groundY - 18)
    ctx!.lineTo(x - 8 + legAnim, groundY)
    ctx!.moveTo(x - 12, groundY - 18)
    ctx!.lineTo(x - 12 - legAnim, groundY)
    ctx!.stroke()

    // Tail
    ctx!.beginPath()
    ctx!.moveTo(x - 12, groundY - 18)
    ctx!.quadraticCurveTo(x - 18, groundY - 28 + Math.sin(tailWag) * 4, x - 22, groundY - 30 + Math.sin(tailWag) * 6)
    ctx!.stroke()

    // Bark indicator
    if (!fled && s.dogBarkTimer !== undefined && s.dogBarkTimer < 0.5) {
      ctx!.fillStyle = '#fff'
      ctx!.font = '10px monospace'
      ctx!.fillText('WOOF!', x + 5, groundY - 38)
    }

    ctx!.restore()
  }

  function drawCampfire(screenX: number, groundY: number, obstacle: Obstacle) {
    const s = obstacle.state

    // Logs
    ctx!.strokeStyle = '#654321'
    ctx!.lineWidth = 4
    ctx!.beginPath()
    ctx!.moveTo(screenX - 15, groundY)
    ctx!.lineTo(screenX + 5, groundY - 8)
    ctx!.moveTo(screenX + 15, groundY)
    ctx!.lineTo(screenX - 5, groundY - 8)
    ctx!.stroke()

    // Flames
    const t = s.animTimer
    for (let i = 0; i < 5; i++) {
      const flicker = Math.sin(t * 10 + i * 1.5) * 3
      const h = 12 + Math.sin(t * 8 + i * 2) * 5
      const fx = screenX - 6 + i * 3 + flicker
      const colors = ['#ff4500', '#ff6b00', '#ffaa00', '#ffcc00', '#ff8800']
      ctx!.fillStyle = colors[i]
      ctx!.beginPath()
      ctx!.moveTo(fx - 3, groundY - 6)
      ctx!.quadraticCurveTo(fx + flicker, groundY - 6 - h, fx + 3, groundY - 6)
      ctx!.fill()
    }

    // Glow
    const glow = ctx!.createRadialGradient(screenX, groundY - 10, 5, screenX, groundY - 10, 40)
    glow.addColorStop(0, 'rgba(255, 150, 50, 0.15)')
    glow.addColorStop(1, 'rgba(255, 100, 0, 0)')
    ctx!.fillStyle = glow
    ctx!.beginPath()
    ctx!.arc(screenX, groundY - 10, 40, 0, Math.PI * 2)
    ctx!.fill()

    // Smoke particles
    if (s.smokeParticles) {
      ctx!.fillStyle = 'rgba(200, 200, 200, 0.3)'
      for (const p of s.smokeParticles) {
        ctx!.globalAlpha = p.alpha
        ctx!.beginPath()
        ctx!.arc(screenX + p.x, groundY - 20 + p.y, p.size, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.globalAlpha = 1
    }
  }

  function drawSasquatch(screenX: number, groundY: number, obstacle: Obstacle) {
    const s = obstacle.state
    const peek = s.squatchPeekAmount || 0

    if (peek <= 0.05) return

    // Find nearest tree to hide behind (draw sasquatch partially behind a trunk area)
    const treeX = screenX - 20
    const bodyReveal = peek // 0 to 1

    ctx!.save()
    // Clip to only show revealed portion
    ctx!.beginPath()
    ctx!.rect(treeX + 10 - bodyReveal * 35, 0, bodyReveal * 60, gameCanvas.value?.height || 800)
    ctx!.clip()

    ctx!.strokeStyle = '#8B4513'
    ctx!.lineWidth = 3

    const headX = treeX + 5
    const headY = groundY - 55

    // Big furry body
    ctx!.fillStyle = '#5C3A1E'
    ctx!.beginPath()
    ctx!.ellipse(headX, groundY - 25, 14, 25, 0, 0, Math.PI * 2)
    ctx!.fill()

    // Head
    ctx!.beginPath()
    ctx!.arc(headX, headY, 10, 0, Math.PI * 2)
    ctx!.fill()

    // Eyes
    ctx!.fillStyle = '#fff'
    ctx!.beginPath()
    ctx!.arc(headX - 3, headY - 2, 3, 0, Math.PI * 2)
    ctx!.arc(headX + 3, headY - 2, 3, 0, Math.PI * 2)
    ctx!.fill()
    ctx!.fillStyle = '#000'
    ctx!.beginPath()
    ctx!.arc(headX - 3, headY - 2, 1.5, 0, Math.PI * 2)
    ctx!.arc(headX + 3, headY - 2, 1.5, 0, Math.PI * 2)
    ctx!.fill()

    // Legs
    ctx!.strokeStyle = '#5C3A1E'
    ctx!.lineWidth = 5
    ctx!.beginPath()
    ctx!.moveTo(headX - 6, groundY - 5)
    ctx!.lineTo(headX - 8, groundY)
    ctx!.moveTo(headX + 6, groundY - 5)
    ctx!.lineTo(headX + 8, groundY)
    ctx!.stroke()

    ctx!.restore()

    // "Tree trunk" to hide behind (drawn on top for layering)
    ctx!.fillStyle = '#3d2817'
    ctx!.fillRect(treeX - 5, groundY - 60, 10, 60)
    ctx!.fillStyle = '#1a3d1a'
    ctx!.beginPath()
    ctx!.moveTo(treeX, groundY - 90)
    ctx!.lineTo(treeX - 18, groundY - 55)
    ctx!.lineTo(treeX + 18, groundY - 55)
    ctx!.closePath()
    ctx!.fill()
  }

  function drawAncientRuins(screenX: number, groundY: number) {
    ctx!.fillStyle = '#8a8070'
    ctx!.strokeStyle = '#6a6050'
    ctx!.lineWidth = 2

    // Left column (broken)
    ctx!.fillRect(screenX - 30, groundY - 45, 8, 45)
    ctx!.fillRect(screenX - 34, groundY - 48, 16, 5)
    // Broken top
    ctx!.beginPath()
    ctx!.moveTo(screenX - 34, groundY - 48)
    ctx!.lineTo(screenX - 30, groundY - 55)
    ctx!.lineTo(screenX - 22, groundY - 50)
    ctx!.lineTo(screenX - 18, groundY - 48)
    ctx!.fill()

    // Right column (intact)
    ctx!.fillRect(screenX + 15, groundY - 60, 8, 60)
    ctx!.fillRect(screenX + 11, groundY - 63, 16, 5)
    // Capital
    ctx!.fillRect(screenX + 10, groundY - 68, 18, 5)

    // Lintel fragment connecting them
    ctx!.fillStyle = '#7a7060'
    ctx!.beginPath()
    ctx!.moveTo(screenX - 18, groundY - 48)
    ctx!.lineTo(screenX + 10, groundY - 65)
    ctx!.lineTo(screenX + 14, groundY - 63)
    ctx!.lineTo(screenX - 14, groundY - 46)
    ctx!.fill()

    // Scattered stones
    ctx!.fillStyle = '#7a7060'
    for (const [ox, oy, r] of [[-20, -3, 5], [5, -2, 4], [-8, -4, 6], [30, -2, 3], [35, -3, 5]] as [number, number, number][]) {
      ctx!.beginPath()
      ctx!.ellipse(screenX + ox, groundY + oy, r, r * 0.6, 0.2, 0, Math.PI * 2)
      ctx!.fill()
    }

    // Cracks on columns
    ctx!.strokeStyle = '#5a5040'
    ctx!.lineWidth = 1
    ctx!.beginPath()
    ctx!.moveTo(screenX - 26, groundY - 30)
    ctx!.lineTo(screenX - 28, groundY - 20)
    ctx!.lineTo(screenX - 25, groundY - 10)
    ctx!.stroke()
    ctx!.beginPath()
    ctx!.moveTo(screenX + 19, groundY - 40)
    ctx!.lineTo(screenX + 17, groundY - 30)
    ctx!.stroke()
  }

  function drawPhilosopher(screenX: number, groundY: number, obstacle: Obstacle) {
    const s = obstacle.state
    ctx!.strokeStyle = '#fff'
    ctx!.lineWidth = 2

    // Seated position
    const headX = screenX
    const headY = groundY - 35

    // Head
    ctx!.beginPath()
    ctx!.arc(headX, headY, 6, 0, Math.PI * 2)
    ctx!.stroke()

    // Beard
    ctx!.beginPath()
    ctx!.moveTo(headX - 3, headY + 4)
    ctx!.lineTo(headX - 1, headY + 12)
    ctx!.lineTo(headX + 3, headY + 4)
    ctx!.stroke()

    // Body (seated, leaning forward thoughtfully)
    ctx!.beginPath()
    ctx!.moveTo(headX, headY + 6)
    ctx!.lineTo(headX - 3, groundY - 15)
    ctx!.stroke()

    // Arm on chin (thinking pose)
    ctx!.beginPath()
    ctx!.moveTo(headX - 3, groundY - 20)
    ctx!.lineTo(headX + 8, groundY - 25)
    ctx!.lineTo(headX + 2, headY + 5)
    ctx!.stroke()

    // Other arm resting
    ctx!.beginPath()
    ctx!.moveTo(headX - 3, groundY - 20)
    ctx!.lineTo(headX - 15, groundY - 12)
    ctx!.stroke()

    // Legs (seated on rock)
    ctx!.beginPath()
    ctx!.moveTo(headX - 3, groundY - 15)
    ctx!.lineTo(headX + 10, groundY - 10)
    ctx!.lineTo(headX + 8, groundY)
    ctx!.moveTo(headX - 3, groundY - 15)
    ctx!.lineTo(headX - 10, groundY - 8)
    ctx!.lineTo(headX - 12, groundY)
    ctx!.stroke()

    // Small sitting rock
    ctx!.fillStyle = '#5a5a5a'
    ctx!.beginPath()
    ctx!.ellipse(headX - 2, groundY - 8, 12, 6, 0, 0, Math.PI * 2)
    ctx!.fill()

    // Thought bubble with rotating quotes
    const thoughts = ['The unexamined life\nis not worth living', 'I know that\nI know nothing', 'One must imagine\nSisyphus happy', 'Man is the measure\nof all things']
    const idx = (s.thoughtIndex || 0) % thoughts.length
    const fadePhase = (s.thoughtTimer || 0) % 5
    let alpha = 1
    if (fadePhase < 0.5) alpha = fadePhase * 2
    else if (fadePhase > 4.5) alpha = (5 - fadePhase) * 2

    drawBubble(headX, headY, thoughts[idx], 'thought', {
      alpha: alpha * 0.8, font: '9px monospace', maxWidth: 120, offsetX: 15, offsetY: -30
    })

    // Label
    ctx!.fillStyle = '#666'
    ctx!.font = '9px monospace'
    ctx!.fillText('Socrates', screenX - 18, groundY + 12)
  }

  function drawMountainGoat(screenX: number, groundY: number, obstacle: Obstacle) {
    const s = obstacle.state

    // Ledge
    ctx!.fillStyle = '#4a4a4a'
    ctx!.beginPath()
    ctx!.moveTo(screenX - 20, groundY)
    ctx!.lineTo(screenX - 25, groundY + 8)
    ctx!.lineTo(screenX + 25, groundY + 8)
    ctx!.lineTo(screenX + 20, groundY)
    ctx!.closePath()
    ctx!.fill()

    ctx!.strokeStyle = '#ddd'
    ctx!.lineWidth = 2

    const goatX = screenX
    const goatY = groundY - 5

    // Body
    ctx!.beginPath()
    ctx!.ellipse(goatX, goatY - 12, 12, 7, 0, 0, Math.PI * 2)
    ctx!.stroke()

    // Head
    ctx!.beginPath()
    ctx!.arc(goatX + 14, goatY - 18, 5, 0, Math.PI * 2)
    ctx!.stroke()

    // Horns
    ctx!.beginPath()
    ctx!.moveTo(goatX + 12, goatY - 22)
    ctx!.quadraticCurveTo(goatX + 8, goatY - 30, goatX + 5, goatY - 26)
    ctx!.moveTo(goatX + 16, goatY - 22)
    ctx!.quadraticCurveTo(goatX + 20, goatY - 30, goatX + 23, goatY - 26)
    ctx!.stroke()

    // Eyes (with blink)
    if (!s.blinking) {
      ctx!.fillStyle = '#fff'
      ctx!.beginPath()
      ctx!.arc(goatX + 16, goatY - 19, 2, 0, Math.PI * 2)
      ctx!.fill()
      ctx!.fillStyle = '#000'
      ctx!.beginPath()
      ctx!.arc(goatX + 16, goatY - 19, 1, 0, Math.PI * 2)
      ctx!.fill()
    } else {
      ctx!.beginPath()
      ctx!.moveTo(goatX + 14, goatY - 19)
      ctx!.lineTo(goatX + 18, goatY - 19)
      ctx!.stroke()
    }

    // Goatee
    ctx!.beginPath()
    ctx!.moveTo(goatX + 17, goatY - 14)
    ctx!.lineTo(goatX + 19, goatY - 10)
    ctx!.stroke()

    // Legs
    ctx!.beginPath()
    ctx!.moveTo(goatX - 8, goatY - 6)
    ctx!.lineTo(goatX - 8, goatY)
    ctx!.moveTo(goatX - 4, goatY - 6)
    ctx!.lineTo(goatX - 4, goatY)
    ctx!.moveTo(goatX + 4, goatY - 6)
    ctx!.lineTo(goatX + 4, goatY)
    ctx!.moveTo(goatX + 8, goatY - 6)
    ctx!.lineTo(goatX + 8, goatY)
    ctx!.stroke()

    // Tail
    ctx!.beginPath()
    ctx!.moveTo(goatX - 12, goatY - 14)
    ctx!.lineTo(goatX - 16, goatY - 18)
    ctx!.stroke()
  }

  function drawAvalancheWarning(screenX: number, groundY: number, obstacle: Obstacle) {
    const s = obstacle.state

    // Danger sign
    ctx!.fillStyle = '#cc3300'
    ctx!.beginPath()
    ctx!.moveTo(screenX, groundY - 55)
    ctx!.lineTo(screenX - 15, groundY - 30)
    ctx!.lineTo(screenX + 15, groundY - 30)
    ctx!.closePath()
    ctx!.fill()

    // Sign border
    ctx!.strokeStyle = '#ffcc00'
    ctx!.lineWidth = 2
    ctx!.beginPath()
    ctx!.moveTo(screenX, groundY - 52)
    ctx!.lineTo(screenX - 12, groundY - 32)
    ctx!.lineTo(screenX + 12, groundY - 32)
    ctx!.closePath()
    ctx!.stroke()

    // Exclamation mark
    ctx!.fillStyle = '#ffcc00'
    ctx!.font = 'bold 14px monospace'
    ctx!.fillText('!', screenX - 3, groundY - 36)

    // Sign post
    ctx!.fillStyle = '#5c4033'
    ctx!.fillRect(screenX - 2, groundY - 30, 4, 30)

    // Falling rocks
    if (s.fallingRocks) {
      ctx!.fillStyle = '#6a6a6a'
      for (const rock of s.fallingRocks) {
        ctx!.save()
        ctx!.translate(screenX + rock.x, groundY + rock.y)
        ctx!.rotate(rock.rotation)
        ctx!.beginPath()
        ctx!.ellipse(0, 0, rock.size, rock.size * 0.7, 0, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.restore()
      }
    }

    // Text label
    ctx!.fillStyle = '#cc3300'
    ctx!.font = '7px monospace'
    ctx!.fillText('DANGER', screenX - 16, groundY - 58)
  }

  function drawTheMuses(screenX: number, groundY: number, obstacle: Obstacle) {
    const s = obstacle.state
    const laugh = s.laughPhase || 0

    // Ledge
    ctx!.fillStyle = '#4a4a4a'
    ctx!.beginPath()
    ctx!.moveTo(screenX - 35, groundY - 5)
    ctx!.lineTo(screenX - 40, groundY + 5)
    ctx!.lineTo(screenX + 40, groundY + 5)
    ctx!.lineTo(screenX + 35, groundY - 5)
    ctx!.closePath()
    ctx!.fill()

    // Three muse figures
    for (let i = 0; i < 3; i++) {
      const mx = screenX - 20 + i * 20
      const bounce = Math.sin(laugh + i * 1.2) * 3
      const headY = groundY - 40 + bounce
      const armAngle = Math.sin(laugh + i * 0.8) * 0.3

      ctx!.strokeStyle = '#fff'
      ctx!.lineWidth = 2

      // Head
      ctx!.beginPath()
      ctx!.arc(mx, headY, 5, 0, Math.PI * 2)
      ctx!.stroke()

      // Body
      ctx!.beginPath()
      ctx!.moveTo(mx, headY + 5)
      ctx!.lineTo(mx, groundY - 12)
      ctx!.stroke()

      // Pointing arm (toward player direction)
      ctx!.beginPath()
      ctx!.moveTo(mx, headY + 10)
      ctx!.lineTo(mx - 12 - Math.sin(armAngle) * 5, headY + 5 + Math.cos(armAngle) * 3)
      ctx!.stroke()

      // Other arm (on hip or gesturing)
      ctx!.beginPath()
      ctx!.moveTo(mx, headY + 10)
      ctx!.lineTo(mx + 8, groundY - 15 + bounce)
      ctx!.stroke()

      // Legs
      ctx!.beginPath()
      ctx!.moveTo(mx, groundY - 12)
      ctx!.lineTo(mx - 6, groundY - 5)
      ctx!.moveTo(mx, groundY - 12)
      ctx!.lineTo(mx + 6, groundY - 5)
      ctx!.stroke()

      // Laughing mouth (open)
      const mouthOpen = Math.abs(Math.sin(laugh * 2 + i)) * 3
      ctx!.beginPath()
      ctx!.arc(mx, headY + 2, 2, 0, Math.PI)
      ctx!.stroke()
      if (mouthOpen > 1) {
        ctx!.fillStyle = '#000'
        ctx!.beginPath()
        ctx!.ellipse(mx, headY + 2, 2, mouthOpen * 0.5, 0, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    // "HA HA HA" text floating up
    const haAlpha = (Math.sin(laugh * 0.5) + 1) * 0.3 + 0.2
    ctx!.fillStyle = '#fff'
    ctx!.globalAlpha = haAlpha
    ctx!.font = '9px monospace'
    const haY = groundY - 50 + Math.sin(laugh * 0.8) * 5
    ctx!.fillText('HA HA HA!', screenX - 22, haY)
    ctx!.globalAlpha = 1

    // Label
    ctx!.fillStyle = '#666'
    ctx!.font = '9px monospace'
    ctx!.fillText('The Muses', screenX - 22, groundY + 16)
  }

  function drawOverlayObstacles(width: number, height: number) {
    if (!ctx) return

    world.obstacles.forEach(obstacle => {
      const screenX = obstacle.worldX - world.worldScrollX
      if (screenX < -200 || screenX > width + 200) return

      const groundY = hillY(screenX, height)
      const s = obstacle.state

      switch (obstacle.type) {
        case 'attack_birds': {
          if (!s.triggered || s.triggerComplete || !s.attackBirds) break
          ctx!.strokeStyle = '#fff'
          ctx!.lineWidth = 1.5
          for (const bird of s.attackBirds) {
            const bx = screenX + bird.x
            const by = groundY + bird.y
            const flapY = Math.sin(bird.phase) * 5
            ctx!.beginPath()
            ctx!.moveTo(bx - 6, by + flapY)
            ctx!.lineTo(bx, by)
            ctx!.lineTo(bx + 6, by + flapY)
            ctx!.stroke()
          }
          // Angry squawks
          if ((s.triggerTimer || 0) < 2) {
            ctx!.fillStyle = '#fff'
            ctx!.font = '9px monospace'
            ctx!.globalAlpha = Math.max(0, 1 - (s.triggerTimer || 0) * 0.5)
            ctx!.fillText('SQUAWK!', screenX - 15, groundY - 90)
            ctx!.globalAlpha = 1
          }
          break
        }
        case 'storm_cloud': {
          if (!s.triggered || s.triggerComplete) break

          // Dark cloud
          ctx!.fillStyle = 'rgba(40, 40, 50, 0.8)'
          ctx!.beginPath()
          ctx!.arc(screenX, groundY - 100, 35, 0, Math.PI * 2)
          ctx!.arc(screenX - 25, groundY - 90, 25, 0, Math.PI * 2)
          ctx!.arc(screenX + 30, groundY - 92, 28, 0, Math.PI * 2)
          ctx!.fill()

          // Rain
          if (s.raindrops) {
            ctx!.strokeStyle = 'rgba(150, 180, 255, 0.6)'
            ctx!.lineWidth = 1
            for (const drop of s.raindrops) {
              ctx!.beginPath()
              ctx!.moveTo(screenX + drop.x, groundY + drop.y)
              ctx!.lineTo(screenX + drop.x - 1, groundY + drop.y + 6)
              ctx!.stroke()
            }
          }

          // Lightning
          if (s.lightningFlash && s.lightningFlash > 0) {
            ctx!.strokeStyle = `rgba(255, 255, 200, ${s.lightningFlash})`
            ctx!.lineWidth = 3
            ctx!.beginPath()
            const lx = screenX + (Math.random() - 0.5) * 20
            ctx!.moveTo(lx, groundY - 70)
            ctx!.lineTo(lx - 10, groundY - 40)
            ctx!.lineTo(lx + 5, groundY - 35)
            ctx!.lineTo(lx - 8, groundY - 5)
            ctx!.stroke()

            // Screen flash
            ctx!.fillStyle = `rgba(255, 255, 255, ${s.lightningFlash * 0.15})`
            ctx!.fillRect(0, 0, width, height)
          }
          break
        }
        case 'alien_laser': {
          if (!s.triggered || s.triggerComplete) break

          const ufoY = s.ufoY || 80

          // UFO body
          ctx!.fillStyle = '#555'
          ctx!.beginPath()
          ctx!.ellipse(screenX, groundY - ufoY, 28, 9, 0, 0, Math.PI * 2)
          ctx!.fill()

          // UFO dome
          ctx!.fillStyle = '#88f'
          ctx!.beginPath()
          ctx!.ellipse(screenX, groundY - ufoY - 7, 13, 10, 0, Math.PI, 0)
          ctx!.fill()

          // Rotating lights
          ctx!.fillStyle = '#0f0'
          for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI + s.animTimer * 6
            ctx!.beginPath()
            ctx!.arc(screenX + Math.cos(angle) * 22, groundY - ufoY + 2, 2.5, 0, Math.PI * 2)
            ctx!.fill()
          }

          // Laser beam
          if (s.laserActive) {
            const laserAngle = s.laserAngle || 0
            const sweepX = Math.sin(laserAngle) * 60
            ctx!.save()
            ctx!.strokeStyle = 'rgba(0, 255, 0, 0.7)'
            ctx!.lineWidth = 3
            ctx!.shadowColor = '#0f0'
            ctx!.shadowBlur = 10
            ctx!.beginPath()
            ctx!.moveTo(screenX, groundY - ufoY + 9)
            ctx!.lineTo(screenX + sweepX, groundY)
            ctx!.stroke()

            // Ground impact glow
            const impactGlow = ctx!.createRadialGradient(screenX + sweepX, groundY, 0, screenX + sweepX, groundY, 20)
            impactGlow.addColorStop(0, 'rgba(0, 255, 0, 0.4)')
            impactGlow.addColorStop(1, 'rgba(0, 255, 0, 0)')
            ctx!.fillStyle = impactGlow
            ctx!.beginPath()
            ctx!.arc(screenX + sweepX, groundY, 20, 0, Math.PI * 2)
            ctx!.fill()
            ctx!.restore()
          }
          break
        }
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
          ctx.font = '10px monospace'
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
      ctx.font = '12px monospace'
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
    ctx.font = '11px monospace'
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
          alpha, font: '10px monospace', maxWidth: 150, offsetX: -60, offsetY: -40
        })
      } else {
        // Sisyphus speech — draw near the player position
        const playerScreenX = world.worldDistance - world.worldScrollX
        const playerY = hillY(playerScreenX, height) - 50
        drawBubble(playerScreenX, playerY, ex.text, 'speech', {
          alpha, font: '10px monospace', maxWidth: 150, offsetX: 20, offsetY: -30
        })
      }
    }

    ctx.fillStyle = '#666'
    ctx.font = '10px monospace'
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

  function drawBirds() {
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
  }

  function drawExclamations(width: number, height: number) {
    if (!ctx) return

    const boulderScreenX = world.boulderDistance - world.worldScrollX
    const boulderY = hillY(boulderScreenX, height) - 29

    if (world.currentBoulderExclamation && world.boulderExclamationTimer > 0 &&
        (gameState.value === 'rolling_back' || gameState.value === 'rolling_over' || gameState.value === 'crushing')) {
      const alpha = Math.min(1, world.boulderExclamationTimer)
      drawBubble(boulderScreenX, boulderY, world.currentBoulderExclamation, 'speech', {
        alpha, font: 'bold 14px monospace', offsetX: -10, offsetY: -50
      })
    }

    if (world.currentSisyphusExclamation && world.sisyphusExclamationTimer > 0 && gameState.value === 'rolling_over') {
      const sisScreenX = boulderScreenX + world.sisyphusTumbleX
      const sisY = hillY(sisScreenX, height) - 30
      const alpha = Math.min(1, world.sisyphusExclamationTimer)
      drawBubble(sisScreenX, sisY, world.currentSisyphusExclamation, 'speech', {
        alpha, font: '12px monospace', offsetX: -10, offsetY: -40
      })
    }
  }

  function drawThoughtBubble(width: number, height: number) {
    if (!ctx || !world.currentThought || gameState.value !== 'playing') return

    const playerScreenX = world.worldDistance - world.worldScrollX
    const playerY = hillY(playerScreenX, height)
    const headY = playerY - 50

    const alpha = world.currentThought.timer < 0.5 ? world.currentThought.timer * 2 : world.currentThought.fadeIn
    drawBubble(playerScreenX, headY, world.currentThought.text, 'thought', {
      alpha, offsetX: 30, offsetY: -40
    })
  }

  function drawFinalThought(width: number, height: number) {
    if (!ctx || gameState.value !== 'final_thought') return

    const alpha = Math.min(1, world.finalThoughtTimer * 2)
    const boulderScreenX = world.boulderDistance - world.worldScrollX
    const boulderY = hillY(boulderScreenX, height) - 29

    drawBubble(boulderScreenX, boulderY, world.currentFinalThought + '\n- The Boulder', 'thought', {
      alpha, font: '14px monospace', maxWidth: 220, offsetX: -60, offsetY: -60
    })
  }

  function drawSisyphusAndBoulder(width: number, height: number) {
    if (!ctx) return

    const boulderRadius = 26

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

    const boulderBaseY = hillY(boulderScreenX, height) - boulderRadius - 3
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

    // Rollback - Sisyphus lying flat at crush position
    if (gameState.value === 'rolling_back') {
      const crushScreenX = world.sisyphusCrushWorldX - world.worldScrollX
      if (crushScreenX > -50 && crushScreenX < (gameCanvas.value?.width || 800) + 50) {
        const crushY = hillY(crushScreenX, height)
        ctx.save()
        ctx.translate(crushScreenX, 0)
        ctx.scale(world.pushDir, 1)
        ctx.translate(-crushScreenX, 0)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(crushScreenX - 15, crushY - 3)
        ctx.lineTo(crushScreenX + 18, crushY - 4)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(crushScreenX - 20, crushY - 5, 5, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(crushScreenX - 5, crushY - 4)
        ctx.lineTo(crushScreenX - 12, crushY - 14)
        ctx.moveTo(crushScreenX + 8, crushY - 4)
        ctx.lineTo(crushScreenX + 5, crushY - 16)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(crushScreenX + 18, crushY - 4)
        ctx.lineTo(crushScreenX + 28, crushY - 2)
        ctx.moveTo(crushScreenX + 18, crushY - 4)
        ctx.lineTo(crushScreenX + 25, crushY + 5)
        ctx.stroke()
        ctx.restore()
      }
      return
    }
    if (gameState.value === 'final_thought') return
    if (feetScreenX < -50) return

    // Flattened (crushed)
    if (world.sisyphusFlattened && gameState.value === 'crushing') {
      const crushScreenX = world.sisyphusCrushWorldX - world.worldScrollX
      const crushY = hillY(crushScreenX, height)
      ctx.save()
      ctx.translate(crushScreenX, 0)
      ctx.scale(world.pushDir, 1)
      ctx.translate(-crushScreenX, 0)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2

      ctx.beginPath()
      ctx.moveTo(crushScreenX - 15, crushY - 3)
      ctx.lineTo(crushScreenX + 18, crushY - 4)
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(crushScreenX - 20, crushY - 5, 5, 0, Math.PI * 2)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(crushScreenX - 5, crushY - 4)
      ctx.lineTo(crushScreenX - 12, crushY - 14)
      ctx.moveTo(crushScreenX + 8, crushY - 4)
      ctx.lineTo(crushScreenX + 5, crushY - 16)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(crushScreenX + 18, crushY - 4)
      ctx.lineTo(crushScreenX + 28, crushY - 2)
      ctx.moveTo(crushScreenX + 18, crushY - 4)
      ctx.lineTo(crushScreenX + 25, crushY + 5)
      ctx.stroke()
      ctx.restore()
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
            font: '12px monospace', offsetX: -20, offsetY: -50
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
        ctx.save()
        ctx.translate(feetScreenX, 0)
        ctx.scale(pd, 1)
        ctx.translate(-feetScreenX, 0)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(feetScreenX - 15, groundY - 5)
        ctx.lineTo(feetScreenX + 20, groundY - 3)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(feetScreenX + 25, groundY - 5, 6, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(feetScreenX, groundY - 5)
        ctx.lineTo(feetScreenX - 10, groundY - 15)
        ctx.moveTo(feetScreenX + 10, groundY - 4)
        ctx.lineTo(feetScreenX + 15, groundY - 18)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(feetScreenX - 15, groundY - 5)
        ctx.lineTo(feetScreenX - 25, groundY - 2)
        ctx.moveTo(feetScreenX - 15, groundY - 5)
        ctx.lineTo(feetScreenX - 20, groundY + 5)
        ctx.stroke()
        ctx.restore()
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
    const renderGap = 40 * Math.max(0.25, Math.pow(Math.cos(slopeAngle), 1.5))
    feetScreenX = boulderScreenX - renderGap * world.pushDir
    const renderFeetY = hillY(feetScreenX, height)

    // Mirror when pushDir < 0
    ctx.save()
    ctx.translate(feetScreenX, 0)
    ctx.scale(world.pushDir, 1)
    ctx.translate(-feetScreenX, 0)

    const effectiveWorldDist = world.pushDir > 0 ? world.worldDistance : 2 * PEAK_DISTANCE - world.worldDistance
    const currentAngle = getAngleAtDistance(effectiveWorldDist)
    const leanAngle = 20 + currentAngle * 0.8
    const leanRad = leanAngle * Math.PI / 180

    const bodyLength = 28
    const breathing = Math.sin(world.breathPhase) * 1

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.5

    const legCycle = Math.sin(world.legPhase)
    const footBackX = feetScreenX - 10 - Math.abs(legCycle) * 8
    const footFrontX = feetScreenX + 8 + Math.abs(Math.sin(world.legPhase + Math.PI)) * 6
    const footY = renderFeetY

    const hipX = feetScreenX
    const hipY = renderFeetY - 18

    const shoulderX = hipX + Math.sin(leanRad) * bodyLength
    const shoulderY = hipY - Math.cos(leanRad) * bodyLength + breathing

    const headRadius = 6
    const headBob = Math.sin(world.legPhase * 0.5) * 1.5
    const headX = shoulderX + 2 + headBob
    const headY = shoulderY - headRadius - 4 + breathing

    // Boulder center in local (mirrored) coordinate space
    const localBoulderCenterX = feetScreenX + (boulderX - feetScreenX) * world.pushDir
    const localBoulderCenterY = boulderY

    // Fixed-length arms aimed toward boulder center
    const UPPER_ARM = 14
    const FOREARM = 14
    const toBoulderDx = localBoulderCenterX - shoulderX
    const toBoulderDy = localBoulderCenterY - shoulderY
    const toBoulderDist = Math.sqrt(toBoulderDx * toBoulderDx + toBoulderDy * toBoulderDy) || 1
    const armDirX = toBoulderDx / toBoulderDist
    const armDirY = toBoulderDy / toBoulderDist

    // Elbow: upper arm along direction with perpendicular bend
    const perpX = -armDirY
    const perpY = armDirX
    const bendAmount = 4 + Math.sin(world.gameTime * 6) * 2
    const elbowX = shoulderX + armDirX * UPPER_ARM + perpX * bendAmount
    const elbowY = shoulderY + armDirY * UPPER_ARM + perpY * bendAmount

    // Hand: forearm from elbow aimed toward boulder
    const eToBoulderDx = localBoulderCenterX - elbowX
    const eToBoulderDy = localBoulderCenterY - elbowY
    const eToBoulderDist = Math.sqrt(eToBoulderDx * eToBoulderDx + eToBoulderDy * eToBoulderDy) || 1
    const handX = elbowX + (eToBoulderDx / eToBoulderDist) * FOREARM
    const handY = elbowY + (eToBoulderDy / eToBoulderDist) * FOREARM

    // Legs
    ctx.beginPath()
    ctx.moveTo(hipX, hipY)
    ctx.lineTo(footBackX, footY)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(hipX, hipY)
    ctx.lineTo(footFrontX, footY)
    ctx.stroke()

    // Torso
    ctx.beginPath()
    ctx.moveTo(hipX, hipY)
    ctx.lineTo(shoulderX, shoulderY)
    ctx.stroke()

    // Arms (two arms with slight vertical offset)
    ctx.beginPath()
    ctx.moveTo(shoulderX, shoulderY - 3)
    ctx.lineTo(elbowX, elbowY - 3)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(shoulderX, shoulderY + 3)
    ctx.lineTo(elbowX, elbowY + 3)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(elbowX, elbowY - 3)
    ctx.lineTo(handX, handY - 3)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(elbowX, elbowY + 3)
    ctx.lineTo(handX, handY + 3)
    ctx.stroke()

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

  function drawCountdown(width: number, height: number) {
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

    ctx.font = isNumber ? 'bold 120px monospace' : 'bold 72px monospace'
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
      ctx.font = '16px monospace'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('[press space or click to push]', width / 2, height / 2 + 50)
      ctx.restore()
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
    drawTrees(width, height)
    drawGrass(width, height)
    drawLandmarks(width, height)
    drawHill(width, height)
    drawPrometheus(width, height)
    drawSpaceship()
    drawBirds()
    drawSisyphusAndBoulder(width, height)
    drawOverlayObstacles(width, height)
    drawExclamations(width, height)
    drawThoughtBubble(width, height)
    drawFinalThought(width, height)
    drawCountdown(width, height)
  }

  return {
    initCanvas,
    resizeCanvas,
    render,
  }
}
