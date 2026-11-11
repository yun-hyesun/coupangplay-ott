import { create } from 'zustand';

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;
const YOUTUBE_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

// fetch(`https://api.themoviedb.org/3/watch/providers/movie?api_key=${TMDB_KEY}&language=ko-KR&watch_region=KR`)
//   .then(res => res.json())
//   .then(data => console.table("쿠팡영화",data.results));

// fetch(`https://api.themoviedb.org/3/watch/providers/tv?api_key=${TMDB_KEY}&language=ko-KR&watch_region=KR`)
//   .then(res => res.json())
//   .then(data => console.table("쿠팡드라마",data.results));

// TMDB 공통 요청
const requestTmdb = async (path, query = {}) => {
  const params = new URLSearchParams({
    api_key: TMDB_KEY,
    language: 'ko-KR',
    ...query,
  });

  const res = await fetch(
    `https://api.themoviedb.org/3${path}?${params}`
  );

  if (!res.ok) {
    throw new Error('TMDB 정보를 불러오지 못했습니다.');
  }

  return res.json();
};

// 작품별 관람등급 확인 결과 재사용
const ratingRequests = {};

// 한국 관람등급이 전체·7·12·15인 작품만 허용
const checkUnder19 = (type, id) => {
  const key = `${type}-${id}`;

  if (!ratingRequests[key]) {
    ratingRequests[key] = (async () => {
      try {
        const path =
          type === 'movie'
            ? `/movie/${id}/release_dates`
            : `/tv/${id}/content_ratings`;

        const data = await requestTmdb(path);

        let ratings = [];

        if (type === 'movie') {
          ratings = (data.results ?? [])
            .filter((item) => item.iso_3166_1 === 'KR')
            .flatMap((item) => item.release_dates ?? [])
            .map((item) => item.certification);
        } else {
          ratings = (data.results ?? [])
            .filter((item) => item.iso_3166_1 === 'KR')
            .map((item) => item.rating);
        }

        const allowed = ['ALL', '전체', '전체관람가', '0', '7', '12', '15'];

        ratings = ratings
          .map((rating) => String(rating ?? '').trim().toUpperCase())
          .filter(Boolean);

        return (
          ratings.length > 0 &&
          ratings.every((rating) => allowed.includes(rating))
        );
      } catch {
        delete ratingRequests[key];
        return false;
      }
    })();
  }

  return ratingRequests[key];
};

// 영화·TV 목록 요청 결과 재사용
const listRequests = {};

// 한국 티빙 제공 콘텐츠 가져오기
// 기존 호출 코드와 연결되도록 함수 이름 유지
const fetchCoupangList = (type, query = {}) => {
  const requestKey = JSON.stringify([type, Object.entries(query).sort(([a], [b]) => a.localeCompare(b))]);
  if (!listRequests[requestKey]) {
    listRequests[requestKey] = (async () => {
      // 영화 또는 TV 제공 업체 목록
      const providers = await requestTmdb(
        `/watch/providers/${type}`,
        { watch_region: 'KR' }
      );

      // 티빙 찾기
      const tving = (providers.results ?? []).find((provider) => {
        const name = provider.provider_name
          .toLowerCase()
          .replace(/\s/g, '');

        return name === 'tving' || name === '티빙';
      });

      if (!tving) {
        throw new Error(
          `티빙 ${type === 'movie' ? '영화' : 'TV'} 제공 업체를 찾지 못했습니다.`
        );
      }

      // 한국 기준 오늘 날짜
      const today = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Seoul',
      }).format(new Date());

      const data = await requestTmdb(`/discover/${type}`, {
        watch_region: 'KR',
        with_watch_providers: String(tving.provider_id),
        include_adult: 'false',
        page: '1',

        ...(type === 'tv'
          ? {
              sort_by: 'first_air_date.desc',
              'first_air_date.lte': today,
              'first_air_date.gte': '1900-01-01',
            }
          : {
              sort_by: 'primary_release_date.desc',
              'primary_release_date.lte': today,
            }),
        ...query,
      });

      const checkedItems = await Promise.all(
        (data.results ?? []).map(async (item) => {
          if (item.adult) return null;

          const allowed = await checkUnder19(type, item.id);

          return allowed
            ? { ...item, media_type: type }
            : null;
        })
      );

    return checkedItems.filter(Boolean);
    })().catch((error) => {
      delete listRequests[requestKey];
      throw error;
    });
  }

  return listRequests[requestKey];
};

export const useMovieStore = create((set, get) => ({
  // 레일 이름마다 데이터와 요청 상태를 따로 저장합니다.
  rails: {},
  railLoading: {},
  railErrors: {},
  railLoaded: {},

  onFetchRail: async (railId, type, params = {}) => {
    if (get().railLoading[railId] || get().railLoaded[railId]) return;
    set((state) => ({
      railLoading: { ...state.railLoading, [railId]: true },
      railErrors: { ...state.railErrors, [railId]: null },
    }));
    try {
      let items;

      if (type === 'all') {
        const [movies, tvs] = await Promise.all([
          fetchCoupangList('movie', params),
          fetchCoupangList('tv', params),
        ]);

        items = [...movies, ...tvs]
          .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
          .slice(0, 20);
      } else {
        items = await fetchCoupangList(type, params);
      }
      const contents = await Promise.all(
      items.map(async (item) => {
        try {
          const images = await requestTmdb(
            `/${item.media_type}/${item.id}/images`,
            { include_image_language: 'ko,en,null' }
          );

          const logos = images.logos ?? [];

          // 한국어 → 영어 → 나머지 로고 순서
          const logo =
            logos.find((image) => image.iso_639_1 === 'ko') ||
            logos.find((image) => image.iso_639_1 === 'en') ||
            logos[0];

          return {
            ...item,
            logo_path: logo?.file_path,
          };
        } catch {
          return item;
        }
      })
    );
      set((state) => ({
        rails: { ...state.rails, [railId]: contents },
        railLoaded: { ...state.railLoaded, [railId]: true },
      }));
    } catch (error) {
      set((state) => ({
        railErrors: { ...state.railErrors, [railId]: error.message },
      }));
    } finally {
      set((state) => ({
        railLoading: { ...state.railLoading, [railId]: false },
      }));
    }
  },

  // =========================
  // 메인 배너: 티빙 TV
  // =========================
  // =========================
// 메인 배너
// =========================
bannerContents: [],
bannerType: null,
bannerRequestId: 0,
isBannerLoading: false,
bannerError: null,
isBannerLoaded: false,

onFetchBanner: async (type = 'all') => {
  const current = get();

  // 같은 종류를 이미 가져왔거나 가져오는 중이면 종료
  if (
    current.bannerType === type &&
    (current.isBannerLoading || current.isBannerLoaded)
  ) {
    return;
  }

  const requestId = current.bannerRequestId + 1;

  set({
    bannerType: type,
    bannerRequestId: requestId,
    bannerContents: [],
    isBannerLoading: true,
    isBannerLoaded: false,
    bannerError: null,
  });

  try {
    const popular = {
      sort_by: 'popularity.desc',
    };

    let items = [];

    switch (type) {
      // 티빙 드라마
      case 'drama':
        items = await fetchCoupangList('tv', {
          ...popular,
          with_genres: '18',
        });
        break;

      // 티빙 영화
      case 'movie':
        items = await fetchCoupangList('movie', popular);
        break;

      // 티빙 키즈·가족 TV 프로그램
      case 'kids':
        items = await fetchCoupangList('tv', {
          ...popular,
          with_genres: '10762|10751',
        });
        break;

      // 한국에서 구매 가능한 영화
      case 'purchase': {
        const today = new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'Asia/Seoul',
        }).format(new Date());

        const data = await requestTmdb('/discover/movie', {
          ...popular,
          watch_region: 'KR',
          with_watch_monetization_types: 'buy',
          include_adult: 'false',
          'primary_release_date.lte': today,
          page: '1',
        });

        const checked = await Promise.all(
          (data.results ?? []).map(async (item) => {
            if (item.adult) return null;

            const allowed = await checkUnder19('movie', item.id);

            return allowed
              ? { ...item, media_type: 'movie' }
              : null;
          })
        );

        items = checked.filter(Boolean);
        break;
      }

      // 티빙 영화 + TV
      case 'all':
      default: {
        const [movies, dramas] = await Promise.all([
          fetchCoupangList('movie', {
            sort_by: 'primary_release_date.desc',
          }),

          fetchCoupangList('tv', {
            with_genres: '18',
            sort_by: 'first_air_date.desc',
          }),
        ]);

        items = [...movies, ...dramas];
        break;
      }
    }

    const banners = items
    .filter((item) => item.backdrop_path)
    .sort((a, b) => {
      if (type === 'all') {
        const dateA = a.release_date || a.first_air_date || '';
        const dateB = b.release_date || b.first_air_date || '';

        return dateB.localeCompare(dateA);
      }

      return (b.popularity ?? 0) - (a.popularity ?? 0);
    })
    .slice(0, 5);

    // 종류를 바꿨다면 이전 요청 결과는 저장하지 않음
    if (get().bannerRequestId !== requestId) return;

    set({
      bannerContents: banners,
      isBannerLoaded: true,
    });
  } catch (error) {
    if (get().bannerRequestId === requestId) {
      set({ bannerError: error.message });
    }
  } finally {
    if (get().bannerRequestId === requestId) {
      set({ isBannerLoading: false });
    }
  }
},

  // =========================
  // 티빙 영화 목록
  // =========================
  popMovies: [],

  onFetchPopular: async () => {
    const movies = await fetchCoupangList('movie');
    set({ popMovies: movies });
  },

  // 영화 ID별 예고편 저장
  popVideo: {},

  onFetchVideo: async (id) => {
    if (get().popVideo[id]) return;

    const data = await requestTmdb(`/movie/${id}/videos`);

    set((state) => ({
      popVideo: {
        ...state.popVideo,
        [id]: data.results ?? [],
      },
    }));
  },

  // =========================
  // 티빙 TV 목록
  // 드라마·예능 등 포함
  // =========================
  tvs: [],

  onFetchTv: async () => {
    const tvs = await fetchCoupangList('tv');
    set({ tvs });
  },

  // TV ID별 예고편 저장
  tvVideo: {},

  onFetchTvVideo: async (id) => {
    if (get().tvVideo[id]) return;

    const data = await requestTmdb(`/tv/${id}/videos`, {
      language: 'en-US',
    });

    set((state) => ({
      tvVideo: {
        ...state.tvVideo,
        [id]: data.results ?? [],
      },
    }));
  },

  // =========================
  // TV 상세정보 + 시즌
  // =========================
  tvDetails: {},
  seasons: {},

  onFetchSeason: async (id) => {
    if (get().seasons[id]) return;

    const data = await requestTmdb(`/tv/${id}`);

    set((state) => ({
      tvDetails: {
        ...state.tvDetails,
        [id]: data,
      },
      seasons: {
        ...state.seasons,
        [id]: data.seasons ?? [],
      },
    }));
  },

  // =========================
  // 시즌별 에피소드
  // =========================
  episodes: {},

  onFetchEpisode: async (id, season) => {
    const key = `${id}-${season}`;

    if (get().episodes[key]) return;

    const data = await requestTmdb(
      `/tv/${id}/season/${season}`
    );

    set((state) => ({
      episodes: {
        ...state.episodes,
        [key]: data.episodes ?? [],
      },
    }));
  },

  // =========================
  // 에피소드 관련 영상
  // =========================
  episodeVideo: {},

  onFetchEpisodeVideo: async (id, season, episode) => {
    const key = `${id}-${season}-${episode}`;

    if (get().episodeVideo[key]) return;

    let videos = [];

    // 1. TMDB에서 에피소드 영상 검색
    try {
      const data = await requestTmdb(
        `/tv/${id}/season/${season}/episode/${episode}/videos`,
        { language: 'en-US' }
      );

      videos = (data.results ?? []).filter(
        (video) => video.site === 'YouTube' && video.key
      );
    } catch (error) {
      console.error('TMDB 영상 검색 실패:', error);
    }

    // 2. TMDB 영상이 없으면 YouTube에서 관련 영상 검색
    if (videos.length === 0 && YOUTUBE_KEY) {
      try {
        const { tvDetails, tvs, episodes } = get();

        const tv =
          tvDetails[id] ||
          tvs.find((item) => item.id === id);

        const tvName = tv?.name || tv?.original_name;

        const episodeList = episodes[`${id}-${season}`] || [];

        const episodeInfo = episodeList.find(
          (item) => item.episode_number === episode
        );

        if (tvName) {
          const searchText =
            `${tvName} 시즌 ${season} ${episode}화 ` +
            `${episodeInfo?.name || ''} 하이라이트`;

          const params = new URLSearchParams({
            part: 'snippet',
            q: searchText,
            type: 'video',
            maxResults: '5',
            videoEmbeddable: 'true',
            key: YOUTUBE_KEY,
          });

          const res = await fetch(
            `https://www.googleapis.com/youtube/v3/search?${params}`
          );

          if (!res.ok) {
            throw new Error('YouTube 영상 검색 실패');
          }

          const data = await res.json();

          videos = (data.items ?? [])
            .filter((item) => item.id?.videoId)
            .map((item) => ({
              key: item.id.videoId,
              name: item.snippet.title,
              site: 'YouTube',
              type: 'Clip',
            }));
        }
      } catch (error) {
        console.error('YouTube 검색 실패:', error);
      }
    }

    // 3. 검색한 영상 저장
    set((state) => ({
      episodeVideo: {
        ...state.episodeVideo,
        [key]: videos,
      },
    }));
  },
}));