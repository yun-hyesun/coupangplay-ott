import { getMatchVideoContext, getMatchVideoKey, selectMatchVideos } from "../data/matchRelatedVideos";
import { getLeagueVideoPage } from "./leagueVideosService";

export async function getMatchVideoPage(game, { signal, cursor = null } = {}) {
  const context = getMatchVideoContext(game);
  if (!context) return { videos: [], nextCursor: null, incomplete: false };
  let monthIndex = cursor?.monthIndex || 0;
  let pageToken = cursor?.pageToken || "";
  let incomplete = false;
  const videos = [];
  const visited = new Set();
  // Bound each interaction while preserving a cursor for the remaining results.
  for (let page = 0; page < 3 && monthIndex < context.months.length; page++) {
    signal?.throwIfAborted();
    const key = `${monthIndex}:${pageToken}`;
    if (visited.has(key)) throw new Error("영상 목록을 갱신하지 못했습니다. 다시 시도해 주세요.");
    visited.add(key);
    const result = await getLeagueVideoPage({
      league: context.league, scope: "month", month: context.months[monthIndex],
      pageToken,
    }, { signal });
    signal?.throwIfAborted();
    videos.push(...result.videos);
    if (result.classificationIncomplete) {
      incomplete = true;
      break; // Retry this page rather than losing videos that were not classified.
    }
    pageToken = result.nextPageToken || "";
    if (!pageToken) monthIndex++;
  }
  return {
    videos: selectMatchVideos(game, videos), incomplete,
    nextCursor: monthIndex < context.months.length ? { monthIndex, pageToken } : null,
  };
}

// Check each league/month once for all the fixtures on the selected day.
// The same cached pages are reused when a confirmed match is expanded.
export async function getScheduleMatchVideos(games, { signal, onVideos = () => {} } = {}) {
  const jobsByQuery = new Map();
  const found = {};
  for (const game of games) {
    const context = getMatchVideoContext(game);
    if (!context) continue;
    for (const month of context.months) {
      const key = `${context.league}:${month}`;
      if (!jobsByQuery.has(key)) jobsByQuery.set(key, { league: context.league, month, games: [], from: context.from });
      const job = jobsByQuery.get(key);
      job.games.push(game);
      job.from = Math.min(job.from, context.from);
    }
  }
  const jobs = [...jobsByQuery.values()];
  let jobIndex = 0;
  async function worker() {
    while (jobIndex < jobs.length) {
      signal?.throwIfAborted();
      const job = jobs[jobIndex++];
      const visited = new Set();
      let pageToken = "";
      try {
        while (!job.games.every(game => found[getMatchVideoKey(game)]?.length)) {
          signal?.throwIfAborted();
          if (visited.has(pageToken)) break;
          visited.add(pageToken);
          const page = await getLeagueVideoPage({ league: job.league, scope: "month", month: job.month, pageToken }, { signal });
          signal?.throwIfAborted();
          for (const game of job.games) {
            const key = getMatchVideoKey(game);
            const videos = selectMatchVideos(game, [...(found[key] || []), ...page.videos]);
            if (videos.length && videos.length !== found[key]?.length) {
              found[key] = videos;
              onVideos(key, videos);
            }
          }
          // Pages are newest first. Older uploads cannot belong to these games.
          if (!page.nextPageToken || page.classificationIncomplete || page.videos.some(video => Date.parse(video.publishedAt) < job.from)) break;
          pageToken = page.nextPageToken;
        }
      } catch (error) {
        if (signal?.aborted) throw error;
        // An unavailable source must never enable an unverified accordion.
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(2, jobs.length) }, () => worker()));
  return found;
}
