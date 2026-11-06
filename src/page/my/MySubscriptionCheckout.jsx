import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { MyPasses, MyMembership, MyMoney } from './MySubscriptionData';
import { MySubscriptionButton } from './components/MySubscriptionButton';
import { MySubscriptionPayment } from './components/MySubscriptionPayment';
import './scss/MySubscriptionUi.scss';
export const MySubscriptionCheckout = () => {
    const [params] = useSearchParams(); const navigate = useNavigate(); const user = useAuthStore(s => s.user); const authLoading = useAuthStore(s => s.loading);
    const plan = [...MyPasses, MyMembership].find(p => p.id === params.get('plan'));
    const [agreed, setAgreed] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [order, setOrder] = useState(null);
    const pending = useRef(false), controller = useRef(null);
    useEffect(() => { setAgreed(false); setError(''); setOrder(null); return () => controller.current?.abort(); }, [plan?.id, user?.uid]);
    const submit = async () => {
        if (!plan || !agreed || pending.current || authLoading) return; if (!user) { navigate('/login'); return; }
        pending.current = true; setBusy(true); setError(''); controller.current = new AbortController();
        try { const uid = user.uid; const result = await MySubscriptionPayment({ idToken: await user.getIdToken(), planId: plan.id, signal: controller.current.signal }); if (useAuthStore.getState().user?.uid === uid) setOrder(result); }
        catch (e) { if (e.name !== 'AbortError') setError(e.message); } finally { pending.current = false; setBusy(false); }
    };
    if (!plan) return <main className="my-pass-page"><div className="my-pass-checkout"><h1>패스를 먼저 선택해 주세요</h1><MySubscriptionButton onClick={() => navigate('/my/subscription/passes')}>구독 패스 안내</MySubscriptionButton></div></main>;
    return <main className="my-pass-page"><div className="my-pass-checkout">{order ? <>
        <h1>구독이 완료되었습니다</h1><div className="my-pass-info"><h2>{plan.name}</h2><p>주문 번호 {order.orderId}</p></div>
        <MySubscriptionButton onClick={() => navigate('/my/subscription')}>내 구독내역 확인하기</MySubscriptionButton></> : <>
        <h1>결제 정보를 확인해주세요</h1><p>{plan.name} 정기 결제에 사용할 정보를 확인해주세요.</p>
        <section className="my-pass-info"><h2>{new Date().toLocaleDateString('ko-KR')} 결제</h2><p>최종 결제 금액</p><p className="my-pass-price">{MyMoney(plan.price)} / 1개월마다 결제</p><p>결제 수단</p></section>
        <section><h2>결제 수단</h2><div className="my-pass-payment-method">쿠페이</div></section>
        <label className="my-pass-agreement"><input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} disabled={busy} /><span>매월 자동결제 및 <a href="/paid-terms" target="_blank" rel="noreferrer">유료서비스 이용약관</a>에 동의합니다.</span></label>
        <p className="my-pass-caption">결제 후 패스 전용 혜택을 이용하지 않은 경우, 이용요금을 결제한 해당 이용기간 내 청약철회가 가능합니다.</p>
        <p className="my-pass-caption">패스 이용 조건과 환불 관련 세부사항은 구독 패스 안내를 확인해주세요.</p>
        {error && <p role="alert">{error}</p>}
        <MySubscriptionButton disabled={!agreed || busy || authLoading} onClick={submit}>{busy ? '결제 확인 중…' : user ? '동의하고 구독하기' : '로그인 후 구독하기'}</MySubscriptionButton>
        <MySubscriptionButton secondary disabled={busy} onClick={() => navigate('/my/subscription/passes')}>구독 패스 안내로 돌아가기</MySubscriptionButton>
    </>}</div></main>;
};
