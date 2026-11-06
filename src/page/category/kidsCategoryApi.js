// 키즈 카테고리 요청은 기존 영화/드라마 캐시에 영향을 주지 않습니다.
const lists = new Map();
const requests = new Map();
const details = new Map();
const queue = [];
let running = 0;

const pump = () => {
  while (running < 4 && queue.length) {
    const { task, resolve, reject } = queue.shift();
    running += 1;
    Promise.resolve().then(task).then(resolve, reject).finally(() => {
      running -= 1;
      pump();
    });
  }
};
const limited = (task) => new Promise((resolve, reject) => {
  queue.push({ task, resolve, reject });
  pump();
});
const request = (path, query = {}) => limited(async () => {
  const key = import.meta.env.VITE_TMDB_API_KEY;

  if (!key) {
    throw new Error('VITE_TMDB_API_KEY 설정을 확인해 주세요.');
  }

  const params = new URLSearchParams({
    api_key: key,
    language: 'ko-KR',
    ...query,
  });

  const response = await fetch(
    `https://api.themoviedb.org/3${path}?${params}`
  );

  if (!response.ok) {
    throw new Error(`키즈 목록 조회 실패 (${response.status})`);
  }

  const data = await response.json();

  if (path.startsWith('/search/')) {
    console.log('[키즈 검색 결과]', {
      search: query.query,
      total: data.total_results,
      titles: (data.results ?? []).map(
        (item) => item.title || item.name
      ),
    });
  }

  return data;
});
const normalize = (value = '') =>
  value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');

const allowedRatings = new Set(['ALL', '전체', '전체관람가', '0', '7', '12']);

const getKidItem = (type, id) => {
  const key = `${type}-${id}`;
  if (!details.has(key)) {
    const promise = request(`/${type}/${id}`, {
      append_to_response: type === 'movie' ? 'release_dates' : 'content_ratings',
    }).then((item) => {
      if (item.adult || !item.backdrop_path) return null;
      const ratings = type === 'movie'
        ? (item.release_dates?.results ?? [])
          .filter((entry) => entry.iso_3166_1 === 'KR')
          .flatMap((entry) => entry.release_dates ?? [])
          .map((entry) => entry.certification)
        : (item.content_ratings?.results ?? [])
          .filter((entry) => entry.iso_3166_1 === 'KR')
          .map((entry) => entry.rating);
      const values = ratings.map((value) => String(value ?? '').trim().toUpperCase()).filter(Boolean);
      if (
        !values.length ||
        !values.every((value) => allowedRatings.has(value))
      ) {
        console.log('[키즈 등급 때문에 제외]', {
          title: item.title || item.name,
          ratings: values,
        });

        return null;
}
      const date = item.release_date || item.first_air_date;
      const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
      if (date && date > today) return null;
      return { ...item, media_type: type, isPurchase: false,
        isCoupangSeries: type === 'tv' && (item.networks ?? []).some((network) => network.id === 5169) };
    });
    details.set(key, promise);
    promise.catch(() => details.delete(key));
  }
  return details.get(key);
};

export const fetchKidsCategory = (category, targetCount = 30, sort = 'recommended') => {
  const key = JSON.stringify(['v2', category.id, category.queries, sort]);
  if (requests.has(key)) return requests.get(key).then(() => fetchKidsCategory(category, targetCount, sort));
  if (!lists.has(key)) {
    lists.set(key, {
      items: new Map(),
      sources: category.id === 'all'
        ? [{ path: '/discover/tv', query: { with_genres: '16|10762', sort_by: sort === 'recent' ? 'first_air_date.desc' : 'popularity.desc' }, page: 0, hasNext: true }]
        : (category.queries ?? []).map((query) => ({ path: '/search/multi', query: { query }, page: 0, hasNext: true })),
    });
  }
  const state = lists.get(key);
  const promise = (async () => {
    while (state.items.size < targetCount && state.sources.some((source) => source.hasNext)) {
      for (const source of state.sources.filter((entry) => entry.hasNext)) {
        const page = source.page + 1;
        const data = await request(source.path, { ...source.query, include_adult: 'false', page: String(page) });
        const matches = (data.results ?? []).filter((item) => {
          const type = item.media_type || 'tv';
          if (!['tv', 'movie'].includes(type) || item.adult || !item.backdrop_path) return false;
          if (category.id === 'all') return true;
          const titles = [item.title, item.name, item.original_title, item.original_name].filter(Boolean).map(normalize);
          return category.queries.some((query) => titles.some((title) => title.includes(normalize(query))));
        });
        const checked = await Promise.all(matches.map((item) => getKidItem(item.media_type || 'tv', item.id)));
        checked.filter(Boolean).forEach((item) => state.items.set(`${item.media_type}-${item.id}`, item));
        // 성공한 페이지에 대해서만 진행 상태를 기록합니다.
        source.page = page;
        source.hasNext = page < Math.min(data.total_pages ?? 0, 500);
      }
    }
    return { items: [...state.items.values()], hasNext: state.sources.some((source) => source.hasNext) };
  })();
  requests.set(key, promise);
  const cleanup = () => requests.delete(key);
  promise.then(cleanup, cleanup);
  return promise;
};
