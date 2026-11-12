import candidates from './video-source-candidates.json' with { type: 'json' };

const unavailablePreviewIds = new Set(candidates.unavailablePreviewIds);
const previewLanguagePriority = { ko: 0, en: 1 };
const MAX_PREVIEW_ATTEMPTS = 3;
const PREVIEW_REQUEST_TIMEOUT_MS = 4500;
const PREVIEW_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_PREVIEW_CACHE_ENTRIES = 128;
const previewCache = new Map();

export const videoTypeLabels = {
  trailer: '예고편',
  teaser: '티저',
  clip: '클립',
  film: '공개 본편',
  episode: '공개 본편',
  featurette: '소개 영상',
  'behind the scenes': '메이킹',
  bloopers: '비하인드',
  'opening credits': '오프닝',
  recap: '하이라이트',
};

export function getVideoFallback(type, id, target, seasonNumber = 1, episodeNumber = 1) {
  if (type !== 'movie' && type !== 'tv') return null;

  const video = candidates.videos[`${type}/${id}`];
  if (!video) return null;
  if (target !== 'playbackFallback') return video.targets.includes(target) ? video : null;

  if (unavailablePreviewIds.has(video.youtubeId) ||
    !video.targets.some((use) => use === 'playbackFallback' || use === 'preview')) return null;

  if (type === 'tv' && video.scope.type !== 'title') {
    if (Number(seasonNumber) !== video.scope.seasonNumber) return null;
    if (video.scope.type === 'episode' && Number(episodeNumber) !== video.scope.episodeNumber) return null;
  }

  return video;
}

function isYouTubeVideo(video) {
  return video?.site === 'YouTube' && /^[\w-]{11}$/.test(video.key || '');
}

function rankWatchVideos(videos, preferredLanguage) {
  return videos.filter(isYouTubeVideo).sort((a, b) =>
    Number(b.iso_639_1 === preferredLanguage) - Number(a.iso_639_1 === preferredLanguage) ||
    Number(b.type === 'Trailer') - Number(a.type === 'Trailer')
  );
}

export function selectWatchVideo({
  type, id, seasonNumber = 1, episodeNumber = 1, episodeVideos = [], titleVideos = [], failedSources = [],
}) {
  if (type !== 'movie' && type !== 'tv') return null;

  const rankedEpisodes = rankWatchVideos(episodeVideos.filter((video) => !video?.fromSearch), 'en');
  const rankedTitles = rankWatchVideos(titleVideos, type === 'movie' ? 'ko' : 'en');
  const primary = rankedEpisodes[0] || rankedTitles[0];
  const isAvailable = (key) => key && !unavailablePreviewIds.has(key) && !failedSources.includes(key);
  const asSource = (video, supplemental, scope = 'title') => ({
    key: video.key,
    name: video.name,
    videoType: video.type?.toLowerCase(),
    scope: { type: scope },
    supplemental,
  });

  const episodeVideo = rankedEpisodes.find((video) => isAvailable(video.key));
  if (episodeVideo) return asSource(episodeVideo, episodeVideo !== primary, 'episode');

  const fallback = getVideoFallback(type, id, 'playbackFallback', seasonNumber, episodeNumber);
  const hasScopedFallback = fallback && fallback.scope.type !== 'title' && isAvailable(fallback.youtubeId);

  if (isAvailable(primary?.key) && !hasScopedFallback) {
    const laterEpisode = type === 'tv' && (Number(seasonNumber) !== 1 || Number(episodeNumber) !== 1);
    return asSource(primary, laterEpisode);
  }

  if (isAvailable(fallback?.youtubeId)) {
    return { ...fallback, key: fallback.youtubeId, name: fallback.videoTitle, supplemental: true };
  }

  const alternate = rankedTitles.find((video) => isAvailable(video.key)) ||
    episodeVideos.find((video) => video?.fromSearch && isYouTubeVideo(video) && isAvailable(video.key));
  return alternate ? asSource(alternate, true) : null;
}

export function selectPreviewVideos(videos, fallback, backup) {
  const sources = (Array.isArray(videos) ? videos : [])
    .filter((video) => isYouTubeVideo(video) && !unavailablePreviewIds.has(video.key) &&
      Object.hasOwn(videoTypeLabels, video.type?.toLowerCase()))
    .sort((a, b) => {
      const languageDifference = (previewLanguagePriority[a.iso_639_1] ?? 2) -
        (previewLanguagePriority[b.iso_639_1] ?? 2);
      return languageDifference || Number(b.type === 'Trailer') - Number(a.type === 'Trailer');
    })
    .map((video) => ({ youtubeId: video.key, videoType: video.type.toLowerCase() }));

  const unique = new Map();
  const previewBackup = backup && { ...backup, endSeconds: backup.endSeconds ?? 30 };
  for (const source of [fallback, ...sources.slice(0, 2), previewBackup, ...sources.slice(2)]) {
    if (source && !unavailablePreviewIds.has(source.youtubeId) && !unique.has(source.youtubeId)) {
      unique.set(source.youtubeId, source);
    }
  }
  return [...unique.values()].slice(0, MAX_PREVIEW_ATTEMPTS);
}

function getPreviewCacheKey(type, id, originalLanguage) {
  return `${type}/${id}/${originalLanguage || ''}`;
}

export function getCachedPreviewVideos(type, id, originalLanguage) {
  const entry = previewCache.get(getPreviewCacheKey(type, id, originalLanguage));
  if (entry?.expiresAt > Date.now()) return entry.videos;
  return undefined;
}

export function loadPreviewVideos(type, id, originalLanguage, apiKey) {
  if (!apiKey || (type !== 'movie' && type !== 'tv')) return Promise.resolve([]);

  const key = getPreviewCacheKey(type, id, originalLanguage);
  const cached = previewCache.get(key);
  if (cached?.expiresAt > Date.now()) return cached.request;

  const languages = new Set(['ko', 'en']);
  if (/^[a-z]{2}$/.test(originalLanguage || '')) languages.add(originalLanguage);
  const query = new URLSearchParams({
    api_key: apiKey,
    language: 'ko-KR',
    include_video_language: [...languages].join(','),
  });

  const entry = { expiresAt: Date.now() + PREVIEW_CACHE_TTL_MS };
  entry.request = fetch(`https://api.themoviedb.org/3/${type}/${id}/videos?${query}`, {
    signal: AbortSignal.timeout(PREVIEW_REQUEST_TIMEOUT_MS),
  }).then(async (response) => {
    if (!response.ok) throw new Error('미리보기 영상 목록을 불러오지 못했습니다.');
    const { results } = await response.json();
    if (!Array.isArray(results)) throw new Error('미리보기 영상 목록의 형식이 올바르지 않습니다.');
    entry.videos = results;
    entry.expiresAt = Date.now() + PREVIEW_CACHE_TTL_MS;
    return results;
  }).catch((error) => {
    if (previewCache.get(key) === entry) previewCache.delete(key);
    throw error;
  });

  previewCache.delete(key);
  previewCache.set(key, entry);
  if (previewCache.size > MAX_PREVIEW_CACHE_ENTRIES) {
    previewCache.delete(previewCache.keys().next().value);
  }
  return entry.request;
}
