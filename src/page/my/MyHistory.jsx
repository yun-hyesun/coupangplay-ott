import { Popup } from '../../components/common/Popup';

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProfileWatchHistory } from '../../store/useProfileWatchHistory';
import { useWatchHistoryStore } from '../../store/useWatchHistoryStore';
import { ContentCard } from '../../components/content/ContentCard';
import './scss/MyHistory.scss'

// 상단 콘텐츠 탭
const contentTabs = [
  { title: '시청내역', path: '/my/history' },
  { title: '찜한 콘텐츠', path: '/my/watchlist' },
  { title: '개별 구매', path: '/my/purchases' },
  { title: "내 와우 클립", path: "/wowclip?view=mine" },
  { title: '라이브 예약 알림', path: '/my/live' }
];

// 장르 필터
const genres = [
  '전체',
  '시리즈',
  '영화'
];

export const MyHistory = () => {
  const { history, ownerKey } = useProfileWatchHistory();
  return (
    <HistoryList
      key={ownerKey ?? 'guest'}
      history={history}
      ownerKey={ownerKey}
    />
  );
};

const HistoryList = ({ history, ownerKey }) => {
  const onDeleteHistory = useWatchHistoryStore((state) => state.onDeleteHistory);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  // 선택된 장르
  const [activeGenre, setActiveGenre] = useState('전체');

  // 편집 모드
  const [isEditing, setIsEditing] = useState(false);

  // 선택된 콘텐츠 ID
  const [selectedIds, setSelectedIds] = useState([]);

  // 장르별 필터링
  const filteredHistory = history
    .filter((item) => activeGenre === '전체' ||
      (item.media_type === 'movie' ? '영화' : '시리즈') === activeGenre)
    .map((item) => ({
      ...item,
      id: item.docId,
      image: item.backdrop_path
        ? `https://image.tmdb.org/t/p/w780${item.backdrop_path}`
        : '',
    }));

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

  const handleDelete = () => { if (selectedIds.length && !deleting) { setDeleteError(false); setDeleteOpen(true); } };
  const confirmDelete = async () => {
    if (!selectedIds.length || deleting) return false;


    setDeleting(true);
    setDeleteError(false);
    try {
      if (await onDeleteHistory(selectedIds)) { handleComplete(); setDeleteOpen(false); }
      else { setDeleteError(true); return false; }
    } catch {
      setDeleteError(true);
      return false;
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="my-history">
      <div className="my-history-inner">


        {/* 상단 콘텐츠 탭 */}
        <nav
          className="my-history-tabs"
          aria-label="마이페이지 콘텐츠 메뉴"
        >
          <Link
            to="/my"
            className="my-history-back"
            aria-label="마이페이지로 돌아가기"
          >
            <img
              src="/images/icon/icon-arrow_back_gray.svg"
              alt=""
            />
          </Link>

          {/* PC / 태블릿 콘텐츠 탭 */}
          {contentTabs.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={tab.path === '/my/history' ? 'active' : ''}
            >
              {tab.title}
            </Link>
          ))}

          {/* 모바일 전용 제목 */}
          <h1 className="my-history-mobile-title">시청내역</h1>

          {/* 모바일 전용 편집 버튼 */}
          <div className="my-history-mobile-actions">
            {isEditing ? (
              <button type="button" onClick={handleComplete}>
                완료
              </button>
            ) : (
              <button type="button" onClick={handleEdit}>
                편집
              </button>
            )}
          </div>
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
                  disabled={deleting || selectedIds.length === 0}
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

        {deleteError && <p role="alert">시청내역을 삭제하지 못했습니다.</p>}
        {/* 시청내역 콘텐츠 목록 */}
        {filteredHistory.length === 0 ? (
          <p className="my-history-empty">
            시청내역이 없습니다.
          </p>
        ) : (
          <div className="my-history-grid">
            {filteredHistory.map((item) => {
              if (!isEditing) {
                return (
                  <ContentCard
                    key={item.docId}
                    item={{
                      ...item,
                      id: item.contentId,
                      resume: true,
                      historyLayout: true,
                      ownerKey,
                      position: item.completed ? 0 : item.position,
                    }}
                  />
                );
              }

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
                              ? '/images/icon/DesignSystem_Icon02/icon-favorite_added.svg'
                              : '/images/icon/DesignSystem_Icon02/icon-favorite_added_white.svg'
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
      {deleteOpen && <Popup title="시청내역을 삭제하시겠습니까?"
        description={`선택한 ${selectedIds.length}개의 시청내역을 삭제합니다.\n삭제한 내역은 복구할 수 없습니다.`}
        onClose={() => setDeleteOpen(false)} onConfirm={confirmDelete} confirmText="삭제" busy={deleting}
        error={deleteError ? '시청내역을 삭제하지 못했습니다. 다시 시도해 주세요.' : ''} />}
    </main>
  );
};

