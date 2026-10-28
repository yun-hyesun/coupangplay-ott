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

// 영화·TV 목록 요청 결과 재사용
const listRequests = {};

// 한국 티빙 제공 콘텐츠 가져오기
// 기존 호출 코드와 연결되도록 함수 이름 유지
const fetchCoupangList = (type) => {
  if (!listRequests[type]) {
    listRequests[type] = (async () => {
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
      });

      return (data.results ?? []).map((item) => ({
        ...item,
        media_type: type,
      }));
    })().catch((error) => {
      delete listRequests[type];
      throw error;
    });
  }

  return listRequests[type];
};

export const useMovieStore = create((set, get) => ({
  // =========================
  // 메인 배너: 영화 + TV
  // =========================
  bannerContents: [],
  isBannerLoading: false,
  bannerError: null,
  isBannerLoaded: false,

  onFetchBanner: async () => {
    if (get().isBannerLoading || get().isBannerLoaded) return;

    set({
      isBannerLoading: true,
      bannerError: null,
    });

    try {
      // 티빙 TV 프로그램만 가져오기
      // 앞서 티빙으로 수정한 함수를 사용
      const tvs = await fetchCoupangList('tv');

      const banners = tvs
        .filter((item) => item.backdrop_path)
        .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
        .slice(0, 5);

      set({
        tvs,
        bannerContents: banners,
        isBannerLoaded: true,
      });
    } catch (error) {
      set({ bannerError: error.message });
    } finally {
      set({ isBannerLoading: false });
    }
  },

  // =========================
  // 쿠팡플레이 영화 목록
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
  // 쿠팡플레이 TV 목록
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