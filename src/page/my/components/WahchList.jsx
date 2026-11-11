
import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../../store/useAuthStore'
import { useWatchlistStore } from '../../../store/useWatchlistStore'
import { useProfileStore } from '../../../store/useProfileStore'
import '../scss/Watchlist.scss'

export const Watchlist = () => {
    // 로그인 사용자
    const user = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.loading);

    // 현재 선택된 프로필
    const currentProfile = useProfileStore(
        (state) => state.currentProfile
    );

    // 찜 목록 데이터
    const watchlist = useWatchlistStore(
        (state) => state.watchlist
    );

    const loading = useWatchlistStore(
        (state) => state.loading
    );

    const error = useWatchlistStore(
        (state) => state.error
    );

    const ownerKey = useWatchlistStore(
        (state) => state.ownerKey
    );

    const onLoadWatchlist = useWatchlistStore(
        (state) => state.onLoadWatchlist
    );

    const onResetWatchlist = useWatchlistStore(
        (state) => state.onResetWatchlist
    );

    // 계정 또는 프로필이 변경되면 찜 목록 새로 불러오기
    useEffect(() => {
        onResetWatchlist();

        if (!authLoading && user?.uid && currentProfile?.id) {
            onLoadWatchlist();
        }
    }, [
        authLoading,
        user?.uid,
        currentProfile?.id,
        onLoadWatchlist,
        onResetWatchlist
    ]);

    // 현재 로그인 계정과 프로필의 찜 목록인지 확인
    const expectedOwnerKey =
        user?.uid && currentProfile?.id
            ? `${user.uid}_${currentProfile.id}`
            : null;

    const isCurrentList =
        expectedOwnerKey !== null &&
        ownerKey === expectedOwnerKey;

    const items = isCurrentList ? watchlist.slice(0, 5) : [];

    // 실제 요청 중일 때만 로딩 표시
    const isLoading =
        authLoading ||
        (user && currentProfile && loading);

    return (
        <section className="watchlist">
            <div className="watchlist-header">
                <Link
                    to="/my/watchlist"
                    className="watchlist-heading"
                >
                    <h2>찜한 콘텐츠</h2>
                    <img className="watchlist-arrow" src="/images/mypage/icon-arrow_right.png" alt="화살표 아이콘" />
                </Link>

                <Link
                    to="/my/watchlist"
                    className="watchlist-more"
                    aria-label="전체 찜 목록 보기"
                >
                    •••
                </Link>
            </div>

            {isLoading ? (
                <p className="watchlist-message">
                    찜 목록을 불러오는 중입니다.
                </p>
            ) : !user || !currentProfile ? (
                <p className="watchlist-message">
                    프로필을 먼저 선택해 주세요.
                </p>
            ) : error ? (
                <p className="watchlist-message">
                    {error}
                </p>
            ) : !isCurrentList ? (
                <p className="watchlist-message">
                    찜 목록을 불러오지 못했습니다.
                </p>
            ) : items.length === 0 ? (
                <p className="watchlist-message">
                    아직 찜한 콘텐츠가 없습니다.
                </p>
            ) : (
                <div className="watchlist-grid">
                    {items.map((item) => (
                        <Link
                            key={item.docId}
                            to={
                                item.media_type === 'movie'
                                    ? `/detail/movie/${item.id}`
                                    : `/detail/tv/${item.id}`
                            }
                            className="watchlist-item"
                        >
                            <div className="watchlist-thumbnail">
                                {item.backdrop_path || item.poster_path ? (
                                    <img
                                        src={`https://image.tmdb.org/t/p/w780${
                                            item.backdrop_path ||
                                            item.poster_path
                                        }`}
                                        alt={item.title}
                                    />
                                ) : (
                                    <span>이미지 없음</span>
                                )}
                            </div>

                            <p className="watchlist-title">
                                {item.title}
                            </p>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    )
}
