import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import { MyPasses, MyNotices } from './MySubscriptionData';
import { MyPassCard } from './components/MyPassCard';
import { MySubscriptionButton } from './components/MySubscriptionButton';
import './scss/MySubscriptionUi.scss';

export const MyPassGuide = () => {
    const navigate = useNavigate();
    const user = useAuthStore(s => s.user);
    const authLoading = useAuthStore(s => s.loading);
    const { subscriptions, onLoadSubscriptions, onResetSubscriptions } = useSubscriptionStore();

    useEffect(() => {
        if (authLoading) return;
        if (user) onLoadSubscriptions();
        else onResetSubscriptions();
    }, [user?.uid, authLoading, onLoadSubscriptions, onResetSubscriptions]);
    return <main className="my-pass-page">
        <div className="my-pass-inner">
            <div className="my-pass-page-heading">
                <h1>구독 패스 안내</h1>
                <MySubscriptionButton
                    secondary onClick={() => navigate('/my/subscription')}>
                    내 구독내역
                </MySubscriptionButton>
            </div>

            <p className="my-pass-lead">패스별 콘텐츠와 월 이용료를 확인하고 선택하세요.</p>

            <aside className="my-pass-info">
                <h3>일반 회원 요금 기준 · 와우 회원 전용 특가 별도</h3>
                <p>와우 회원 전용 요금은 와우 멤버십 가입 시 적용됩니다. 멤버십 혜택은 별도입니다.</p>
                <button className="my-pass-text-button"
                    onClick={() => navigate('/my/subscription/membership')}>
                    와우 멤버십 혜택 보기</button></aside>

            <section className="my-pass-grid" aria-label="구독 가능한 패스">
                {MyPasses.map(pass =>
                    <MyPassCard
                        key={pass.id}
                        pass={pass}
                        subscribed={!!user && subscriptions.some(s => s.id === pass.id)}
                        onSelect={p => navigate(`/my/subscription/checkout?plan=${p.id}`)}
                        onManage={() => navigate('/my/subscription')} />)}
            </section>

            <section className="my-pass-notices">
                <h2>구독 전 확인사항</h2>
                <p>패스별 이용료는 부가세가 포함된 금액입니다. 이용 가능한 콘텐츠와 결제·환불 조건은 상품에 따라 다릅니다.</p>
                <div className="my-pass-card">
                    <h3>유의사항</h3>
                    <ul>
                        {MyNotices.map(n => <li key={n}>{n}</li>)}
                    </ul>
                </div>
            </section>
        </div>
    </main>;
};
