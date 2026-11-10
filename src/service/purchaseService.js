
import {
    collection,
    doc,
    onSnapshot,
    serverTimestamp,
    setDoc,
    updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

// 포트폴리오 시연용 모의 구매 저장
export const saveMockPurchase = async (uid, product) => {
    if (!uid) throw new Error('로그인이 필요합니다.');

    if (!['movie', 'tv'].includes(product.mediaType) || !product.contentId) {
        throw new Error('구매할 콘텐츠 정보가 올바르지 않습니다.');
    }

    if (!Number.isFinite(product.price) || product.price < 0) {
        throw new Error('구매 가격을 확인해 주세요.');
    }

    const purchaseId = `${product.mediaType}_${product.contentId}`;

    await setDoc(
        doc(db, 'users', uid, 'purchases', purchaseId),
        {
            contentId: String(product.contentId),
            mediaType: product.mediaType,
            title: product.title,
            image: product.image || '',
            genre: product.genre,
            price: product.price,
            info: product.info || '개별 구매 콘텐츠',
            status: 'mock_paid',
            paymentMode: 'mock',
            purchasedAt: serverTimestamp(),
            hidden: false
        }
    );

    return purchaseId;
};

// 로그인한 사용자의 구매내역 실시간 구독
export const subscribeMyPurchases = (uid, onChange, onError) => {
    return onSnapshot(
        collection(db, 'users', uid, 'purchases'),
        (snapshot) => {
            const purchases = snapshot.docs.map((purchaseDoc) => ({
                id: purchaseDoc.id,
                ...purchaseDoc.data()
            }));

            purchases.sort(
                (a, b) =>
                    (b.purchasedAt?.toMillis?.() ?? 0) -
                    (a.purchasedAt?.toMillis?.() ?? 0)
            );

            onChange(purchases);
        },
        onError
    );
};

// 구매내역 숨기기 / 복원
export const updatePurchaseHidden = async (uid, purchaseId, hidden) => {
    if (!uid) {
        throw new Error('로그인이 필요합니다.');
    }

    await updateDoc(
        doc(db, 'users', uid, 'purchases', purchaseId),
        { hidden }
    );
};
