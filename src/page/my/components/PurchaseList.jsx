
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../../store/useAuthStore'
import { subscribeMyPurchases } from '../../../service/purchaseService'
import '../scss/PurchaseList.scss'
import { ContentRail } from '../../../components/content/ContentRail';
import { ContentCard } from '../../../components/content/ContentCard';
import { useMyListArtwork } from './useMyListArtwork';
import '../scss/WatchHistory.scss';

export const PurchaseList = () => {
    // 로그인한 사용자 정보
    const user = useAuthStore((state) => state.user);

    // 구매 내역 저장
    const [purchaseList, setPurchaseList] = useState([]);

    // 데이터 불러오기 오류
    const [purchaseError, setPurchaseError] = useState('');

    // Firebase 구매 내역 실시간 연결
    useEffect(() => {
        setPurchaseList([]);
        setPurchaseError('');

        if (!user?.uid) return;

        const unsubscribe = subscribeMyPurchases(
            user.uid,
            setPurchaseList,
            (error) => {
                console.error('구매내역 불러오기 오류:', error);
                setPurchaseError('구매내역을 불러오지 못했습니다.');
            }
        );

        return unsubscribe;
    }, [user?.uid]);

    // 숨기지 않은 구매 콘텐츠만 표시
    const purchasedItems = purchaseList
    .filter((purchase) => !purchase.hidden && purchase.contentId)
    .map((purchase) => {
        const image = typeof purchase.image === 'string'
            ? purchase.image.trim()
            : '';

        const posterPath = /^\/[^/]/.test(image)
            ? image
            : image.match(
                /^(?:https?:)?\/\/image\.tmdb\.org\/t\/p\/[^/]+(\/[^?#]+)/i
            )?.[1];

        return {
            id: purchase.contentId,
            media_type: purchase.mediaType,
            title: purchase.title,
            poster_path: purchase.poster_path || posterPath,
            backdrop_path: purchase.backdrop_path,
            logo_path: purchase.logo_path,
        };
    });

    const visiblePurchases = useMyListArtwork(purchasedItems);

    return (
        <section className="watch-history">
            <div className="watch-history-header">
                <Link to="/my/purchases" className="watch-history-heading">
                    <h2>개별 구매</h2>
                    <img
                        className="watch-history-arrow"
                        src="/images/icon/DesignSystem_Icon01/icon-chevron_right.svg"
                        alt=""
                    />
                </Link>

                <Link
                    to="/my/purchases"
                    className="watch-history-more"
                    aria-label="전체 구매 내역 보기"
                >
                    <img
                        src="/images/icon/DesignSystem_Icon01/icon-more_horiz.svg"
                        alt=""
                    />
                </Link>
            </div>

            {purchaseError ? (
                <p className="watch-history-message" role="alert">{purchaseError}</p>
            ) : visiblePurchases.length === 0 ? (
                <p className="watch-history-message">구매한 콘텐츠가 없습니다.</p>
            ) : (
                <div className="watch-history-content">
                    <div className="watch-history-desktop">
                        <ContentRail
                            title=""
                            items={visiblePurchases}
                            showMore={false}
                        />
                    </div>

                    <div className="watch-history-mobile">
                        {visiblePurchases.slice(0, 4).map((item) => (
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
