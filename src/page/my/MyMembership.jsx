import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MySubscriptionButton } from './components/MySubscriptionButton';
import { MySubscriptionFaq } from './components/MySubscriptionFaq';
import poster from './assets/MyMembershipPoster.png';
import './scss/MySubscriptionUi.scss';
export const MyMembership = () => {
    const navigate = useNavigate(); return <main className="my-pass-page"><div className="my-pass-inner my-membership">
        <section><h1>와우 멤버십 가입</h1><h2>WOW! 와우 멤버십 시작하면<br />쿠팡플레이 특별 혜택</h2></section>
        <section><h2>이번주 인기작 TOP 6</h2><div className="my-membership-posters">{['직장인들', '너 말고 다른 연애', '사랑이 온다', '코치', '무한도전', '해리포터와 마법사의 돌'].map((title, i) => <div key={title} className={`my-membership-poster my-membership-poster-${i}`}><img src={poster} alt={title} /></div>)}</div></section>
        <div><p>언제든 해지 가능</p><MySubscriptionButton onClick={() => navigate('/my/subscription/checkout?plan=wow-membership')}>결제하고 시작하기</MySubscriptionButton><p className="my-pass-caption">와우 멤버십 이용료로 첫 달 7,890원 결제에 동의합니다.</p></div>
        <section className="my-pass-info"><h2>쿠팡의 다양한 쇼핑혜택도 함께 누리세요</h2><h3>새벽 도착</h3><p>로켓와우, 로켓프레시 상품 주문건</p></section>
        <MySubscriptionFaq />
        <p className="my-pass-caption">• 와우 멤버십 이용약관에 동의합니다.<br />• 월 7,890원의 결제와 서비스 이용에 동의합니다.<br />• 명시하지 않은 혜택은 특정 상품 및 서비스 제공 수량·조건에 따라 제한 또는 변경될 수 있습니다.</p>
        <MySubscriptionButton onClick={() => navigate('/my/subscription/checkout?plan=wow-membership')}>결제하고 시작하기</MySubscriptionButton>
    </div></main>
};
