export default defineEventHandler(async (event) => {
  const storage = useStorage('leaderboard')

  try {
    const body = await readBody(event)

    if (!body.initials || typeof body.score !== 'number') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid score data'
      })
    }

    // Validate initials (1-3 uppercase letters)
    const initials = String(body.initials).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)
    if (initials.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid initials'
      })
    }

    const score = Math.floor(Math.max(0, body.score))

    // Get existing scores
    const scores = await storage.getItem<{ initials: string; score: number; createdAt: number }[]>('scores') || []

    // Add new score
    scores.push({
      initials,
      score,
      createdAt: Date.now(),
    })

    // Keep top 100 by score
    scores.sort((a, b) => b.score - a.score)
    const trimmedScores = scores.slice(0, 100)

    // Save back
    await storage.setItem('scores', trimmedScores)

    return { success: true }
  } catch (error) {
    console.error('Failed to save score:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save score'
    })
  }
})
