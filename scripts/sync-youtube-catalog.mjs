import { config } from "dotenv";
import { getYouTubeCatalog } from "../api/youtube-catalog.js";

config({ path: [".env.local", ".env"], quiet: true });
const catalog = getYouTubeCatalog();
if (process.argv.includes("--watch")) {
  console.log("YouTube catalogue worker started (12-hour refresh, resumable history import).");
  catalog.start();
  // Keep the standalone worker alive; Vite itself already owns its server loop.
  setInterval(() => {}, 3600000);
} else {
  const result = await catalog.sync();
  console.log(JSON.stringify(result, null, 2));
  catalog.store.close();
  if (result.lastError) process.exitCode = 1;
}
