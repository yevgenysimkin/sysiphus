export default defineEventHandler(async (event) => {
  const storage = useStorage('leaderboard')

  try {
    const scores = await storage.getItem<{ initials: string; score: number }[]>('scores') || []

    // Sort by score descending, take top 10
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error)
    return []
  }
})
