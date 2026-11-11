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

  // 앱 내부에서 처리하는 채널 데이터 조건
  if (config.sourceCheck) params.sourceCheck = config.sourceCheck;
  if (config.channelTitles) params.channelTitles = config.channelTitles;
  if (config.channelTag) params.channelTag = config.channelTag;
  if (config.useTving === false) {
    params.requiredImage = config.imageType === '세로'
      ? 'poster_path' : 'backdrop_path';
  }

  if (config.adultOnly) {
    params.adultOnly = true;
    params.useTving = false;
    params.requiredImage =
      config.imageType === '세로'
        ? 'poster_path'
        : 'backdrop_path';
  }

  if (config.excludeOriginCountry) {
    params.excludeOriginCountry = config.excludeOriginCountry;
  }

  return params;
};
export const makeRailId = (config) => JSON.stringify([
  config.type || 'movie', makeParams(config),
]);

