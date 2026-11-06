
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
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

// 임시 데이터
// 실제 예약 기능 연동 후 데이터로 교체
const initialLiveData = [];

export const MyLive = () => {
    // 라이브 예약 목록
    const [liveList, setLiveList] = useState(initialLiveData);

    // 선택한 장르
    const [activeGenre, setActiveGenre] = useState('전체');

    // 편집 모드
    const [isEditing, setIsEditing] = useState(false);

    // 선택한 콘텐츠 ID
    const [selectedIds, setSelectedIds] = useState([]);

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
    const handleDelete = () => {
        if (selectedIds.length === 0) return;

        const confirmed = window.confirm(
            '선택한 라이브 예약 알림을 삭제하시겠습니까?'
        );

        if (!confirmed) return;

        setLiveList((prev) =>
            prev.filter((item) => !selectedIds.includes(item.id))
        );

        setSelectedIds([]);
        setIsEditing(false);
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

                {/* 라이브 예약 목록 */}
                {filteredLive.length === 0 ? (
                    <p className="my-live-empty">
                        예약한 라이브 알림이 없습니다.
                    </p>
                ) : (
                    <div className="my-live-grid">
                        {filteredLive.map((item) => {
                            const isSelected =
                                selectedIds.includes(item.id);

                            return (
                                <div
                                    className="my-live-item"
                                    key={item.id}
                                >
                                    <button
                                        type="button"
                                        className="my-live-thumbnail"
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
                                                className="my-live-image"
                                            />
                                        ) : (
                                            <span className="my-live-placeholder">
                                                {item.title}
                                            </span>
                                        )}

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
                                                            ? '/images/mypage/checked-true.svg'
                                                            : '/images/mypage/checked-false.svg'
                                                    }
                                                    alt=""
                                                    className="my-live-check"
                                                />
                                            </span>
                                        )}
                                    </button>

                                    <div className="my-live-info">
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
