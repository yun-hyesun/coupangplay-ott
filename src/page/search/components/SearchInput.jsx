import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const SearchInput = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(
    location.pathname === '/search'
  );
  const [searchText, setSearchText] = useState(
    () => location.pathname === '/search'
      ? new URLSearchParams(location.search).get('q') || ''
      : ''
  );

  const inputRef = useRef(null);
  const composingSearch = useRef(false);
  const previousPage = useRef('/');

  // 입력창을 열면 자동으로 포커스
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // 뒤로 가기나 다른 메뉴로 이동했을 때 화면 동기화
  useEffect(() => {
    if (composingSearch.current) return;

    if (location.pathname === '/search') {
      setIsOpen(true);
      setSearchText(
        new URLSearchParams(location.search).get('q') || ''
      );
    } else {
      setSearchText('');
      setIsOpen(false);
    }
  }, [location.pathname, location.search]);

  const handleOpen = () => {
    if (location.pathname !== '/search') {
      previousPage.current =
        location.pathname + location.search + location.hash;
    }

    setIsOpen(true);
  };

  const handleClose = () => {
    composingSearch.current = false;
    setSearchText('');
    setIsOpen(false);

    if (location.pathname === '/search') {
      navigate(previousPage.current, { replace: true });
    }
  };

  const search = (value) => {
    if (!value.trim()) {
      handleClose();
      return;
    }

    // 검색 페이지로 바로 진입했을 때는 홈으로 돌아가요.
    if (location.pathname !== '/search') {
      previousPage.current =
        location.pathname + location.search + location.hash;
    }

    const params = new URLSearchParams({ q: value });
    const nextPage = `/search?${params.toString()}`;

    if (nextPage === location.pathname + location.search) return;

    navigate(nextPage, {
      replace: location.pathname === '/search',
    });
  };

  return (
    <form
      className={`header-search-form${isOpen ? ' is-open' : ''}`}
      onSubmit={(event) => {
        event.preventDefault();

        if (!composingSearch.current) search(searchText);
      }}
    >
      <button
        type="button"
        className="header-search-btn"
        aria-label="검색창 열기"
        aria-expanded={isOpen}
        aria-controls="header-search-input"
        onClick={() => {
          handleOpen();
          inputRef.current?.focus();
        }}
      />

      {isOpen && (
        <>
          <label htmlFor="header-search-input" className="sr-only">
            검색
          </label>

          <input
            ref={inputRef}
            type="search"
            id="header-search-input"
            value={searchText}
            placeholder="제목, 사람, 장르"
            onCompositionStart={() => {
              composingSearch.current = true;
            }}
            onCompositionEnd={(event) => {
              composingSearch.current = false;
              const value = event.currentTarget.value;
              setSearchText(value);
              search(value);
            }}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setSearchText(value);

              if (!composingSearch.current) search(value);
            }}
            onKeyDown={(event) => {
              if (
                event.key === 'Escape' &&
                !composingSearch.current
              ) {
                event.preventDefault();
                handleClose();
              }
            }}
          />

          <button
            type="button"
            className="close"
            onClick={handleClose}
          >
            닫기
          </button>
        </>
      )}
    </form>
  );
};