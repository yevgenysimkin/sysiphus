import { COLORS } from '~/game/constants'

/**
 * Draws an elaborate ancient Greek temple ruin at the given position.
 * Extracted from useRenderer-obstacles.ts to keep file sizes under 1000 lines.
 */
export function drawAncientRuins(ctx: CanvasRenderingContext2D, screenX: number, groundY: number) {
  const stone = COLORS.ruinsStone
  const stroke = COLORS.ruinsStroke
  const crack = COLORS.ruinsCrack
  const scattered = COLORS.scatteredStone

  // --- Foundation / platform base ---
  ctx.fillStyle = stroke
  ctx.beginPath()
  ctx.moveTo(screenX - 90, groundY)
  ctx.lineTo(screenX - 95, groundY + 8)
  ctx.lineTo(screenX + 95, groundY + 8)
  ctx.lineTo(screenX + 90, groundY)
  ctx.closePath()
  ctx.fill()

  // Stepped base (two tiers)
  ctx.fillStyle = stone
  ctx.fillRect(screenX - 85, groundY - 6, 170, 6)
  ctx.fillStyle = stroke
  ctx.fillRect(screenX - 80, groundY - 10, 160, 4)

  // --- Left column (broken, shorter) ---
  const lcx = screenX - 55
  ctx.fillStyle = stone
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.5

  // Column base (Doric style)
  ctx.fillRect(lcx - 10, groundY - 14, 20, 4)
  // Column shaft with fluting
  ctx.fillRect(lcx - 7, groundY - 90, 14, 76)
  // Fluting lines
  ctx.strokeStyle = crack
  ctx.lineWidth = 0.5
  for (let i = -5; i <= 5; i += 2.5) {
    ctx.beginPath()
    ctx.moveTo(lcx + i, groundY - 14)
    ctx.lineTo(lcx + i, groundY - 90)
    ctx.stroke()
  }
  // Broken jagged top
  ctx.fillStyle = stone
  ctx.beginPath()
  ctx.moveTo(lcx - 7, groundY - 90)
  ctx.lineTo(lcx - 5, groundY - 100)
  ctx.lineTo(lcx - 1, groundY - 95)
  ctx.lineTo(lcx + 2, groundY - 105)
  ctx.lineTo(lcx + 5, groundY - 98)
  ctx.lineTo(lcx + 7, groundY - 90)
  ctx.closePath()
  ctx.fill()

  // Cracks
  ctx.strokeStyle = crack
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(lcx - 3, groundY - 60)
  ctx.lineTo(lcx - 5, groundY - 45)
  ctx.lineTo(lcx - 2, groundY - 30)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(lcx + 4, groundY - 75)
  ctx.lineTo(lcx + 2, groundY - 65)
  ctx.stroke()

  // --- Center-left column (intact, tallest) ---
  const clcx = screenX - 20
  ctx.fillStyle = stone
  ctx.fillRect(clcx - 10, groundY - 14, 20, 4)
  ctx.fillRect(clcx - 7, groundY - 140, 14, 126)
  // Fluting
  ctx.strokeStyle = crack
  ctx.lineWidth = 0.5
  for (let i = -5; i <= 5; i += 2.5) {
    ctx.beginPath()
    ctx.moveTo(clcx + i, groundY - 14)
    ctx.lineTo(clcx + i, groundY - 140)
    ctx.stroke()
  }
  // Capital (Doric echinus + abacus)
  ctx.fillStyle = stone
  ctx.fillRect(clcx - 10, groundY - 144, 20, 4)
  ctx.fillRect(clcx - 12, groundY - 149, 24, 5)
  // Crack
  ctx.strokeStyle = crack
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(clcx + 3, groundY - 110)
  ctx.lineTo(clcx + 1, groundY - 90)
  ctx.lineTo(clcx + 4, groundY - 70)
  ctx.stroke()

  // --- Center-right column (broken mid-height) ---
  const crcx = screenX + 20
  ctx.fillStyle = stone
  ctx.fillRect(crcx - 10, groundY - 14, 20, 4)
  ctx.fillRect(crcx - 7, groundY - 110, 14, 96)
  // Fluting
  ctx.strokeStyle = crack
  ctx.lineWidth = 0.5
  for (let i = -5; i <= 5; i += 2.5) {
    ctx.beginPath()
    ctx.moveTo(crcx + i, groundY - 14)
    ctx.lineTo(crcx + i, groundY - 110)
    ctx.stroke()
  }
  // Broken top
  ctx.fillStyle = stone
  ctx.beginPath()
  ctx.moveTo(crcx - 7, groundY - 110)
  ctx.lineTo(crcx - 4, groundY - 118)
  ctx.lineTo(crcx + 1, groundY - 113)
  ctx.lineTo(crcx + 4, groundY - 120)
  ctx.lineTo(crcx + 7, groundY - 112)
  ctx.lineTo(crcx + 7, groundY - 110)
  ctx.closePath()
  ctx.fill()

  // --- Right column (intact, with capital) ---
  const rcx = screenX + 55
  ctx.fillStyle = stone
  ctx.fillRect(rcx - 10, groundY - 14, 20, 4)
  ctx.fillRect(rcx - 7, groundY - 135, 14, 121)
  // Fluting
  ctx.strokeStyle = crack
  ctx.lineWidth = 0.5
  for (let i = -5; i <= 5; i += 2.5) {
    ctx.beginPath()
    ctx.moveTo(rcx + i, groundY - 14)
    ctx.lineTo(rcx + i, groundY - 135)
    ctx.stroke()
  }
  // Capital
  ctx.fillStyle = stone
  ctx.fillRect(rcx - 10, groundY - 139, 20, 4)
  ctx.fillRect(rcx - 12, groundY - 144, 24, 5)
  // Crack
  ctx.strokeStyle = crack
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(rcx - 2, groundY - 100)
  ctx.lineTo(rcx - 4, groundY - 80)
  ctx.stroke()

  // --- Lintel / architrave (spans center-left to right, broken in the middle) ---
  ctx.fillStyle = scattered
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1
  // Left section of lintel (tilted, partially fallen)
  ctx.beginPath()
  ctx.moveTo(clcx - 12, groundY - 149)
  ctx.lineTo(screenX + 5, groundY - 147)
  ctx.lineTo(screenX + 8, groundY - 139)
  ctx.lineTo(clcx - 12, groundY - 142)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // Right section (connecting to right column)
  ctx.beginPath()
  ctx.moveTo(screenX + 12, groundY - 145)
  ctx.lineTo(rcx + 12, groundY - 144)
  ctx.lineTo(rcx + 12, groundY - 137)
  ctx.lineTo(screenX + 12, groundY - 138)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // --- Pediment triangle (above the lintel, partially intact) ---
  ctx.fillStyle = stone
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(clcx - 8, groundY - 149)
  ctx.lineTo(screenX + 15, groundY - 175)
  ctx.lineTo(rcx + 8, groundY - 144)
  // Broken right edge
  ctx.lineTo(rcx - 5, groundY - 150)
  ctx.lineTo(screenX + 25, groundY - 168)
  ctx.lineTo(screenX + 5, groundY - 165)
  ctx.lineTo(clcx + 5, groundY - 149)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // --- Fallen column drum (on the ground, left side) ---
  ctx.fillStyle = stone
  ctx.beginPath()
  ctx.ellipse(screenX - 75, groundY - 6, 12, 7, 0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = crack
  ctx.lineWidth = 0.5
  ctx.stroke()
  // Second drum stacked askew
  ctx.fillStyle = scattered
  ctx.beginPath()
  ctx.ellipse(screenX - 68, groundY - 14, 10, 6, -0.2, 0, Math.PI * 2)
  ctx.fill()

  // --- Fallen capital fragment (right side) ---
  ctx.fillStyle = stone
  ctx.save()
  ctx.translate(screenX + 75, groundY - 4)
  ctx.rotate(0.3)
  ctx.fillRect(-12, -5, 24, 10)
  ctx.fillRect(-14, -8, 28, 5)
  ctx.restore()

  // --- Scattered stones and rubble ---
  ctx.fillStyle = scattered
  const rubble = [
    [-40, -3, 7, 4], [-30, -2, 5, 3], [0, -2, 6, 4],
    [35, -3, 8, 5], [70, -2, 5, 3], [-60, -4, 4, 3],
    [45, -2, 6, 4], [-15, -3, 5, 3], [80, -3, 7, 4],
    [-80, -2, 4, 2], [60, -4, 3, 2], [10, -2, 4, 3],
  ] as [number, number, number, number][]
  for (const [ox, oy, rx, ry] of rubble) {
    ctx.beginPath()
    ctx.ellipse(screenX + ox, groundY + oy, rx, ry, Math.random() * 0.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // --- Decorative carved frieze detail on lintel ---
  ctx.strokeStyle = crack
  ctx.lineWidth = 0.5
  // Simple wave/meander pattern on the right lintel section
  const friezeY = groundY - 141
  for (let fx = screenX + 15; fx < rcx + 5; fx += 8) {
    ctx.beginPath()
    ctx.moveTo(fx, friezeY)
    ctx.lineTo(fx + 2, friezeY - 2)
    ctx.lineTo(fx + 4, friezeY)
    ctx.lineTo(fx + 6, friezeY + 2)
    ctx.stroke()
  }

  // --- Vine / vegetation growing on ruins ---
  ctx.strokeStyle = '#2a4a2a'
  ctx.lineWidth = 1
  // Vine on center-left column
  ctx.beginPath()
  ctx.moveTo(clcx + 7, groundY - 40)
  ctx.quadraticCurveTo(clcx + 14, groundY - 60, clcx + 8, groundY - 80)
  ctx.quadraticCurveTo(clcx + 16, groundY - 100, clcx + 9, groundY - 120)
  ctx.stroke()
  // Small leaves
  ctx.fillStyle = COLORS.pineHighlight
  for (const ly of [-50, -70, -90, -110]) {
    ctx.beginPath()
    ctx.ellipse(clcx + 12, groundY + ly, 3, 2, 0.5, 0, Math.PI * 2)
    ctx.fill()
  }
}
