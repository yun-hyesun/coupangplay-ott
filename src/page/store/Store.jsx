import { useEffect, useMemo, useState } from 'react';
import { StoreMarvelSection } from './components/StoreMarvelSection';
import { StoreChannelPasses } from '../category/components/StoreChannelPasses';
import { CategoryMenu } from '../../components/content/CategoryMenu';
import { MainBanner } from '../../components/content/MainBanner';
import { ContentRail } from '../../components/content/ContentRail';
import { useAuthStore } from '../../store/useAuthStore';
import { useMovieStore } from '../../store/useMovieStore';
import { subscribeMyPurchases } from '../../service/purchaseService';
import './scss/Store.scss';

export const Store = () => {
  const uid = useAuthStore((state) => state.user?.uid);

  const contentDetails = useMovieStore(
    (state) => state.contentDetails
  );
  const onFetchContentDetail = useMovieStore(
    (state) => state.onFetchContentDetail
  );

  const [purchaseState, setPurchaseState] = useState({
    uid: null,
    items: [],
    error: '',
  });

  // 계정별 구매내역 실시간 조회
  useEffect(() => {
    if (!uid) return;

    let active = true;

    const unsubscribe = subscribeMyPurchases(
      uid,
      (items) => {
        if (active) {
          setPurchaseState({ uid, items, error: '' });
        }
      },
      (error) => {
        if (!active) return;

        console.error('구매내역 조회 실패:', error);

        setPurchaseState({
          uid,
          items: [],
          error: '구매한 콘텐츠를 불러오지 못했습니다.',
        });
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [uid]);

  // 구매 완료된 작품만 선택
  const purchases = useMemo(() => {
    if (!uid || purchaseState.uid !== uid) return [];

    return purchaseState.items.filter(
      (purchase) =>
        purchase.status === 'mock_paid' &&
        !purchase.hidden &&
        purchase.contentId &&
        ['movie', 'tv'].includes(purchase.mediaType)
    );
  }, [uid, purchaseState]);

  // 기존 조회 함수 재사용: 캐시에 있으면 추가 요청하지 않음
  useEffect(() => {
    purchases.forEach((purchase) => {
      onFetchContentDetail(
        purchase.mediaType,
        purchase.contentId
      );
    });
  }, [purchases, onFetchContentDetail]);

  // 기존 상세 데이터의 가로 이미지와 작품 정보 사용
  const purchasedItems = purchases
    .map((purchase) => {
      const key = `${purchase.mediaType}-${purchase.contentId}`;
      const content = contentDetails[key];

      return content?.backdrop_path
        ? { ...content, isPurchase: true }
        : null;
    })
    .filter(Boolean);

  return (
    <main className="store-page">
      <MainBanner type="purchase" />

      <CategoryMenu section="store" />

      {/* 구매한 콘텐츠: 첫 번째 가로 레일 */}
      {purchasedItems.length > 0 && (
        <ContentRail
          title="구매한 콘텐츠"
          items={purchasedItems}
          layout="horizontal"
          showMore={false}
          limit={purchasedItems.length}
        />
      )}

      {uid &&
        purchaseState.uid === uid &&
        purchaseState.error && (
          <p role="alert">{purchaseState.error}</p>
        )}

      <ContentRail
        railKey="store-ranking"
        showMore={false}
      />

      <ContentRail railKey="store-latest" />

      <ContentRail railKey="store-action-adventure" />

      <StoreChannelPasses />

      <StoreMarvelSection />

      <ContentRail railKey="store-family-animation" />
    </main>
  );
};