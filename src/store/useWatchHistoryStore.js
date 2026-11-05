
import { create } from 'zustand';
import {
    collection,
    doc,
    getDocs,
    setDoc,
    serverTimestamp
} from 'firebase/firestore';

import { auth, db } from '../firebase/firebase';
import { useProfileStore } from './useProfileStore';

// 프로필별 시청내역 컬렉션
const getHistoryRef = (uid, profileId) => {
    return collection(
        db,
        'users',
        uid,
        'profiles',
        profileId,
        'watchHistory'
    );
};

export const useWatchHistoryStore = create((set, get) => ({
    history: [],
    loading: false,
    error: null,
    ownerKey: null,

    // 시청내역 불러오기
    onLoadHistory: async () => {
        const user = auth.currentUser;
        const profile = useProfileStore.getState().currentProfile;

        if (!user || !profile) {
            set({
                history: [],
                ownerKey: null,
                loading: false
            });
            return [];
        }

        const ownerKey = `${user.uid}_${profile.id}`;

        set({
            loading: true,
            error: null,
            history: [],
            ownerKey: null
        });

        try {
            const snapshot = await getDocs(
                getHistoryRef(user.uid, profile.id)
            );

            const history = snapshot.docs.map((item) => ({
                ...item.data(),
                docId: item.id
            }));

            // 최신 시청순 정렬
            history.sort((a, b) => {
                const aTime = a.updatedAt?.toMillis?.() ?? 0;
                const bTime = b.updatedAt?.toMillis?.() ?? 0;
                return bTime - aTime;
            });

            // 다른 프로필로 변경됐는지 확인
            const currentUser = auth.currentUser;
            const currentProfile =
                useProfileStore.getState().currentProfile;

            if (
                currentUser?.uid !== user.uid ||
                currentProfile?.id !== profile.id
            ) {
                return [];
            }

            set({
                history,
                ownerKey,
                loading: false
            });

            return history;

        } catch (error) {
            console.error('시청내역 불러오기 오류:', error);

            set({
                loading: false,
                error: error.message
            });

            return [];
        }
    },

    // 시청내역 저장
    onSaveHistory: async (content) => {
        const user = auth.currentUser;
        const profile = useProfileStore.getState().currentProfile;

        if (!user || !profile) return false;

        const mediaType = content.media_type === 'movie'
            ? 'movie'
            : 'tv';

        const contentId = String(content.id);

        const historyDoc = doc(
            getHistoryRef(user.uid, profile.id),
            `${mediaType}_${contentId}`
        );

        try {
            await setDoc(historyDoc, {
                id: content.id,
                title: content.title || content.name || '',
                media_type: mediaType,
                backdrop_path: content.backdrop_path || '',
                poster_path: content.poster_path || '',
                progress: content.progress ?? 0,
                info: content.info || '',
                updatedAt: serverTimestamp()
            }, { merge: true });

            await get().onLoadHistory();

            return true;

        } catch (error) {
            console.error('시청내역 저장 오류:', error);
            set({ error: error.message });
            return false;
        }
    },

    // 시청내역 초기화
    onResetHistory: () => {
        set({
            history: [],
            loading: false,
            error: null,
            ownerKey: null
        });
    }
}));
