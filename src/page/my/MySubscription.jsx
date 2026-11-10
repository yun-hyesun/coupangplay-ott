
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { VoucherModal } from './components/MyVoucherModal';
import { SubscriptionMenu } from './components/MySubscriptionMenu';
import { MyPageHeader } from './components/MyPageHeader';
import { MySubscriptionButton } from './components/MySubscriptionButton';
import { MySubscriptionActions } from './components/MySubscriptionActions';
import { MySubscriptionModal } from './components/MySubscriptionModal';

import { useAuthStore } from '../../store/useAuthStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';

import './scss/MySubscription.scss';
import './scss/MySubscriptionUi.scss';

const subscriptionLogos = {
    'sports-pass': '/images/mypage/pass/sports-logo.svg',
    'moa-pass': '/images/mypage/pass/moa-logo.svg',
    'jplus-pass': '/images/mypage/pass/jplus-logo.svg',
    'ebs-pass': '/images/mypage/pass/ebs-logo.svg',
    'kids-pass': '/images/mypage/pass/kids-logo.svg',
    'paramount-pass': '/images/mypage/pass/paramount-logo.svg',
    'sony-pass': '/images/mypage/pass/sony-logo.svg',
    'crunchyroll-pass': '/images/mypage/pass/crunchyroll-logo.svg',
};

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
        onMockCancelSubscription,
        onMockResumeSubscription,
    } = useSubscriptionStore();

    const [isVoucherOpen, setIsVoucherOpen] = useState(false);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [openCancelId, setOpenCancelId] = useState(null);

    const [cancelTarget, setCancelTarget] = useState(null);
    const [actionBusy, setActionBusy] = useState(false);
    const [actionError, setActionError] = useState('');
    const [cancelDone, setCancelDone] = useState(false);

    // 로그인 계정이 변경되면 구독내역 다시 불러오기
    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            useSubscriptionStore.getState().onResetSubscriptions();
            return;
        }

        onLoadSubscriptions();
    }, [user?.uid, authLoading, onLoadSubscriptions]);

    // 이용권 코드 등록
    const handleRegisterVoucher = async (code) => {
        const success = await onRegisterVoucher(code);

        if (success) {
            setIsVoucherOpen(false);
        }

        return success;
    };

    // 구독 해지 모달 열기
    const handleCancelSubscription = (subscription) => {
        setOpenMenuId(null);
        setActionError('');
        setCancelTarget(subscription);
    };

    // 구독 해지 확정
    const handleConfirmCancel = async () => {
        if (!cancelTarget || actionBusy || !user) return;

        setActionError('');

        // 이미 해지 신청된 이용권은 중복 요청하지 않고 완료 안내만 표시
        if (cancelTarget.status === 'cancel_pending') {
            setCancelTarget(null);
            setCancelDone(true);
            return;
        }

        setActionBusy(true);

        try {
            if (cancelTarget.paymentMode === 'mock') {
                await onMockCancelSubscription(cancelTarget.id);
            } else {
                await MySubscriptionActions({
                    id: cancelTarget.id,
                    action: 'cancel',
                    user,
                });

                await onLoadSubscriptions();
            }

            if (useAuthStore.getState().user?.uid !== user.uid) {
                return;
            }

            setCancelTarget(null);
            setCancelDone(true);
        } catch (err) {
            setActionError(
                err.message || '구독 해지 신청에 실패했습니다.'
            );
        } finally {
            setActionBusy(false);
        }
    };

    // 구독 해지 신청 취소
    const handleResume = async (subscription) => {
        if (actionBusy || !user) return;

        setActionBusy(true);
        setActionError('');

        try {
            if (subscription.paymentMode === 'mock') {
                await onMockResumeSubscription(subscription.id);
            } else {
                await MySubscriptionActions({
                    id: subscription.id,
                    action: 'resume',
                    user,
                });

                await onLoadSubscriptions();
            }

            setOpenCancelId(null);
        } catch (err) {
            setActionError(
                err.message || '해지 신청 취소에 실패했습니다.'
            );
        } finally {
            setActionBusy(false);
        }
    };

    return (
        <main className="my-subscription">
            <div className="my-subscription-inner">

                {/* 페이지 헤더 */}
                <div className="subscription-header">
                    <MyPageHeader title="내 구독내역" />

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

                {/* 구독내역 */}
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
                        {subscriptions.map((subscription) => {
                            const isCancelPending =
                                subscription.status === 'cancel_pending';

                            const isCancelOpen =
                                openCancelId === subscription.id;

                            return (
                                <div
                                    key={subscription.id}
                                    className={`subscription-card ${isCancelPending ? 'cancel-pending' : ''
                                        }`}
                                >
                                    {/* 상단: 로고, 정보, 더보기 */}
                                    <div className="subscription-card-top">

                                        <div className="subscription-thumbnail">
                                            <div className="subscription-play-badge">
                                                <img
                                                    src="/images/badge-icon.svg"
                                                    alt=""
                                                />
                                            </div>

                                            <div className="subscription-logo">
                                                {subscriptionLogos[subscription.id] ? (
                                                    <img
                                                        src={subscriptionLogos[subscription.id]}
                                                        alt={subscription.name}
                                                    />
                                                ) : (
                                                    <strong>
                                                        {subscription.label || subscription.name}
                                                    </strong>
                                                )}
                                            </div>
                                        </div>

                                        <div className="subscription-info">
                                            <h3>{subscription.name}</h3>
                                            <p>{subscription.billingCycle}</p>
                                            <p>
                                                {isCancelPending
                                                    ? `이용 종료일 ${subscription.endDate ||
                                                    subscription.nextPaymentDate
                                                    }`
                                                    : `다음 결제일 ${subscription.nextPaymentDate}`}
                                            </p>
                                        </div>

                                        <div className="subscription-menu-wrap">
                                            <button
                                                type="button"
                                                className="subscription-more-btn"
                                                aria-label={`${subscription.name} 구독 관리`}
                                                aria-expanded={
                                                    openMenuId === subscription.id
                                                }
                                                onClick={() => {
                                                    setOpenMenuId(
                                                        openMenuId === subscription.id
                                                            ? null
                                                            : subscription.id
                                                    );
                                                }}
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
                                                        setOpenMenuId(null);
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

                                    {/* 하단: 해지 신청한 이용권만 표시 */}
                                    {isCancelPending && (
                                        <div className="my-pass-cancel-accordion">

                                            <button
                                                type="button"
                                                className="my-pass-cancel-question"
                                                aria-expanded={isCancelOpen}
                                                aria-controls={`cancel-answer-${subscription.id}`}
                                                onClick={() => {
                                                    setOpenCancelId(
                                                        isCancelOpen
                                                            ? null
                                                            : subscription.id
                                                    );
                                                }}
                                            >
                                                <span>
                                                    구독 해지가 신청되었습니다.
                                                </span>

                                                <span
                                                    className="my-pass-cancel-arrow"
                                                    aria-hidden="true"
                                                >
                                                    <img
                                                        src="/images/icon/DesignSystem_Icon01/icon-chevron_right.svg"
                                                        alt=""
                                                    />
                                                </span>
                                            </button>

                                            <div
                                                id={`cancel-answer-${subscription.id}`}
                                                className={`my-pass-cancel-answer-wrap ${isCancelOpen ? 'open' : ''
                                                    }`}
                                            >
                                                <div className="my-pass-cancel-answer-inner">
                                                    <div className="my-pass-cancel-answer">
                                                        <p>
                                                            {subscription.name}의 구독 해지가
                                                            신청되었습니다. 이용기간 종료일까지
                                                            기존 혜택을 이용할 수 있습니다.
                                                        </p>

                                                        <div className="my-pass-cancel-bottom">
                                                            <span>
                                                                이용 종료일 {
                                                                    subscription.endDate ||
                                                                    subscription.nextPaymentDate
                                                                }
                                                            </span>

                                                            <button
                                                                type="button"
                                                                className="voucher-open-btn"
                                                                disabled={actionBusy}
                                                                onClick={() => handleResume(subscription)}
                                                            >
                                                                해지 신청 취소
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="subscription-empty">
                        <p>현재 구독 중인 이용권이 없습니다.</p>
                        <span>
                            이용권을 등록하면 구독 정보를 확인할 수 있습니다.
                        </span>
                    </div>
                )}

                {(error || actionError) && subscriptions.length > 0 && (
                    <p role="alert">{error || actionError}</p>
                )}
            </div>

            {/* 이용권 등록 모달 */}
            {isVoucherOpen && (
                <VoucherModal
                    onClose={() => setIsVoucherOpen(false)}
                    onRegister={handleRegisterVoucher}
                    registering={loading}
                />
            )}

            {/* 구독 해지 확인 모달 */}
            {cancelTarget && (
                <MySubscriptionModal
                    title="구독 해지"
                    onClose={() => setCancelTarget(null)}
                    busy={actionBusy}
                >
                    <p>
                        <strong>{cancelTarget.name}</strong> 이용권을
                        해지하시겠습니까?
                    </p>

                    <p>
                        구독 해지 후에도 이용기간 종료일까지
                        서비스를 이용할 수 있습니다.
                    </p>

                    {actionError && (
                        <p role="alert">{actionError}</p>
                    )}

                    <div className="my-pass-modal-actions">
                        <MySubscriptionButton
                            secondary
                            disabled={actionBusy}
                            onClick={() => setCancelTarget(null)}
                        >
                            돌아가기
                        </MySubscriptionButton>

                        <MySubscriptionButton
                            disabled={actionBusy}
                            onClick={handleConfirmCancel}
                        >
                            {actionBusy ? '처리 중…' : '구독 해지'}
                        </MySubscriptionButton>
                    </div>
                </MySubscriptionModal>
            )}

            {/* 구독 해지 완료 모달 */}
            {cancelDone && (
                <MySubscriptionModal
                    title="구독 해지가 신청되었습니다"
                    onClose={() => setCancelDone(false)}
                >
                    <p>
                        이용기간 종료일까지 서비스를 이용할 수 있습니다.
                    </p>

                    <div className="my-pass-modal-actions">
                        <MySubscriptionButton
                            onClick={() => setCancelDone(false)}
                        >
                            확인
                        </MySubscriptionButton>
                    </div>
                </MySubscriptionModal>
            )}
        </main>
    );
};
