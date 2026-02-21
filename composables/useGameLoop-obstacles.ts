import type { Obstacle } from './useGameState'
import { TIMING, PHYSICS, SOUND_AUDIBLE_RANGE, OBSTACLE_BEHAVIOR, SPAWNING } from '~/game/constants'

interface ObstacleUpdateDeps {
  world: {
    boulderDistance: number
    pushDir: 1 | -1
    obstacles: Obstacle[]
  }
  play8BitSound: (type: 'footstep' | 'huff' | 'push' | 'slip' | 'crush' | 'roll' | 'levelup' | 'bark' | 'thunder' | 'laser') => void
}

export function createObstacleUpdater(deps: ObstacleUpdateDeps) {
  const { world, play8BitSound } = deps

  function updateObstacles(dt: number) {
    const playerWorldX = world.boulderDistance

    for (const obs of world.obstacles) {
      const dist = Math.abs(playerWorldX - obs.worldX)
      const s = obs.state
      s.animTimer += dt

      switch (obs.type) {
        case 'stray_dog': {
          if (!s.dogFled) {
            // Bark timer
            if (s.dogBarkTimer !== undefined) {
              s.dogBarkTimer -= dt
              if (s.dogBarkTimer <= 0) {
                s.dogBarkTimer = TIMING.barkIntervalBase + Math.random() * TIMING.barkIntervalRandom
                if (dist < SOUND_AUDIBLE_RANGE) play8BitSound('bark')
              }
            }
            // Flee when player approaches
            if (dist < (obs.triggerProximity || OBSTACLE_BEHAVIOR.strayDogDefaultProximity)) {
              s.dogFled = true
              if (dist < SOUND_AUDIBLE_RANGE) play8BitSound('bark')
            }
          } else {
            // Run downhill (opposite of push direction) past the player
            s.dogX = (s.dogX || 0) - world.pushDir * PHYSICS.dogRunSpeed * dt
          }
          break
        }
        case 'campfire': {
          // Spawn smoke particles
          if (s.smokeParticles) {
            if (Math.random() < dt * OBSTACLE_BEHAVIOR.smokeSpawnRateMultiplier) {
              s.smokeParticles.push({
                x: (Math.random() - 0.5) * OBSTACLE_BEHAVIOR.smokeXOffsetRange,
                y: 0,
                vy: OBSTACLE_BEHAVIOR.smokeVyMin - Math.random() * Math.abs(OBSTACLE_BEHAVIOR.smokeVyRange),
                alpha: OBSTACLE_BEHAVIOR.smokeAlphaMin + Math.random() * OBSTACLE_BEHAVIOR.smokeAlphaRange,
                size: OBSTACLE_BEHAVIOR.smokeSizeMin + Math.random() * OBSTACLE_BEHAVIOR.smokeSizeRange,
              })
            }
            // Update particles
            for (let i = s.smokeParticles.length - 1; i >= 0; i--) {
              const p = s.smokeParticles[i]
              p.y += p.vy * dt
              p.x += (Math.random() - 0.5) * OBSTACLE_BEHAVIOR.smokeDriftRange * dt
              p.alpha -= dt * OBSTACLE_BEHAVIOR.smokeAlphaDecayRate
              p.size += dt * OBSTACLE_BEHAVIOR.smokeSizeGrowthRate
              if (p.alpha <= 0) s.smokeParticles.splice(i, 1)
            }
          }
          break
        }
        case 'sasquatch': {
          const proximity = obs.triggerProximity || OBSTACLE_BEHAVIOR.sasquatchDefaultProximity
          if (dist < proximity) {
            // Duck down (hide)
            s.squatchPeekAmount = Math.max(0, (s.squatchPeekAmount || SPAWNING.sasquatchInitialPeek) - dt * OBSTACLE_BEHAVIOR.sasquatchHideSpeed)
            s.squatchHiding = true
          } else if (s.squatchHiding && dist > proximity + OBSTACLE_BEHAVIOR.sasquatchPeekDistanceThreshold) {
            // Slowly peek back
            s.squatchPeekAmount = Math.min(SPAWNING.sasquatchInitialPeek, (s.squatchPeekAmount || 0) + dt * OBSTACLE_BEHAVIOR.sasquatchPeekSpeed)
            if (s.squatchPeekAmount >= SPAWNING.sasquatchInitialPeek) s.squatchHiding = false
          }
          break
        }
        case 'attack_birds': {
          if (s.triggered && !s.triggerComplete) {
            s.triggerTimer = (s.triggerTimer || 0) + dt
            if (s.attackBirds) {
              for (const bird of s.attackBirds) {
                bird.x += bird.vx * dt
                bird.y += bird.vy * dt
                bird.phase += dt * OBSTACLE_BEHAVIOR.attackBirdAnimSpeed
              }
            }
            if ((s.triggerTimer || 0) > TIMING.attackBirdsDuration) s.triggerComplete = true
          } else if (!s.triggered && dist < (obs.triggerProximity || OBSTACLE_BEHAVIOR.strayDogDefaultProximity)) {
            s.triggered = true
            s.triggerTimer = 0
            // Spawn attack birds
            s.attackBirds = []
            for (let i = 0; i < OBSTACLE_BEHAVIOR.attackBirdCount; i++) {
              const angle = (i / OBSTACLE_BEHAVIOR.attackBirdCount) * Math.PI * 2
              s.attackBirds.push({
                x: 0, y: -60 - i * 10,
                vx: Math.cos(angle) * OBSTACLE_BEHAVIOR.attackBirdVxMagnitude,
                vy: Math.sin(angle) * OBSTACLE_BEHAVIOR.attackBirdVyMagnitude - OBSTACLE_BEHAVIOR.attackBirdVyDownOffset,
                phase: i * OBSTACLE_BEHAVIOR.attackBirdPhaseStagger,
              })
            }
          }
          break
        }
        case 'storm_cloud': {
          if (s.triggered && !s.triggerComplete) {
            s.triggerTimer = (s.triggerTimer || 0) + dt
            const timer = s.triggerTimer || 0

            // Phase transitions
            if (s.stormPhase === 'arriving') {
              // Cloud drifts in from offscreen over stormArrivalDuration
              const arrivalProgress = Math.min(1, timer / TIMING.stormArrivalDuration)
              const eased = arrivalProgress * arrivalProgress * (3 - 2 * arrivalProgress) // smoothstep
              s.stormCloudX = OBSTACLE_BEHAVIOR.stormCloudSpawnOffsetX * (1 - eased)
              s.stormCloudY = OBSTACLE_BEHAVIOR.stormCloudHoverHeight * eased
              if (timer >= TIMING.stormArrivalDuration) {
                s.stormPhase = 'active'
                s.lightningTimer = OBSTACLE_BEHAVIOR.lightningIntervalMin
                s.stormThoughtTimer = TIMING.stormThoughtInterval * 0.3 // first thought comes quicker
              }
            } else if (s.stormPhase === 'active') {
              const activeTime = timer - TIMING.stormArrivalDuration
              // Rain
              if (s.raindrops) {
                if (Math.random() < dt * OBSTACLE_BEHAVIOR.raindropSpawnRateMultiplier) {
                  s.raindrops.push({ x: (Math.random() - 0.5) * OBSTACLE_BEHAVIOR.raindropXOffsetRange, y: OBSTACLE_BEHAVIOR.raindropSpawnY, speed: OBSTACLE_BEHAVIOR.raindropSpeedMin + Math.random() * OBSTACLE_BEHAVIOR.raindropSpeedRange })
                }
                for (let i = s.raindrops.length - 1; i >= 0; i--) {
                  s.raindrops[i].y += s.raindrops[i].speed * dt
                  if (s.raindrops[i].y > OBSTACLE_BEHAVIOR.raindropGroundY) s.raindrops.splice(i, 1)
                }
              }
              // Lightning
              if (s.lightningTimer !== undefined) {
                s.lightningTimer -= dt
                if (s.lightningTimer <= 0) {
                  s.lightningFlash = OBSTACLE_BEHAVIOR.lightningFlashIntensity
                  s.lightningTimer = OBSTACLE_BEHAVIOR.lightningIntervalMin + Math.random() * OBSTACLE_BEHAVIOR.lightningIntervalRange
                  if (dist < SOUND_AUDIBLE_RANGE) play8BitSound('thunder')
                }
              }
              // Storm thoughts (cycle through them)
              if (s.stormThoughtTimer !== undefined) {
                s.stormThoughtTimer -= dt
                if (s.stormThoughtTimer <= 0) {
                  s.stormThoughtTimer = TIMING.stormThoughtInterval
                  s.stormThoughtIndex = ((s.stormThoughtIndex || 0) + 1) % 4
                }
              }
              if (activeTime >= TIMING.stormActiveDuration) {
                s.stormPhase = 'departing'
              }
            } else if (s.stormPhase === 'departing') {
              const departTime = timer - TIMING.stormArrivalDuration - TIMING.stormActiveDuration
              s.stormCloudX = (s.stormCloudX || 0) - OBSTACLE_BEHAVIOR.stormCloudDepartSpeedX * dt
              s.stormCloudY = (s.stormCloudY || OBSTACLE_BEHAVIOR.stormCloudHoverHeight) + OBSTACLE_BEHAVIOR.stormCloudDepartSpeedY * dt
              // Drain remaining rain
              if (s.raindrops) {
                for (let i = s.raindrops.length - 1; i >= 0; i--) {
                  s.raindrops[i].y += s.raindrops[i].speed * dt
                  if (s.raindrops[i].y > OBSTACLE_BEHAVIOR.raindropGroundY) s.raindrops.splice(i, 1)
                }
              }
              if (departTime >= TIMING.stormDepartDuration) s.triggerComplete = true
            }
            // Lightning flash fade (all phases)
            if (s.lightningFlash && s.lightningFlash > 0) {
              s.lightningFlash -= dt * OBSTACLE_BEHAVIOR.lightningFadeSpeed
            }
          } else if (!s.triggered && dist < (obs.triggerProximity || OBSTACLE_BEHAVIOR.stormDefaultProximity)) {
            s.triggered = true
            s.triggerTimer = 0
            s.stormPhase = 'arriving'
            s.stormCloudX = OBSTACLE_BEHAVIOR.stormCloudSpawnOffsetX
            s.stormCloudY = 0
            s.stormThoughtIndex = 0
            s.stormThoughtTimer = 0
          }
          break
        }
        case 'alien_laser': {
          if (s.triggered && !s.triggerComplete) {
            s.triggerTimer = (s.triggerTimer || 0) + dt
            const timer = s.triggerTimer || 0

            if (s.ufoPhase === 'arriving') {
              // Fly in from offscreen — descend diagonally
              const arrivalProgress = Math.min(1, timer / TIMING.alienArrivalDuration)
              const eased = arrivalProgress * arrivalProgress * (3 - 2 * arrivalProgress)
              s.ufoX = OBSTACLE_BEHAVIOR.ufoSpawnOffsetX * (1 - eased)
              s.ufoY = OBSTACLE_BEHAVIOR.ufoDefaultY * eased + (1 - eased) * 300
              if (timer >= TIMING.alienArrivalDuration) {
                s.ufoPhase = 'active'
                if (dist < SOUND_AUDIBLE_RANGE) play8BitSound('laser')
              }
            } else if (s.ufoPhase === 'active') {
              s.laserAngle = (s.laserAngle || 0) + dt * OBSTACLE_BEHAVIOR.laserAngleSpeed
              s.laserActive = timer > OBSTACLE_BEHAVIOR.laserActiveStart && timer < OBSTACLE_BEHAVIOR.laserActiveEnd
              s.ufoY = OBSTACLE_BEHAVIOR.ufoDefaultY + Math.sin(s.animTimer * OBSTACLE_BEHAVIOR.ufoBobSpeed) * OBSTACLE_BEHAVIOR.ufoBobAmplitude
              if (timer >= OBSTACLE_BEHAVIOR.laserActiveEnd + 0.5) {
                s.ufoPhase = 'departing'
                s.laserActive = false
              }
            } else if (s.ufoPhase === 'departing') {
              // Fly away upward and offscreen
              s.ufoX = (s.ufoX || 0) + OBSTACLE_BEHAVIOR.ufoDepartSpeedX * dt
              s.ufoY = (s.ufoY || OBSTACLE_BEHAVIOR.ufoDefaultY) + OBSTACLE_BEHAVIOR.ufoDepartSpeedY * dt
              if (timer >= TIMING.alienLaserDuration) s.triggerComplete = true
            }
          } else if (!s.triggered && dist < (obs.triggerProximity || OBSTACLE_BEHAVIOR.alienDefaultProximity)) {
            s.triggered = true
            s.triggerTimer = 0
            s.ufoX = OBSTACLE_BEHAVIOR.ufoSpawnOffsetX
            s.ufoY = 300
            s.laserAngle = 0
            s.ufoPhase = 'arriving'
          }
          break
        }
        case 'mountain_goat': {
          if (s.blinkTimer !== undefined) {
            s.blinkTimer -= dt
            if (s.blinkTimer <= 0) {
              if (s.blinking) {
                s.blinking = false
                s.blinkTimer = TIMING.blinkIntervalBase + Math.random() * TIMING.blinkIntervalRandom
              } else {
                s.blinking = true
                s.blinkTimer = TIMING.blinkDuration
              }
            }
          }
          break
        }
        case 'avalanche_warning': {
          if (s.fallingRocks) {
            // Spawn rocks
            if (Math.random() < dt * OBSTACLE_BEHAVIOR.rockSpawnRate) {
              s.fallingRocks.push({
                x: (Math.random() - 0.5) * OBSTACLE_BEHAVIOR.rockXOffsetRange,
                y: OBSTACLE_BEHAVIOR.rockSpawnYMin - Math.random() * Math.abs(OBSTACLE_BEHAVIOR.rockSpawnYRange),
                vy: OBSTACLE_BEHAVIOR.rockVyMin + Math.random() * OBSTACLE_BEHAVIOR.rockVyRange,
                size: OBSTACLE_BEHAVIOR.rockSizeMin + Math.random() * OBSTACLE_BEHAVIOR.rockSizeRange,
                rotation: Math.random() * Math.PI * 2,
              })
            }
            for (let i = s.fallingRocks.length - 1; i >= 0; i--) {
              const r = s.fallingRocks[i]
              r.y += r.vy * dt
              r.vy += OBSTACLE_BEHAVIOR.rockGravity * dt
              r.rotation += dt * OBSTACLE_BEHAVIOR.rockRotationSpeed
              if (r.y > OBSTACLE_BEHAVIOR.rockGroundY) s.fallingRocks.splice(i, 1)
            }
          }
          break
        }
        case 'the_muses': {
          s.laughPhase = (s.laughPhase || 0) + dt * OBSTACLE_BEHAVIOR.musesLaughSpeed
          break
        }
        case 'philosopher': {
          if (s.thoughtTimer !== undefined) {
            s.thoughtTimer += dt
            if (s.thoughtTimer > TIMING.philosopherThoughtCycle) {
              s.thoughtTimer = 0
              s.thoughtIndex = ((s.thoughtIndex || 0) + 1) % OBSTACLE_BEHAVIOR.philosopherThoughtPositions
            }
          }
          break
        }
      }
    }
  }

  return { updateObstacles }
}
