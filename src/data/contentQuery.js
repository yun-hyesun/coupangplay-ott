export const makeParams = (config) => {
  const { type = 'movie', genre, country, sort = 'popularity.desc', ended, untilYear, minVotes } = config;
  const params = { sort_by: sort };
  if (genre) params.with_genres = String(genre).replace(/\s+/g, '');
  if (country) params.with_origin_country = country;
  if (type === 'tv' && ended) params.with_status = '3';
  if (untilYear) params[type === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte'] = `${untilYear}-12-31`;
  if (minVotes) params['vote_count.gte'] = String(minVotes);
  if (config.companies) {
    params.with_companies = config.companies;
  }

  if (config.kidsOnly) {
    params.kidsOnly = true;
    params.requiredImage =
      config.imageType === '세로' ? 'poster_path' : 'backdrop_path';
  }

  if (config.useTving === false) {
    params.useTving = false;
  }

  if (config.excludeGenres) {
    params.without_genres = config.excludeGenres;
  }

  if (config.monetizationType) {
    params.with_watch_monetization_types = config.monetizationType;
    params.requiredImage =
      config.imageType === '세로' ? 'poster_path' : 'backdrop_path';
  }

  if (config.network) {
    params.with_networks = config.network;
    params.requiredImage =
      config.imageType === '세로' ? 'poster_path' : 'backdrop_path';
  }

  return params;
};
export const makeRailId = (config) => JSON.stringify([
  config.type || 'movie', makeParams(config),
]);
