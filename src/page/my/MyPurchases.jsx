
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import './scss/MyPurchases.scss'

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

// 임시 구매 데이터
// 실제 구매 기능 연동 후 교체
const initialPurchases = [];

export const MyPurchases = () => {
    // 전체 구매 기록
    const [purchases, setPurchases] = useState(initialPurchases);

    // 선택한 장르
    const [activeGenre, setActiveGenre] = useState('전체');

    // 편집 모드
    const [isEditing, setIsEditing] = useState(false);

    // 선택된 콘텐츠 ID
    const [selectedIds, setSelectedIds] = useState([]);

    // 숨긴 콘텐츠 ID
    // 현재는 화면에서만 유지됨
    const [hiddenIds, setHiddenIds] = useState([]);

    // 숨기지 않은 구매 기록만 표시
    const visiblePurchases = purchases.filter(
        (item) => !hiddenIds.includes(item.id)
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

    // 선택한 구매 기록 숨기기
    const handleHide = () => {
        if (selectedIds.length === 0) return;

        const confirmed = window.confirm(
            '선택한 구매내역을 목록에서 숨기시겠습니까?\n실제 구매 기록은 삭제되지 않습니다.'
        );

        if (!confirmed) return;

        // 선택한 ID를 숨김 목록에 추가
        setHiddenIds((prev) => [
            ...new Set([...prev, ...selectedIds])
        ]);

        setSelectedIds([]);
        setIsEditing(false);
    };

    return (
        <main className="my-purchases">
            <div className="my-purchases-inner">

                {/* 상단 콘텐츠 탭 */}
                <nav
                    className="my-purchases-tabs"
                    aria-label="마이페이지 콘텐츠 메뉴"
                >
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
                                        selectedIds.length === 0
                                    }
                                >
                                    선택 숨기기 ({selectedIds.length})
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
                                    className="my-purchases-item"
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
                                                            ? '/images/mypage/checked-true.svg'
                                                            : '/images/mypage/checked-false.svg'
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
        </main>
    );
};

