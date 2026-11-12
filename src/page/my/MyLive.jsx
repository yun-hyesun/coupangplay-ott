
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '../../firebase/firebase'
import { useAuthStore } from '../../store/useAuthStore'
import { useProfileStore } from '../../store/useProfileStore'
import { getLiveReminderItems, useWatchlistStore } from '../../store/useWatchlistStore'
import { SportsWatchlistThumbnail } from './components/LiveReminder'
import './scss/MyLive.scss'

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
    '전체',
    '스포츠',
    '드라마',
    '예능',
    '영화',
    '스토어',
    '키즈'
];

export const MyLive = () => {
    const user = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.loading);
    const currentProfile = useProfileStore((state) => state.currentProfile);
    const { watchlist, ownerKey, loading, error, onLoadWatchlist, onRemoveWatchlist } = useWatchlistStore();
    const currentOwnerKey = user?.uid && currentProfile?.id
        ? `${user.uid}_${currentProfile.id}`
        : null;
    const isCurrentList = Boolean(!authLoading && currentOwnerKey && ownerKey === currentOwnerKey);
    const liveList = isCurrentList ? getLiveReminderItems(watchlist) : [];

    useEffect(() => {
        if (!authLoading && currentOwnerKey) onLoadWatchlist();
    }, [authLoading, currentOwnerKey, onLoadWatchlist]);

    // 선택한 장르
    const [activeGenre, setActiveGenre] = useState('전체');

    // 편집 모드
    const [editingOwnerKey, setEditingOwnerKey] = useState(null);
    const isEditing = Boolean(currentOwnerKey && editingOwnerKey === currentOwnerKey);

    // 선택한 콘텐츠 ID
    const [selectedIds, setSelectedIds] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const isBusy = authLoading || loading || isDeleting || !isCurrentList;

    // 장르 필터링
    const filteredLive = liveList.filter((item) =>
        activeGenre === '전체' || item.genre === activeGenre
    );

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
        setEditingOwnerKey(currentOwnerKey);
        setSelectedIds([]);
        setDeleteError('');
    };

    // 편집 완료
    const handleComplete = () => {
        setEditingOwnerKey(null);
        setSelectedIds([]);
    };

    // 전체 선택 / 해제
    const handleSelectAll = () => {
        const visibleIds = filteredLive.map((item) => item.id);

        const allSelected =
            visibleIds.length > 0 &&
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

    // 선택 삭제
    const handleDelete = async () => {
        if (!isEditing || isBusy || selectedIds.length === 0) return;

        const confirmed = window.confirm(
            '선택한 라이브 예약 알림을 삭제하시겠습니까?'
        );

        if (!confirmed) return;

        setIsDeleting(true);
        setDeleteError('');

        try {
            const selectedItems = liveList.filter((item) => selectedIds.includes(item.id));
            for (const item of selectedItems) {
                const profile = useProfileStore.getState().currentProfile;
                const uid = auth.currentUser?.uid;
                if (!uid || !profile?.id || `${uid}_${profile.id}` !== currentOwnerKey) {
                    throw new Error('프로필이 변경되었습니다.');
                }
                if (!await onRemoveWatchlist(item)) throw new Error('예약 알림 삭제 실패');
            }
            setSelectedIds([]);
            setEditingOwnerKey(null);
        } catch {
            setDeleteError('라이브 예약 알림을 삭제하지 못했습니다. 다시 시도해 주세요.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <main className="my-live">
            <div className="my-live-inner">

                {/* 상단 콘텐츠 탭 */}

                {/* 상단 콘텐츠 탭 */}
                <nav
                    className="my-live-tabs"
                    aria-label="마이페이지 콘텐츠 메뉴"
                >
                    {/* 뒤로가기 버튼 */}
                    <Link
                        to="/my"
                        className="my-live-back"
                        aria-label="마이페이지로 돌아가기"
                    >
                        <img
                            src="/images/icon/icon-arrow_back_gray.svg"
                            alt=""
                        />
                    </Link>

                    {/* 콘텐츠 탭 */}
                    {contentTabs.map((tab) => (
                        <Link
                            key={tab.path}
                            to={tab.path}
                            className={
                                tab.path === '/my/live' ? 'active' : ''
                            }
                        >
                            {tab.title}
                        </Link>
                    ))}


                    {/* 모바일 전용 제목 */}
                    <h1 className="my-live-mobile-title">
                        라이브 예약 알림
                    </h1>

                    {/* 모바일 전용 편집 버튼 */}
                    <div className="my-live-mobile-actions">
                        {isEditing ? (
                            <button
                                type="button"
                                onClick={handleComplete}
                                disabled={isBusy}
                            >
                                완료
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleEdit}
                                disabled={isBusy}
                            >
                                편집
                            </button>
                        )}
                    </div>

                </nav>


                {/* 장르 필터 + 편집 메뉴 */}
                <div className="my-live-toolbar">

                    <div
                        className="my-live-genres"
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
                                onClick={() => {
                                    setActiveGenre(genre);
                                    setSelectedIds([]);
                                }}
                                aria-pressed={activeGenre === genre}
                                disabled={isDeleting}
                            >
                                {genre}
                            </button>
                        ))}
                    </div>

                    <div className="my-live-actions">
                        {isEditing ? (
                            <>
                                <button
                                    type="button"
                                    className="delete"
                                    onClick={handleDelete}
                                    disabled={isBusy || selectedIds.length === 0}
                                >
                                    선택 삭제 ({selectedIds.length})
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSelectAll}
                                    disabled={isBusy}
                                >
                                    전체 선택
                                </button>

                                <button
                                    type="button"
                                    onClick={handleComplete}
                                    disabled={isBusy}
                                >
                                    완료
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={handleEdit}
                                disabled={isBusy}
                            >
                                편집
                            </button>
                        )}
                    </div>
                </div>

                {/* 라이브 예약 목록 */}
                {deleteError && <p className="my-live-empty" role="alert">{deleteError}</p>}
                {authLoading || (currentOwnerKey && loading && !isCurrentList) ? (
                    <p className="my-live-empty">
                        라이브 예약 알림을 불러오는 중입니다.
                    </p>
                ) : !currentOwnerKey ? (
                    <p className="my-live-empty">
                        프로필을 먼저 선택해 주세요.
                    </p>
                ) : error || !isCurrentList ? (
                    <p className="my-live-empty">
                        라이브 예약 알림을 불러오지 못했습니다.
                    </p>
                ) : filteredLive.length === 0 ? (
                    <p className="my-live-empty">
                        예약한 라이브 알림이 없습니다.
                    </p>
                ) : (
                    <div className="my-live-grid">
                        {filteredLive.map((item) => {
                            const isSelected =
                                selectedIds.includes(item.id);
                            const Thumbnail = isEditing ? 'button' : Link;

                            return (
                                <div
                                    className="my-live-item"
                                    key={item.id}
                                >
                                    <Thumbnail
                                        className="my-live-thumbnail"
                                        {...(isEditing ? {
                                            type: 'button',
                                            onClick: () => handleSelect(item.id),
                                            disabled: isBusy,
                                        } : { to: item.path, state: item.state })}
                                        aria-label={
                                            isEditing ? `${item.title} ${isSelected
                                                ? '선택 해제'
                                                : '선택'
                                            }` : `${item.title} 경기 일정 보기`
                                        }
                                        aria-pressed={
                                            isEditing ? isSelected : undefined
                                        }
                                    >
                                        <SportsWatchlistThumbnail item={item} />

                                        {/* 편집 모드 */}
                                        {isEditing && (
                                            <span
                                                className={
                                                    `my-live-overlay ${isSelected
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
                                                    className="my-live-check"
                                                />
                                            </span>
                                        )}
                                    </Thumbnail>

                                    <div className="my-live-info">
                                        <h3>{item.title}</h3>
                                        <p>{item.date}</p>
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
