import type { Ref } from 'vue'
import type { GameState } from './useGameState'
import type { Bird, Cloud, Tree, GrassTuft, Landmark } from './useGameState'
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
    pushPower: number
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
    landmarks: Landmark[]
    prometheusDistance: number
    prometheusGreeted: boolean
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

  function drawStars(width: number, height: number) {
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 100; i++) {
      const x = ((Math.sin(i * 123.456) * 0.5 + 0.5) * width * 2 - world.worldScrollX * 0.02) % width
      const y = (Math.cos(i * 789.012) * 0.5 + 0.5) * height * 0.5
      const twinkle = Math.sin(world.gameTime * 2 + i) * 0.5 + 0.5
      ctx.globalAlpha = 0.3 + twinkle * 0.7
      ctx.beginPath()
      ctx.arc(x, y, twinkle * 1.5 + 0.5, 0, Math.PI * 2)
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

    if (altitude > 1500) {
      const mountainAlpha = Math.min(0.4, (altitude - 1500) / 3000)
      ctx.fillStyle = `rgba(60, 60, 80, ${mountainAlpha})`
      ctx.beginPath()
      ctx.moveTo(0, height * 0.6)
      for (let x = 0; x < width; x += 50) {
        const peakHeight = Math.sin(x * 0.01 + world.worldScrollX * 0.0001) * 80 +
                           Math.sin(x * 0.02) * 40
        ctx.lineTo(x, height * 0.5 - peakHeight)
      }
      ctx.lineTo(width, height * 0.6)
      ctx.closePath()
      ctx.fill()
    }

    if (altitude > 500) {
      const hillAlpha = Math.min(0.3, (altitude - 500) / 2000)
      ctx.fillStyle = `rgba(40, 50, 40, ${hillAlpha})`
      ctx.beginPath()
      ctx.moveTo(0, height * 0.7)
      for (let x = 0; x < width; x += 30) {
        const hillHeight = Math.sin(x * 0.015 + world.worldScrollX * 0.0003) * 50 +
                           Math.sin(x * 0.03) * 25
        ctx.lineTo(x, height * 0.6 - hillHeight)
      }
      ctx.lineTo(width, height * 0.7)
      ctx.closePath()
      ctx.fill()
    }

    const treeLineAlpha = Math.max(0, 0.25 - altitude / 4000)
    if (treeLineAlpha > 0.02) {
      ctx.fillStyle = `rgba(20, 40, 20, ${treeLineAlpha})`
      ctx.beginPath()
      ctx.moveTo(0, height * 0.8)
      for (let x = 0; x < width; x += 15) {
        const treeHeight = Math.sin(x * 0.05 + world.worldScrollX * 0.001) * 20 +
                           Math.abs(Math.sin(x * 0.1)) * 15
        ctx.lineTo(x, height * 0.75 - treeHeight)
      }
      ctx.lineTo(width, height * 0.8)
      ctx.closePath()
      ctx.fill()
    }
  }

  function drawTrees(width: number, height: number) {
    if (!ctx) return

    world.trees.forEach(tree => {
      const screenX = tree.worldX - world.worldScrollX
      if (screenX < -50 || screenX > width + 50) return

      const groundY = hillY(screenX, height)
      const size = tree.size

      if (tree.worldX > world.boulderDistance + 200) return

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

    world.landmarks.forEach(landmark => {
      const screenX = landmark.worldX - world.worldScrollX
      if (screenX < -100 || screenX > width + 100) return

      const groundY = hillY(screenX, height)

      if (landmark.type === 'souvlaki') {
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
      } else if (landmark.type === 'sign') {
        ctx!.fillStyle = '#5c4033'
        ctx!.fillRect(screenX - 2, groundY - 40, 4, 40)
        ctx!.fillRect(screenX - 25, groundY - 50, 50, 20)
        ctx!.fillStyle = '#fff'
        ctx!.font = '7px monospace'
        const signs = ['KEEP GOING', 'ALMOST THERE', 'NO REFUNDS', 'WHY?']
        ctx!.fillText(signs[Math.floor(landmark.worldX / 5000) % signs.length], screenX - 20, groundY - 38)
      } else if (landmark.type === 'bench') {
        ctx!.fillStyle = '#654321'
        ctx!.fillRect(screenX - 20, groundY - 15, 40, 5)
        ctx!.fillRect(screenX - 18, groundY - 15, 3, 15)
        ctx!.fillRect(screenX + 15, groundY - 15, 3, 15)
        ctx!.fillRect(screenX - 20, groundY - 25, 40, 3)
      } else if (landmark.type === 'rock') {
        ctx!.fillStyle = '#5a5a5a'
        ctx!.beginPath()
        ctx!.ellipse(screenX, groundY - 10, 20, 12, 0, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.fillStyle = '#4a4a4a'
        ctx!.beginPath()
        ctx!.ellipse(screenX - 5, groundY - 12, 8, 6, 0.3, 0, Math.PI * 2)
        ctx!.fill()
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
      const screenX = markerWorldX - world.worldScrollX
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

    // Rock
    ctx.fillStyle = '#555'
    ctx.beginPath()
    ctx.moveTo(embedX - 40 * scale, groundY)
    ctx.lineTo(embedX + 30 * scale, groundY - 10)
    ctx.lineTo(embedX + 40 * scale, embedY + 25 * scale)
    ctx.lineTo(embedX - 30 * scale, embedY + 35 * scale)
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

    // Greeting
    const sisyphusNearby = Math.abs(world.boulderDistance - world.prometheusDistance) < 80
    if (sisyphusNearby && !world.prometheusGreeted && gameState.value === 'playing') {
      world.prometheusGreeted = true
    }

    if (world.prometheusGreeted && world.boulderDistance > world.prometheusDistance && world.boulderDistance < world.prometheusDistance + 200) {
      drawBubble(embedX, embedY - 15 * scale, "Hey pal... hope you're taking care of yourself!", 'speech', {
        font: '10px monospace', maxWidth: 140, offsetX: -60, offsetY: -40
      })
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
    const centerX = width / 2
    const centerY = height / 2

    drawBubble(centerX, centerY + 30, world.currentFinalThought + '\n- The Boulder', 'thought', {
      alpha, font: '14px monospace', maxWidth: 220, offsetX: -120, offsetY: -80
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
        feetScreenX = boulderScreenX - 50
      } else {
        feetScreenX = boulderScreenX + 50
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
      }
      return
    }
    if (gameState.value === 'final_thought') return
    if (feetScreenX < -50) return

    // Flattened (crushed)
    if (world.sisyphusFlattened && gameState.value === 'crushing') {
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      const crushScreenX = world.sisyphusCrushWorldX - world.worldScrollX
      const crushY = hillY(crushScreenX, height)

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
      return
    }

    // Continue prompt - face-planted
    if (gameState.value === 'continue_prompt') {
      const groundY = hillY(feetScreenX, height)
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2

      const facingRight = !continueFromPeak.value
      const dir = facingRight ? 1 : -1

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

      // Walk toward boulder: after crush he's to the right, after peak he's to the left
      const walkingLeft = !continueFromPeak.value
      const dir = walkingLeft ? -1 : 1

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

      if (world.sisyphusFallen) {
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
        return
      }

      if (world.sisyphusRunning) {
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
        return
      }

      // Tumbling
      ctx.save()
      ctx.translate(feetScreenX, groundY - 20)
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
    const currentAngle = getAngleAtDistance(world.worldDistance)
    const leanAngle = 35 + (currentAngle * 0.3)
    const leanRad = leanAngle * Math.PI / 180

    const bodyLength = 28
    const breathing = Math.sin(world.breathPhase) * 1

    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.5

    const legCycle = Math.sin(world.legPhase)
    const footBackX = feetScreenX - 10 - Math.abs(legCycle) * 8
    const footFrontX = feetScreenX + 8 + Math.abs(Math.sin(world.legPhase + Math.PI)) * 6
    const footY = feetY

    const hipX = feetScreenX
    const hipY = feetY - 18

    const shoulderX = hipX + Math.sin(leanRad) * bodyLength
    const shoulderY = hipY - Math.cos(leanRad) * bodyLength + breathing

    const headRadius = 6
    const headBob = Math.sin(world.legPhase * 0.5) * 1.5
    const headX = shoulderX + 2 + headBob
    const headY = shoulderY - headRadius - 4 + breathing

    const armPushCycle = Math.sin(world.gameTime * 6) * 0.3 + world.armPhase * 0.5
    const armExtension = 18 + armPushCycle * 8

    const elbowOffsetX = 12
    const elbowOffsetY = 4 + Math.sin(world.gameTime * 6) * 3
    const elbowX = shoulderX + elbowOffsetX
    const elbowY = shoulderY + elbowOffsetY

    const handX = shoulderX + armExtension
    const handY = shoulderY + 2 + Math.sin(world.gameTime * 6 + 0.5) * 4

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

    // Arms
    ctx.beginPath()
    ctx.moveTo(shoulderX, shoulderY - 3)
    ctx.lineTo(elbowX, elbowY - 4)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(shoulderX, shoulderY + 3)
    ctx.lineTo(elbowX, elbowY + 4)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(elbowX, elbowY - 4)
    ctx.lineTo(handX, handY - 4)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(elbowX, elbowY + 4)
    ctx.lineTo(handX, handY + 4)
    ctx.stroke()

    // Head
    ctx.beginPath()
    ctx.arc(headX, headY, headRadius, 0, Math.PI * 2)
    ctx.stroke()

    // Effort lines
    if (world.pushPower > 1) {
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
    const skyTop = `rgb(${26 + altitudeRatio * 20}, ${26 + altitudeRatio * 30}, ${46 + altitudeRatio * 40})`
    skyGradient.addColorStop(0, skyTop)
    skyGradient.addColorStop(0.5, '#1a1a4e')
    skyGradient.addColorStop(1, '#16213e')
    ctx.fillStyle = skyGradient
    ctx.fillRect(0, 0, width, height)

    drawStars(width, height)
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
