import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore";
import { useWatchlistStore } from "../../../store/useWatchlistStore";
import { useProfileStore } from "../../../store/useProfileStore";
import { ContentRail } from '../../../components/content/ContentRail';
import { ContentCard } from '../../../components/content/ContentCard';
import { useMyListArtwork } from './useMyListArtwork';
import '../scss/WatchHistory.scss';
import "../scss/WatchList.scss";

export const WatchList = () => {
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

    const savedItems = isCurrentList
        ? watchlist.filter(
            (item) => item.media_type === 'movie' || item.media_type === 'tv'
        )
        : [];

    const items = useMyListArtwork(savedItems);

    // 실제 요청 중일 때만 로딩 표시
    const isLoading =
        authLoading ||
        (user && currentProfile && loading);

    return (
    <section className="watch-history">
        <div className="watch-history-header">
            <Link to="/my/watchlist" className="watch-history-heading">
                <h2>찜한 콘텐츠</h2>
                <img
                    className="watch-history-arrow"
                    src="/images/icon/DesignSystem_Icon01/icon-chevron_right.svg"
                    alt=""
                />
            </Link>

            <Link
                to="/my/watchlist"
                className="watch-history-more"
                aria-label="전체 찜 목록 보기"
            >
                <img
                    src="/images/icon/DesignSystem_Icon01/icon-more_horiz.svg"
                    alt=""
                />
            </Link>
        </div>

        {isLoading ? (
            <p className="watch-history-message">찜 목록을 불러오는 중입니다.</p>
        ) : !user || !currentProfile ? (
            <p className="watch-history-message">프로필을 먼저 선택해 주세요.</p>
        ) : error ? (
            <p className="watch-history-message">{error}</p>
        ) : !isCurrentList ? (
            <p className="watch-history-message">찜 목록을 불러오지 못했습니다.</p>
        ) : items.length === 0 ? (
            <p className="watch-history-message">아직 찜한 콘텐츠가 없습니다.</p>
        ) : (
            <div className="watch-history-content">
                <div className="watch-history-desktop">
                    <ContentRail title="" items={items} showMore={false} />
                </div>

                <div className="watch-history-mobile">
                    {items.slice(0, 4).map((item) => (
                        <div
                            className="watch-history-mobile-item"
                            key={`${item.media_type}-${item.id}`}
                        >
                            <ContentCard
                                item={item}
                                type={item.media_type || 'movie'}
                                imageType="가로"
                            />
                        </div>
                    ))}
                </div>
            </div>
        )}
    </section>
);
}
