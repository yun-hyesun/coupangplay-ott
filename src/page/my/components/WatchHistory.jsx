
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

import { useAuthStore } from '../../../store/useAuthStore';
import { useProfileStore } from '../../../store/useProfileStore';
import { useWatchHistoryStore } from '../../../store/useWatchHistoryStore';
import { ContentRail } from '../../../components/content/ContentRail';
import { ContentCard } from '../../../components/content/ContentCard';

import '../scss/WatchHistory.scss';

export const WatchHistory = () => {
    const user = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.loading);

    const currentProfile = useProfileStore(
        (state) => state.currentProfile
    );

    const history = useWatchHistoryStore(
        (state) => state.history
    );

    const loading = useWatchHistoryStore(
        (state) => state.loading
    );

    const error = useWatchHistoryStore(
        (state) => state.error
    );

    const ownerKey = useWatchHistoryStore(
        (state) => state.ownerKey
    );

    const onLoadHistory = useWatchHistoryStore(
        (state) => state.onLoadHistory
    );

    const onResetHistory = useWatchHistoryStore(
        (state) => state.onResetHistory
    );

    // 계정 또는 프로필 변경 시 시청내역 불러오기
    useEffect(() => {
        onResetHistory();

        if (!authLoading && user?.uid && currentProfile?.id) {
            onLoadHistory();
        }
    }, [
        authLoading,
        user?.uid,
        currentProfile?.id,
        onLoadHistory,
        onResetHistory
    ]);

    const expectedOwnerKey =
        user?.uid && currentProfile?.id
            ? `${user.uid}_${currentProfile.id}`
            : null;

    const isCurrentList =
        expectedOwnerKey !== null &&
        ownerKey === expectedOwnerKey;

    const items = isCurrentList
        ? history
            .filter((item) => !item.completed && item.backdrop_path)
            .map((item) => ({
                ...item,
                resume: true,
                ownerKey: expectedOwnerKey,
            }))
        : [];

    const isLoading =
        authLoading ||
        (user && currentProfile && loading);

    return (
        <section className="watch-history">
            <div className="watch-history-header">
                <Link
                    to="/my/history"
                    className="watch-history-heading"
                >
                    <h2>시청내역</h2>
                    <img
                        className="watch-history-arrow"
                        src="/images/icon/DesignSystem_Icon01/icon-chevron_right.svg"
                        alt=""
                    />
                </Link>

                <Link
                    to="/my/history"
                    className="watch-history-more"
                    aria-label="전체 시청내역 보기"
                >
                    <img
                        src="/images/icon/DesignSystem_Icon01/icon-more_horiz.svg"
                        alt=""
                    />
                </Link>
            </div>

            {isLoading ? (
                <p className="watch-history-message">시청내역을 불러오는 중입니다.</p>
            ) : !user || !currentProfile ? (
                <p className="watch-history-message">프로필을 먼저 선택해 주세요.</p>
            ) : error ? (
                <p className="watch-history-message">{error}</p>
            ) : !isCurrentList ? (
                <p className="watch-history-message">시청내역을 불러오지 못했습니다.</p>
            ) : items.length === 0 ? (
                <p className="watch-history-message">아직 시청한 콘텐츠가 없습니다.</p>
            ) : (
                <div className="watch-history-content">

                    <>
                        {/* PC + 태블릿 : 기존 Swiper 유지 */}
                        <div className="watch-history-desktop">
                            <ContentRail
                                title=""
                                items={items}
                                showMore={false}
                            />
                        </div>

                        {/* 모바일 : 2열 그리드 */}
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
                    </>

                </div>
            )}
        </section>
    );
};
