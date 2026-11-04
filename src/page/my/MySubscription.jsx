
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VoucherModal } from './components/VoucherModal';
import { SubscriptionMenu } from './components/SubscriptionMenu';
import './scss/MySubscription.scss';

// 시연용 이용권 코드
const voucherCodes = {
    '1111111111111': {
        id: 'sports-pass',
        name: '스포츠 패스',
        label: 'SPORTS',
        price: 13900
    },
    '2222222222222': {
        id: 'moa-pass',
        name: 'MOA 패스',
        label: 'MOA',
        price: 9900
    },
    '3333333333333': {
        id: 'jplus-pass',
        name: 'JPLUS 패스',
        label: 'JPLUS',
        price: 9900
    }
};

export const MySubscription = () => {
    const navigate = useNavigate();

    // 구독 정보 저장 (새로고침해도 유지)
    const [subscription, setSubscription] = useState(() => {
        try {
            const saved = localStorage.getItem('mySubscription');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('구독 정보 불러오기 실패:', error);
            return null;
        }
    });

    // 이용권 등록 모달
    const [isVoucherOpen, setIsVoucherOpen] = useState(false);

    // 구독 관리 메뉴
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // 이용권 등록
    const handleRegisterVoucher = (code) => {
        const voucher = voucherCodes[code];

        // 등록되지 않은 코드
        if (!voucher) {
            return false;
        }

        // 다음 결제일 계산
        const today = new Date();
        const nextPayment = new Date(today);

        nextPayment.setMonth(nextPayment.getMonth() + 1);

        // 새 구독 정보
        const newSubscription = {
            ...voucher,
            billingCycle: '1개월마다 결제',
            nextPaymentDate: nextPayment.toLocaleDateString('ko-KR'),
            status: 'active'
        };

        // 구독 상태 변경
        setSubscription(newSubscription);

        // localStorage 저장
        localStorage.setItem(
            'mySubscription',
            JSON.stringify(newSubscription)
        );

        // 모달 및 메뉴 닫기
        setIsVoucherOpen(false);
        setIsMenuOpen(false);

        return true;
    };

    // 구독 해지
    const handleCancelSubscription = () => {
        if (!subscription) return;

        const confirmed = window.confirm(
            `${subscription.name} 구독을 해지하시겠습니까?\n현재는 시연용 기능입니다.`
        );

        if (!confirmed) return;

        // 구독 정보 삭제
        setSubscription(null);
        localStorage.removeItem('mySubscription');

        // 메뉴 닫기
        setIsMenuOpen(false);
    };

    return (
        <main className="my-subscription">
            <div className="my-subscription-inner">

                {/* 페이지 제목 */}
                <div className="subscription-header">
                    <h2>내 구독내역</h2>

                    <button
                        type="button"
                        className="voucher-open-btn"
                        onClick={() => setIsVoucherOpen(true)}
                    >
                        <span aria-hidden="true">+</span>
                        이용권 등록
                    </button>
                </div>

                {/* 구독 중인 경우 */}
                {subscription?.status === 'active' ? (
                    <div className="subscription-list">
                        <div className="subscription-card">

                            {/* 이용권 이미지 영역 */}
                            <div className="subscription-thumbnail">
                                <span className="sports-play">▶</span>
                                <strong>
                                    {subscription.label ||
                                        subscription.name}
                                </strong>
                            </div>

                            {/* 이용권 정보 */}
                            <div className="subscription-info">
                                <h3>{subscription.name}</h3>

                                <p>{subscription.billingCycle}</p>

                                <p>
                                    다음 결제일 {subscription.nextPaymentDate}
                                </p>
                            </div>

                            {/* 구독 관리 메뉴 */}
                            <div className="subscription-menu-wrap">
                                <button
                                    type="button"
                                    className="subscription-more-btn"
                                    onClick={() =>
                                        setIsMenuOpen(!isMenuOpen)
                                    }
                                    aria-label="구독 관리 메뉴"
                                    aria-expanded={isMenuOpen}
                                >
                                    <img src="/images/icon/DesignSystem_Icon04/icon-more_vert.svg" alt="" />
                                </button>

                                {isMenuOpen && (
                                    <SubscriptionMenu
                                        subscriptionName={subscription.name}
                                        onPaymentHistory={() => {
                                            setIsMenuOpen(false);
                                            navigate(
                                                '/my/subscription/payment'
                                            );
                                        }}
                                        onCancel={handleCancelSubscription}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* 구독하지 않은 경우 */
                    <div className="subscription-empty">
                        <p>
                            현재 구독 중인 이용권이 없습니다.
                        </p>

                        <span>
                            이용권을 등록하면 구독 정보를 확인할 수 있습니다.
                        </span>
                    </div>
                )}
            </div>

            {/* 이용권 등록 모달 */}
            {isVoucherOpen && (
                <VoucherModal
                    onClose={() => setIsVoucherOpen(false)}
                    onRegister={handleRegisterVoucher}
                />
            )}
        </main>
    );
};
