
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './scss/MyPurchases.scss'
import { useAuthStore } from '../../store/useAuthStore';
import { subscribeMyPurchases } from '../../service/purchaseService';
import { updatePurchaseHidden } from '../../service/purchaseService';

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

export const MyPurchases = () => {
    const user = useAuthStore((state) => state.user);
    const [purchases, setPurchases] = useState([]);
    const [purchaseError, setPurchaseError] = useState('');

    useEffect(() => {
        setPurchases([]);
        setPurchaseError('');
        if (!user?.uid) return;

        return subscribeMyPurchases(
            user.uid,
            setPurchases,
            () => setPurchaseError('구매내역을 불러오지 못했습니다.')
        );
    }, [user?.uid]);

    // 선택한 장르
    const [activeGenre, setActiveGenre] = useState('전체');

    // 편집 모드
    const [isEditing, setIsEditing] = useState(false);

    // 선택된 콘텐츠 ID
    const [selectedIds, setSelectedIds] = useState([]);

    // 숨기기 확인 모달
    const [showHideModal, setShowHideModal] = useState(false);

    // 일반 모드에서는 숨긴 콘텐츠 제외
    // 편집 모드에서는 숨긴 콘텐츠까지 표시
    const visiblePurchases = purchases.filter(
        (item) => isEditing || !item.hidden
    );

    // 장르 필터링
    const filteredPurchases = visiblePurchases.filter(
        (item) =>
            activeGenre === '전체' ||
            item.genre === activeGenre
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
        const visibleIds = filteredPurchases.map(
            (item) => item.id
        );

        const allSelected =
            visibleIds.length > 0 &&
            visibleIds.every((id) =>
                selectedIds.includes(id)
            );

        if (allSelected) {
            setSelectedIds((prev) =>
                prev.filter(
                    (id) => !visibleIds.includes(id)
                )
            );
        } else {
            setSelectedIds((prev) => [
                ...new Set([...prev, ...visibleIds])
            ]);
        }
    };


    // 선택 숨기기 모달 열기
    const handleHide = () => {
        if (selectedIds.length === 0) return;
        setShowHideModal(true);
    };


    const [isUpdating, setIsUpdating] = useState(false);

    // 선택한 콘텐츠 숨기기
    const handleConfirmHide = async () => {
        if (!user?.uid || selectedIds.length === 0 || isUpdating) return;

        setIsUpdating(true);
        setPurchaseError('');

        try {
            await Promise.all(
                purchases
                    .filter((item) =>
                        selectedIds.includes(item.id) && !item.hidden
                    )
                    .map((item) =>
                        updatePurchaseHidden(user.uid, item.id, true)
                    )
            );

            setSelectedIds([]);
            setIsEditing(false);
            setShowHideModal(false);
        } catch (err) {
            console.error('구매내역 숨기기 오류:', err);
            setPurchaseError('구매내역을 숨기지 못했습니다.');
        } finally {
            setIsUpdating(false);
        }
    };


    // 숨긴 콘텐츠 다시 표시
    const handleRestore = async () => {
        if (!user?.uid || selectedIds.length === 0 || isUpdating) return;

        const hiddenItems = purchases.filter(
            (item) => selectedIds.includes(item.id) && item.hidden
        );

        if (hiddenItems.length === 0) return;

        setIsUpdating(true);
        setPurchaseError('');

        try {
            await Promise.all(
                hiddenItems.map((item) =>
                    updatePurchaseHidden(user.uid, item.id, false)
                )
            );

            setSelectedIds([]);
        } catch (err) {
            console.error('구매내역 복원 오류:', err);
            setPurchaseError('구매내역을 복원하지 못했습니다.');
        } finally {
            setIsUpdating(false);
        }
    };




    return (
        <main className="my-purchases">
            <div className="my-purchases-inner">


                {/* 상단 콘텐츠 탭 */}
                <nav
                    className="my-purchases-tabs"
                    aria-label="마이페이지 콘텐츠 메뉴"
                >
                    {/* 뒤로가기 버튼 */}
                    <Link
                        to="/my"
                        className="my-purchases-back"
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
                                tab.path === '/my/purchases'
                                    ? 'active'
                                    : ''
                            }
                        >
                            {tab.title}
                        </Link>
                    ))}


                    {/* 모바일 전용 제목 */}
                    <h1 className="my-purchases-mobile-title">
                        개별 구매
                    </h1>

                    {/* 모바일 전용 편집 버튼 */}
                    <div className="my-purchases-mobile-actions">
                        {isEditing ? (
                            <button
                                type="button"
                                onClick={handleComplete}
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

                </nav>


                {/* 장르 필터 + 편집 메뉴 */}
                <div className="my-purchases-toolbar">

                    <div
                        className="my-purchases-genres"
                        role="group"
                        aria-label="장르 필터"
                    >
                        {genres.map((genre) => (
                            <button
                                key={genre}
                                type="button"
                                className={
                                    activeGenre === genre
                                        ? 'active'
                                        : ''
                                }
                                onClick={() => {
                                    setActiveGenre(genre);
                                    setSelectedIds([]);
                                }}
                                aria-pressed={
                                    activeGenre === genre
                                }
                            >
                                {genre}
                            </button>
                        ))}
                    </div>

                    {/* 편집 메뉴 */}
                    <div className="my-purchases-actions">
                        {isEditing ? (
                            <>
                                <button
                                    type="button"
                                    className="hide"
                                    onClick={handleHide}
                                    disabled={
                                        isUpdating ||
                                        !selectedIds.some((id) =>
                                            purchases.some(
                                                (item) => item.id === id && !item.hidden
                                            )
                                        )
                                    }
                                >
                                    선택 숨기기 ({selectedIds.length})
                                </button>

                                <button
                                    type="button"
                                    className="restore"
                                    onClick={handleRestore}
                                    disabled={
                                        isUpdating ||
                                        !selectedIds.some((id) =>
                                            purchases.some(
                                                (item) => item.id === id && item.hidden
                                            )
                                        )
                                    }
                                >
                                    선택 복원
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

                {purchaseError && <p role="alert">{purchaseError}</p>}

                {/* 구매 콘텐츠 목록 */}
                {filteredPurchases.length === 0 ? (
                    <p className="my-purchases-empty">
                        표시할 구매내역이 없습니다.
                    </p>
                ) : (
                    <div className="my-purchases-grid">
                        {filteredPurchases.map((item) => {
                            const isSelected =
                                selectedIds.includes(item.id);

                            return (
                                <div
                                    className={`my-purchases-item ${item.hidden ? 'is-hidden' : ''
                                        }`}
                                    key={item.id}
                                >
                                    <button
                                        type="button"
                                        className="my-purchases-thumbnail"
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
                                            isEditing
                                                ? isSelected
                                                : undefined
                                        }
                                    >
                                        {item.image ? (
                                            <img
                                                src={item.image}
                                                alt=""
                                                className="my-purchases-image"
                                            />
                                        ) : (
                                            <span className="my-purchases-placeholder">
                                                {item.title}
                                            </span>
                                        )}

                                        {isEditing && item.hidden && (
                                            <span className="my-purchases-hidden-label">
                                                숨김
                                            </span>
                                        )}

                                        {/* 편집 모드 오버레이 */}
                                        {isEditing && (
                                            <span
                                                className={
                                                    `my-purchases-overlay ${isSelected
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
                                                    className="my-purchases-check"
                                                />
                                            </span>
                                        )}
                                    </button>

                                    <div className="my-purchases-info">
                                        <h3>{item.title}</h3>
                                        <p>{item.info}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>


            {showHideModal && (
                <div className="my-purchases-modal">
                    <div
                        className="my-purchases-modal__content"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="hide-modal-title"
                    >
                        <div className="my-purchases-modal__icon">
                            <span>!</span>
                        </div>

                        <h2 id="hide-modal-title">
                            구매내역을 숨기시겠습니까?
                        </h2>

                        <p>
                            선택한 {selectedIds.length}개의 콘텐츠를
                            목록에서 숨깁니다.
                            <br />
                            실제 구매 기록은 삭제되지 않습니다.
                        </p>

                        <div className="my-purchases-modal__actions">
                            <button
                                type="button"
                                className="my-purchases-modal__button my-purchases-modal__button--secondary"
                                onClick={() => setShowHideModal(false)}
                            >
                                취소
                            </button>

                            <button
                                type="button"
                                className="my-purchases-modal__button"
                                onClick={handleConfirmHide}
                            >
                                숨기기
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </main>
    );
};

