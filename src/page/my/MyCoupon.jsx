
import { useState } from 'react';
// [추가] 공통 페이지 헤더
import { MyPageHeader } from './components/MyPageHeader';
import './scss/MyCoupon.scss';

const coupons = [
  {
    id: 1,
    discount: 4900,
    name: '더 드라마 소장 전용',
    expireDate: '2026년 12월 27일',
    status: 'available',
  },
  {
    id: 2,
    discount: 3000,
    name: '영화 개별구매 전용',
    expireDate: '2026년 12월 15일',
    status: 'available',
  },
  {
    id: 3,
    discount: 2000,
    name: '스포츠 패스 전용',
    expireDate: '2026년 11월 30일',
    status: 'available',
  },
  {
    id: 4,
    discount: 5000,
    name: '첫 구매 고객 전용',
    expireDate: '2026년 10월 27일',
    status: 'expired',
  },
];

export const MyCoupon = () => {
  const [activeTab, setActiveTab] = useState('available');
  const [selectedCoupon, setSelectedCoupon] = useState(null);

  const filteredCoupons = coupons.filter(
    (coupon) => coupon.status === activeTab
  );

  return (
    <main className="my-coupon">
      <div className="my-coupon__inner">
        <header className="my-coupon__header">
          <MyPageHeader title="할인 쿠폰" />
        </header>

        <div className="my-coupon__tabs" role="tablist" aria-label="쿠폰 상태">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'available'}
            className={activeTab === 'available' ? 'active' : ''}
            onClick={() => setActiveTab('available')}
          >
            사용 가능
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'expired'}
            className={activeTab === 'expired' ? 'active' : ''}
            onClick={() => setActiveTab('expired')}
          >
            기간 만료
          </button>
        </div>

        {activeTab === 'available' && (
          <h3 className="my-coupon__count">
            보유한 쿠폰 <span>{filteredCoupons.length}</span>
          </h3>
        )}

        <div className="my-coupon__list">
          {filteredCoupons.map((coupon) => (
            <article
              className={`coupon-card ${
                coupon.status === 'expired' ? 'expired' : ''
              }`}
              key={coupon.id}
            >
              <div className="coupon-card__content">
                <p className="coupon-card__discount">
                  <strong>{coupon.discount.toLocaleString()}</strong>
                  <span> 원 할인</span>
                </p>

                <p className="coupon-card__name">{coupon.name}</p>

                <p className="coupon-card__date">
                  {coupon.status === 'expired'
                    ? '기간 만료'
                    : `${coupon.expireDate} 만료`}
                </p>
              </div>

              <button
                className="coupon-card__detail"
                type="button"
                onClick={() => setSelectedCoupon(coupon)}
              >
                자세히 보기
              </button>
            </article>
          ))}
        </div>
      </div>

      {selectedCoupon && (
        <div
          className="coupon-modal"
          onClick={() => setSelectedCoupon(null)}
        >
          <div
            className="coupon-modal__content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coupon-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="coupon-modal-title">쿠폰 상세 정보</h3>
            <p>{selectedCoupon.name}</p>
            <strong>
              {selectedCoupon.discount.toLocaleString()}원 할인
            </strong>
            <p>
              {selectedCoupon.status === 'expired'
                ? '기간이 만료된 쿠폰입니다.'
                : `${selectedCoupon.expireDate} 만료`}
            </p>
            <button
              type="button"
              onClick={() => setSelectedCoupon(null)}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
