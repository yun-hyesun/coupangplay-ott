
import { create } from 'zustand';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    updateDoc,
    serverTimestamp,
    runTransaction
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
    },
    '4444444444444': {
        id: 'ebs-pass',
        name: 'EBS ON 패스',
        label: 'EBS ON',
        price: 9900
    },
    '5555555555555': {
        id: 'kids-pass',
        name: '키즈+ 패스',
        label: 'KIDS+',
        price: 9900
    },
    '6666666666666': {
        id: 'paramount-pass',
        name: 'Paramount+ 패스',
        label: 'Paramount+',
        price: 9900
    },
    '7777777777777': {
        id: 'sony-pass',
        name: 'SONY PICTURES 패스',
        label: 'SONY PICTURES',
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


    // 구독 패스 모의 결제 및 등록
    onMockSubscribe: async (plan) => {
        const user = auth.currentUser;

        if (!user) {
            set({ error: '로그인이 필요합니다.' });
            return null;
        }

        if (!plan?.id || !plan?.name || !Number.isFinite(plan.price)) {
            set({ error: '올바르지 않은 이용권 정보입니다.' });
            return null;
        }

        const uid = user.uid;

        const today = new Date();
        const nextPayment = new Date(today);
        nextPayment.setMonth(nextPayment.getMonth() + 1);

        const subscriptionData = {
            name: plan.name,
            label: plan.label || plan.name,
            price: plan.price,
            billingCycle: '1개월마다 결제',
            nextPaymentDate: nextPayment.toLocaleDateString('ko-KR'),
            status: 'active',
            paymentMode: 'mock',
            createdAt: serverTimestamp()
        };

        set({ loading: true, error: null });

        try {
            // 동일한 이용권이 이미 등록되어 있는지 확인
            const subscriptionRef = getSubscriptionRef(uid, plan.id);
            const orderId = `MOCK-${plan.id}-${Date.now()}`;

            await runTransaction(db, async (transaction) => {
                const existing = await transaction.get(subscriptionRef);
                const previous = existing.data();

                if (previous?.status === 'active') {
                    throw new Error('이미 구독 중인 이용권입니다.');
                }

                transaction.set(subscriptionRef, {
                    ...subscriptionData,
                    paymentHistory: [
                        ...(previous?.paymentHistory ?? []),
                        {
                            id: orderId,
                            paidAt: today.toISOString(),
                            amount: plan.price,
                            status: 'mock_paid',
                        },
                    ],
                });
            });

            if (auth.currentUser?.uid !== uid) {
                return null;
            }

            await get().onLoadSubscriptions();

            return {
                orderId,
                status: 'mock_paid',
                planId: plan.id
            };

        } catch (error) {
            console.error('모의 구독 등록 오류:', error);
            set({ error: error.message, loading: false });
            throw error;
        }
    },


    // 모의 구독 해지 신청
    onMockCancelSubscription: async (subscriptionId) => {
        const user = auth.currentUser;

        if (!user) {
            throw new Error('로그인이 필요합니다.');
        }

        const uid = user.uid;

        set({ loading: true, error: null });

        try {
            const subscriptionRef = getSubscriptionRef(
                uid,
                subscriptionId
            );

            const snapshot = await getDoc(subscriptionRef);

            if (!snapshot.exists()) {
                throw new Error('구독 정보를 찾을 수 없습니다.');
            }

            const subscription = snapshot.data();

            if (subscription.paymentMode !== 'mock') {
                throw new Error('시연용 구독만 이 기능을 사용할 수 있습니다.');
            }

            if (subscription.status !== 'active') {
                throw new Error('현재 해지 신청할 수 없는 구독입니다.');
            }

            // 문서를 삭제하지 않고 상태만 변경
            await updateDoc(subscriptionRef, {
                status: 'cancel_pending',
                endDate: subscription.nextPaymentDate,
                canceledAt: serverTimestamp()
            });

            if (auth.currentUser?.uid !== uid) {
                return false;
            }

            await get().onLoadSubscriptions();

            return true;

        } catch (error) {
            set({ loading: false, error: error.message });
            throw error;
        }
    },

    // 모의 구독 해지 신청 취소
    onMockResumeSubscription: async (subscriptionId) => {
        const user = auth.currentUser;

        if (!user) {
            throw new Error('로그인이 필요합니다.');
        }

        const uid = user.uid;

        set({ loading: true, error: null });

        try {
            const subscriptionRef = getSubscriptionRef(
                uid,
                subscriptionId
            );

            const snapshot = await getDoc(subscriptionRef);

            if (!snapshot.exists()) {
                throw new Error('구독 정보를 찾을 수 없습니다.');
            }

            const subscription = snapshot.data();

            if (
                subscription.paymentMode !== 'mock' ||
                subscription.status !== 'cancel_pending'
            ) {
                throw new Error('해지 신청을 취소할 수 없는 구독입니다.');
            }

            await updateDoc(subscriptionRef, {
                status: 'active',
                endDate: null,
                canceledAt: null
            });

            if (auth.currentUser?.uid !== uid) {
                return false;
            }

            await get().onLoadSubscriptions();

            return true;

        } catch (error) {
            set({ loading: false, error: error.message });
            throw error;
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
            createdAt: serverTimestamp(),
            paymentMode: 'mock',
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
