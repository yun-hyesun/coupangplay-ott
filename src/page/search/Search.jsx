import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ContentGrid } from '../../components/content/ContentGrid';
import { ContentTitle } from '../../components/content/ContentTitle';
import { searchContents } from './searchContents';
import './scss/Search.scss';

export const Search = () => {
  const [params] = useSearchParams();
  const query = (params.get('q') || '').trim();
  return <SearchResults key={query} query={query} />;
};

const SearchResults = ({ query }) => {
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState({
    items: [], page: 0, totalPages: 0, error: '', partial: false,
  });

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const data = await searchContents({
          query,
          page,
          signal: controller.signal,
          apiKey: import.meta.env.VITE_TMDB_API_KEY,
        });
        if (controller.signal.aborted) return;
        setResult((previous) => {
          const items = page === 1 ? data.items : [...previous.items, ...data.items];
          return {
            items: [...new Map(items.map((item) => [`${item.media_type}-${item.id}`, item])).values()],
            page,
            totalPages: data.totalPages,
            partial: data.partial,
            error: '',
          };
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setResult((previous) => ({ ...previous, error: error.message }));
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, page, retry]);

  const loading = Boolean(query && !result.error && result.page !== page);
  const tryAgain = () => {
    setResult((previous) => ({ ...previous, error: '' }));
    setRetry((value) => value + 1);
  };

  return (
    <main className="searchPage">
      <ContentTitle title={query ? `‘${query}’ 검색 결과` : '검색'} />
      {!query && <p>제목, 장르, 배우 또는 감독 이름을 입력해 주세요.</p>}
      {query && <ContentGrid items={result.items} type="all" imageType="가로" />}

      <div aria-live="polite">
        {loading && <p role="status">검색 중입니다.</p>}
        {query && !loading && !result.error && !result.items.length && (
          <p>검색 결과가 없습니다.</p>
        )}
        {result.partial && <p>일부 검색 결과를 불러오지 못했습니다.</p>}
      </div>

      {result.error && (
        <div role="alert">
          <p>{result.error}</p>
          <button type="button" onClick={tryAgain}>다시 시도</button>
        </div>
      )}

      {!loading && !result.error && result.page < result.totalPages && (
        <button
          className="searchPage-more"
          type="button"
          onClick={() => setPage((value) => value + 1)}
        >
          더 보기
        </button>
      )}
    </main>
  );
};

