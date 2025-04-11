export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  ssr: false,

  modules: [
    '@nuxt/content',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/scripts',
    '@nuxt/test-utils',
    '@nuxt/ui'
  ],
  
  nitro: {
    // Enable this if you want to serve your API through Nuxt
    // devServer: {
    //   watch: ['./server']
    // }
  },
  
  runtimeConfig: {
    public: {
      wsUrl: process.env.WS_URL || 'ws://localhost:3001',
      apiUrl: process.env.API_URL || 'http://localhost:3001'
    }
  },

  // Add this to make the dev server accessible on your network
  devServer: {
    host: '0.0.0.0',
    port: 3000
  },

  // Optional: Configure proxy if you want to avoid CORS
  routeRules: {
    '/api/**': {
      proxy: { to: 'http://localhost:3001/api/**' }
    }
  }
})