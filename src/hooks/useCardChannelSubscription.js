import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuthStore } from '../store/useAuthStore';

const channelPasses = {
  'EBS ON': 'ebs-pass',
  SONY: 'sony-pass',
  'Paramount+': 'paramount-pass',
  MOA: 'moa-pass',
  JPlus: 'jplus-pass',
};

export const useCardChannelSubscription = (badges, enabled) => {
  const uid = useAuthStore((state) => state.user?.uid);
  const authLoading = useAuthStore((state) => state.loading);
  const [snapshot, setSnapshot] = useState(null);
  const planIds = badges.map((badge) => channelPasses[badge]).filter(Boolean);
  const hasPass = planIds.length > 0;

  useEffect(() => {
    if (!enabled || !hasPass || !uid) return;

    return onSnapshot(
      collection(db, 'users', uid, 'subscriptions'),
      (result) => {
        const activePasses = result.docs
          .filter((pass) => pass.data().status === 'active')
          .map((pass) => pass.id);
        setSnapshot({ uid, activePasses });
      },
      () => setSnapshot({ uid, activePasses: [], error: true })
    );
  }, [enabled, hasPass, uid]);

  if (!hasPass) return null;

  const accountSnapshot = uid && snapshot?.uid === uid ? snapshot : null;
  return {
    isSubscribed: planIds.some((id) => accountSnapshot?.activePasses.includes(id)),
    loading: authLoading || (Boolean(uid) && !accountSnapshot),
    error: Boolean(accountSnapshot?.error),
    checkoutPath: `/my/subscription/checkout?plan=${encodeURIComponent(planIds[0])}`,
  };
};
