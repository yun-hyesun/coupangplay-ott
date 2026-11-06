const integer = (value, minimum) => {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum ? number : null;
};

export const clipEpisodeDetails = (clip = {}) => {
  const content = clip.content || {};
  if (content.media_type !== 'tv') return { seasonNumber: null, episodeNumber: null, numberOfSeasons: null };
  return {
    seasonNumber: integer(clip.seasonNumber ?? clip.season_number ?? content.seasonNumber ?? content.season_number, 0),
    episodeNumber: integer(clip.episodeNumber ?? clip.episode_number ?? content.episodeNumber ?? content.episode_number, 1),
    numberOfSeasons: integer(content.number_of_seasons ?? clip.numberOfSeasons, 1),
  };
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
