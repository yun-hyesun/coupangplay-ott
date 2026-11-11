import { episodeKey } from './communityData.js';

export const readEpisodeNumber = (value, minimum) => {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum ? number : null;
};

export const watchEpisodeKey = ({ seasonNumber, episodeNumber } = {}) => {
  const season = readEpisodeNumber(seasonNumber, 0);
  const episode = readEpisodeNumber(episodeNumber, 1);
  return season === null || episode === null ? null : episodeKey(season, episode);
};
