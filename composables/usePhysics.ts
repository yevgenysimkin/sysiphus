import gameConfig from '~/game.config.json'

// Flat start area before the hill begins
export const FLAT_START = gameConfig.flatStartWidth

// Build level arrays from config (levels start AFTER the flat area)
export const LEVEL_ANGLES = gameConfig.levels.map(l => l.angle)
export const LEVEL_DISTANCES: number[] = []
let runningDistance = FLAT_START
for (const level of gameConfig.levels) {
  LEVEL_DISTANCES.push(runningDistance)
  runningDistance += level.width
}
export const PEAK_DISTANCE = runningDistance

// Physics constants from config
export const CONSTANT_SPEED = gameConfig.physics.constantSpeed
export const METER_DRAIN_RATES = gameConfig.physics.meterDrainRates

// Camera constants
export const PLAYER_SCREEN_X_RATIO = 1 / 3
export const GROUND_SCREEN_Y_OFFSET = 100

// Prometheus
export const prometheusConfigDistance = gameConfig.prometheus.distance

export function usePhysics() {
  function getLevelAtDistance(dist: number): number {
    if (dist < FLAT_START) return 0
    for (let i = LEVEL_DISTANCES.length - 1; i >= 0; i--) {
      if (dist >= LEVEL_DISTANCES[i]) return i + 1
    }
    return 1
  }

  function getAngleAtDistance(dist: number): number {
    if (dist < FLAT_START) {
      const transitionZone = 30
      const distToLevel1 = FLAT_START - dist
      if (distToLevel1 < transitionZone) {
        const t = 1 - (distToLevel1 / transitionZone)
        const smoothT = t * t * (3 - 2 * t)
        return LEVEL_ANGLES[0] * smoothT
      }
      return 0
    }

    const level = getLevelAtDistance(dist)
    const levelStart = LEVEL_DISTANCES[level - 1]
    const currentAngle = LEVEL_ANGLES[level - 1]
    const transitionZone = 30
    const distIntoLevel = dist - levelStart

    if (level > 1 && distIntoLevel < transitionZone) {
      const prevAngle = LEVEL_ANGLES[level - 2]
      const t = distIntoLevel / transitionZone
      const smoothT = t * t * (3 - 2 * t)
      return prevAngle + (currentAngle - prevAngle) * smoothT
    } else if (level === 1 && distIntoLevel < transitionZone) {
      const t = distIntoLevel / transitionZone
      const smoothT = t * t * (3 - 2 * t)
      return currentAngle * smoothT
    }

    return currentAngle
  }

  function getHeightAtWorldDistance(worldDist: number): number {
    if (worldDist <= FLAT_START) return 0

    if (worldDist <= PEAK_DISTANCE) {
      let height = 0
      for (let level = 0; level < LEVEL_ANGLES.length; level++) {
        const segmentStart = LEVEL_DISTANCES[level]
        const segmentEnd = level < LEVEL_ANGLES.length - 1 ? LEVEL_DISTANCES[level + 1] : PEAK_DISTANCE
        const angle = LEVEL_ANGLES[level]

        if (worldDist >= segmentStart) {
          const distInSegment = Math.min(worldDist, segmentEnd) - segmentStart
          height += Math.tan(angle * Math.PI / 180) * distInSegment
        }
      }
      return height
    } else {
      const overPeak = worldDist - PEAK_DISTANCE
      const mirrorDist = PEAK_DISTANCE - overPeak

      if (mirrorDist <= FLAT_START) return 0
      return getHeightAtWorldDistance(mirrorDist)
    }
  }

  function getHillYAtScreenX(
    screenX: number,
    canvasHeight: number,
    worldScrollX: number,
    boulderDistance: number
  ): number {
    const worldX = screenX + worldScrollX
    const worldHeight = getHeightAtWorldDistance(worldX)
    const playerWorldHeight = getHeightAtWorldDistance(boulderDistance)
    const cameraYOffset = playerWorldHeight
    const baseY = canvasHeight - GROUND_SCREEN_Y_OFFSET
    return baseY - (worldHeight - cameraYOffset)
  }

  return {
    getLevelAtDistance,
    getAngleAtDistance,
    getHeightAtWorldDistance,
    getHillYAtScreenX,
  }
}
