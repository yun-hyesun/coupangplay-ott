
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import './scss/MyHistory.scss'

// 상단 콘텐츠 탭
const contentTabs = [
  { title: '시청내역', path: '/my/history' },
  { title: '찜한 콘텐츠', path: '/my/watchlist' },
  { title: '개별 구매', path: '/my/purchases' },
  { title: '라이브 예약 알림', path: '/my/live' }
];

// 장르 필터
const genres = [
  '전체',
  '스포츠',
  '드라마',
  '예능',
  '영화',
  '스토어',
  '키즈'
];

// 임시 시청내역 데이터
// 추후 Firebase 시청 기록 데이터로 교체
const initialHistory = [
  {
    id: 1,
    title: '너 말고 다른 연애',
    info: '시즌 1 3화 · 24분 남음',
    genre: '드라마',
    image: '',
    progress: 60
  },
  {
    id: 2,
    title: '사랑, 그날',
    info: '시즌 1 3화 · 18분 남음',
    genre: '드라마',
    image: '',
    progress: 40
  },
  {
    id: 3,
    title: '지금부터 문제는 아닙니다',
    info: '시즌 1 3화 · 42분 남음',
    genre: '예능',
    image: '',
    progress: 75
  },
  {
    id: 4,
    title: '유니버스 킬러',
    info: '시즌 1 3화 · 35분 남음',
    genre: '드라마',
    image: '',
    progress: 30
  },
  {
    id: 5,
    title: '랜덤스',
    info: '시즌 1 3화 · 21분 남음',
    genre: '영화',
    image: '',
    progress: 85
  }
];

export const MyHistory = () => {
  // 시청내역 데이터
  const [history, setHistory] = useState(initialHistory);

  // 선택된 장르
  const [activeGenre, setActiveGenre] = useState('전체');

  // 편집 모드
  const [isEditing, setIsEditing] = useState(false);

  // 선택된 콘텐츠 ID
  const [selectedIds, setSelectedIds] = useState([]);

  // 장르별 필터링
  const filteredHistory = history.filter((item) => {
    return activeGenre === '전체' ||
      item.genre === activeGenre;
  });

  // 콘텐츠 선택 / 해제
  const handleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id]
    );
  };

  // 편집 시작
  const handleEdit = () => {
    setIsEditing(true);
    setSelectedIds([]);
  };

  // 편집 완료
  const handleComplete = () => {
    setIsEditing(false);
    setSelectedIds([]);
  };

  // 전체 선택 / 해제 (현재 필터 결과 기준)
  const handleSelectAll = () => {
    const visibleIds = filteredHistory.map((item) => item.id);

    const allSelected = visibleIds.length > 0 &&
      visibleIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !visibleIds.includes(id))
      );
    } else {
      setSelectedIds((prev) => [
        ...new Set([...prev, ...visibleIds])
      ]);
    }
  };

  // 선택 삭제 (현재는 임시 데이터에서만 삭제)
  const handleDelete = () => {
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(
      '선택한 시청내역을 삭제하시겠습니까?'
    );

    if (!confirmed) return;

    setHistory((prev) =>
      prev.filter((item) => !selectedIds.includes(item.id))
    );

    setSelectedIds([]);
    setIsEditing(false);
  };

  return (
    <main className="my-history">
      <div className="my-history-inner">

        {/* 상단 콘텐츠 탭 */}
        <nav
          className="my-history-tabs"
          aria-label="마이페이지 콘텐츠 메뉴"
        >
          {contentTabs.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={
                tab.path === '/my/history'
                  ? 'active'
                  : ''
              }
            >
              {tab.title}
            </Link>
          ))}
        </nav>

        {/* 장르 필터 및 편집 메뉴 */}
        <div className="my-history-toolbar">

          <div
            className="my-history-genres"
            role="group"
            aria-label="장르 필터"
          >
            {genres.map((genre) => (
              <button
                key={genre}
                type="button"
                className={
                  activeGenre === genre ? 'active' : ''
                }
                onClick={() => setActiveGenre(genre)}
                aria-pressed={activeGenre === genre}
              >
                {genre}
              </button>
            ))}
          </div>

          {/* 오른쪽 편집 버튼 */}
          <div className="my-history-actions">
            {isEditing ? (
              <>
                <button
                  type="button"
                  className="delete"
                  onClick={handleDelete}
                  disabled={selectedIds.length === 0}
                >
                  선택 삭제 ({selectedIds.length})
                </button>

                <button
                  type="button"
                  onClick={handleSelectAll}
                >
                  전체 선택
                </button>

                <button
                  type="button"
                  onClick={handleComplete}
                >
                  완료
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleEdit}
              >
                편집
              </button>
            )}
          </div>
        </div>

        {/* 시청내역 콘텐츠 목록 */}
        {filteredHistory.length === 0 ? (
          <p className="my-history-empty">
            시청내역이 없습니다.
          </p>
        ) : (
          <div className="my-history-grid">
            {filteredHistory.map((item) => {
              const isSelected =
                selectedIds.includes(item.id);

              return (
                <div
                  className="my-history-item"
                  key={item.id}
                >
                  <button
                    type="button"
                    className="my-history-thumbnail"
                    onClick={() => {
                      if (isEditing) {
                        handleSelect(item.id);
                      }
                    }}
                    disabled={!isEditing}
                    aria-label={
                      `${item.title} ${isSelected
                        ? '선택 해제'
                        : '선택'
                      }`
                    }
                    aria-pressed={
                      isEditing ? isSelected : undefined
                    }
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        className="my-history-image"
                      />
                    ) : (
                      <span className="my-history-placeholder">
                        {item.title}
                      </span>
                    )}

                    {/* 시청 진행바 */}
                    <span
                      className="my-history-progress"
                      style={{
                        width: `${item.progress}%`
                      }}
                    />

                    {/* 편집 모드 오버레이 */}
                    {isEditing && (
                      <span
                        className={
                          `my-history-overlay ${isSelected
                            ? 'selected'
                            : ''
                          }`
                        }
                      >
                        <img
                          src={
                            isSelected
                              ? '/images/mypage/checked-true.svg'
                              : '/images/mypage/checked-false.svg'
                          }
                          alt=""
                          className="my-history-check"
                        />
                      </span>
                    )}
                  </button>

                  <div className="my-history-info">
                    <h3>{item.title}</h3>
                    <p>{item.info}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};
