
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { MyPasses, MyMembership, MyMoney } from './MySubscriptionData';
import { MySubscriptionButton } from './components/MySubscriptionButton';
import './scss/MySubscriptionUi.scss';

const passHomePaths = {
    'ebs-pass': '/channel/ebs',
    'sony-pass': '/channel/sony',
    'paramount-pass': '/channel/paramount',
    'moa-pass': '/channel/moa',
    'jplus-pass': '/channel/jplus',
    'sports-pass': '/sports',
    'kids-pass': '/kids',
};

export const MySubscriptionCheckout = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();

    const user = useAuthStore((state) => state.user);
    const authLoading = useAuthStore((state) => state.loading);

    const onMockSubscribe = useSubscriptionStore(
        (state) => state.onMockSubscribe
    );

    // 선택한 구독 패스
    const plan = [...MyPasses, MyMembership].find(
        (item) => item.id === params.get('plan')
    );

    const channelHomePath = passHomePaths[plan?.id];

    const [agreed, setAgreed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [order, setOrder] = useState(null);

    const pending = useRef(false);

    // 패스 또는 로그인 계정 변경 시 초기화
    useEffect(() => {
        setAgreed(false);
        setError('');
        setOrder(null);
    }, [plan?.id, user?.uid]);

    // 모의 구독 결제
    const submit = async () => {
        if (
            !plan ||
            !agreed ||
            pending.current ||
            authLoading
        ) {
            return;
        }

        if (!user) {
            navigate('/login');
            return;
        }

        pending.current = true;
        setBusy(true);
        setError('');

        try {
            const uid = user.uid;

            // Firebase에 모의 구독 등록
            const result = await onMockSubscribe(plan);

            // 로그인 계정이 변경되지 않았을 때만 완료 처리
            if (
                result &&
                useAuthStore.getState().user?.uid === uid
            ) {
                setOrder(result);
            }

        } catch (err) {
            setError(
                err.message || '구독 등록에 실패했습니다.'
            );
        } finally {
            pending.current = false;
            setBusy(false);
        }
    };

    // 패스를 선택하지 않은 경우
    if (!plan) {
        return (
            <main className="my-pass-page">
                <div className="my-pass-checkout">
                    <h1>패스를 먼저 선택해 주세요</h1>

                    <MySubscriptionButton
                        onClick={() =>
                            navigate('/my/subscription/passes')
                        }
                    >
                        구독 패스 안내
                    </MySubscriptionButton>
                </div>
            </main>
        );
    }

    return (
        <main className="my-pass-page">
            <div className={`my-pass-checkout${order ? ' my-pass-checkout--complete' : ''}`}>

                {order ? (
                    <section
                        className="my-pass-complete"
                        aria-labelledby="subscription-complete-title"
                    >
                        <h1 id="subscription-complete-title">구독이 완료되었습니다</h1>
                        <h2>{plan.name}</h2>
                        <p>시연용 주문 번호 {order.orderId}</p>
                        <p>실제 결제는 발생하지 않았습니다.</p>

                        <div className="my-pass-complete__actions">
                            <MySubscriptionButton
                                secondary
                                onClick={() => navigate('/my/subscription', { replace: true })}
                            >
                                내 구독내역 확인하기
                            </MySubscriptionButton>

                            {channelHomePath && (
                                <MySubscriptionButton
                                    onClick={() => navigate(channelHomePath, { replace: true })}
                                >
                                    채널 홈으로 이동하기
                                </MySubscriptionButton>
                            )}
                        </div>
                    </section>
                ) : (
                    // 구독 결제 정보 화면
                    <>
                        <h1>결제 정보를 확인해주세요</h1>

                        <p>
                            {plan.name} 정기 결제에 사용할
                            정보를 확인해주세요.
                        </p>

                        {/* 결제 금액 */}
                        <section className="my-pass-info">
                            <h2>
                                {new Date().toLocaleDateString('ko-KR')} 결제
                            </h2>

                            <p>최종 결제 금액</p>

                            <p className="my-pass-price">
                                {MyMoney(plan.price)} / 1개월마다 결제
                            </p>

                            <p>결제 수단</p>
                        </section>

                        {/* 결제 수단 */}
                        <section>
                            <h2>결제 수단</h2>

                            <div className="my-pass-payment-method">
                                쿠페이
                            </div>
                        </section>

                        {/* 구매 동의 */}
                        <label className="my-pass-agreement">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                disabled={busy}
                            />

                            {/* 원형 체크 표시 */}
                            <span
                                className={`my-pass-agreement-check ${agreed ? 'active' : ''}`}
                                aria-hidden="true"
                            >
                                {agreed && <span />}
                            </span>

                            <span>
                                매월 자동결제 및{' '}
                                <a
                                    href="/paid-terms"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    유료서비스 이용약관
                                </a>
                                에 동의합니다.
                            </span>
                        </label>

                        <p className="my-pass-caption">
                            본 페이지는 포트폴리오 시연용이며
                            실제 결제 및 자동결제가 발생하지 않습니다.
                        </p>

                        <p className="my-pass-caption">
                            패스 이용 조건과 환불 관련 세부사항은
                            구독 패스 안내를 확인해주세요.
                        </p>

                        {/* 오류 메시지 */}
                        {error && (
                            <p role="alert">{error}</p>
                        )}

                        {/* 구독 버튼 */}
                        <MySubscriptionButton
                            disabled={
                                !agreed ||
                                busy ||
                                authLoading
                            }
                            onClick={submit}
                        >
                            {busy
                                ? '구독 처리 중…'
                                : user
                                    ? '동의하고 구독하기'
                                    : '로그인 후 구독하기'}
                        </MySubscriptionButton>

                        {/* 이전 페이지 */}
                        <MySubscriptionButton
                            secondary
                            disabled={busy}
                            onClick={() =>
                                navigate('/my/subscription/passes')
                            }
                        >
                            구독 패스 안내로 돌아가기
                        </MySubscriptionButton>
                    </>
                )}

            </div>
        </main>
    );
};
