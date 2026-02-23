export default defineEventHandler(async (event) => {
  const storage = useStorage('leaderboard')

  try {
    const scores = await storage.getItem<{ initials: string; score: number; createdAt?: number }[]>('scores') || []

    // Sort by most recent first, take top 10
    return scores
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 10)
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error)
    return []
  }
})
