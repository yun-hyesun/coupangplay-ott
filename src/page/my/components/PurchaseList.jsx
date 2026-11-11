
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../../store/useAuthStore'
import { subscribeMyPurchases } from '../../../service/purchaseService'
import '../scss/PurchaseList.scss'

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
    const visiblePurchases = purchaseList.filter(
        (item) => !item.hidden
    );

    return (
        <section className="purchase-list">
            <div className="purchase-list-header">
                <Link
                    to="/my/purchases"
                    className="purchase-list-heading"
                >
                    <h2>개별 구매</h2>
                    <img
                        src="/images/icon/DesignSystem_Icon01/icon-chevron_right.svg"
                        alt=""
                        className="purchase-list-arrow"
                    />
                </Link>

                <Link
                    to="/my/purchases"
                    className="purchase-list-more"
                    aria-label="전체 구매 내역 보기"
                >
                    <img
                        src="/images/icon/DesignSystem_Icon01/icon-more_horiz.svg"
                        alt=""
                    />
                </Link>
            </div>

            {purchaseError && (
                <p role="alert">{purchaseError}</p>
            )}

            {visiblePurchases.length === 0 ? (
                <p className="purchase-list-message">
                    구매한 콘텐츠가 없습니다.
                </p>
            ) : (
                <div className="purchase-list-grid">
                    {visiblePurchases.slice(0, 5).map((item) => (
                        <Link
                            key={item.id}
                            to={`/detail/${item.mediaType}/${item.contentId}`}
                            className="purchase-list-item"
                        >
                            <div className="purchase-list-thumbnail">
                                {item.image ? (
                                    <img
                                        src={item.image}
                                        alt={item.title}
                                    />
                                ) : (
                                    <span>이미지 없음</span>
                                )}
                            </div>

                            <p className="purchase-list-title">
                                {item.title}
                            </p>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    )
}
