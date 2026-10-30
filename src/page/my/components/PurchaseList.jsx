import React from 'react'
import { Link } from 'react-router-dom'
import '../scss/PurchaseList.scss'

export const PurchaseList = () => {
    // 추후 Firebase 구매 내역 데이터 연결 예정
    const purchaseList = [];

    return (
        <section className="purchase-list">
            <div className="purchase-list-header">
                <Link
                    to="/my/purchases"
                    className="purchase-list-heading"
                >
                    <h2>개별 구매</h2>
                    <img
                        src="/images/mypage/icon-arrow_right.png"
                        alt=""
                        className="purchase-list-arrow"
                    />
                </Link>

                <Link
                    to="/my/purchases"
                    className="purchase-list-more"
                    aria-label="전체 구매 내역 보기"
                >
                    •••
                </Link>
            </div>

            {purchaseList.length === 0 ? (
                <p className="purchase-list-message">
                    구매한 콘텐츠가 없습니다.
                </p>
            ) : (
                <div className="purchase-list-grid">
                    {purchaseList.slice(0, 5).map((item) => (
                        <Link
                            key={item.id}
                            to={`/detail/${item.media_type}/${item.id}`}
                            className="purchase-list-item"
                        >
                            <div className="purchase-list-thumbnail">
                                {item.backdrop_path ? (
                                    <img
                                        src={`https://image.tmdb.org/t/p/w780${item.backdrop_path}`}
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
