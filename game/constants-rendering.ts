// ── Rendering Geometry Constants ──────────────────────────────────────
// Pixel coordinates, proportions, and visual parameters for all canvas drawing.
// Organized by rendered element. Used by useRenderer*.ts files.

// ── Sky & Atmosphere ────────────────────────────────────────────────

export const SKY = {
  altitudeScale: 3000,
  topR: 15, topRBonus: 25, topG: 10, topGBonus: 20, topB: 40, topBBonus: 50,
  midStop: 0.45, midR: 20, midRBonus: 10, midG: 15, midGBonus: 10, midB: 55, midBBonus: 20,
  horizonStop: 0.85, horizonR: 40, horizonRBonus: 30, horizonG: 20, horizonGBonus: 15, horizonB: 45, horizonBBonus: 10,
  farOffsetR: 15, farOffsetG: 10, farOffsetB: -10,
} as const

export const STARS = {
  altitudeScale: 2500,
  baseCount: 100, altitudeBonus: 80,
  seedX: 123.456, seedY: 789.012,
  heightScale: 0.55, parallaxRate: 0.02,
  twinkleFreq: 2,
  baseAlpha: 0.2, altitudeAlphaBonus: 0.4,
  twinkleAlphaBase: 0.4, twinkleAltitudeBonus: 0.3,
  sizeBase: 1.5, sizeOffset: 0.5, sizeAltitudeBonus: 0.5,
} as const

export const MOON = {
  xFromRight: 100, y: 70,
  glowInnerRadius: 25, glowOuterRadius: 70,
  arcRadius: 70, fillRadius: 30,
} as const

// ── Parallax Background Layers ──────────────────────────────────────

export const PARALLAX = {
  mountains: {
    rise: 320, parallax: 0.008, baseOffset: 10, stepSize: 40,
    freq1: 0.008, amp1: 90, freq2: 0.015, phase2: 2, amp2: 50, freq3: 0.003, amp3: 60,
  },
  hills: {
    rise: 240, parallax: 0.02, baseOffset: 10, stepSize: 25,
    freq1: 0.012, amp1: 55, freq2: 0.025, phase2: 1, amp2: 30, freq3: 0.007, amp3: 35,
  },
  treesFar: {
    rise: 170, parallax: 0.04, baseOffset: 5, stepSize: 12,
    freq1: 0.06, amp1: 25, freq2: 0.09, phase2: 0.5, amp2: 15,
  },
  river: {
    rise: 110, parallax: 0.06, baseOffset: 5, stepSize: 20,
    rippleFreq: 0.04, rippleSpeed: 0.8, rippleAmp: 3,
  },
  shimmer: {
    lineWidth: 1.5, seed: 137, parallaxRate: 0.5,
    rippleSpeed: 1.2, rippleAmp: 2, lineLength: 15, lineWaveAmp: 5,
  },
  treesMid: {
    rise: 60, parallax: 0.1, baseOffset: 5, stepSize: 10,
    freq1: 0.08, amp1: 20, freq2: 0.12, phase2: 1, amp2: 12,
  },
  treesNear: {
    rise: 20, parallax: 0.18, baseOffset: 3, stepSize: 8,
    freq1: 0.1, amp1: 18, freq2: 0.14, phase2: 0.7, amp2: 10,
  },
} as const

// ── Tree Shapes ──────────────────────────────────────────────────────

export const PINE = {
  trunkWidth: 0.08, trunkHeight: 0.45,
  tierCount: 3, tierYBase: 0.35, tierYStride: 0.22,
  tierWidthBase: 0.35, tierWidthDecrement: 0.08, tierHeight: 0.3,
  highlightWidth: 1,
} as const

export const OAK = {
  trunkWidth: 0.1, trunkHeight: 0.45,
  branchWidth: 0.05, branchY: 0.4,
  branchLeftX: 0.25, branchLeftY: 0.6, branchRightX: 0.2, branchRightY: 0.55,
  canopyY: 0.65, canopyRadius: 0.3,
  canopyLeftX: 0.4, canopyLeftY: 0.1, canopyLeftRadius: 0.7,
  canopyRightX: 0.4, canopyRightY: 0.15, canopyRightRadius: 0.65,
  canopyCenterY: 0.2, canopyCenterRadius: 0.75,
  highlightX: 0.1, highlightY: 0.3, highlightRadius: 0.4,
} as const

export const DEAD_TREE_SHAPE = {
  trunkWidth: 0.07, branchWidth: 0.04,
  trunk: [
    [0, 0], [0.03, -0.5], [-0.02, -0.8],
  ] as readonly (readonly number[])[],
  branches: [
    [[-0.02, -0.6], [-0.25, -0.75], [-0.3, -0.85]],
    [[0.03, -0.5], [0.2, -0.6]],
    [[-0.02, -0.8], [0.15, -0.92]],
    [[-0.02, -0.8], [-0.12, -0.95]],
  ] as readonly (readonly (readonly number[])[])[]
} as const

// ── Grass & Clouds ──────────────────────────────────────────────────

export const GRASS_RENDER = {
  lineWidth: 1, swaySpeed: 2, swayWorldScale: 0.1, swayAmp: 2,
  bladeSpacing: 3, curveY: 0.6, swayCurveMult: 1.5,
} as const

export const CLOUD_SHAPE = {
  parallax: 0.05, wrapOffset: 200,
  size1: 0.5,
  xOffset2: 0.35, yOffset2: 0.15, size2: 0.4,
  xOffset3: 0.7, size3: 0.45,
} as const

// ── Hill Drawing ────────────────────────────────────────────────────

export const HILL_RENDER = {
  rightEdgeExtension: 100, stepSize: 5, strokeWidth: 3,
  markerWidth: 1, markerHeight: 20,
  levelTextXOffset: 8, levelTextYOffset: 25,
  peakMarkerHeight: 10, peakMarkerLeftX: 8, peakMarkerY: 5, peakMarkerRightX: 8,
  peakTextXOffset: 18, peakTextYOffset: 15,
} as const

// ── Tree Culling ────────────────────────────────────────────────────

export const TREE_CULL_DISTANCE = 300

// ── Prometheus ──────────────────────────────────────────────────────

export const PROMETHEUS = {
  embedX: 40, embedY: 25, scale: 1.5,
  // Rock bezier shape (relative to embed point)
  rock: {
    leftX: -40, topBezLeftX: -45, topBezLeftY: -20, topPeakX: -10, topPeakY: -25,
    rightX: 30, rightY: -10, rightBezX: 45,
    bodyRightX: 42, bodyRightY: 20, bottomRightX: 30, bottomRightY: 30,
    bottomMidX: 10, bottomMidY: 40, bottomLeftX: -25, bottomLeftY: 38,
  },
  lineWidth: 2.5, headRadius: 8, headY: -12,
  bodyTopY: -4, bodyBottomY: 22,
  armX: 25, armY: 5,
  chainLineWidth: 1.5, chainDash: 3,
  chainStartX: 25, chainY: 15, chainEndX: 35,
  legX: 8, legY: 40,
  bloodLineWidth: 1.5, bloodDripSpeed: 20, bloodDripCycle: 30,
  bloodDripCount: 3, bloodDripYOffset: 10, bloodDripYSpacing: 5,
  bloodDripLengthBase: 15, bloodDripLengthAmp: 5, bloodDripWaveSpeed: 2,
  bloodXStride: 3, bloodCurveXAmp: 5, bloodCurveXSpeed: 2,
  bloodBaseYOffset: 20, bloodCycleStride: 10,
  // Vulture
  vultureBobSpeed: 3, vultureBobAmp: 3,
  vultureBodyX: -18, vultureBodyY: 14, vultureBodyW: 10, vultureBodyH: 6, vultureBodyRot: -0.3,
  vultureHeadX: -6, vultureHeadY: 10, vultureHeadR: 5,
  vultureBeakStartX: -3, vultureBeakEndX: 2, vultureBeakY: 12,
  vultureWingLeftStartX: -30, vultureWingLeftStartY: 6,
  vultureWingLeftBodyX: -18, vultureWingLeftBodyY: 14,
  vultureWingLeftEndX: -30, vultureWingLeftEndY: 22,
  // Ouch text
  ouchCycleLength: 4, ouchTexts: ['ouch...', 'ow...', 'ouch...', 'ugh...'] as readonly string[],
  ouchAlphaBase: 0.5, ouchAlphaVar: 0.3, ouchBlinkSpeed: 4, ouchTextX: -45,
  // Dialogue
  bubbleMaxWidth: 150, bubbleXOffset: -60, bubbleYOffset: -40,
  playerBubbleYOffset: -50, playerBubbleXOffset: 20, playerBubbleYOffset2: -30,
  labelX: 10, labelY: 70,
} as const

// ── Spaceship ───────────────────────────────────────────────────────

export const SPACESHIP = {
  bodyW: 28, bodyH: 9,
  domeW: 13, domeH: 10, domeY: 7,
  lightCount: 5, lightCircleRadius: 22, lightPointRadius: 2.5, lightY: 2, lightRotSpeed: 6,
} as const

// ── Environmental Birds ─────────────────────────────────────────────

export const ENV_BIRD = {
  flapAmp: 4, wingSpan: 4, lineWidth: 1,
} as const

// ── Idle Bird (Lou) ─────────────────────────────────────────────────

export const LOU_BIRD = {
  groundOffset: 60, lineWidth: 2.5, swoopAmp: 15, swoopFreqMult: 6,
  bodyW: 14, bodyH: 5,
  wingLineWidth: 2,
  wingStartX: 6, wingCurveX: 16, wingEndX: 26, wingFlapCurveY: 12, wingFlapEndY: 6,
  // Talons
  talonLineWidth: 1.5,
  talonLeftStartX: 3, talonLength: 12, talonSpread: 7, talonBottomY: 15,
  // Beak
  beakStartX: 14, beakStartY: -2, beakEndX: 22, beakEndY: 1, beakBottomY: 5,
  // Eye
  eyeX: 8, eyeY: -3, eyeRadius: 2,
  pupilX: 8.5, pupilY: -2.5, pupilRadius: 1,
} as const

// ── Gary Bird ───────────────────────────────────────────────────────

export const GARY_BIRD = {
  lineWidth: 2.5,
  // Landed pose
  landedBodyW: 12, landedBodyH: 5, landedBodyRot: 0.2, landedBodyY: -5,
  landedHeadX: 10, landedHeadY: -10, landedHeadR: 4,
  landedBeakStartX: 14, landedBeakStartY: -10, landedBeakEndX: 19, landedBeakEndY: -9, landedBeakBottomY: -8,
  // Legs
  landedTalonLeftStartX: -2, landedTalonLeftX: -4, landedTalonLength: 8,
  landedTalonSpread: 7, landedTalonBottomY: 10,
  landedTalonRightStartX: 4, landedTalonRightX: 6,
  // Eye
  landedEyeX: 11, landedEyeY: -11, landedEyeRadius: 1.5,
  landedPupilX: 11.5, landedPupilY: -11, landedPupilRadius: 0.8,
  // Flying pose
  flyingSwoopAmp: 15, flyingSwoopFreqMult: 6,
  flyingBodyW: 12, flyingBodyH: 5,
  flyingWingStartX: 5, flyingWingCurveX: 14, flyingWingEndX: 22,
  flyingWingFlapCurveY: 10, flyingWingFlapEndY: 5,
  flyingBeakStartX: 12, flyingBeakStartY: -2, flyingBeakEndX: 18, flyingBeakEndY: 0, flyingBeakBottomY: 2,
  // Idle bubbles
  departingBubbleYOffset: 20,
  landedGroundOffset: 18,
} as const

export const IDLE_BUBBLES = {
  garyMaxWidth: 160, garyXOffset: -20, garyYOffset: -30,
  louBubbleYOffset: 10,
  dialogueMaxWidth: 180, dialogueXOffset: -30, dialogueYOffset: -35,
  garyDialogueMaxWidth: 180, garyDialogueXOffset: -30, garyDialogueYOffset: -35,
} as const

// ── Character Rendering ─────────────────────────────────────────────

export const FLAT_BODY = {
  lineWidth: 2,
  torsoXStart: -15, torsoXEnd: 18, torsoYStart: -3, torsoYEnd: -4,
  headXOffset: -20, headRadius: 5,
  armLStartX: -5, armLEndY: -14, armRStartX: 8, armREndY: -16,
  legXEnd: 28, legStraightY: -2, legBentY: 5,
} as const

export const EXCLAMATION = {
  boulderYOffset: 29,
  boulderBubbleXOffset: -20, boulderBubbleYOffset: -50,
  sisExclaimYOffset: -30,
  sisBubbleXOffset: -10, sisBubbleYOffset: -40,
} as const

export const THOUGHT_RENDER = {
  headYOffset: -50,
  bubbleXOffset: 30, bubbleYOffset: -40,
} as const

export const FINAL_THOUGHT = {
  alphaScale: 2, boulderYOffset: -29,
  maxWidth: 220, xOffset: -60, yOffset: -60,
} as const

export const COUNTDOWN = {
  popThreshold: 0.15, popScaleStart: 0.5, popScaleRate: 1 / 0.15,
  fadeStart: 0.8, fadeWindow: 0.2,
  centerYOffset: -30,
  strokeWidth: 4,
  instructionYOffset: 50, instructionAlpha: 0.6,
} as const

export const CONTINUE_BODY = {
  torsoStartXOffset: -15, torsoEndXOffset: 20, torsoY: -5, torsoEndY: -3,
  headXOffset: 25, headY: -5, headRadius: 6,
  armLStartXOffset: 0, armLY: -5, armLEndXOffset: -10, armLEndY: -15,
  armRStartXOffset: 10, armRY: -4, armREndXOffset: 15, armREndY: -18,
  legLStartXOffset: -15, legLY: -5, legLEndXOffset: -25, legLEndY: -2,
  legRStartXOffset: -15, legRY: -5, legREndXOffset: -20, legREndY: 5,
  boulderGap: 50,
} as const

export const GETTING_UP = {
  standDuration: 1.5,
  hipYOffset: -18, shoulderYOffset: -25,
  headRadius: 6, headGap: 8,
  eyeXOffset: 2, eyeYOffset: -9, eyeRadius: 1.5,
  armXOffset: 12, armYOffset: 10,
  legXOffset: 8,
  sassyXOffset: -20, sassyYOffset: -50,
  // Walking
  walkCycleSpeed: 8, walkBounce: 2,
  walkDistanceScale: 50,
  torsoXOffset: 3, headXOffset: 5,
  armSwingScale: 0.5, armSwingDist: 10, armSwingYOffset: 15,
  legSwingDist: 10,
} as const

export const RUNNING = {
  cycleSpeed: 15, bounce: 3,
  shoulderXOffset: 10,
  armSwingScale: 0.6,
  armSwingLX: -10, armSwingLY: 15, armSwingRX: 15, armSwingRY: 10,
  legSwingDist: 15,
} as const

export const TUMBLING = {
  groundYOffset: -20,
  torsoTop: -10, torsoBottom: 15,
  headY: -16, headRadius: 6,
  armStartY: -5,
  armFlailMultiplier: 3, armFlailScale: 0.5,
  armLX: -15, armLY: -10, armLFlailX: 10, armLFlailY: 5,
  armRX: 15, armRY: 0, armRFlailX: -10, armRFlailY: 5,
  legTop: 15,
  legLX: -10, legLFlailX: -8, legLY: 25,
  legRX: 10, legRFlailX: 8, legRY: 28,
} as const

export const PUSHING = {
  renderGapMinFactor: 0.25, renderGapPower: 1.5,
  leanAngleOffset: 20, leanAngleScale: 0.17,
  breathingAmplitude: 1,
  strokeWidth: 2.5,
  stride: 14, footLiftAmplitude: 4,
  headBobPhaseScale: 0.5, headBobAmplitude: 1.5, headXOffset: 2,
  // Arms
  elbowBendBase: 4, elbowBendMin: 1, elbowBendAmplitude: 5, elbowBendFreq: 6,
  armYOffset: 3,
} as const

export const SWAT = {
  arcAmplitude: 1.8, arcOffset: -0.5,
  elbowAngleOffset: 0.5,
  armYOffset: 3,
} as const

export const EFFORT_LINES = {
  lineWidth: 1, count: 3, freq: 10, offsetScale: 2,
  xBase: -10, yBase: -5, xOffset: -16, yStep: 4,
} as const

// ── Delivery Bird (large transport bird) ────────────────────────────

export const DELIVERY_BIRD_RENDER = {
  lineWidth: 2.5, flapFreq: 6, wingAmp: 20,
  bodyW: 18, bodyH: 7,
  wingLineWidth: 2,
  wingInnerX: 8, wingCurveX: 22, wingEndX: 34, wingCurveYOffset: 16, wingEndYOffset: 10,
  beakStartX: 16, beakStartY: -3, beakEndX: 24, beakEndY: 0, beakBottomY: 4,
  tailStartX: 14, tailEndX: 22, tailUpY: -6, tailDownY: 3,
  // Talons
  talonLineWidth: 1.5,
  talonInnerX: 5, talonMidY: 7, talonKneeY: 20, talonFootY: 30,
  clawOuterX: 8, clawOuterY: 34, clawInnerX: 1, clawInnerY: 35, clawMidX: 5, clawMidY: 36,
} as const

export const CARRIED_BODY = {
  swayFreq: 3, swayAmp: 2,
  midY: 36,
  bodySpan: 18,
  headSwayScale: 0.3,
  armLX: -10, armDangleY: 18, armRX: 4, armRDangleY: 20,
  legLX: 14, legLDangleY: 22, legRX: 18, legRDangleY: 20,
  bloodDripSpeed: 2, bloodDripPhaseOffset: 0.5,
  bloodDrop1W: 1, bloodDrop1H: 2, bloodDrop1X: -4, bloodDrop1Range: 8,
  bloodDrop2W: 1, bloodDrop2H: 1.5, bloodDrop2X: 5, bloodDrop2Range: 6,
} as const

// ── Boulder Rendering ───────────────────────────────────────────────

export const BOULDER_RENDER = {
  lineWidth: 3, crackLineWidth: 1.5,
  crackXOffset: -0.25, crackYOffset: -0.2, crackRadiusScale: 0.28,
  crackArcStart: 0.5, crackArcEnd: 2.5,
  slopeSampleDist: 5,
} as const

// ── Obstacle Rendering ──────────────────────────────────────────────

export const SOUVLAKI = {
  xOffset: -25, width: 50, height: -50,
  awningXMin: -35, awningXMax: 35, awningY: -50, awningPeakXMin: -30, awningPeakXMax: 30, awningPeakY: -65,
  textX: -22, textY: -30, textX2: -18, textY2: -20,
} as const

export const SIGN_RENDER = {
  postXOffset: -2, postWidth: 4, postHeight: -40,
  boardXOffset: -25, boardWidth: 50, boardYOffset: -50, boardHeight: 20,
  cycleDistance: 5000,
} as const

export const BENCH = {
  seatXOffset: -20, seatWidth: 40, seatHeight: 5, seatY: -15,
  legLX: -18, legRX: 15, legHeight: 15,
  backY: -25, backHeight: 3,
} as const

export const ROCK_RENDER = {
  width: 20, height: 12, yOffset: -10,
  shadowXOffset: -5, shadowYOffset: -12, shadowW: 8, shadowH: 6, shadowRot: 0.3,
} as const

export const STRAY_DOG = {
  lineWidth: 2,
  legAnimFreqFlee: 20, legAnimAmpFlee: 6, legAnimFreqIdle: 3, legAnimAmpIdle: 2,
  tailWagFreqFlee: 15, tailWagFreqIdle: 5, tailWagAmplitude: 0.4,
  bodyXMin: -12, bodyXMax: 12, bodyY: -18,
  headX: 16, headY: -22, headRadius: 6,
  earLX: 13, earLY: -27, earLEndX: 11, earLEndY: -33,
  earRX: 19, earRY: -27, earREndX: 21, earREndY: -33,
  snoutStartX: 22, snoutStartY: -22, snoutEndX: 26, snoutEndY: -20,
  frontLegLX: 8, frontLegRX: 4, backLegLX: -8, backLegRX: -12, legY: -18,
  tailStartX: -12, tailStartY: -18,
  tailCtrlX: -18, tailCtrlY: -28, tailEndX: -22, tailEndY: -30,
  tailWagScale1: 4, tailWagScale2: 6,
  barkTextY: -38, barkThreshold: 0.5,
  fledCullDist: 600,
} as const

export const CAMPFIRE = {
  logLineWidth: 4,
  logLStartX: -15, logLEndX: 5, logLY: -8,
  logRStartX: 15, logREndX: -5, logRY: -8,
  flameCount: 5, flickerFreq: 10, flickerPhaseOffset: 1.5, flickerAmp: 3,
  flameHeightBase: 12, flameHeightFreq: 8, flameHeightAmp: 5, flameHeightPhaseOffset: 2,
  flameXBase: -6, flameXStep: 3,
  flameYBase: -6, flameHeightCtrlOffset: -6,
  glowInnerRadius: 5, glowOuterRadius: 40, glowY: -10,
  smokeY: -20,
} as const

export const SASQUATCH = {
  treeXOffset: -20, lineWidth: 3,
  clipXOffset: 10, clipWidthMin: 35, clipWidthMax: 60,
  headXOffset: 5, headYOffset: -55,
  bodyW: 14, bodyH: 25,
  headRadius: 10,
  eyeLX: -3, eyeY: -2, eyeRX: 3, eyeRadius: 3, pupilRadius: 1.5,
  legLineWidth: 5, legLX: -6, legRX: 6, legY: -5, legEndLX: -8, legEndRX: 8,
  trunkXOffset: -5, trunkWidth: 10, trunkHeight: -60,
  foliageApexX: 0, foliageApexY: -90, foliageBaseXMin: -18, foliageBaseY: -55, foliageBaseXMax: 18,
} as const

export const ANCIENT_RUINS = {
  lineWidth: 2,
  colLX: -30, colLHeight: -45, colLWidth: 8, colLCapX: -34, colLCapY: -48, colLCapWidth: 16, colLCapHeight: 5,
  breakXMin: -34, breakY: -48, breakPeakX: -30, breakPeakY: -55, breakMidX: -22, breakMidY: -50, breakEndX: -18,
  colRX: 15, colRHeight: -60, colRWidth: 8, colRCapX: 11, colRCapY: -63, colRCapWidth: 16, colRCapHeight: 5,
  capitalX: 10, capitalY: -68, capitalWidth: 18, capitalHeight: 5,
  lintelXMin: -18, lintelYMin: -48, lintelPeakX: 10, lintelPeakY: -65,
  lintelEndX: 14, lintelEndY: -63, lintelReturnX: -14, lintelReturnY: -46,
  scatteredStones: [[-20, -3, 5], [5, -2, 4], [-8, -4, 6], [30, -2, 3], [35, -3, 5]] as readonly (readonly number[])[],
  stoneHeightScale: 0.6, stoneRotation: 0.2,
  crackLineWidth: 1,
  crackLStartX: -26, crackLStartY: -30, crackLMidX: -28, crackLMidY: -20, crackLEndX: -25, crackLEndY: -10,
  crackRStartX: 19, crackRStartY: -40, crackREndX: 17, crackREndY: -30,
} as const

export const PHILOSOPHER = {
  lineWidth: 2, headY: -35, headRadius: 6,
  beardLX: -3, beardLY: 4, beardMidX: -1, beardMidY: 12, beardRX: 3,
  bodyX: -3, bodyY: -15,
  armThinkStartX: -3, armThinkMidX: 8, armThinkMidY: -25, armThinkEndX: 2, armThinkEndYOffset: 5,
  armRestStartX: -3, armRestY: -20, armRestEndX: -15, armRestEndY: -12,
  legLStartX: -3, legLStartY: -15, legLMidX: 10, legLMidY: -10, legLEndX: 8,
  legRStartX: -3, legRStartY: -15, legRMidX: -10, legRMidY: -8, legREndX: -12,
  rockX: -2, rockY: -8, rockW: 12, rockH: 6,
  thoughtFadeIn: 0.5, thoughtFadeOutStart: 4.5, thoughtFadeOutDuration: 5,
  thoughtAlpha: 0.8, thoughtMaxWidth: 120, thoughtYOffset: -30,
  labelX: -18, labelY: 12,
} as const

export const MOUNTAIN_GOAT = {
  lineWidth: 2, yOffset: -5,
  bodyW: 12, bodyH: 7, bodyY: -12,
  headX: 14, headY: -18, headRadius: 5,
  hornLStartX: 12, hornLStartY: -22, hornLCtrlX: 8, hornLCtrlY: -30, hornLEndX: 5, hornLEndY: -26,
  hornRStartX: 16, hornRStartY: -22, hornRCtrlX: 20, hornRCtrlY: -30, hornREndX: 23, hornREndY: -26,
  eyeX: 16, eyeY: -19, eyeRadius: 2, pupilRadius: 1,
  blinkStartX: 14, blinkEndX: 18, blinkY: -19,
  goateeStartX: 17, goateeStartY: -14, goateeEndX: 19, goateeEndY: -10,
  legXPositions: [-8, -4, 4, 8] as readonly number[], legTopY: -6,
  tailStartX: -12, tailStartY: -14, tailEndX: -16, tailEndY: -18,
  // Ledge
  ledgeXMin: -20, ledgeXMax: 20, ledgeYMin: 0, ledgeYMax: 8, ledgeCornerXMin: -25, ledgeCornerXMax: 25,
} as const

export const AVALANCHE_RENDER = {
  // Danger sign
  signTopY: -55, signBottomY: -30, signXMin: -15, signXMax: 15,
  borderWidth: 2, borderTopY: -52, borderBottomY: -32, borderX: 12,
  exclamationX: -3, exclamationY: -36,
  postXOffset: -2, postWidth: 4, postYOffset: -30, postHeight: 30,
  fallingRockHeightScale: 0.7,
  labelX: -16, labelY: -58,
} as const

export const MUSES = {
  // Ledge
  ledgeXMin: -35, ledgeYMin: -5, ledgeCornerXMin: -40, ledgeYMax: 5, ledgeCornerXMax: 40, ledgeXMax: 35,
  // Figures
  xBase: -20, xSpacing: 20,
  bouncePhaseOffset: 1.2, headYOffset: -40,
  armAnglePhaseOffset: 0.8, armAngleAmplitude: 0.3,
  lineWidth: 2, headRadius: 5,
  bodyYOffsetHead: 5, bodyYOffsetFoot: -12,
  armPointXOffset: -12, armPointYOffset: 5, armPointSwingX: -5, armPointSwingY: 3,
  armOtherXOffset: 8, armOtherYOffset: -15,
  legXOffset: 6, legYOffset: -5,
  laughAmpMult: 2, mouthRadius: 2, mouthFillHeightScale: 0.5,
  // HA HA HA
  laughTextAlphaSineScale: 0.5, laughTextAlphaOffset: 0.3, laughTextAlphaMin: 0.2,
  laughTextFloatFreq: 0.8, laughTextFloatAmp: 5, laughTextXOffset: -22,
  labelX: -22, labelY: 16,
} as const

// ── Overlay Obstacles ───────────────────────────────────────────────

export const OVERLAY_CULL = { xMin: -200, xMax: 200 } as const

export const ATTACK_BIRDS_RENDER = {
  lineWidth: 1.5, flapAmp: 5, wingXMin: -6, wingXMax: 6,
  squawkThreshold: 2, squawkAlphaFade: 0.5, squawkXOffset: -15, squawkY: -90,
} as const

export const STORM = {
  mainRadius: 35, mainY: -100,
  bulgeLeftX: -25, bulgeLeftRadius: 25, bulgeLeftY: -90,
  bulgeRightX: 30, bulgeRightRadius: 28, bulgeRightY: -92,
  rainLineWidth: 1, rainDropLength: 6,
  lightningLineWidth: 3, lightningRandomOffset: 20, lightningRandomScale: 0.5,
  lightningY1: -70, lightningY2: -40, lightningY3: -35, lightningY4: -5,
  flashAlphaScale: 0.15,
} as const

export const ALIEN = {
  ufoBodyW: 28, ufoBodyH: 9,
  ufoDomeW: 13, ufoDomeH: 10, ufoDomeY: 7,
  lightCount: 5, lightCircleRadius: 22, lightY: 2, lightRadius: 2.5, lightRotSpeed: 6,
  laserSweepDist: 60, laserLineWidth: 3, laserShadowBlur: 10, laserBeamYOffset: 9,
  impactGlowRadius: 20,
} as const
