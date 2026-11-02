export const makeParams = (config) => {
  const { type = 'movie', genre, country, sort = 'popularity.desc', ended, untilYear, minVotes } = config;
  const params = { sort_by: sort };
  if (genre) params.with_genres = String(genre).replace(/\s+/g, '');
  if (country) params.with_origin_country = country;
  if (type === 'tv' && ended) params.with_status = '3';
  if (untilYear) params[type === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte'] = `${untilYear}-12-31`;
  if (minVotes) params['vote_count.gte'] = String(minVotes);
  return params;
};
export const makeRailId = (config) => JSON.stringify([
  config.type || 'movie', makeParams(config),
]);
