import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { defineConfig, loadEnv } from "vite";

const env = loadEnv("development", process.cwd(), "");

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: ["./src/scss"],
        additionalData: "@use \"variables\" as *;\n@use \"mixins\" as *;",
      },
    },
  },
  server: {
    proxy: {
      "/espn": {
        target: "https://site.api.espn.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/espn/, "/apis/site/v2/sports"),
      },
      "/kleague": {
        target: "https://www.kleague.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/kleague/, ""),
      },
      "/nba": {
        target: "https://api.api-ninjas.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nba/, "/v1"),
        headers: { "X-Api-Key": env.API_NINJAS_KEY },
      },
      "/football-data": {
        target: "https://api.football-data.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/football-data/, "/v4"),
        headers: { "X-Auth-Token": env.FOOTBALL_DATA_KEY },
      },
    },
  },
});
