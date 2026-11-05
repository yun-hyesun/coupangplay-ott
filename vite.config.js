import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig, loadEnv } from 'vite'
import sportsHandler from './api/sports.js'

// .env.local의 값(API_NINJAS_KEY)을 읽습니다
const env = loadEnv('development', process.cwd(), '')

// 로컬 Vite에서 배포용 스포츠 API 핸들러를 재사용합니다.
const sportsApi = {
  name: 'local-sports-api',
  configureServer(server) {
    const { YOUTUBE_API_KEY } = loadEnv(server.config.mode, server.config.envDir, '')
    if (YOUTUBE_API_KEY) process.env.YOUTUBE_API_KEY ??= YOUTUBE_API_KEY

    server.middlewares.use((req, res, next) => {
      if (req.url?.split('?')[0] !== '/api/sports') {
        return next()
      }

      // Vercel 핸들러의 status/json 응답을 Node HTTP 응답에 연결합니다.
      res.status = (code) => {
        res.statusCode = code
        return res
      }
      res.json = (data) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        return res.end(JSON.stringify(data))
      }

      return sportsHandler(req, res)
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    sportsApi,
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
