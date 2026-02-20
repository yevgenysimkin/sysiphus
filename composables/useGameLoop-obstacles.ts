import type { Obstacle } from './useGameState'

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
                s.dogBarkTimer = 3 + Math.random() * 4
                if (dist < 600) play8BitSound('bark')
              }
            }
            // Flee when player approaches
            if (dist < (obs.triggerProximity || 200)) {
              s.dogFled = true
              if (dist < 600) play8BitSound('bark')
            }
          } else {
            // Run downhill (opposite of push direction) past the player
            s.dogX = (s.dogX || 0) - world.pushDir * 200 * dt
          }
          break
        }
        case 'campfire': {
          // Spawn smoke particles
          if (s.smokeParticles) {
            if (Math.random() < dt * 3) {
              s.smokeParticles.push({
                x: (Math.random() - 0.5) * 8,
                y: 0,
                vy: -15 - Math.random() * 10,
                alpha: 0.4 + Math.random() * 0.2,
                size: 2 + Math.random() * 3,
              })
            }
            // Update particles
            for (let i = s.smokeParticles.length - 1; i >= 0; i--) {
              const p = s.smokeParticles[i]
              p.y += p.vy * dt
              p.x += (Math.random() - 0.5) * 10 * dt
              p.alpha -= dt * 0.3
              p.size += dt * 2
              if (p.alpha <= 0) s.smokeParticles.splice(i, 1)
            }
          }
          break
        }
        case 'sasquatch': {
          const proximity = obs.triggerProximity || 250
          if (dist < proximity) {
            // Duck down (hide)
            s.squatchPeekAmount = Math.max(0, (s.squatchPeekAmount || 0.8) - dt * 2)
            s.squatchHiding = true
          } else if (s.squatchHiding && dist > proximity + 100) {
            // Slowly peek back
            s.squatchPeekAmount = Math.min(0.8, (s.squatchPeekAmount || 0) + dt * 0.5)
            if (s.squatchPeekAmount >= 0.8) s.squatchHiding = false
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
                bird.phase += dt * 12
              }
            }
            if ((s.triggerTimer || 0) > 3) s.triggerComplete = true
          } else if (!s.triggered && dist < (obs.triggerProximity || 200)) {
            s.triggered = true
            s.triggerTimer = 0
            // Spawn attack birds
            s.attackBirds = []
            for (let i = 0; i < 6; i++) {
              const angle = (i / 6) * Math.PI * 2
              s.attackBirds.push({
                x: 0, y: -60 - i * 10,
                vx: Math.cos(angle) * 80,
                vy: Math.sin(angle) * 60 - 20,
                phase: i * 0.5,
              })
            }
          }
          break
        }
        case 'storm_cloud': {
          if (s.triggered && !s.triggerComplete) {
            s.triggerTimer = (s.triggerTimer || 0) + dt
            // Raindrops
            if (s.raindrops) {
              if (Math.random() < dt * 30) {
                s.raindrops.push({ x: (Math.random() - 0.5) * 120, y: -80, speed: 200 + Math.random() * 100 })
              }
              for (let i = s.raindrops.length - 1; i >= 0; i--) {
                s.raindrops[i].y += s.raindrops[i].speed * dt
                if (s.raindrops[i].y > 10) s.raindrops.splice(i, 1)
              }
            }
            // Lightning
            if (s.lightningTimer !== undefined) {
              s.lightningTimer -= dt
              if (s.lightningTimer <= 0) {
                s.lightningFlash = 0.3
                s.lightningTimer = 1 + Math.random() * 2
                if (dist < 600) play8BitSound('thunder')
              }
              if (s.lightningFlash && s.lightningFlash > 0) {
                s.lightningFlash -= dt * 2
              }
            }
            if ((s.triggerTimer || 0) > 4) s.triggerComplete = true
          } else if (!s.triggered && dist < (obs.triggerProximity || 150)) {
            s.triggered = true
            s.triggerTimer = 0
            s.lightningTimer = 1
          }
          break
        }
        case 'alien_laser': {
          if (s.triggered && !s.triggerComplete) {
            s.triggerTimer = (s.triggerTimer || 0) + dt
            s.laserAngle = (s.laserAngle || 0) + dt * 1.5
            s.laserActive = (s.triggerTimer || 0) > 0.5 && (s.triggerTimer || 0) < 3
            s.ufoY = 80 + Math.sin(s.animTimer * 2) * 10
            if ((s.triggerTimer || 0) > 3.5) s.triggerComplete = true
          } else if (!s.triggered && dist < (obs.triggerProximity || 200)) {
            s.triggered = true
            s.triggerTimer = 0
            s.ufoX = 0
            s.laserAngle = 0
            if (dist < 600) play8BitSound('laser')
          }
          break
        }
        case 'mountain_goat': {
          if (s.blinkTimer !== undefined) {
            s.blinkTimer -= dt
            if (s.blinkTimer <= 0) {
              if (s.blinking) {
                s.blinking = false
                s.blinkTimer = 3 + Math.random() * 5
              } else {
                s.blinking = true
                s.blinkTimer = 0.15
              }
            }
          }
          break
        }
        case 'avalanche_warning': {
          if (s.fallingRocks) {
            // Spawn rocks
            if (Math.random() < dt * 2) {
              s.fallingRocks.push({
                x: (Math.random() - 0.5) * 60,
                y: -40 - Math.random() * 20,
                vy: 30 + Math.random() * 40,
                size: 2 + Math.random() * 4,
                rotation: Math.random() * Math.PI * 2,
              })
            }
            for (let i = s.fallingRocks.length - 1; i >= 0; i--) {
              const r = s.fallingRocks[i]
              r.y += r.vy * dt
              r.vy += 80 * dt
              r.rotation += dt * 3
              if (r.y > 10) s.fallingRocks.splice(i, 1)
            }
          }
          break
        }
        case 'the_muses': {
          s.laughPhase = (s.laughPhase || 0) + dt * 4
          break
        }
        case 'philosopher': {
          if (s.thoughtTimer !== undefined) {
            s.thoughtTimer += dt
            if (s.thoughtTimer > 5) {
              s.thoughtTimer = 0
              s.thoughtIndex = ((s.thoughtIndex || 0) + 1) % 4
            }
          }
          break
        }
      }
    }
  }

  return { updateObstacles }
}
