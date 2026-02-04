// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  app: {
    head: {
      title: 'Sisyphus',
      meta: [
        { name: 'description', content: 'Push the boulder. Forever.' }
      ]
    }
  },
  nitro: {
    storage: {
      'leaderboard': {
        driver: 'fs',
        base: './.data/leaderboard'
      }
    }
  }
})
