
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import process from "node:process";
import babel from "@rolldown/plugin-babel";
import { defineConfig, loadEnv } from "vite";
import sportsHandler from "./api/sports.js";
import { createLeagueVideosHandler } from "./api/league-videos.js";
import { createMyTeamVideosHandler } from "./api/my-team-videos.js";
import { createYouTubeCatalog } from "./api/youtube-catalog.js";

const env = loadEnv("development", process.cwd(), "");

// 로컬 Vite에서 스포츠 API 핸들러 사용
const sportsApi = {
  name: "local-sports-api",

  configureServer(server) {
    const { YOUTUBE_API_KEY, VITE_YOUTUBE_API_KEY } = loadEnv(
      server.config.mode,
      server.config.envDir,
      ""
    );

    const youtubeApiKey = YOUTUBE_API_KEY || VITE_YOUTUBE_API_KEY;
    if (youtubeApiKey) {
      process.env.YOUTUBE_API_KEY ??= youtubeApiKey;
    }
    const leagueVideosHandler = createLeagueVideosHandler({ apiKey: youtubeApiKey });
    const catalog = createYouTubeCatalog({ apiKey: youtubeApiKey });
    const myTeamVideosHandler = createMyTeamVideosHandler({ catalog });
    const stopCatalog = catalog.start();
    server.httpServer?.once("close", stopCatalog);

    server.middlewares.use((req, res, next) => {
      const path = req.url?.split("?")[0];
      if (path !== "/api/sports" && path !== "/api/league-videos" && path !== "/api/my-team-videos") {
        return next();
      }

      // Vercel API 응답 형식 연결
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };

      res.json = (data) => {
        res.setHeader(
          "Content-Type",
          "application/json; charset=utf-8"
        );
        return res.end(JSON.stringify(data));
      };

      if (path === "/api/my-team-videos") return myTeamVideosHandler(req, res);
      return path === "/api/league-videos" ? leagueVideosHandler(req, res) : sportsHandler(req, res);
    });
  },
};

export default defineConfig({
  plugins: [
    sportsApi,
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
  ],

  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: ["./src/scss"],
        additionalData:
          '@use "variables" as *;\n@use "mixins" as *;',
      },
    },
  },

  server: {
    proxy: {
      "/espn-standings": {
        target: "https://site.api.espn.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/espn-standings/, "/apis/v2/sports"),
      },
      "/espn-core": {
        target: "https://sports.core.api.espn.com",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/espn-core/, "/v2"),
      },

      "/espn": {
        target: "https://site.api.espn.com",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/espn/, "/apis/site/v2/sports"),
      },

      "/jolpica": {
        target: "https://api.jolpi.ca",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/jolpica/, "/ergast"),
      },

      "/kleague": {
        target: "https://www.kleague.com",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/kleague/, ""),
      },

      "/nba": {
        target: "https://api.api-ninjas.com",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/nba/, "/v1"),
        headers: {
          "X-Api-Key": env.API_NINJAS_KEY,
        },
      },

      "/football-data": {
        target: "https://api.football-data.org",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/football-data/, "/v4"),
        headers: {
          "X-Auth-Token": env.FOOTBALL_DATA_KEY,
        },
      },

      "/mls-api": {
        target: "https://stats-api.mlssoccer.com",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/mls-api/, ""),
      },

      "/openliga": {
        target: "https://api.openligadb.de",
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/openliga/, ""),
      },
    },
  },
});
