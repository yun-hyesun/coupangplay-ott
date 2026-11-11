import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ContentGrid } from '../../components/content/ContentGrid';
import { ContentTitle } from '../../components/content/ContentTitle';
import {
  categorySections,
  categoryCollections,
  entertainmentCategoryTitles,
} from '../../data/categoryConfig';
import {
  useMovieStore,
  fetchCuratedCategoryItem,
  fetchCategoryKeywordId,
} from '../../store/useMovieStore';
import './scss/Category.scss';
import { fetchKidsCategory } from './kidsCategoryApi';

const SORT_OPTIONS = [
  { value: 'recommended', label: '추천순' },
  { value: 'recent', label: '최근 추가순' },
  { value: 'name', label: '가나다순' },
];

const SORT_QUERY = {
  recommended: 'popularity.desc',
  recent: 'date.desc',
  name: 'popularity.desc',
};

const getDate = (item) =>
  item.release_date || item.first_air_date || '';

const getTitle = (item) => item.title || item.name || '';

export const Category = () => {
  const { section, categoryId } = useParams();
  const config = categorySections[section];

  if (!config) {
    return (
      <main className="categoryPage">
        <p>카테고리를 찾을 수 없습니다.</p>
        <Link to="/">홈으로</Link>
      </main>
    );
  }

  return (
    <CategoryContent
      key={`${section}-${categoryId}`}
      section={section}
      categoryId={categoryId}
      config={config}
    />
  );
};

const CategoryContent = ({ section, categoryId, config }) => {
  const navigate = useNavigate();
  const initialCategory = config.categories.find(
    (item) => item.id === categoryId
  );

  const [selectedIds, setSelectedIds] = useState(
    initialCategory && initialCategory.id !== 'all' ? [initialCategory.id] : []
  );
  const [sort, setSort] = useState('recommended');
  const [filterOpen, setFilterOpen] = useState(false);

  const filterRef = useRef(null);

  const selectedCategories = config.categories.filter((item) =>
    selectedIds.includes(item.id)
  );

  const filterLabel =
    selectedIds.length === 0
      ? '전체'
      : selectedIds.length === 1
        ? selectedCategories[0]?.label
        : `${selectedIds.length}개 선택`;

  useEffect(() => {
    if (!filterOpen) return;

    const handleOutside = (event) => {
      if (!filterRef.current?.contains(event.target)) {
        setFilterOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setFilterOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [filterOpen]);

  const toggleCategory = (id) => {
    if (id === 'all') {
      setSelectedIds([]);
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((value) => value !== id)
        : [...prev, id]
    );
  };

  // 선택이 없으면 해당 메뉴의 전체 목록 조회
  const categories = selectedCategories.length
    ? selectedCategories
    : [config.categories.find((item) => item.id === 'all')];

  const resultKey = JSON.stringify([
    section,
    [...selectedIds].sort(),
    sort,
  ]);

  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);

  useEffect(() => {
    if (!sortOpen) return;

    const handleOutside = (event) => {
      if (!sortRef.current?.contains(event.target)) {
        setSortOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setSortOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [sortOpen]);

  return (
    <main className="categoryPage">
      <Link
        className="categoryPage-back"
        to={`/${section}`}
        onClick={(event) => {
          event.preventDefault();
          navigate(-1);
        }}
      >
        {config.label} 홈으로
      </Link>

      {section === 'kids' ? (
        <div className="categoryPage-heading">
          <ContentTitle title="좋아하는 캐릭터를 만나보세요" />
        </div>
      ) : (
        <h2 className="categoryPage-title">
          전체 {config.label}
        </h2>
      )}

      <div className="categoryPage-toolbar">
        <div className="categoryFilter dropDown" ref={filterRef}>
          <button
            type="button"
            className={`categoryFilter-trigger dropDown-button ${
              filterOpen ? 'is-open' : ''
            }`}
            aria-expanded={filterOpen}
            aria-controls="category-filter-panel"
            onClick={() => setFilterOpen((prev) => !prev)}
          >
            <span className="categoryFilter-label">{section === 'kids' ? '캐릭터' : '장르'}</span>
            <span>{filterLabel}</span>
            <span className="categoryFilter-arrow dropDown-arrow" aria-hidden="true"></span>
          </button>

          {filterOpen && (
            <div
              className="categoryFilter-panel dropDown-panel"
              id="category-filter-panel"
            >
              <div className="categoryFilter-actions">
                {/* <button
                  type="button"
                  onClick={() =>
                    setSelectedIds(
                      config.categories.map((item) => item.id)
                    )
                  }
                >
                  전체 선택
                </button> */}
                <p className='gideTxt'>{section === 'kids' ? '캐릭터 선택' : '장르 선택'} (복수 선택 가능)</p>

                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                >
                  초기화
                </button>
              </div>

              <div className="categoryFilter-list">
                {config.categories.map((category) => (
                  <label
                    className="categoryFilter-option dropDown-option"
                    key={category.id}
                  >
                    <span>{category.label}</span>
                    <input
                      type="checkbox"
                      checked={category.id === 'all' ? selectedIds.length === 0 : selectedIds.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                    />
                    
                  </label>
                ))}
              </div>

              <button
                type="button"
                className="categoryFilter-done"
                onClick={() => setFilterOpen(false)}
              >
                선택 완료
              </button>
            </div>
          )}
        </div>

        <div
          className={`categorySort dropDown ${sortOpen ? 'is-open' : ''}`}
          ref={sortRef}
        >
          <button
            type="button"
            className="categorySort-trigger dropDown-button"
            aria-expanded={sortOpen}
            aria-controls="category-sort-options"
            onClick={() => setSortOpen((prev) => !prev)}
          >
          <span>
            {SORT_OPTIONS.find((option) => option.value === sort)?.label}
          </span>

          <span className="categorySort-arrow dropDown-arrow" aria-hidden="true"></span>
        </button>

        {sortOpen && (
          <ul className="categorySort-list dropDown-panel" id="category-sort-options">
            {SORT_OPTIONS.map((option) => (
              <li className="categorySort-item" key={option.value}>
                <button
                  type="button"
                  className={`categorySort-option dropDown-option ${
                    sort === option.value ? 'is-selected' : ''
                  }`}
                  aria-pressed={sort === option.value}
                  onClick={() => {
                    setSort(option.value);
                    setSortOpen(false);
                    sortRef.current
                      ?.querySelector('.categorySort-trigger')
                      ?.focus();
                  }}
                >
                  <span>{option.label}</span>

                  {sort === option.value && (
                    <span className="categorySort-check" aria-hidden="true"></span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>

      {selectedCategories.length > 0 && (
        <div className="categoryPage-selected">
          {selectedCategories.map((category) => (
            <button
              type="button"
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              aria-label={`${category.label} 선택 해제`}
            >
              {category.label}
              <span aria-hidden="true">×</span>
            </button>
          ))}

          <button
            type="button"
            className="categoryPage-reset"
            onClick={() => setSelectedIds([])}
          >
            전체 초기화
          </button>
        </div>
      )}

      <CategoryResults
        key={resultKey}
        section={section}
        config={config}
        categories={categories}
        sort={sort}
      />
    </main>
  );
};


// 카테고리 간 중복 요청을 재사용하고 동시 요청을 4개로 제한합니다.
const entertainmentRequests = new Map();
const entertainmentQueue = [];
let entertainmentRunning = 0;

const drainEntertainmentQueue = () => {
  while (entertainmentRunning < 4 && entertainmentQueue.length) {
    const { task, resolve, reject } = entertainmentQueue.shift();
    entertainmentRunning += 1;
    Promise.resolve().then(task).then(resolve, reject).finally(() => {
      entertainmentRunning -= 1;
      drainEntertainmentQueue();
    });
  }
};

const enqueueEntertainment = (task) => new Promise((resolve, reject) => {
  entertainmentQueue.push({ task, resolve, reject });
  drainEntertainmentQueue();
});

const normalizeEntertainmentTitle = (value = '') =>
  value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

// 국내 예능은 시청 제공 업체와 관계없이 조회합니다.
const fetchDomesticEntertainment = async (id) => {
  const params = new URLSearchParams({
    api_key: import.meta.env.VITE_TMDB_API_KEY,
    language: 'ko-KR',
    append_to_response: 'content_ratings',
  });
  const response = await fetch(`https://api.themoviedb.org/3/tv/${id}?${params}`);
  if (!response.ok) throw new Error(`국내 프로그램 조회 실패 (${response.status})`);
  const detail = await response.json();
  if (detail.adult || !detail.origin_country?.includes('KR')) return null;
  if (!detail.backdrop_path || detail.genres?.some((genre) => genre.id === 16)) return null;
  const ratings = (detail.content_ratings?.results ?? [])
    .filter((rating) => rating.iso_3166_1 === 'KR')
    .map((rating) => String(rating.rating ?? '').trim().toUpperCase())
    .filter(Boolean);
  const allowed = ['ALL', '전체', '전체관람가', '0', '7', '12', '15'];
  if (!ratings.length || !ratings.every((rating) => allowed.includes(rating))) return null;
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
  if (detail.first_air_date && detail.first_air_date > today) return null;
  return {
    ...detail,
    media_type: 'tv',
    isPurchase: false,
    isCoupangSeries: detail.networks?.some((network) => network.id === 5169) ?? false,
  };
};

const loadEntertainmentTitle = (entry) => {
  const aliases = Array.isArray(entry) ? entry : [entry];
  const cacheKey = JSON.stringify(aliases);
  if (entertainmentRequests.has(cacheKey)) return entertainmentRequests.get(cacheKey);

  const request = enqueueEntertainment(async () => {
    const apiKey = import.meta.env.VITE_TMDB_API_KEY;
    if (!apiKey) throw new Error('VITE_TMDB_API_KEY 설정을 확인해 주세요.');

    for (const title of aliases) {
      const params = new URLSearchParams({
        api_key: apiKey,
        language: 'ko-KR',
        query: title,
        include_adult: 'false',
        page: '1',
      });
      const response = await fetch(`https://api.themoviedb.org/3/search/tv?${params}`);
      if (!response.ok) throw new Error(`예능 검색 실패 (${response.status}): ${title}`);
      const data = await response.json();
      const expected = normalizeEntertainmentTitle(title);
      const candidates = (data.results ?? []).filter((item) =>
        !item.adult &&
        item.origin_country?.includes('KR') &&
        !item.genre_ids?.includes(16) &&
        [item.name, item.original_name].some((name) =>
          normalizeEntertainmentTitle(name) === expected
        )
      );
      // 제목이 비슷하다는 이유로 다른 작품을 대신 넣지 않습니다.
      candidates.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
      for (const candidate of candidates) {
        const item = await fetchDomesticEntertainment(candidate.id);
        if (item?.backdrop_path) return item;
      }
    }
    return null;
  });
  entertainmentRequests.set(cacheKey, request);
  request.catch(() => entertainmentRequests.delete(cacheKey));
  return request;
};

const CategoryResults = ({
  section,
  config,
  categories,
  sort,
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasNext, setHasNext] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);

  const activeRef = useRef(false);
  const loadingRef = useRef(false);

  const load = async (targetCount = 30) => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const results = await Promise.all(
        categories.map(async (category) => {
          if (section === 'kids') {
            return fetchKidsCategory(category, targetCount, sort);
          }

          if (section === 'entertainment' && entertainmentCategoryTitles[category.id]) {
            const titles = entertainmentCategoryTitles[category.id];
            const contents = await Promise.all(titles.map(loadEntertainmentTitle));
            return { items: contents.filter(Boolean), hasNext: false };
          }

          if (category.curated) {
            const ids =
              categoryCollections[
                `${section}-${category.id}`
              ] ?? [];

            const contents = await Promise.all(
              [...new Set(ids)].map((id) =>
                fetchCuratedCategoryItem(
                  config.type,
                  id,
                  section === 'store'
                )
              )
            );

            return {
              items: contents.filter(Boolean),
              hasNext: false,
            };
          }

          const keywordId = category.keyword
            ? await fetchCategoryKeywordId(category.keyword)
            : null;

          const params = {
            requiredImage: 'backdrop_path',

            ...(section === 'entertainment'
              ? { useTving: false, with_origin_country: 'KR', with_genres: '10764|10767|35|99', without_genres: '16' }
              : {}),

            ...(section === 'drama'
              ? {
                  without_genres: '10764,10767,10763',
                }
              : {}),

            ...category.params,

            ...(keywordId
              ? { with_keywords: String(keywordId) }
              : {}),

            ...(category.foreign
              ? { excludeOriginCountry: 'KR' }
              : {}),

            ...(section === 'store'
              ? { with_watch_monetization_types: 'buy' }
              : {}),

            sort_by:
              sort === 'recent'
                ? config.type === 'movie'
                  ? 'primary_release_date.desc'
                  : 'first_air_date.desc'
                : SORT_QUERY[sort],
          };

          const listKey = `category-domestic-v6-${section}-${category.id}-${sort}`;

          // 30개를 채울 때까지 다음 API 페이지를 이어서 조회합니다.
          let after = useMovieStore.getState();
          while (
            (after.moreLists[listKey]?.length ?? 0) < targetCount &&
            (!after.morePage[listKey] || after.moreHasNext[listKey] !== false)
          ) {
            if (!activeRef.current) return { items: [], hasNext: false };
            const previousPage = after.morePage[listKey] ?? 0;
            await after.onFetchMore(listKey, config.type, params);
            after = useMovieStore.getState();
            if (after.moreErrors[listKey]) throw new Error(after.moreErrors[listKey]);
            if ((after.morePage[listKey] ?? 0) === previousPage) {
              throw new Error('목록 조회가 진행되지 않았습니다. 다시 시도해 주세요.');
            }
          }

          return {
            items: after.moreLists[listKey] ?? [],
            hasNext: after.moreHasNext[listKey] ?? false,
          };
        })
      );

      if (!activeRef.current) return;

      const uniqueItems = new Map();

      results.forEach((result) => {
        result.items.forEach((item) => {
          if (!item.backdrop_path) return;

          uniqueItems.set(
            `${item.media_type || config.type}-${item.id}`,
            item
          );
        });
      });

      const contents = [...uniqueItems.values()];

      if (sort === 'name') {
        contents.sort((a, b) =>
          getTitle(a).localeCompare(getTitle(b), 'ko', {
            numeric: true,
          })
        );
      } else if (sort === 'recent') {
        contents.sort((a, b) =>
          getDate(b).localeCompare(getDate(a))
        );
      } else {
        contents.sort(
          (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)
        );
      }

      setVisibleCount(targetCount);
      setItems(contents);
      setHasNext(results.some((result) => result.hasNext));
    } catch (error) {
      if (activeRef.current) {
        setError(error.message || '콘텐츠를 불러오지 못했습니다.');
      }
    } finally {
      loadingRef.current = false;

      if (activeRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    activeRef.current = true;
    void load();

    return () => {
      activeRef.current = false;
    };
  }, []);

  return (
    <>
      <ContentGrid
        items={items.slice(0, visibleCount)}
        type={config.type}
        imageType="가로"
      />

      {loading && (
        <p className="categoryPage-message" role="status">
          콘텐츠를 불러오는 중입니다.
        </p>
      )}

      {error && (
        <p className="categoryPage-message" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="categoryPage-message">
          표시할 작품이 없습니다.
        </p>
      )}

      {!loading && (hasNext || items.length > visibleCount || error) && (
        <button
          type="button"
          className="categoryPage-more"
          onClick={() => {
            const target = error ? visibleCount : visibleCount + 30;
            if (!error && items.length >= target) setVisibleCount(target);
            else void load(target);
          }}
        >
          {error ? '다시 시도' : '더 보기'}
        </button>
      )}
    </>
  );
};