
import { useEffect, useRef } from 'react';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

import { useMovieStore } from '../../store/useMovieStore';
import { ContentGrid } from '../../components/content/ContentGrid';
import { ContentTitle } from '../../components/content/ContentTitle';
import { railConfig } from '../../data/railConfig';
import { makeParams } from '../../data/contentQuery';

import './scss/more.scss';

export const More = () => {
  const [searchParams] = useSearchParams();
  const railKey = searchParams.get('rail');
  const config = railConfig[railKey];
  const MAX_ITEMS = 30;
  const loadRef = useRef(null);
  const navigate = useNavigate();

  // Zustand 상태
  const moreLists = useMovieStore((state) => state.moreLists);
  const moreLoading = useMovieStore((state) => state.moreLoading);
  const moreErrors = useMovieStore((state) => state.moreErrors);
  const morePage = useMovieStore((state) => state.morePage);
  const moreHasNext = useMovieStore((state) => state.moreHasNext);
  const onFetchMore = useMovieStore((state) => state.onFetchMore);

  const items = (moreLists?.[railKey] ?? []).slice(0, MAX_ITEMS);
  const reachedLimit = items.length >= MAX_ITEMS;
  const loading = moreLoading?.[railKey] ?? false;
  const error = moreErrors?.[railKey] ?? null;
  const page = morePage?.[railKey] ?? 0;
  const hasNext = moreHasNext?.[railKey] ?? true;

  // 처음 페이지 진입 시 데이터 요청
  
  // 처음 페이지 진입 시 데이터 요청
  useEffect(() => {
    if (
      !config ||
      page > 0 ||
      loading ||
      error
    ) {
      return;
    }

    onFetchMore(
      railKey,
      config.type,
      makeParams(config)
    );
  }, [ railKey, config, page, loading, error, onFetchMore,]);

  // 화면 하단에 도달하면 다음 페이지 자동 요청
  
  // 화면 하단에 도달하면 다음 페이지 자동 요청
  useEffect(() => {
    if (
      !config ||
      !hasNext ||
      loading ||
      error ||
      page === 0 ||
      reachedLimit
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onFetchMore(
            railKey,
            config.type,
            makeParams(config)
          );
        }
      },
      {
        rootMargin: '300px',
      }
    );

    const target = loadRef.current;

    if (target) {
      observer.observe(target);
    }

    return () => observer.disconnect();
  }, [railKey,config,page,loading,error,hasNext,reachedLimit,onFetchMore,]);


  if (!config) {
    return (
      <main className="morePage">
        <p>콘텐츠 목록을 찾을 수 없습니다.</p>
        <Link to="/">홈으로 돌아가기</Link>
      </main>
    );
  }

  const location = useLocation();

  const homeLinks = {
    '/': '홈으로',
    '/drama': '드라마 홈으로',
    '/entertainment': '예능 홈으로',
    '/movie': '영화 홈으로',
    '/store': '스토어 홈으로',
    '/sports': '스포츠 홈으로',
    '/kids': '키즈 홈으로',
    '/channel/adult': 'Adult 홈으로',
  };

  const from = location.state?.from;
  const homePath = Object.hasOwn(homeLinks, from) ? from : '/';

  return (
    <main className="morePage">
      <Link className="contentList-back" to={homePath}>
        {homeLinks[homePath]}
      </Link>
      <ContentTitle title={config.title} />

      <ContentGrid
        items={items}
        type={config.type}
        imageType={config.gridImageType || '세로'}
      />

      {error && (
        <p className="morePage-error" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <p className="morePage-loading" role="status">
          콘텐츠를 불러오는 중입니다.
        </p>
      )}

      {!loading && !error && page > 0 && items.length === 0 && (
        <p>표시할 콘텐츠가 없습니다.</p>
      )}

      {/* 무한 스크롤 감지 영역 */}
      {!error && hasNext && !reachedLimit && (
        <div
          ref={loadRef}
          className="morePage-observer"
          aria-hidden="true"
        />
      )}
    </main>
  );
};
