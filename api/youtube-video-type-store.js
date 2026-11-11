import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = join(tmpdir(), "coupangplay-sports");
const cacheFile = join(directory, "youtube-video-types-v1.json");
let writes = Promise.resolve();

export const youtubeVideoTypeStore = {
  async load() {
    try {
      const entries = JSON.parse(await readFile(cacheFile, "utf8"));
      return Array.isArray(entries) ? entries : [];
    } catch { return []; }
  },
  async save(entries) {
    writes = writes.catch(() => {}).then(async () => {
      const combined = new Map((await this.load()).map(entry => [entry.key, entry]));
      for (const entry of entries) {
        if (!combined.has(entry.key) || combined.get(entry.key).at <= entry.at) combined.set(entry.key, entry);
      }
      const current = [...combined.values()].filter(entry => typeof entry.isShort === "boolean" && Number.isFinite(entry.at)
        && Date.now() >= entry.at && Date.now() - entry.at < 86400000).slice(-5000);
      await mkdir(directory, { recursive: true });
      const temporaryFile = cacheFile + ".pending";
      await writeFile(temporaryFile, JSON.stringify(current));
      await rename(temporaryFile, cacheFile);
    });
    return writes;
  },
};
