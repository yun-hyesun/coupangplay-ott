const normalize = (text) => text.normalize('NFKC').toLowerCase().replace(/[\s·/&-]+/g, '');
const aliases = {
  로맨스: ['로맨스', '로맨틱', '멜로'],
  애니메이션: ['애니', '애니메이션', '만화'],
  다큐멘터리: ['다큐', '다큐멘터리'],
  '액션 & 어드벤처': ['액션', '어드벤처', '모험'],
  'SF & 판타지': ['sf', '에스에프', '판타지'],
  '전쟁 & 정치': ['전쟁', '정치'],
  'Sci-Fi & Fantasy': ['sf', '에스에프', '판타지'],
  'Action & Adventure': ['액션', '어드벤처', '모험'],
  'War & Politics': ['전쟁', '정치'],
};

export async function searchContents({ query, page, signal, apiKey }) {
  if (!apiKey) throw new Error('TMDB API 키를 확인해 주세요.');

  const request = async (path, queryParams = {}) => {
    const params = new URLSearchParams({
      api_key: apiKey,
      language: 'ko-KR',
      ...queryParams,
    });
    const response = await fetch(`https://api.themoviedb.org/3${path}?${params}`, { signal });
    if (!response.ok) throw new Error('검색 결과를 불러오지 못했습니다.');
    return response.json();
  };

  const text = normalize(query);
  const [multiResult, peopleResult, movieGenres, tvGenres] = await Promise.allSettled([
    request('/search/multi', { query, page: String(page), include_adult: 'false' }),
    page === 1
      ? request('/search/person', { query, include_adult: 'false' })
      : Promise.resolve({ results: [] }),
    request('/genre/movie/list'),
    request('/genre/tv/list'),
  ]);

  if (signal.aborted) throw new DOMException('검색 취소', 'AbortError');

  const tasks = [];
  const matchedGenres = [
    ['movie', movieGenres],
    ['tv', tvGenres],
  ];

  for (const [type, response] of matchedGenres) {
    const genres = response.value?.genres ?? [];
    const ids = genres.filter((genre) =>
      [genre.name, ...(aliases[genre.name] ?? [])].some((name) => normalize(name) === text)
    ).map((genre) => genre.id);

    if (ids.length) {
      tasks.push(request(`/discover/${type}`, {
        with_genres: ids.join('|'),
        page: String(page),
        include_adult: 'false',
        sort_by: 'popularity.desc',
      }).then((data) => ({
        ...data,
        results: data.results.map((item) => ({ ...item, media_type: type })),
      })));
    }
  }

  const people = peopleResult.value?.results ?? [];
  const exactPeople = people.filter((person) => normalize(person.name) === text);
  const selectedPeople = (exactPeople.length ? exactPeople : people).slice(0, 3);

  for (const person of selectedPeople) {
    tasks.push(request(`/person/${person.id}/combined_credits`).then((data) => ({
      results: [
        ...(data.cast ?? []),
        ...(data.crew ?? []).filter((item) => item.job === 'Director'),
      ].sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)),
      total_pages: 1,
    })));
  }

  const relatedResults = await Promise.allSettled(tasks);
  if (signal.aborted) throw new DOMException('검색 취소', 'AbortError');

  const responses = [multiResult, ...relatedResults];
  const successful = responses.filter((result) => result.status === 'fulfilled');
  if (!successful.length) throw new Error('검색 결과를 불러오지 못했습니다.');

  const items = successful.flatMap((result) => result.value.results ?? [])
    .filter((item) =>
      ['movie', 'tv'].includes(item.media_type) && !item.adult && item.poster_path
    );

  return {
    items: [...new Map(items.map((item) => [`${item.media_type}-${item.id}`, item])).values()],
    totalPages: Math.min(500, Math.max(0, ...successful.map((result) => result.value.total_pages ?? 0))),
    partial: [multiResult, peopleResult, movieGenres, tvGenres, ...relatedResults]
      .some((result) => result.status === 'rejected'),
  };
}

