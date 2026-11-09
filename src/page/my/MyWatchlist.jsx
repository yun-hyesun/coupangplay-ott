
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '../../firebase/firebase'
import { useAuthStore } from '../../store/useAuthStore'
import { useProfileStore } from '../../store/useProfileStore'
import { useWatchlistStore } from '../../store/useWatchlistStore'
import './scss/MyPageHeader.scss'
import './scss/MyWatchlist.scss'

// 상단 콘텐츠 탭
const contentTabs = [
    { title: '시청내역', path: '/my/history' },
    { title: '찜한 콘텐츠', path: '/my/watchlist' },
    { title: '개별 구매', path: '/my/purchases' },
    { title: '내 와우 클립', path: '/wowclip?view=mine' },
    { title: '라이브 예약 알림', path: '/my/live' }
];

// 장르 필터
const genres = [
    '전체', '시리즈', '스포츠', '드라마', '예능',
    '영화', '스토어', '키즈'
];
const mobileGenres = ['전체', '시리즈', '영화'];

export const MyWatchlist = () => {
    const user = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.loading);
    const currentProfile = useProfileStore(
        (state) => state.currentProfile
    );

    const {
        watchlist,
        ownerKey,
        loading,
        error,
        onLoadWatchlist,
        onRemoveWatchlist
    } = useWatchlistStore();

    const [activeGenre, setActiveGenre] = useState('전체');
    const [isEditing, setIsEditing] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);

    // 현재 로그인 계정과 프로필 확인
    const uid = auth.currentUser?.uid || user?.uid;
    const profileId = currentProfile?.id;
    const currentOwnerKey = uid && profileId
        ? `${uid}_${profileId}`
        : null;

    // 프로필이 변경되면 찜 목록 불러오기
    useEffect(() => {
        if (authLoading || !currentOwnerKey) return;

        onLoadWatchlist();
    }, [authLoading, currentOwnerKey, onLoadWatchlist]);

    // 다른 프로필의 찜 목록이 잠시 보이지 않도록 확인
    const currentWatchlist =
        ownerKey === currentOwnerKey ? watchlist : [];

    // 현재 저장된 데이터의 media_type으로 영화 분류
    // 다른 장르 필터는 추후 장르 데이터 연동 시 확장
    const filteredWatchlist = currentWatchlist.filter((item) => {
        if (activeGenre === '전체') return true;

        if (activeGenre === '영화') {
            return item.media_type === 'movie';
        }

        if (activeGenre === '시리즈') {
            return item.media_type === 'tv';
        }

        return false;
    });

    // 콘텐츠 고유 ID
    const getItemKey = (item) =>
        `${item.media_type}_${item.id}`;

    // 선택 / 선택 해제
    const handleSelect = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id)
                ? prev.filter((selectedId) => selectedId !== id)
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

    // 전체 선택 / 해제
    const handleSelectAll = () => {
        const visibleIds = filteredWatchlist.map(getItemKey);
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

    // Firebase에서 선택한 찜 목록 삭제
    const handleDelete = async () => {
        if (selectedIds.length === 0 || isDeleting) return;

        const confirmed = window.confirm(
            '선택한 찜 콘텐츠를 삭제하시겠습니까?'
        );

        if (!confirmed) return;

        setIsDeleting(true);

        try {
            const selectedItems = currentWatchlist.filter((item) =>
                selectedIds.includes(getItemKey(item))
            );

            // 한 건씩 삭제하고 저장소의 목록 갱신
            for (const item of selectedItems) {
                await onRemoveWatchlist(item);
            }

            setSelectedIds([]);
            setIsEditing(false);
        } catch (error) {
            console.error('찜 목록 삭제 실패:', error);
            alert('일부 콘텐츠를 삭제하지 못했습니다.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <main className="my-watchlist">
            <div className="my-watchlist-inner">

                {/* 모바일: 공통 MyPageHeader 스타일 적용 */}
                <div className="my-watchlist-mobile-header">
                    <div className="my-page-header">
                        <Link
                            to="/my"
                            className="my-page-header__back"
                            aria-label="마이페이지로 돌아가기"
                        >
                            <img src="/images/icon/icon-arrow_back_gray.svg" alt="" />
                        </Link>
                        <h2>찜 내역</h2>
                    </div>
                    <div className="my-watchlist-mobile-actions">
                        {isEditing ? (
                            <button
                                type="button"
                                onClick={handleComplete}
                                disabled={isDeleting}
                            >
                                완료
                            </button>
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

                {/* 상단 콘텐츠 탭 (PC / 태블릿) */}
                <nav
                    className="my-watchlist-tabs"
                    aria-label="마이페이지 콘텐츠 메뉴"
                >
                    {/* 뒤로가기 버튼 추가 */}
                    <Link
                        to="/my"
                        className="my-watchlist-back"
                        aria-label="마이페이지로 돌아가기"
                    >
                        <img
                            src="/images/icon/icon-arrow_back_gray.svg"
                            alt=""
                        />
                    </Link>

                    {contentTabs.map((tab) => (
                        <Link
                            key={tab.path}
                            to={tab.path}
                            className={
                                tab.path === '/my/watchlist'
                                    ? 'active'
                                    : ''
                            }
                        >
                            {tab.title}
                        </Link>
                    ))}

                </nav>

                {/* 장르 필터 + 편집 메뉴 */}
                <div className="my-watchlist-toolbar">

                    <div
                        className="my-watchlist-genres"
                        role="group"
                        aria-label="장르 필터"
                    >
                        {genres.map((genre) => (
                            <button
                                key={genre}
                                type="button"
                                className={
                                    `${activeGenre === genre ? 'active' : ''} ${genre === '시리즈' ? 'mobile-only' : mobileGenres.includes(genre) ? '' : 'desktop-only'
                                    }`
                                }
                                onClick={() => {
                                    setActiveGenre(genre);
                                    setSelectedIds([]);
                                }}
                                aria-pressed={activeGenre === genre}
                            >
                                {genre}
                            </button>
                        ))}
                    </div>

                    <div className="my-watchlist-actions">
                        {isEditing ? (
                            <>
                                <button
                                    type="button"
                                    className="delete"
                                    onClick={handleDelete}
                                    disabled={
                                        selectedIds.length === 0 ||
                                        isDeleting
                                    }
                                >
                                    선택 삭제 ({selectedIds.length})
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSelectAll}
                                    disabled={isDeleting}
                                >
                                    전체 선택
                                </button>

                                <button
                                    type="button"
                                    onClick={handleComplete}
                                    disabled={isDeleting}
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

                {/* 콘텐츠 목록 */}
                {!currentOwnerKey ? (
                    <p className="my-watchlist-empty">
                        프로필을 선택해 주세요.
                    </p>
                ) : loading && ownerKey !== currentOwnerKey ? (
                    <p className="my-watchlist-empty">
                        찜한 콘텐츠를 불러오는 중입니다.
                    </p>
                ) : error ? (
                    <p className="my-watchlist-empty">
                        찜 목록을 불러오지 못했습니다.
                    </p>
                ) : filteredWatchlist.length === 0 ? (
                    <p className="my-watchlist-empty">
                        찜한 콘텐츠가 없습니다.
                    </p>
                ) : (
                    <div className="my-watchlist-grid">
                        {filteredWatchlist.map((item) => {
                            const itemKey = getItemKey(item);
                            const isSelected =
                                selectedIds.includes(itemKey);

                            const imagePath =
                                item.backdrop_path || item.poster_path;

                            return (
                                <div
                                    className="my-watchlist-item"
                                    key={itemKey}
                                >
                                    <button
                                        type="button"
                                        className="my-watchlist-thumbnail"
                                        onClick={() => {
                                            if (isEditing) {
                                                handleSelect(itemKey);
                                            }
                                        }}
                                        disabled={!isEditing || isDeleting}
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
                                        {imagePath ? (
                                            <picture>
                                                {item.poster_path && (
                                                    <source
                                                        media="(max-width: 767px)"
                                                        srcSet={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                                                    />
                                                )}
                                                <img
                                                    src={`https://image.tmdb.org/t/p/w780${imagePath}`}
                                                    alt=""
                                                    className="my-watchlist-image"
                                                />
                                            </picture>
                                        ) : (
                                            <span className="my-watchlist-placeholder">
                                                {item.title}
                                            </span>
                                        )}

                                        {/* 편집 모드 */}
                                        {isEditing && (
                                            <span
                                                className={
                                                    `my-watchlist-overlay ${isSelected
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
                                                    className="my-watchlist-check"
                                                />
                                            </span>
                                        )}
                                    </button>

                                    <div className="my-watchlist-info">
                                        <h3>{item.title}</h3>
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
