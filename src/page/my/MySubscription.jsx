
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { VoucherModal } from './components/VoucherModal';
import { SubscriptionMenu } from './components/SubscriptionMenu';

import { useAuthStore } from '../../store/useAuthStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';

import './scss/MySubscription.scss';

export const MySubscription = () => {
    const navigate = useNavigate();

    const user = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.loading);

    const {
        subscriptions,
        loading,
        error,
        onLoadSubscriptions,
        onRegisterVoucher,
        onCancelSubscription
    } = useSubscriptionStore();

    const [isVoucherOpen, setIsVoucherOpen] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);

    // 로그인 계정이 변경되면 구독내역 다시 불러오기
    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            useSubscriptionStore.getState().onResetSubscriptions();
            return;
        }

        onLoadSubscriptions();
    }, [user?.uid, authLoading, onLoadSubscriptions]);

    // 이용권 등록
    const handleRegisterVoucher = async (code) => {
        const success = await onRegisterVoucher(code);

        if (success) {
            setIsVoucherOpen(false);
        }

        return success;
    };

    // 구독 해지
    const handleCancelSubscription = async (subscription) => {
        const confirmed = window.confirm(
            `${subscription.name} 구독을 해지하시겠습니까?\n현재는 시연용 기능입니다.`
        );

        if (!confirmed) return;

        const success = await onCancelSubscription(subscription.id);

        if (success) {
            setOpenMenuId(null);
        }
    };

    return (
        <main className="my-subscription">
            <div className="my-subscription-inner">

                <div className="subscription-header">
                    <h2>내 구독내역</h2>

                    <button
                        type="button"
                        className="voucher-open-btn"
                        onClick={() => setIsVoucherOpen(true)}
                        disabled={!user || loading || authLoading}
                    >
                        <span aria-hidden="true">+</span>
                        이용권 등록
                    </button>
                </div>

                {authLoading ? (
                    <div className="subscription-empty">
                        <p>로그인 상태를 확인하고 있습니다.</p>
                    </div>
                ) : !user ? (
                    <div className="subscription-empty">
                        <p>로그인이 필요합니다.</p>
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                        >
                            로그인하기
                        </button>
                    </div>
                ) : loading ? (
                    <div className="subscription-empty">
                        <p>구독내역을 불러오는 중입니다.</p>
                    </div>
                ) : error && subscriptions.length === 0 ? (
                    <div className="subscription-empty">
                        <p>{error}</p>
                        <button
                            type="button"
                            onClick={onLoadSubscriptions}
                        >
                            다시 시도
                        </button>
                    </div>
                ) : subscriptions.length > 0 ? (
                    <div className="subscription-list">

                        {subscriptions.map((subscription) => (
                            <div
                                className="subscription-card"
                                key={subscription.id}
                            >
                                <div className="subscription-thumbnail">
                                    <span className="sports-play">▶</span>
                                    <strong>
                                        {subscription.label || subscription.name}
                                    </strong>
                                </div>

                                <div className="subscription-info">
                                    <h3>{subscription.name}</h3>
                                    <p>{subscription.billingCycle}</p>
                                    <p>
                                        다음 결제일 {subscription.nextPaymentDate}
                                    </p>
                                </div>

                                <div className="subscription-menu-wrap">
                                    <button
                                        type="button"
                                        className="subscription-more-btn"
                                        onClick={() => {
                                            setOpenMenuId(
                                                openMenuId === subscription.id
                                                    ? null
                                                    : subscription.id
                                            );
                                        }}
                                        aria-label={`${subscription.name} 구독 관리`}
                                        aria-expanded={openMenuId === subscription.id}
                                    >
                                        <img
                                            src="/images/icon/DesignSystem_Icon01/icon-more_horiz.svg"
                                            alt=""
                                        />
                                    </button>

                                    {openMenuId === subscription.id && (
                                        <SubscriptionMenu
                                            subscriptionName={subscription.name}
                                            onPaymentHistory={() => {
                                                navigate(
                                                    `/my/subscription/payment?plan=${subscription.id}`
                                                );
                                            }}
                                            onCancel={() =>
                                                handleCancelSubscription(subscription)
                                            }
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="subscription-empty">
                        <p>현재 구독 중인 이용권이 없습니다.</p>
                        <span>
                            이용권을 등록하면 구독 정보를 확인할 수 있습니다.
                        </span>
                    </div>
                )}
            </div>

            {isVoucherOpen && (
                <VoucherModal
                    onClose={() => setIsVoucherOpen(false)}
                    onRegister={handleRegisterVoucher}
                    registering={loading}
                />
            )}
        </main>
    );
};
