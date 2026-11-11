import { readEpisodeNumber, watchEpisodeKey } from '../../../data/watchHistoryData.js';

export const clipEpisodeDetails = (clip = {}) => {
  const content = clip.content || {};
  if (content.media_type !== 'tv') return { seasonNumber: null, episodeNumber: null, numberOfSeasons: null };
  return {
    seasonNumber: readEpisodeNumber(clip.seasonNumber ?? clip.season_number ?? content.seasonNumber ?? content.season_number, 0),
    episodeNumber: readEpisodeNumber(clip.episodeNumber ?? clip.episode_number ?? content.episodeNumber ?? content.episode_number, 1),
    numberOfSeasons: readEpisodeNumber(content.number_of_seasons ?? clip.numberOfSeasons, 1),
  };
};

export const hasOriginalWatchHistory = (clip, history) => {
  const { id, media_type: type } = clip.content || {};
  if (id == null || (type !== 'movie' && type !== 'tv')) return false;

  const episode = watchEpisodeKey(clipEpisodeDetails(clip));
  return history.some((item) => {
    if (item.media_type !== type || item.id == null || String(item.id) !== String(id)) return false;
    if (type === 'movie') return true;
    return !!episode && (watchEpisodeKey(item) === episode ||
      (Array.isArray(item.watchedEpisodes) && item.watchedEpisodes.includes(episode)));
  });
};

export const clipEpisodeLabel = (clip) => {
  const { seasonNumber, episodeNumber, numberOfSeasons } = clipEpisodeDetails(clip);
  if (episodeNumber === null) return '';
  if (seasonNumber === 0) return `스페셜 · ${episodeNumber}화`;
  if (seasonNumber !== null && (numberOfSeasons === null || numberOfSeasons > 1 || seasonNumber > 1)) return `시즌 ${seasonNumber} · ${episodeNumber}화`;
  return `${episodeNumber}화`;
};

export const clipWatchState = (clip) => {
  const { seasonNumber, episodeNumber } = clipEpisodeDetails(clip);
  return {
    content: clip.content,
    youtubeKey: clip.videoKey,
    resumeAt: clip.start,
    ...(seasonNumber !== null ? { seasonNumber } : {}),
    ...(episodeNumber !== null ? { episodeNumber } : {}),
  };
};
