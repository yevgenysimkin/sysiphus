import type { Ref } from 'vue'
import type { Obstacle } from './useGameState'
import { philosopherThoughts } from '~/game/content'
import {
  COLORS, FONTS, DEFAULT_CULL_MARGIN, STRAY_DOG_CULL_MARGIN,
} from '~/game/constants'

interface ObstacleRendererDeps {
  ctx: () => CanvasRenderingContext2D | null
  gameCanvas: Ref<HTMLCanvasElement | null>
  world: {
    worldScrollX: number
    gameTime: number
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
    ctx.fillStyle = '#8b4513'
    ctx.fillRect(screenX - 25, groundY - 50, 50, 50)
    ctx.fillStyle = '#c41e3a'
    ctx.beginPath()
    ctx.moveTo(screenX - 35, groundY - 50)
    ctx.lineTo(screenX + 35, groundY - 50)
    ctx.lineTo(screenX + 30, groundY - 65)
    ctx.lineTo(screenX - 30, groundY - 65)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = FONTS.xs
    ctx.fillText('SOUVLAKI', screenX - 22, groundY - 30)
    ctx.fillText('(closed)', screenX - 18, groundY - 20)
  }
  function drawSign(screenX: number, groundY: number, worldX: number) {
    const ctx = getCtx()!
    ctx.fillStyle = '#5c4033'
    ctx.fillRect(screenX - 2, groundY - 40, 4, 40)
    ctx.fillRect(screenX - 25, groundY - 50, 50, 20)
    ctx.fillStyle = '#fff'
    ctx.font = FONTS.tiny
    const signs = ['KEEP GOING', 'ALMOST THERE', 'NO REFUNDS', 'WHY?']
    ctx.fillText(signs[Math.floor(worldX / 5000) % signs.length], screenX - 20, groundY - 38)
  }
  function drawBench(screenX: number, groundY: number) {
    const ctx = getCtx()!
    ctx.fillStyle = '#654321'
    ctx.fillRect(screenX - 20, groundY - 15, 40, 5)
    ctx.fillRect(screenX - 18, groundY - 15, 3, 15)
    ctx.fillRect(screenX + 15, groundY - 15, 3, 15)
    ctx.fillRect(screenX - 20, groundY - 25, 40, 3)
  }
  function drawRock(screenX: number, groundY: number) {
    const ctx = getCtx()!
    ctx.fillStyle = '#5a5a5a'
    ctx.beginPath()
    ctx.ellipse(screenX, groundY - 10, 20, 12, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#4a4a4a'
    ctx.beginPath()
    ctx.ellipse(screenX - 5, groundY - 12, 8, 6, 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
  function drawStrayDog(screenX: number, origGroundY: number, obstacle: Obstacle) {
    const ctx = getCtx()!
    const s = obstacle.state
    const dogOffsetX = s.dogX || 0
    const x = screenX + dogOffsetX
    const fled = s.dogFled

    if (fled && Math.abs(dogOffsetX) > 600) return

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

    ctx.strokeStyle = '#ddd'
    ctx.lineWidth = 2

    const legAnim = fled ? Math.sin(s.animTimer * 20) * 6 : Math.sin(s.animTimer * 3) * 2
    const tailWag = Math.sin(s.animTimer * (fled ? 15 : 5)) * 0.4

    // Body
    ctx.beginPath()
    ctx.moveTo(x - 12, groundY - 18)
    ctx.lineTo(x + 12, groundY - 18)
    ctx.stroke()

    // Head
    ctx.beginPath()
    ctx.arc(x + 16, groundY - 22, 6, 0, Math.PI * 2)
    ctx.stroke()

    // Ears
    ctx.beginPath()
    ctx.moveTo(x + 13, groundY - 27)
    ctx.lineTo(x + 11, groundY - 33)
    ctx.moveTo(x + 19, groundY - 27)
    ctx.lineTo(x + 21, groundY - 33)
    ctx.stroke()

    // Snout
    ctx.beginPath()
    ctx.moveTo(x + 22, groundY - 22)
    ctx.lineTo(x + 26, groundY - 20)
    ctx.stroke()

    // Front legs
    ctx.beginPath()
    ctx.moveTo(x + 8, groundY - 18)
    ctx.lineTo(x + 8 + legAnim, groundY)
    ctx.moveTo(x + 4, groundY - 18)
    ctx.lineTo(x + 4 - legAnim, groundY)
    ctx.stroke()

    // Back legs
    ctx.beginPath()
    ctx.moveTo(x - 8, groundY - 18)
    ctx.lineTo(x - 8 + legAnim, groundY)
    ctx.moveTo(x - 12, groundY - 18)
    ctx.lineTo(x - 12 - legAnim, groundY)
    ctx.stroke()

    // Tail
    ctx.beginPath()
    ctx.moveTo(x - 12, groundY - 18)
    ctx.quadraticCurveTo(x - 18, groundY - 28 + Math.sin(tailWag) * 4, x - 22, groundY - 30 + Math.sin(tailWag) * 6)
    ctx.stroke()

    // Bark indicator
    if (!fled && s.dogBarkTimer !== undefined && s.dogBarkTimer < 0.5) {
      ctx.fillStyle = '#fff'
      ctx.font = FONTS.base
      ctx.fillText('WOOF!', x + 5, groundY - 38)
    }

    ctx.restore()
  }
  function drawCampfire(screenX: number, groundY: number, obstacle: Obstacle) {
    const ctx = getCtx()!
    const s = obstacle.state

    // Logs
    ctx.strokeStyle = '#654321'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(screenX - 15, groundY)
    ctx.lineTo(screenX + 5, groundY - 8)
    ctx.moveTo(screenX + 15, groundY)
    ctx.lineTo(screenX - 5, groundY - 8)
    ctx.stroke()

    // Flames
    const t = s.animTimer
    for (let i = 0; i < 5; i++) {
      const flicker = Math.sin(t * 10 + i * 1.5) * 3
      const h = 12 + Math.sin(t * 8 + i * 2) * 5
      const fx = screenX - 6 + i * 3 + flicker
      const colors = ['#ff4500', '#ff6b00', '#ffaa00', '#ffcc00', '#ff8800']
      ctx.fillStyle = colors[i]
      ctx.beginPath()
      ctx.moveTo(fx - 3, groundY - 6)
      ctx.quadraticCurveTo(fx + flicker, groundY - 6 - h, fx + 3, groundY - 6)
      ctx.fill()
    }

    // Glow
    const glow = ctx.createRadialGradient(screenX, groundY - 10, 5, screenX, groundY - 10, 40)
    glow.addColorStop(0, 'rgba(255, 150, 50, 0.15)')
    glow.addColorStop(1, 'rgba(255, 100, 0, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(screenX, groundY - 10, 40, 0, Math.PI * 2)
    ctx.fill()

    // Smoke particles
    if (s.smokeParticles) {
      ctx.fillStyle = 'rgba(200, 200, 200, 0.3)'
      for (const p of s.smokeParticles) {
        ctx.globalAlpha = p.alpha
        ctx.beginPath()
        ctx.arc(screenX + p.x, groundY - 20 + p.y, p.size, 0, Math.PI * 2)
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
    const treeX = screenX - 20
    const bodyReveal = peek // 0 to 1

    ctx.save()
    // Clip to only show revealed portion
    ctx.beginPath()
    ctx.rect(treeX + 10 - bodyReveal * 35, 0, bodyReveal * 60, gameCanvas.value?.height || 800)
    ctx.clip()

    ctx.strokeStyle = '#8B4513'
    ctx.lineWidth = 3

    const headX = treeX + 5
    const headY = groundY - 55

    // Big furry body
    ctx.fillStyle = '#5C3A1E'
    ctx.beginPath()
    ctx.ellipse(headX, groundY - 25, 14, 25, 0, 0, Math.PI * 2)
    ctx.fill()

    // Head
    ctx.beginPath()
    ctx.arc(headX, headY, 10, 0, Math.PI * 2)
    ctx.fill()

    // Eyes
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(headX - 3, headY - 2, 3, 0, Math.PI * 2)
    ctx.arc(headX + 3, headY - 2, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.arc(headX - 3, headY - 2, 1.5, 0, Math.PI * 2)
    ctx.arc(headX + 3, headY - 2, 1.5, 0, Math.PI * 2)
    ctx.fill()

    // Legs
    ctx.strokeStyle = '#5C3A1E'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(headX - 6, groundY - 5)
    ctx.lineTo(headX - 8, groundY)
    ctx.moveTo(headX + 6, groundY - 5)
    ctx.lineTo(headX + 8, groundY)
    ctx.stroke()

    ctx.restore()

    // "Tree trunk" to hide behind (drawn on top for layering)
    ctx.fillStyle = '#3d2817'
    ctx.fillRect(treeX - 5, groundY - 60, 10, 60)
    ctx.fillStyle = '#1a3d1a'
    ctx.beginPath()
    ctx.moveTo(treeX, groundY - 90)
    ctx.lineTo(treeX - 18, groundY - 55)
    ctx.lineTo(treeX + 18, groundY - 55)
    ctx.closePath()
    ctx.fill()
  }
  function drawAncientRuins(screenX: number, groundY: number) {
    const ctx = getCtx()!
    ctx.fillStyle = '#8a8070'
    ctx.strokeStyle = '#6a6050'
    ctx.lineWidth = 2

    // Left column (broken)
    ctx.fillRect(screenX - 30, groundY - 45, 8, 45)
    ctx.fillRect(screenX - 34, groundY - 48, 16, 5)
    // Broken top
    ctx.beginPath()
    ctx.moveTo(screenX - 34, groundY - 48)
    ctx.lineTo(screenX - 30, groundY - 55)
    ctx.lineTo(screenX - 22, groundY - 50)
    ctx.lineTo(screenX - 18, groundY - 48)
    ctx.fill()

    // Right column (intact)
    ctx.fillRect(screenX + 15, groundY - 60, 8, 60)
    ctx.fillRect(screenX + 11, groundY - 63, 16, 5)
    // Capital
    ctx.fillRect(screenX + 10, groundY - 68, 18, 5)

    // Lintel fragment connecting them
    ctx.fillStyle = '#7a7060'
    ctx.beginPath()
    ctx.moveTo(screenX - 18, groundY - 48)
    ctx.lineTo(screenX + 10, groundY - 65)
    ctx.lineTo(screenX + 14, groundY - 63)
    ctx.lineTo(screenX - 14, groundY - 46)
    ctx.fill()

    // Scattered stones
    ctx.fillStyle = '#7a7060'
    for (const [ox, oy, r] of [[-20, -3, 5], [5, -2, 4], [-8, -4, 6], [30, -2, 3], [35, -3, 5]] as [number, number, number][]) {
      ctx.beginPath()
      ctx.ellipse(screenX + ox, groundY + oy, r, r * 0.6, 0.2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Cracks on columns
    ctx.strokeStyle = '#5a5040'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(screenX - 26, groundY - 30)
    ctx.lineTo(screenX - 28, groundY - 20)
    ctx.lineTo(screenX - 25, groundY - 10)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(screenX + 19, groundY - 40)
    ctx.lineTo(screenX + 17, groundY - 30)
    ctx.stroke()
  }
  function drawPhilosopher(screenX: number, groundY: number, obstacle: Obstacle) {
    const ctx = getCtx()!
    const s = obstacle.state
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2

    // Seated position
    const headX = screenX
    const headY = groundY - 35

    // Head
    ctx.beginPath()
    ctx.arc(headX, headY, 6, 0, Math.PI * 2)
    ctx.stroke()

    // Beard
    ctx.beginPath()
    ctx.moveTo(headX - 3, headY + 4)
    ctx.lineTo(headX - 1, headY + 12)
    ctx.lineTo(headX + 3, headY + 4)
    ctx.stroke()

    // Body (seated, leaning forward thoughtfully)
    ctx.beginPath()
    ctx.moveTo(headX, headY + 6)
    ctx.lineTo(headX - 3, groundY - 15)
    ctx.stroke()

    // Arm on chin (thinking pose)
    ctx.beginPath()
    ctx.moveTo(headX - 3, groundY - 20)
    ctx.lineTo(headX + 8, groundY - 25)
    ctx.lineTo(headX + 2, headY + 5)
    ctx.stroke()

    // Other arm resting
    ctx.beginPath()
    ctx.moveTo(headX - 3, groundY - 20)
    ctx.lineTo(headX - 15, groundY - 12)
    ctx.stroke()

    // Legs (seated on rock)
    ctx.beginPath()
    ctx.moveTo(headX - 3, groundY - 15)
    ctx.lineTo(headX + 10, groundY - 10)
    ctx.lineTo(headX + 8, groundY)
    ctx.moveTo(headX - 3, groundY - 15)
    ctx.lineTo(headX - 10, groundY - 8)
    ctx.lineTo(headX - 12, groundY)
    ctx.stroke()

    // Small sitting rock
    ctx.fillStyle = '#5a5a5a'
    ctx.beginPath()
    ctx.ellipse(headX - 2, groundY - 8, 12, 6, 0, 0, Math.PI * 2)
    ctx.fill()

    // Thought bubble with rotating quotes
    const idx = (s.thoughtIndex || 0) % philosopherThoughts.length
    const fadePhase = (s.thoughtTimer || 0) % 5
    let alpha = 1
    if (fadePhase < 0.5) alpha = fadePhase * 2
    else if (fadePhase > 4.5) alpha = (5 - fadePhase) * 2

    drawBubble(headX, headY, philosopherThoughts[idx], 'thought', {
      alpha: alpha * 0.8, font: FONTS.sm, maxWidth: 120, offsetX: 15, offsetY: -30
    })

    // Label
    ctx.fillStyle = '#666'
    ctx.font = FONTS.sm
    ctx.fillText('Socrates', screenX - 18, groundY + 12)
  }
  function drawMountainGoat(screenX: number, groundY: number, obstacle: Obstacle) {
    const ctx = getCtx()!
    const s = obstacle.state

    // Ledge
    ctx.fillStyle = '#4a4a4a'
    ctx.beginPath()
    ctx.moveTo(screenX - 20, groundY)
    ctx.lineTo(screenX - 25, groundY + 8)
    ctx.lineTo(screenX + 25, groundY + 8)
    ctx.lineTo(screenX + 20, groundY)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = '#ddd'
    ctx.lineWidth = 2

    const goatX = screenX
    const goatY = groundY - 5

    // Body
    ctx.beginPath()
    ctx.ellipse(goatX, goatY - 12, 12, 7, 0, 0, Math.PI * 2)
    ctx.stroke()

    // Head
    ctx.beginPath()
    ctx.arc(goatX + 14, goatY - 18, 5, 0, Math.PI * 2)
    ctx.stroke()

    // Horns
    ctx.beginPath()
    ctx.moveTo(goatX + 12, goatY - 22)
    ctx.quadraticCurveTo(goatX + 8, goatY - 30, goatX + 5, goatY - 26)
    ctx.moveTo(goatX + 16, goatY - 22)
    ctx.quadraticCurveTo(goatX + 20, goatY - 30, goatX + 23, goatY - 26)
    ctx.stroke()

    // Eyes (with blink)
    if (!s.blinking) {
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(goatX + 16, goatY - 19, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.arc(goatX + 16, goatY - 19, 1, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.moveTo(goatX + 14, goatY - 19)
      ctx.lineTo(goatX + 18, goatY - 19)
      ctx.stroke()
    }

    // Goatee
    ctx.beginPath()
    ctx.moveTo(goatX + 17, goatY - 14)
    ctx.lineTo(goatX + 19, goatY - 10)
    ctx.stroke()

    // Legs
    ctx.beginPath()
    ctx.moveTo(goatX - 8, goatY - 6)
    ctx.lineTo(goatX - 8, goatY)
    ctx.moveTo(goatX - 4, goatY - 6)
    ctx.lineTo(goatX - 4, goatY)
    ctx.moveTo(goatX + 4, goatY - 6)
    ctx.lineTo(goatX + 4, goatY)
    ctx.moveTo(goatX + 8, goatY - 6)
    ctx.lineTo(goatX + 8, goatY)
    ctx.stroke()

    // Tail
    ctx.beginPath()
    ctx.moveTo(goatX - 12, goatY - 14)
    ctx.lineTo(goatX - 16, goatY - 18)
    ctx.stroke()
  }
  function drawAvalancheWarning(screenX: number, groundY: number, obstacle: Obstacle) {
    const ctx = getCtx()!
    const s = obstacle.state

    // Danger sign
    ctx.fillStyle = '#cc3300'
    ctx.beginPath()
    ctx.moveTo(screenX, groundY - 55)
    ctx.lineTo(screenX - 15, groundY - 30)
    ctx.lineTo(screenX + 15, groundY - 30)
    ctx.closePath()
    ctx.fill()

    // Sign border
    ctx.strokeStyle = '#ffcc00'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(screenX, groundY - 52)
    ctx.lineTo(screenX - 12, groundY - 32)
    ctx.lineTo(screenX + 12, groundY - 32)
    ctx.closePath()
    ctx.stroke()

    // Exclamation mark
    ctx.fillStyle = '#ffcc00'
    ctx.font = FONTS.exclamationBold
    ctx.fillText('!', screenX - 3, groundY - 36)

    // Sign post
    ctx.fillStyle = '#5c4033'
    ctx.fillRect(screenX - 2, groundY - 30, 4, 30)

    // Falling rocks
    if (s.fallingRocks) {
      ctx.fillStyle = '#6a6a6a'
      for (const rock of s.fallingRocks) {
        ctx.save()
        ctx.translate(screenX + rock.x, groundY + rock.y)
        ctx.rotate(rock.rotation)
        ctx.beginPath()
        ctx.ellipse(0, 0, rock.size, rock.size * 0.7, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    // Text label
    ctx.fillStyle = '#cc3300'
    ctx.font = FONTS.tiny
    ctx.fillText('DANGER', screenX - 16, groundY - 58)
  }
  function drawTheMuses(screenX: number, groundY: number, obstacle: Obstacle) {
    const ctx = getCtx()!
    const s = obstacle.state
    const laugh = s.laughPhase || 0

    // Ledge
    ctx.fillStyle = '#4a4a4a'
    ctx.beginPath()
    ctx.moveTo(screenX - 35, groundY - 5)
    ctx.lineTo(screenX - 40, groundY + 5)
    ctx.lineTo(screenX + 40, groundY + 5)
    ctx.lineTo(screenX + 35, groundY - 5)
    ctx.closePath()
    ctx.fill()

    // Three muse figures
    for (let i = 0; i < 3; i++) {
      const mx = screenX - 20 + i * 20
      const bounce = Math.sin(laugh + i * 1.2) * 3
      const headY = groundY - 40 + bounce
      const armAngle = Math.sin(laugh + i * 0.8) * 0.3

      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2

      // Head
      ctx.beginPath()
      ctx.arc(mx, headY, 5, 0, Math.PI * 2)
      ctx.stroke()

      // Body
      ctx.beginPath()
      ctx.moveTo(mx, headY + 5)
      ctx.lineTo(mx, groundY - 12)
      ctx.stroke()

      // Pointing arm (toward player direction)
      ctx.beginPath()
      ctx.moveTo(mx, headY + 10)
      ctx.lineTo(mx - 12 - Math.sin(armAngle) * 5, headY + 5 + Math.cos(armAngle) * 3)
      ctx.stroke()

      // Other arm (on hip or gesturing)
      ctx.beginPath()
      ctx.moveTo(mx, headY + 10)
      ctx.lineTo(mx + 8, groundY - 15 + bounce)
      ctx.stroke()

      // Legs
      ctx.beginPath()
      ctx.moveTo(mx, groundY - 12)
      ctx.lineTo(mx - 6, groundY - 5)
      ctx.moveTo(mx, groundY - 12)
      ctx.lineTo(mx + 6, groundY - 5)
      ctx.stroke()

      // Laughing mouth (open)
      const mouthOpen = Math.abs(Math.sin(laugh * 2 + i)) * 3
      ctx.beginPath()
      ctx.arc(mx, headY + 2, 2, 0, Math.PI)
      ctx.stroke()
      if (mouthOpen > 1) {
        ctx.fillStyle = '#000'
        ctx.beginPath()
        ctx.ellipse(mx, headY + 2, 2, mouthOpen * 0.5, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // "HA HA HA" text floating up
    const haAlpha = (Math.sin(laugh * 0.5) + 1) * 0.3 + 0.2
    ctx.fillStyle = '#fff'
    ctx.globalAlpha = haAlpha
    ctx.font = FONTS.sm
    const haY = groundY - 50 + Math.sin(laugh * 0.8) * 5
    ctx.fillText('HA HA HA!', screenX - 22, haY)
    ctx.globalAlpha = 1

    // Label
    ctx.fillStyle = '#666'
    ctx.font = FONTS.sm
    ctx.fillText('The Muses', screenX - 22, groundY + 16)
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
      if (screenX < -200 || screenX > width + 200) return

      const groundY = hillY(screenX, height)
      const s = obstacle.state

      switch (obstacle.type) {
        case 'attack_birds': {
          if (!s.triggered || s.triggerComplete || !s.attackBirds) break
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 1.5
          for (const bird of s.attackBirds) {
            const bx = screenX + bird.x
            const by = groundY + bird.y
            const flapY = Math.sin(bird.phase) * 5
            ctx.beginPath()
            ctx.moveTo(bx - 6, by + flapY)
            ctx.lineTo(bx, by)
            ctx.lineTo(bx + 6, by + flapY)
            ctx.stroke()
          }
          // Angry squawks
          if ((s.triggerTimer || 0) < 2) {
            ctx.fillStyle = '#fff'
            ctx.font = FONTS.sm
            ctx.globalAlpha = Math.max(0, 1 - (s.triggerTimer || 0) * 0.5)
            ctx.fillText('SQUAWK!', screenX - 15, groundY - 90)
            ctx.globalAlpha = 1
          }
          break
        }
        case 'storm_cloud': {
          if (!s.triggered || s.triggerComplete) break

          // Dark cloud
          ctx.fillStyle = 'rgba(40, 40, 50, 0.8)'
          ctx.beginPath()
          ctx.arc(screenX, groundY - 100, 35, 0, Math.PI * 2)
          ctx.arc(screenX - 25, groundY - 90, 25, 0, Math.PI * 2)
          ctx.arc(screenX + 30, groundY - 92, 28, 0, Math.PI * 2)
          ctx.fill()

          // Rain
          if (s.raindrops) {
            ctx.strokeStyle = 'rgba(150, 180, 255, 0.6)'
            ctx.lineWidth = 1
            for (const drop of s.raindrops) {
              ctx.beginPath()
              ctx.moveTo(screenX + drop.x, groundY + drop.y)
              ctx.lineTo(screenX + drop.x - 1, groundY + drop.y + 6)
              ctx.stroke()
            }
          }

          // Lightning
          if (s.lightningFlash && s.lightningFlash > 0) {
            ctx.strokeStyle = `rgba(255, 255, 200, ${s.lightningFlash})`
            ctx.lineWidth = 3
            ctx.beginPath()
            const lx = screenX + (Math.random() - 0.5) * 20
            ctx.moveTo(lx, groundY - 70)
            ctx.lineTo(lx - 10, groundY - 40)
            ctx.lineTo(lx + 5, groundY - 35)
            ctx.lineTo(lx - 8, groundY - 5)
            ctx.stroke()

            // Screen flash
            ctx.fillStyle = `rgba(255, 255, 255, ${s.lightningFlash * 0.15})`
            ctx.fillRect(0, 0, width, height)
          }
          break
        }
        case 'alien_laser': {
          if (!s.triggered || s.triggerComplete) break

          const ufoY = s.ufoY || 80

          // UFO body
          ctx.fillStyle = '#555'
          ctx.beginPath()
          ctx.ellipse(screenX, groundY - ufoY, 28, 9, 0, 0, Math.PI * 2)
          ctx.fill()

          // UFO dome
          ctx.fillStyle = '#88f'
          ctx.beginPath()
          ctx.ellipse(screenX, groundY - ufoY - 7, 13, 10, 0, Math.PI, 0)
          ctx.fill()

          // Rotating lights
          ctx.fillStyle = '#0f0'
          for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI + s.animTimer * 6
            ctx.beginPath()
            ctx.arc(screenX + Math.cos(angle) * 22, groundY - ufoY + 2, 2.5, 0, Math.PI * 2)
            ctx.fill()
          }

          // Laser beam
          if (s.laserActive) {
            const laserAngle = s.laserAngle || 0
            const sweepX = Math.sin(laserAngle) * 60
            ctx.save()
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)'
            ctx.lineWidth = 3
            ctx.shadowColor = '#0f0'
            ctx.shadowBlur = 10
            ctx.beginPath()
            ctx.moveTo(screenX, groundY - ufoY + 9)
            ctx.lineTo(screenX + sweepX, groundY)
            ctx.stroke()

            // Ground impact glow
            const impactGlow = ctx.createRadialGradient(screenX + sweepX, groundY, 0, screenX + sweepX, groundY, 20)
            impactGlow.addColorStop(0, 'rgba(0, 255, 0, 0.4)')
            impactGlow.addColorStop(1, 'rgba(0, 255, 0, 0)')
            ctx.fillStyle = impactGlow
            ctx.beginPath()
            ctx.arc(screenX + sweepX, groundY, 20, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
          }
          break
        }
      }
    })
  }

  return {
    drawLandmarks,
    drawOverlayObstacles,
  }
}
