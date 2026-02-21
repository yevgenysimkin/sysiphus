import { PEAK_DISTANCE, GROUND_SCREEN_Y_OFFSET } from './usePhysics'
import { COLORS, ENVIRONMENT } from '~/game/constants'
import { PARALLAX } from '~/game/constants-rendering'

/**
 * Draws the multi-layer parallax background (mountains, hills, trees, river, shimmer).
 * Extracted from useRenderer.ts to keep file sizes under 1000 lines.
 */
export function drawParallaxBackground(
  ctx: CanvasRenderingContext2D,
  worldScrollX: number,
  gameTime: number,
  getHeightAtWorldDistance: (dist: number) => number,
  width: number,
  height: number,
  altitude: number
) {
  // Ground line on screen
  const groundY = height - GROUND_SCREEN_Y_OFFSET
  // Progress ratio: 0 at base, 1 at peak
  const maxAlt = getHeightAtWorldDistance(PEAK_DISTANCE)
  const t = Math.min(1, altitude / (maxAlt || 1))

  // --- f) Mountains (furthest, drawn first) ---
  const mt = PARALLAX.mountains
  const mtRise = t * mt.rise
  const mtBase = groundY - mtRise
  const mtScroll = worldScrollX * mt.parallax
  ctx.fillStyle = COLORS.mountainFill
  ctx.beginPath()
  ctx.moveTo(0, mtBase + mt.baseOffset)
  for (let x = 0; x <= width; x += mt.stepSize) {
    const h = Math.sin((x + mtScroll) * mt.freq1) * mt.amp1 +
              Math.sin((x + mtScroll) * mt.freq2 + mt.phase2) * mt.amp2 +
              Math.sin((x + mtScroll) * mt.freq3) * mt.amp3
    ctx.lineTo(x, mtBase - Math.max(0, h))
  }
  ctx.lineTo(width, height)
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fill()

  // --- e) Hills ---
  const hl = PARALLAX.hills
  const hlRise = t * hl.rise
  const hlBase = groundY - hlRise
  const hlScroll = worldScrollX * hl.parallax
  ctx.fillStyle = COLORS.hillsFill
  ctx.beginPath()
  ctx.moveTo(0, hlBase + hl.baseOffset)
  for (let x = 0; x <= width; x += hl.stepSize) {
    const h = Math.sin((x + hlScroll) * hl.freq1) * hl.amp1 +
              Math.sin((x + hlScroll) * hl.freq2 + hl.phase2) * hl.amp2 +
              Math.cos((x + hlScroll) * hl.freq3) * hl.amp3
    ctx.lineTo(x, hlBase - Math.max(0, h))
  }
  ctx.lineTo(width, height)
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fill()

  // --- d) Trees (far) ---
  const tf3 = PARALLAX.treesFar
  const tf3Rise = t * tf3.rise
  const tf3Base = groundY - tf3Rise
  const tf3Scroll = worldScrollX * tf3.parallax
  ctx.fillStyle = COLORS.treesFar
  ctx.beginPath()
  ctx.moveTo(0, tf3Base + tf3.baseOffset)
  for (let x = 0; x <= width; x += tf3.stepSize) {
    const h = Math.abs(Math.sin((x + tf3Scroll) * tf3.freq1)) * tf3.amp1 +
              Math.abs(Math.sin((x + tf3Scroll) * tf3.freq2 + tf3.phase2)) * tf3.amp2
    ctx.lineTo(x, tf3Base - h)
  }
  ctx.lineTo(width, height)
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fill()

  // --- c) River ---
  const rv = PARALLAX.river
  const rvRise = t * rv.rise
  const rvBase = groundY - rvRise
  const rvScroll = worldScrollX * rv.parallax

  // River band — a flat-ish water surface
  ctx.fillStyle = COLORS.riverFill
  ctx.beginPath()
  ctx.moveTo(0, rvBase + rv.baseOffset)
  for (let x = 0; x <= width; x += rv.stepSize) {
    const ripple = Math.sin((x + rvScroll) * rv.rippleFreq + gameTime * rv.rippleSpeed) * rv.rippleAmp
    ctx.lineTo(x, rvBase + ripple)
  }
  ctx.lineTo(width, height)
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fill()

  // Moonlight shimmer on water
  const sh = PARALLAX.shimmer
  ctx.strokeStyle = COLORS.shimmer
  ctx.lineWidth = sh.lineWidth
  for (let i = 0; i < ENVIRONMENT.shimmerCount; i++) {
    const sx = ((i * sh.seed + rvScroll * sh.parallaxRate) % width)
    const sy = rvBase + Math.sin(gameTime * sh.rippleSpeed + i) * sh.rippleAmp
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx + sh.lineLength + Math.sin(gameTime + i) * sh.lineWaveAmp, sy)
    ctx.stroke()
  }

  // --- b) Trees (mid) ---
  const tf2 = PARALLAX.treesMid
  const tf2Rise = t * tf2.rise
  const tf2Base = groundY - tf2Rise
  const tf2Scroll = worldScrollX * tf2.parallax
  ctx.fillStyle = COLORS.treesMid
  ctx.beginPath()
  ctx.moveTo(0, tf2Base + tf2.baseOffset)
  for (let x = 0; x <= width; x += tf2.stepSize) {
    const h = Math.abs(Math.sin((x + tf2Scroll) * tf2.freq1)) * tf2.amp1 +
              Math.abs(Math.sin((x + tf2Scroll) * tf2.freq2 + tf2.phase2)) * tf2.amp2
    ctx.lineTo(x, tf2Base - h)
  }
  ctx.lineTo(width, height)
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fill()

  // --- a) Trees (nearest, drawn last) ---
  const tf1 = PARALLAX.treesNear
  const tf1Rise = t * tf1.rise
  const tf1Base = groundY - tf1Rise
  const tf1Scroll = worldScrollX * tf1.parallax
  ctx.fillStyle = COLORS.treesNear
  ctx.beginPath()
  ctx.moveTo(0, tf1Base + tf1.baseOffset)
  for (let x = 0; x <= width; x += tf1.stepSize) {
    const h = Math.abs(Math.sin((x + tf1Scroll) * tf1.freq1)) * tf1.amp1 +
              Math.abs(Math.cos((x + tf1Scroll) * tf1.freq2 + tf1.phase2)) * tf1.amp2
    ctx.lineTo(x, tf1Base - h)
  }
  ctx.lineTo(width, height)
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fill()
}
