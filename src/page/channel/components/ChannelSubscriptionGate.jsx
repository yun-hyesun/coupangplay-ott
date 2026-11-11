import { createContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase/firebase';
import { useAuthStore } from '../../../store/useAuthStore';

export const ChannelSubscriptionContext = createContext(null);

export const ChannelSubscriptionGate = ({
  planId,
  children,
}) => {
  const navigate = useNavigate();
  const uid = useAuthStore((state) => state.user?.uid);
  const authLoading = useAuthStore((state) => state.loading);

  const [subscription, setSubscription] = useState({
    uid: null,
    planId: null,
    subscribed: false,
    error: '',
  });

  useEffect(() => {
    if (!uid) return;

    let active = true;

    const unsubscribe = onSnapshot(
      doc(db, 'users', uid, 'subscriptions', planId),
      (snapshot) => {
        if (!active) return;

        const data = snapshot.data();

        setSubscription({
          uid,
          planId,
          subscribed: snapshot.exists() && data.status === 'active',
          error: '',
        });
      },
      (error) => {
        if (!active) return;

        console.error('구독 확인 실패:', error);

        setSubscription({
          uid,
          planId,
          subscribed: false,
          error: '구독 정보를 확인하지 못했습니다.',
        });
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid, planId]);

  const isCurrent =
    Boolean(uid) &&
    subscription.uid === uid &&
    subscription.planId === planId;

  const loading =
    authLoading || (Boolean(uid) && !isCurrent);

  const error = isCurrent ? subscription.error : '';
  const isSubscribed = isCurrent && subscription.subscribed;

  const checkoutPath =
    `/my/subscription/checkout?plan=${encodeURIComponent(planId)}`;

  // 배너의 구독하기 버튼만 연결
  const handleClickCapture = (event) => {
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest('.channel-sign')) return;

    event.preventDefault();
    event.stopPropagation();

    if (loading || error) return;

    navigate(
      isSubscribed ? '/my/subscription' : checkoutPath
    );
  };

  return (
    <ChannelSubscriptionContext.Provider
      value={{ isSubscribed, loading, error, checkoutPath }}
    >
      <div onClickCapture={handleClickCapture}>
        {error && <p role="alert">{error}</p>}
        {children}
      </div>
    </ChannelSubscriptionContext.Provider>
  );
};