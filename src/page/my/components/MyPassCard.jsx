import React from 'react';
import { MyMoney } from '../MySubscriptionData';
import { MySubscriptionButton } from './MySubscriptionButton';
export const MyPassCard=({pass,subscribed,onSelect,onManage})=>(
 <article className="my-pass-card"><h3>{pass.name}</h3><p className="my-pass-price">월 {MyMoney(pass.price)}</p>
 <p className="my-pass-caption">와우 회원 월 {MyMoney(pass.wowPrice)}<br/>{pass.description}</p>
 <MySubscriptionButton secondary={subscribed} onClick={()=>subscribed?onManage(pass):onSelect(pass)}>{subscribed?'구독 관리':'선택하기'}</MySubscriptionButton></article>
);
