import { create } from 'zustand';
import { railConfig } from '../data/railConfig';
import { makeParams } from '../data/contentQuery';

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;
const YOUTUBE_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

const storeBannerMovieIds = [
  693134, // 듄: 파트 2
  361743, // 탑건: 매버릭
  157336, // 인터스텔라
  569094, // 스파이더맨: 어크로스 더 유니버스
  575264, // 미션 임파서블: 데드 레코닝 PART ONE
];

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
// 키즈 전용 관람등급 확인
const kidsRatingRequests = {};

const checkKidsRating = (type, id) => {
  const key = `${type}-${id}`;

  if (!kidsRatingRequests[key]) {
    kidsRatingRequests[key] = (async () => {
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

        const allowed = [
          'ALL', '전체', '전체관람가', '0',
          '7', '12',
        ];

        ratings = ratings
          .map((rating) =>
            String(rating ?? '').trim().toUpperCase()
          )
          .filter(Boolean);

        return (
          ratings.length > 0 &&
          ratings.every((rating) => allowed.includes(rating))
        );
      } catch {
        return false;
      }
    })().catch(() => {
      delete kidsRatingRequests[key];
      return false;
    });
  }

  return kidsRatingRequests[key];
};


import { useProfileStore } from './useProfileStore';

// 한국 관람등급을 숫자로 변환
const normalizeRating = (rating) => {
  const value = String(rating ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s/g, '');

  if (['ALL', '전체', '전체관람가', '0'].includes(value)) {
    return 0;
  }

  if (['7', '7세이상', '7세이상관람가'].includes(value)) {
    return 7;
  }

  if (['12', '12세이상', '12세이상관람가'].includes(value)) {
    return 12;
  }

  if (['15', '15세이상', '15세이상관람가'].includes(value)) {
    return 15;
  }

  if (['19', '19세이상', '청소년관람불가'].includes(value)) {
    return 19;
  }

  return null;
};

// 콘텐츠의 한국 관람등급 조회
const getContentRating = async (type, id) => {
  if (!['movie', 'tv'].includes(type) || !id) {
    return null;
  }

  try {
    const path = type === 'movie'
      ? `/movie/${id}/release_dates`
      : `/tv/${id}/content_ratings`;

    const data = await requestTmdb(path);

    let ratings = [];

    if (type === 'movie') {
      ratings = (data.results ?? [])
        .filter(item => item.iso_3166_1 === 'KR')
        .flatMap(item => item.release_dates ?? [])
        .map(item => normalizeRating(item.certification));
    } else {
      ratings = (data.results ?? [])
        .filter(item => item.iso_3166_1 === 'KR')
        .map(item => normalizeRating(item.rating));
    }

    // 등급을 확인할 수 없으면 제한
    if (ratings.length === 0 || ratings.some(r => r === null)) {
      return null;
    }

    // 여러 등급이 존재하면 가장 높은 등급 적용
    return Math.max(...ratings);

  } catch (error) {
    console.error('관람등급 조회 실패:', error);
    return null;
  }
};

// 현재 프로필의 시청 가능 여부 확인
export const canWatchContent = async (type, id) => {
  const profile = useProfileStore.getState().currentProfile;

  // 프로필을 선택하지 않았다면 시청 제한
  if (!profile) return false;

  const contentRating = await getContentRating(type, id);

  if (contentRating === null) return false;

  const profileRating = normalizeRating(profile.rating);

  if (profileRating === null) return false;

  // 19세 콘텐츠는 성인 인증 필요
  if (contentRating === 19 && !profile.isAdultVerified) {
    return false;
  }

  return contentRating <= profileRating;
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

      const { kidsOnly, ...tmdbQuery } = query;
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
        ...tmdbQuery,
      });

      const checkedItems = await Promise.all(
        (data.results ?? []).map(async (item) => {
          if (item.adult) return null;

          const allowed = query.kidsOnly
            ? await checkKidsRating(type, item.id)
            : await checkUnder19(type, item.id);

          return allowed
            ? { ...item, media_type: type }
            : null;
        })
      );

      if (kidsOnly) {
        console.log('키즈 검색 작품 수:', data.results?.length);
        console.log(
          '키즈 관람등급 통과 수:',
          checkedItems.filter(Boolean).length
        );
      }

      if (kidsOnly) {
        console.log('키즈 장르:', query.with_genres);
        console.log('TMDB 검색 결과:', data.results?.length);
        console.log(
          '관람등급 통과:',
          checkedItems.filter(Boolean).length
        );
      }

      return checkedItems.filter(Boolean);
    })().catch((error) => {
      delete listRequests[requestKey];
      throw error;
    });
  }

  return listRequests[requestKey];
};

// 더보기 페이지별 요청 캐시
const morePageRequests = {};
const providerIds = {};

// 더보기 콘텐츠 요청
const fetchMorePage = async (type, query = {}, page = 1) => {
  const key = JSON.stringify([type, query, page]);

  if (!morePageRequests[key]) {
    morePageRequests[key] = (async () => {
      // 영화 + TV 통합
      if (type === 'all') {
        const [movies, tvs] = await Promise.all([
          fetchMorePage('movie', query, page),
          fetchMorePage('tv', query, page),
        ]);

        const results = [...movies.results, ...tvs.results];

        results.sort((a, b) => {
          if ((query.sort_by || '').includes('date.desc')) {
            const dateA = a.release_date || a.first_air_date || '';
            const dateB = b.release_date || b.first_air_date || '';
            return dateB.localeCompare(dateA);
          }

          return (b.popularity || 0) - (a.popularity || 0);
        });

        return {
          results,
          hasNext: movies.hasNext || tvs.hasNext,
        };
      }

      // 티빙 제공 업체 ID 찾기
      const { kidsOnly, requiredImage, useTving: useTvingOption, ...tmdbQuery } = query;

      const useTving =
        !query.with_networks &&
        query.with_watch_monetization_types !== 'buy' &&
        useTvingOption !== false &&
        !(kidsOnly && query.with_companies);

      if (useTving && !providerIds[type]) {
        providerIds[type] = requestTmdb(
          `/watch/providers/${type}`,
          { watch_region: 'KR' }
        )
          .then((data) => {
            const provider = (data.results || []).find((p) => {
              const name = p.provider_name
                .toLowerCase()
                .replace(/\s/g, '');

              return name === 'tving' || name === '티빙';
            });

            if (!provider) {
              throw new Error('티빙 제공 업체를 찾지 못했습니다.');
            }

            return provider.provider_id;
          })
          .catch((error) => {
            delete providerIds[type];
            throw error;
          });
      }

      const providerId = useTving ? await providerIds[type] : null;

      const today = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Seoul',
      }).format(new Date());

      const dateKey =
        type === 'movie'
          ? 'primary_release_date.lte'
          : 'first_air_date.lte';

      const sort = query.sort_by || 'popularity.desc';

      const normalizedSort = sort.includes(',')
        ? type === 'movie'
          ? 'primary_release_date.desc'
          : 'first_air_date.desc'
        : sort;

      // TMDB 콘텐츠 가져오기
      const data = await requestTmdb(`/discover/${type}`, {
        watch_region: 'KR',
        ...(providerId ? { with_watch_providers: String(providerId) } : {}),
        include_adult: 'false',
        [dateKey]: today,
        ...tmdbQuery,
        sort_by: normalizedSort,
        page: String(page),
      });

      // 기존 관람등급 필터 적용
      const checked = await Promise.all(
        (data.results || []).map(async (item) => {
          if (item.adult || (requiredImage && !item[requiredImage])) {
            return null;
          }

          const allowed = kidsOnly
            ? await checkKidsRating(type, item.id)
            : await checkUnder19(type, item.id);

          if (!allowed) return null;

          return {
            ...item,
            media_type: type,
            isPurchase: query.with_watch_monetization_types === 'buy',
            isCoupangSeries: type === 'tv' && String(query.with_networks) === '5169',
          };
        })
      );

      return {
        results: checked.filter(Boolean),
        hasNext: page < Math.min(data.total_pages || 0, 500),
      };
    })().catch((error) => {
      delete morePageRequests[key];
      throw error;
    });
  }

  return morePageRequests[key];
};

const shouldMixCoupangSeries = (type, query) =>
  (type === 'tv' || type === 'all') &&
  !query.with_networks &&
  !query.with_watch_monetization_types &&
  !query.with_companies &&
  query.useTving !== false;

const fetchRailPage = async (type, query = {}, page = 1) => {
  if (!shouldMixCoupangSeries(type, query)) {
    return fetchMorePage(type, query, page);
  }

  const sort = query.sort_by || 'popularity.desc';
  const dateSort = sort.includes('date.');
  const ascending = sort.endsWith('.asc');

  const compare = (a, b) => {
    const order = dateSort
      ? (b.release_date || b.first_air_date || '').localeCompare(
        a.release_date || a.first_air_date || ''
      )
      : sort.startsWith('vote_average.')
        ? (b.vote_average ?? 0) - (a.vote_average ?? 0)
        : (b.popularity ?? 0) - (a.popularity ?? 0);

    return ascending ? -order : order;
  };

  const makeSource = (mediaType, params, isCoupang = false) => ({
    mediaType,
    params,
    isCoupang,
    page: 1,
    hasNext: true,
    items: [],
  });

  const sources = [
    // 동점이면 쿠팡플레이 쪽을 먼저 읽어 배지 값을 살린다.
    makeSource('tv', { ...query, with_networks: '5169' }, true),
    makeSource('tv', query),
  ];

  if (type === 'all') {
    sources.push(makeSource('movie', query));

    // 혼합 레일에서 최신순을 쓰면 영화와 TV에 맞는 날짜 필드를 사용한다.
    if (dateSort) {
      const direction = ascending ? 'asc' : 'desc';

      for (const source of sources) {
        const field = source.mediaType === 'movie'
          ? 'primary_release_date'
          : 'first_air_date';

        source.params = { ...source.params, sort_by: `${field}.${direction}` };
      }
    }
  }

  const fillSource = async (source) => {
    while (source.items.length === 0 && source.hasNext) {
      const result = await fetchMorePage(
        source.mediaType,
        source.params,
        source.page
      );

      source.items = [...result.results];
      source.hasNext = result.hasNext;
      source.page += 1;
    }
  };

  const pageSize = 20;
  const end = page * pageSize;
  const merged = new Map();

  // 다음 작품 1편까지 확인해 더보기 여부를 계산한다.
  while (merged.size <= end) {
    await Promise.all(sources.map(fillSource));

    const available = sources.filter((source) => source.items.length > 0);
    if (available.length === 0) break;

    available.sort((a, b) => compare(a.items[0], b.items[0]));

    const item = available[0].items.shift();
    const key = `${item.media_type}-${item.id}`;

    if (!merged.has(key)) {
      merged.set(key, item);
    }

    // 같은 작품이 다른 목록의 대기열에 있어도 쿠팡플레이 배지를 유지한다.
    const coupangSource = sources.find((source) => source.isCoupang);
    const isCoupangSeries =
      item.isCoupangSeries ||
      (item.media_type === 'tv' &&
        coupangSource.items.some((work) => work.id === item.id));

    if (isCoupangSeries) {
      merged.set(key, { ...merged.get(key), isCoupangSeries: true });
    }
  }

  return {
    results: [...merged.values()].slice(end - pageSize, end),
    hasNext: merged.size > end,
  };
};

const purchaseRequests = new Set();
export const useMovieStore = create((set, get) => ({

  // =========================
  // 더보기 공통 페이지
  // =========================

  moreLists: {},
  moreLoading: {},
  moreErrors: {},
  morePage: {},
  moreHasNext: {},

  onFetchMore: async (
    railKey,
    type,
    params = {},
    reset = false
  ) => {
    if (!railKey || get().moreLoading[railKey]) return;

    if (!reset && get().moreHasNext[railKey] === false) {
      return;
    }

    const page = reset
      ? 1
      : (get().morePage[railKey] || 0) + 1;

    set((state) => ({
      moreLoading: {
        ...state.moreLoading,
        [railKey]: true,
      },
      moreErrors: {
        ...state.moreErrors,
        [railKey]: null,
      },
    }));

    try {
      const { results, hasNext } = await fetchRailPage(
        type,
        params,
        page
      );

      // 작품별 타이틀 로고 가져오기
      const contents = await Promise.all(
        results.map(async (item) => {
          try {
            const mediaType = item.media_type;

            const images = await requestTmdb(
              `/${mediaType}/${item.id}/images`,
              { include_image_language: 'ko,en,null' }
            );

            const logos = images.logos ?? [];

            // 한국어 → 영어 → 기타 순서
            const logo =
              logos.find((img) => img.iso_639_1 === 'ko') ||
              logos.find((img) => img.iso_639_1 === 'en') ||
              logos[0];

            return {
              ...item,
              logo_path: logo?.file_path ?? null,
            };
          } catch {
            return item;
          }
        })
      );


      set((state) => {
        const old = reset
          ? []
          : state.moreLists[railKey] || [];

        const seen = new Set(
          old.map((item) => `${item.media_type}-${item.id}`)
        );

        const fresh = contents.filter(
          (item) =>
            !seen.has(`${item.media_type}-${item.id}`)
        );

        return {
          moreLists: {
            ...state.moreLists,
            [railKey]: [...old, ...fresh],
          },
          morePage: {
            ...state.morePage,
            [railKey]: page,
          },
          moreHasNext: {
            ...state.moreHasNext,
            [railKey]: hasNext,
          },
        };
      });
    } catch (error) {
      set((state) => ({
        moreErrors: {
          ...state.moreErrors,
          [railKey]: error.message,
        },
      }));
    } finally {
      set((state) => ({
        moreLoading: {
          ...state.moreLoading,
          [railKey]: false,
        },
      }));
    }
  },


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
      if (shouldMixCoupangSeries(type, params)) {
        const { results } = await fetchRailPage(type, params, 1);
        items = results;
      } else

        if (
          params.with_networks ||
          params.with_watch_monetization_types === 'buy' ||
          (params.kidsOnly && (params.with_companies || params.useTving === false))
        ) {
          params.useTving === false
          const works = new Map();
          let page = 1;
          let hasNext = true;

          while (works.size < 20 && hasNext) {
            const result = await fetchMorePage(type, params, page);

            for (const item of result.results) {
              works.set(`${item.media_type}-${item.id}`, item);
            }

            hasNext = result.hasNext;
            page += 1;
          }

          items = [...works.values()].slice(0, 20);
        } else if (type === 'all') {
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
        // 한국 드라마 최신순
        case 'drama':
          items = await fetchCoupangList('tv', {
            with_genres: '18',
            with_origin_country: 'KR',
            sort_by: 'first_air_date.desc',
          });
          break;

        // 티빙 예능 최신순
        case 'entertainment':
          items = await fetchCoupangList('tv', {
            with_genres: '10764|10767',
            sort_by: 'first_air_date.desc',
          });
          break;

        // 영화 최신순
        case 'movie':
          items = await fetchCoupangList('movie', {
            sort_by: 'primary_release_date.desc',
          });
          break;

        // 키즈 최신순


        case 'kids': {
          const seen = new Set();

          const pickBanners = async (railKey, count) => {
            const config = railConfig[railKey];
            const params = {
              ...makeParams(config),
              requiredImage: 'backdrop_path',
            };

            const selected = [];
            let page = 1;
            let hasNext = true;

            while (selected.length < count && hasNext) {
              const result = await fetchMorePage(config.type, params, page);

              for (const item of result.results) {
                const key = `${item.media_type}-${item.id}`;

                if (seen.has(key)) continue;

                seen.add(key);
                selected.push(item);

                if (selected.length === count) break;
              }

              hasNext = result.hasNext;
              page += 1;
            }

            return selected;
          };

          const adventure = await pickBanners('kids-fantasy-adventure', 2);
          const disneyPixar = await pickBanners('kids-animation', 2);
          const koreanAnimation = await pickBanners('kids-korean-animation', 1);

          items = [...adventure, ...disneyPixar, ...koreanAnimation];
          break;
        }



        // 구매 가능한 영화 최신순
        case 'purchase': {
          const results = await Promise.allSettled(
            storeBannerMovieIds.map((id) => requestTmdb(`/movie/${id}`))
          );

          items = results
            .filter(({ status }) => status === 'fulfilled')
            .map(({ value }) => ({ ...value, media_type: 'movie' }))
            .filter((item) => !item.adult && item.backdrop_path);

          if (items.length === 0) {
            throw new Error('스토어 추천 영화를 불러오지 못했습니다.');
          }

          break;
        }

        // 홈: 영화 + 드라마 최신순


        case 'all':
        default: {
          const [movies, koreanDramas, overseasDramas] =
            await Promise.all([
              // 영화
              fetchCoupangList('movie', {
                sort_by: 'primary_release_date.desc',
              }),

              // 한국 드라마
              fetchCoupangList('tv', {
                with_genres: '18',
                with_origin_country: 'KR',
                sort_by: 'first_air_date.desc',
              }),

              // 해외 드라마
              fetchCoupangList('tv', {
                with_genres: '18',
                without_origin_country: 'KR',
                sort_by: 'first_air_date.desc',
              }),
            ]);

          // 종류별 최신 작품 선택
          const latest = (list, count) =>
            [...list]
              .filter((item) => item.backdrop_path)
              .sort((a, b) => {
                const dateA = a.release_date || a.first_air_date || '';
                const dateB = b.release_date || b.first_air_date || '';
                return dateB.localeCompare(dateA);
              })
              .slice(0, count);

          items = [
            ...latest(movies, 2),
            ...latest(koreanDramas, 1),
            ...latest(overseasDramas, 2),
          ];

          break;
        }



      }



      const seen = new Set();

      const banners = items
        .filter((item) => item.backdrop_path)
        .filter((item) => {
          const key = `${item.media_type}-${item.id}`;

          if (seen.has(key)) return false;

          seen.add(key);
          return true;
        })
        .sort((a, b) => {
          if (type === 'kids' || type === 'purchase') return 0;

          const dateA = a.release_date || a.first_air_date || '';
          const dateB = b.release_date || b.first_air_date || '';

          return dateB.localeCompare(dateA);
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
            relevanceLanguage: 'ko',
            regionCode: 'KR',
            key: YOUTUBE_KEY,
          });

          const res = await fetch(
            `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
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

  // 상세페이지 공통: 영화/TV 상세 및 추천 콘텐츠
  contentDetails: {},
  detailRecommendations: {},
  detailLoading: {},
  detailErrors: {},
  onFetchContentDetail: async (type, id) => {
    const key = `${type}-${id}`;
    if (get().contentDetails[key] || get().detailLoading[key]) return;
    set(state => ({
      detailLoading: { ...state.detailLoading, [key]: true },
      detailErrors: { ...state.detailErrors, [key]: null },
    }));
    try {
      const [detail, recommendations] = await Promise.all([
        requestTmdb(`/${type}/${id}`),
        requestTmdb(`/${type}/${id}/recommendations`, { page: '1' }),
      ]);
      set(state => ({
        contentDetails: { ...state.contentDetails, [key]: { ...detail, media_type: type } },
        detailRecommendations: { ...state.detailRecommendations, [key]: (recommendations.results ?? []).filter(item => item.backdrop_path).map(item => ({ ...item, media_type: type })) },
      }));
    } catch (error) {
      set(state => ({ detailErrors: { ...state.detailErrors, [key]: error.message } }));
    } finally {
      set(state => ({ detailLoading: { ...state.detailLoading, [key]: false } }));
    }
  },

  purchaseAvailability: {},

  onCheckPurchase: async (type, id) => {
    if (!id || (type !== 'movie' && type !== 'tv')) return;

    const key = `${type}-${id}`;

    if (
      get().purchaseAvailability[key] !== undefined ||
      purchaseRequests.has(key)
    ) {
      return;
    }

    purchaseRequests.add(key);

    try {
      const data = await requestTmdb(`/${type}/${id}/watch/providers`);
      const canBuy = (data.results?.KR?.buy?.length ?? 0) > 0;

      set((state) => ({
        purchaseAvailability: {
          ...state.purchaseAvailability,
          [key]: canBuy,
        },
      }));
    } catch {
      // 조회 실패 시 배지 없이 카드를 표시하고, 다음 진입 때 다시 확인한다.
    } finally {
      purchaseRequests.delete(key);
    }
  },

}));