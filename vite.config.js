import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, loadEnv } from 'vite'

// .env.local의 값(API_NINJAS_KEY)을 읽습니다
const env = loadEnv('development', process.cwd(), '')

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: ['./src/scss'],
        additionalData: `
          @use "variables" as *;
          @use "mixins" as *;
        `
      }
    }
  },
  server: {
    proxy: {
      '/kleague': {
        target: 'https://www.kleague.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kleague/, ''),
      },
      '/nba': {
        target: 'https://api.api-ninjas.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nba/, '/v1'),
        headers: { 'X-Api-Key': env.API_NINJAS_KEY },
      },
    },
  },
})