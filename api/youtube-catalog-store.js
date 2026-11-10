import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { getExplicitVideoLeague } from "../src/data/leagueVideoQueries.js";

export const CATALOG_REFRESH_MS = 12 * 60 * 60 * 1000;
export const CATALOG_MAX_VIDEOS = 5000;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const CATALOG_CHANNEL_ID = "UCnBht7BrOx-A328KFXgysqQ";

function durationLabel(iso = "") {
  const values = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!values) return "";
  const [, h, m, s] = values.map(Number);
  return h ? `${h}:${String(m || 0).padStart(2, "0")}:${String(s || 0).padStart(2, "0")}`
    : `${String(m || 0).padStart(2, "0")}:${String(s || 0).padStart(2, "0")}`;
}

export function createYouTubeCatalogStore({ filename = process.env.YOUTUBE_CATALOG_DB || resolve(".data/youtube-catalog.sqlite"), maxVideos = CATALOG_MAX_VIDEOS } = {}) {
  if (!Number.isInteger(maxVideos) || maxVideos < 1 || maxVideos > CATALOG_MAX_VIDEOS) throw new RangeError("영상 저장 한도는 1~5,000건이어야 합니다.");
  if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS catalog_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS catalog_lock (id INTEGER PRIMARY KEY, owner TEXT, expires_at INTEGER);
    CREATE TABLE IF NOT EXISTS catalog_videos (
      id TEXT PRIMARY KEY, published_at TEXT NOT NULL DEFAULT '', data TEXT,
      view_count INTEGER, updated_at INTEGER NOT NULL DEFAULT 0,
      is_short INTEGER, type_checked_at INTEGER NOT NULL DEFAULT 0,
      type_retry_at INTEGER NOT NULL DEFAULT 0, available INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS catalog_due ON catalog_videos(updated_at);
    CREATE INDEX IF NOT EXISTS catalog_popular ON catalog_videos(is_short, view_count DESC);`);
  let inTransaction = false;
  const transaction = work => {
    if (inTransaction) return work();
    db.exec("BEGIN IMMEDIATE");
    inTransaction = true;
    try { const result = work(); db.exec("COMMIT"); return result; }
    catch (error) { db.exec("ROLLBACK"); throw error; }
    finally { inTransaction = false; }
  };
  const get = key => {
    const row = db.prepare("SELECT value FROM catalog_state WHERE key = ?").get(key);
    return row ? JSON.parse(row.value) : undefined;
  };
  const set = (key, value) => db.prepare("INSERT INTO catalog_state VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(key, JSON.stringify(value));
  function trimToLimit() {
    const count = db.prepare("SELECT count(*) AS count FROM catalog_videos").get().count;
    if (count <= maxVideos) return { removed: 0, retained: count };
    const rows = db.prepare(`SELECT id,data,published_at,
      CASE WHEN available=1 AND data IS NOT NULL AND is_short=0 AND view_count IS NOT NULL THEN 0
        WHEN available=1 AND data IS NOT NULL AND is_short IS NULL THEN 1
        WHEN available=1 AND data IS NULL THEN 2 ELSE 3 END AS priority
      FROM catalog_videos ORDER BY priority, coalesce(view_count,-1) DESC, published_at DESC, id`).all();
    const keep = new Set();
    // Reserve 10% for recent candidates so new uploads can accumulate views before eviction.
    const recent = rows.filter(row => row.priority <= 1).sort((a, b) => b.published_at.localeCompare(a.published_at) || a.id.localeCompare(b.id));
    for (const row of recent.slice(0, Math.floor(maxVideos / 10))) keep.add(row.id);
    // Share popular slots across leagues; one competition must not displace every other league.
    for (let priority = 0; priority <= 3 && keep.size < maxVideos; priority++) {
      const leagues = new Map();
      for (const row of rows) {
        if (row.priority !== priority || keep.has(row.id)) continue;
        const league = getExplicitVideoLeague(row.data ? JSON.parse(row.data).title : "") || "other";
        if (!leagues.has(league)) leagues.set(league, []);
        leagues.get(league).push(row.id);
      }
      const longest = Math.max(0, ...[...leagues.values()].map(items => items.length));
      for (let round = 0; round < longest && keep.size < maxVideos; round++) {
        for (const items of leagues.values()) if (items[round] && keep.size < maxVideos) keep.add(items[round]);
      }
    }
    const removed = db.prepare(`DELETE FROM catalog_videos WHERE id NOT IN (${[...keep].map(() => "?").join(",")})`).run(...keep).changes;
    set("retentionRemoved", (get("retentionRemoved") || 0) + removed);
    return { removed, retained: keep.size };
  }
  const store = {
    filename, get, set,
    close() { db.close(); },
    enforceLimit() { return transaction(trimToLimit); },
    compact() { db.exec("VACUUM"); db.exec("PRAGMA wal_checkpoint(TRUNCATE)"); },
    acquire(owner, now) {
      return db.prepare(`INSERT INTO catalog_lock VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner, expires_at=excluded.expires_at
        WHERE catalog_lock.expires_at <= ?`).run(owner, now + 180000, now).changes === 1;
    },
    renew(owner, now) { db.prepare("UPDATE catalog_lock SET expires_at=? WHERE id=1 AND owner=?").run(now + 180000, owner); },
    release(owner) { db.prepare("DELETE FROM catalog_lock WHERE id=1 AND owner=?").run(owner); },
    reserveCall(now, limit) {
      return transaction(() => {
        const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
        const saved = get("budget");
        const budget = saved?.day === day ? saved : { day, used: 0 };
        if (budget.used >= limit) return false;
        set("budget", { ...budget, used: budget.used + 1 });
        return true;
      });
    },
    discover(items, state = {}, details) {
      return transaction(() => {
        const insert = db.prepare("INSERT OR IGNORE INTO catalog_videos(id,published_at) VALUES (?,?)");
        let added = 0, existing = false;
        for (const item of items) {
          const changed = insert.run(item.id, item.publishedAt || "").changes;
          added += changed;
          existing ||= !changed;
        }
        // New candidates are ranked with their fetched statistics in this same transaction.
        // Committed storage stays capped even when the catalogue is already full.
        if (details) store.saveDetails(details.items, details.requestedIds, details.now);
        trimToLimit();
        for (const [key, value] of Object.entries(state)) set(key, value);
        return { added, existing };
      });
    },
    has(id) { return Boolean(db.prepare("SELECT id FROM catalog_videos WHERE id=?").get(id)); },
    dueDetails(now, limit = 50) {
      return db.prepare(`SELECT id FROM catalog_videos WHERE updated_at <= ? OR (data IS NOT NULL AND json_extract(data,'$.metadataVersion') IS NULL)
        ORDER BY updated_at, published_at DESC LIMIT ?`)
        .all(now - CATALOG_REFRESH_MS, limit).map(row => row.id);
    },
    saveDetails(items, requestedIds, now) {
      transaction(() => {
        const upsert = db.prepare(`UPDATE catalog_videos SET published_at=?, data=?, view_count=?, updated_at=?, is_short=?,
          type_checked_at=?, type_retry_at=0, available=1 WHERE id=?`);
        const missing = new Set(requestedIds);
        for (const item of items) {
          if (!missing.has(item.id) || item.snippet?.channelId !== CATALOG_CHANNEL_ID || !Number.isFinite(Date.parse(item.snippet.publishedAt))) continue;
          missing.delete(item.id);
          const previous = db.prepare("SELECT data,is_short,type_checked_at FROM catalog_videos WHERE id=?").get(item.id);
          if (!previous) continue;
          const iso = item.contentDetails?.duration || "";
          const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
          const seconds = match ? Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) : null;
          const old = previous?.data ? JSON.parse(previous.data) : null;
          // Explicit embed dimensions are returned only when YouTube knows the aspect ratio.
          // Landscape videos cannot be Shorts; never infer this from thumbnails or the default iframe HTML.
          const width = Number(item.player?.embedWidth), height = Number(item.player?.embedHeight);
          const landscapeVerified = Number.isFinite(width) && Number.isFinite(height) && width > height && height > 0;
          const standardVerified = seconds > 180 || landscapeVerified;
          const keepPreviousType = old?.durationIso === iso && !(old.landscapeVerified && !landscapeVerified);
          const isShort = standardVerified ? 0 : keepPreviousType ? previous.is_short : null;
          const { title, publishedAt, thumbnails } = item.snippet;
          const count = item.statistics?.viewCount == null ? null : Number(item.statistics.viewCount);
          const viewCount = Number.isSafeInteger(count) && count >= 0 ? count : null;
          const value = { id: item.id, title, publishedAt, channelId: CATALOG_CHANNEL_ID,
            image: (thumbnails?.maxres || thumbnails?.standard || thumbnails?.high || thumbnails?.medium)?.url || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${item.id}`, duration: durationLabel(iso), durationIso: iso, durationSeconds: seconds, viewCount,
            metadataVersion: 2, landscapeVerified,
            kind: /풀경기|풀영상|다시보기|full\s*match/i.test(title) ? "replay" : /하이라이트|highlights?|\bHL\b/i.test(title) ? "highlight" : "recommend" };
          upsert.run(publishedAt, JSON.stringify(value), viewCount, now, isShort, standardVerified ? now : previous.type_checked_at, item.id);
        }
        for (const id of missing) db.prepare("UPDATE catalog_videos SET data=NULL, published_at='', view_count=NULL, is_short=NULL, available=0, updated_at=? WHERE id=?").run(now, id);
        trimToLimit();
      });
    },
    dueTypes(now, limit = 50) {
      const candidates = db.prepare(`SELECT data FROM catalog_videos WHERE available=1 AND data IS NOT NULL AND type_retry_at<=?
        AND (json_extract(data,'$.durationSeconds') IS NULL OR json_extract(data,'$.durationSeconds')<=180)
        AND coalesce(json_extract(data,'$.landscapeVerified'),0)=0
        AND (is_short IS NULL OR type_checked_at<=?) ORDER BY view_count DESC`).all(now, now - 86400000)
        .map(row => JSON.parse(row.data)).filter(video => {
          const match = video.durationIso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
          return !match || Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0) <= 180;
        });
      // Verify the most popular candidates in each league fairly during the first import.
      const leagues = new Map();
      for (const video of candidates) {
        const league = getExplicitVideoLeague(video.title) || "other";
        if (!leagues.has(league)) leagues.set(league, []);
        leagues.get(league).push(video);
      }
      const selected = [];
      for (let round = 0; selected.length < Math.min(limit, candidates.length); round++) {
        for (const videos of leagues.values()) if (videos[round] && selected.length < limit) selected.push(videos[round]);
      }
      return selected;
    },
    saveTypes(classifications, now) {
      transaction(() => {
        for (const { id, isShort } of classifications) {
          if (typeof isShort === "boolean") db.prepare("UPDATE catalog_videos SET is_short=?, type_checked_at=?, type_retry_at=0 WHERE id=?").run(Number(isShort), now, id);
          else db.prepare("UPDATE catalog_videos SET type_retry_at=? WHERE id=?").run(now + 3600000, id);
        }
        trimToLimit();
      });
    },
    videos(now) {
      return db.prepare(`SELECT data FROM catalog_videos WHERE available=1 AND is_short=0 AND view_count IS NOT NULL AND updated_at>?
        ORDER BY view_count DESC, published_at DESC, id`).all(now - MAX_AGE_MS)
        .map(row => ({ ...JSON.parse(row.data), isShort: false }));
    },
    unclassifiedVideos(now, minViews = 0) {
      return db.prepare(`SELECT data FROM catalog_videos WHERE available=1 AND is_short IS NULL AND data IS NOT NULL AND view_count>=? AND updated_at>?
        ORDER BY view_count DESC`).all(minViews, now - MAX_AGE_MS).map(row => JSON.parse(row.data));
    },
    purgeExpired(now) {
      db.prepare("UPDATE catalog_videos SET data=NULL, view_count=NULL, is_short=NULL, published_at='' WHERE data IS NOT NULL AND updated_at<=?").run(now - MAX_AGE_MS);
    },
    status(now) {
      const counts = db.prepare(`SELECT count(*) AS discovered, sum(data IS NOT NULL AND available=1) AS detailed,
        sum(is_short=0 AND available=1 AND data IS NOT NULL) AS standard,
        sum(available=1 AND data IS NULL) AS pending, sum(data IS NOT NULL AND is_short IS NULL AND available=1) AS unclassified FROM catalog_videos`).get();
      return { ...Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, value || 0])), historyComplete: Boolean(get("historyDone")) && !counts.pending,
        retentionLimit: maxVideos, catalogLimited: Boolean(get("retentionRemoved")),
        lastRunAt: get("lastRunAt") || null, lastError: get("lastError") || "", retryAt: get("retryAt") || 0,
        refreshing: Boolean(db.prepare("SELECT id FROM catalog_lock WHERE expires_at>?").get(now)), budget: get("budget") || null };
    },
  };
  return store;
}
