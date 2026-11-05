
import { create } from 'zustand';
import {
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    serverTimestamp
} from 'firebase/firestore';

import { auth, db } from '../firebase/firebase';

// 시연용 이용권 코드
const voucherCodes = {
    '1111111111111': {
        id: 'sports-pass',
        name: '스포츠 패스',
        label: 'SPORTS',
        price: 13900
    },
    '2222222222222': {
        id: 'moa-pass',
        name: 'MOA 패스',
        label: 'MOA',
        price: 9900
    },
    '3333333333333': {
        id: 'jplus-pass',
        name: 'JPLUS 패스',
        label: 'JPLUS',
        price: 9900
    }
};

// 계정별 구독 컬렉션
const getSubscriptionsRef = (uid) => {
    return collection(db, 'users', uid, 'subscriptions');
};

// 구독 문서
const getSubscriptionRef = (uid, subscriptionId) => {
    return doc(
        db,
        'users',
        uid,
        'subscriptions',
        subscriptionId
    );
};

export const useSubscriptionStore = create((set, get) => ({
    subscriptions: [],
    loading: false,
    error: null,

    // 구독내역 불러오기
    onLoadSubscriptions: async () => {
        const user = auth.currentUser;

        if (!user) {
            set({
                subscriptions: [],
                loading: false,
                error: '로그인이 필요합니다.'
            });
            return [];
        }

        const uid = user.uid;
        set({ loading: true, error: null, subscriptions: [] });

        try {
            const snapshot = await getDocs(
                getSubscriptionsRef(uid)
            );

            const subscriptions = snapshot.docs.map((item) => ({
                ...item.data(),
                id: item.id
            }));

            // 요청 중 다른 계정으로 변경되었는지 확인
            if (auth.currentUser?.uid !== uid) {
                return [];
            }

            set({
                subscriptions,
                loading: false
            });

            return subscriptions;

        } catch (error) {
            console.error('구독내역 불러오기 오류:', error);

            if (auth.currentUser?.uid === uid) {
                set({
                    loading: false,
                    error: error.message
                });
            }

            return [];
        }
    },

    // 이용권 등록
    onRegisterVoucher: async (code) => {
        const user = auth.currentUser;

        if (!user) {
            set({ error: '로그인이 필요합니다.' });
            return false;
        }

        const voucher = voucherCodes[code];

        if (!voucher) {
            set({ error: '유효하지 않은 이용권 코드입니다.' });
            return false;
        }

        // 이미 등록된 이용권인지 확인
        const alreadySubscribed = get().subscriptions.some(
            (item) => item.id === voucher.id
        );

        if (alreadySubscribed) {
            set({ error: '이미 구독 중인 이용권입니다.' });
            return false;
        }

        const uid = user.uid;

        const today = new Date();
        const nextPayment = new Date(today);
        nextPayment.setMonth(nextPayment.getMonth() + 1);

        const subscriptionData = {
            name: voucher.name,
            label: voucher.label,
            price: voucher.price,
            billingCycle: '1개월마다 결제',
            nextPaymentDate: nextPayment.toLocaleDateString('ko-KR'),
            status: 'active',
            createdAt: serverTimestamp()
        };

        set({ loading: true, error: null });

        try {
            await setDoc(
                getSubscriptionRef(uid, voucher.id),
                subscriptionData
            );

            if (auth.currentUser?.uid !== uid) {
                return false;
            }

            await get().onLoadSubscriptions();

            return true;

        } catch (error) {
            console.error('이용권 등록 오류:', error);

            if (auth.currentUser?.uid === uid) {
                set({
                    loading: false,
                    error: error.message
                });
            }

            return false;
        }
    },

    // 구독 해지
    onCancelSubscription: async (subscriptionId) => {
        const user = auth.currentUser;

        if (!user) {
            set({ error: '로그인이 필요합니다.' });
            return false;
        }

        const uid = user.uid;

        set({ loading: true, error: null });

        try {
            await deleteDoc(
                getSubscriptionRef(uid, subscriptionId)
            );

            if (auth.currentUser?.uid !== uid) {
                return false;
            }

            await get().onLoadSubscriptions();

            return true;

        } catch (error) {
            console.error('구독 해지 오류:', error);

            if (auth.currentUser?.uid === uid) {
                set({
                    loading: false,
                    error: error.message
                });
            }

            return false;
        }
    },

    // 로그아웃 시 초기화
    onResetSubscriptions: () => {
        set({
            subscriptions: [],
            loading: false,
            error: null
        });
    }
}));
