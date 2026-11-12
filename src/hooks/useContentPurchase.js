import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useMovieStore } from '../store/useMovieStore';
import { subscribeMyPurchases } from '../service/purchaseService';

export const useContentPurchase = (type, id, { knownPurchase = false, enabled = true } = {}) => {
  const uid = useAuthStore((state) => state.user?.uid);
  const authLoading = useAuthStore((state) => state.loading);
  const key = `${type}-${id}`;
  const canBuy = useMovieStore((state) => state.purchaseAvailability[key]);
  const onCheckPurchase = useMovieStore((state) => state.onCheckPurchase);
  const [checkedKey, setCheckedKey] = useState(null);
  const [purchaseState, setPurchaseState] = useState(null);
  const valid = Boolean(id) && (type === 'movie' || type === 'tv');
  const isPurchase = knownPurchase || canBuy === true;

  useEffect(() => {
    if (!enabled || !valid || knownPurchase || canBuy !== undefined) return;

    let active = true;
    void onCheckPurchase(type, id).finally(() => {
      if (active) setCheckedKey(key);
    });
    return () => { active = false; };
  }, [enabled, valid, knownPurchase, canBuy, type, id, key, onCheckPurchase]);

  useEffect(() => {
    if (!enabled || !valid || !isPurchase || !uid) return;

    return subscribeMyPurchases(
      uid,
      (items) => setPurchaseState({ uid, items }),
      () => setPurchaseState({ uid, items: [], error: true })
    );
  }, [enabled, valid, isPurchase, uid]);

  const hasPurchaseState = Boolean(uid) && purchaseState?.uid === uid;
  const isPurchased = hasPurchaseState && purchaseState.items.some((item) =>
    item.mediaType === type &&
    String(item.contentId) === String(id) &&
    item.status === 'mock_paid'
  );
  const checkingAvailability = enabled && valid && !knownPurchase && canBuy === undefined;

  return {
    isPurchase,
    needsPurchase: valid && isPurchase && !isPurchased,
    purchasePending: (checkingAvailability && checkedKey !== key) ||
      (valid && isPurchase && (authLoading || (Boolean(uid) && !hasPurchaseState))),
    purchaseError: (checkingAvailability && checkedKey === key) ||
      (valid && isPurchase && hasPurchaseState && Boolean(purchaseState.error)),
    purchasePath: `/purchase/checkout/${type}/${id}`,
  };
};
