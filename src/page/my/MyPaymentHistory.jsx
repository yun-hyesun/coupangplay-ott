
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useEffect } from 'react';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { subscriptionLogos } from './MySubscriptionData';
import './scss/MySubscription.scss';


export const MyPaymentHistory = () => {
    const navigate = useNavigate();

    const [searchParams] = useSearchParams();
    const planId = searchParams.get('plan');
    const userId = useAuthStore((state) => state.user?.uid);
    const authLoading = useAuthStore((state) => state.loading);
    const { subscriptions, loading, error, onLoadSubscriptions } =
        useSubscriptionStore();

    useEffect(() => {
        if (!authLoading && userId && planId) {
            onLoadSubscriptions();
        }
    }, [authLoading, userId, planId, onLoadSubscriptions]);

    const subscription = userId
        ? subscriptions.find((item) => item.id === planId)
        : undefined;
    const logo = subscriptionLogos[planId];

    const payments = subscription?.paymentHistory ?? [];

    return (
        <main className="my-subscription">
            <div className="my-subscription-inner">
                <div className="subscription-header">
                    <h2>결제 내역</h2>

                    <button
                        type="button"
                        className="voucher-open-btn"
                        onClick={() => navigate('/my/subscription')}
                    >
                        구독내역으로 돌아가기
                    </button>
                </div>

                <div className="subscription-list">
                    {authLoading || (userId && planId && loading) ? (
                        <p>구독 정보를 불러오는 중입니다.</p>
                    ) : !userId ? (
                        <p>결제 내역을 보려면 로그인해 주세요.</p>
                    ) : !planId ? (
                        <p>내 구독내역에서 확인할 패스를 선택해 주세요.</p>
                    ) : error ? (
                        <p role="alert">{error}</p>
                    ) : !subscription ? (
                        <p>선택한 패스의 구독 정보를 찾을 수 없습니다.</p>
                    ) : (
                        <>
                            <div className="subscription-card">
                                <div className="subscription-card-top">
                                    <div className="subscription-thumbnail">
                                        <div className="subscription-play-badge">
                                            <img src="/images/badge-icon.svg" alt="" />
                                        </div>
                                        <div className="subscription-logo">
                                            {logo ? (
                                                <img src={logo} alt="" />
                                            ) : (
                                                <strong>{subscription.label || subscription.name}</strong>
                                            )}
                                        </div>
                                    </div>

                                    <div className="subscription-info">
                                        <h3>{subscription.name}</h3>
                                        <p>{subscription.billingCycle}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <table className="payment-history-table">
                                    <thead>
                                        <tr>
                                            <th scope="col">결제 날짜</th>
                                            <th scope="col">결제 상태</th>
                                            <th scope="col">가격</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.length > 0 ? (
                                            [...payments].reverse().map((payment) => (
                                                <tr key={payment.id}>
                                                    <td>{new Date(payment.paidAt).toLocaleDateString('ko-KR')}</td>
                                                    <td>모의 결제 완료</td>
                                                    <td>{payment.amount.toLocaleString('ko-KR')}원</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={3}>저장된 모의 결제 내역이 없습니다.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                <p className="payment-history-note">
                                    다음 결제일과 구독 상태는 내 구독내역에서 확인할 수 있습니다.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
};
