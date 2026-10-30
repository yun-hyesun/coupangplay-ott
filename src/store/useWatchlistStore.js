
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
import { useProfileStore } from './useProfileStore';

// 선택된 프로필의 찜 목록 컬렉션
const getWatchlistRef = (uid, profileId) => {
    return collection(
        db,
        'users',
        uid,
        'profiles',
        profileId,
        'watchlist'
    );
};

// 찜한 콘텐츠의 문서 ID
// 영화와 TV 시리즈의 ID 중복 방지
const getContentId = (content) => {
    return `${content.media_type}_${content.id}`;
};

export const useWatchlistStore = create((set, get) => ({
    // 찜한 콘텐츠 목록
    watchlist: [],

    // 현재 불러온 계정과 프로필
    ownerKey: null,

    // 로딩 및 오류 상태
    loading: false,
    error: null,

    // 찜 목록 불러오기
    onLoadWatchlist: async () => {
        const user = auth.currentUser;
        const profile = useProfileStore.getState().currentProfile;

        if (!user || !profile) {
            set({
                watchlist: [],
                ownerKey: null,
                loading: false
            });
            return [];
        }

        const ownerKey = `${user.uid}_${profile.id}`;

        set({
            watchlist: [],
            ownerKey: null,
            loading: true,
            error: null
        });

        try {
            const snapshot = await getDocs(
                getWatchlistRef(user.uid, profile.id)
            );

            const items = snapshot.docs.map((item) => ({
                ...item.data(),
                docId: item.id
            }));

            // 가장 최근 찜한 콘텐츠부터 정렬
            items.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() ?? 0;
                const bTime = b.createdAt?.toMillis?.() ?? 0;
                return bTime - aTime;
            });

            // 불러오는 동안 프로필이 변경되었는지 확인
            const current = useProfileStore.getState().currentProfile;

            if (
                auth.currentUser?.uid !== user.uid ||
                current?.id !== profile.id
            ) {
                return [];
            }

            set({
                watchlist: items,
                ownerKey,
                loading: false
            });

            return items;

        } catch (error) {
            console.error('찜 목록 불러오기 오류:', error);

            set({
                loading: false,
                error: error.message
            });

            return [];
        }
    },

    // 찜 목록에 추가
    onAddWatchlist: async (content) => {
        const user = auth.currentUser;
        const profile = useProfileStore.getState().currentProfile;

        if (!user || !profile) {
            set({ error: '프로필을 먼저 선택해 주세요.' });
            return false;
        }

        if (
            !content?.id ||
            !['movie', 'tv'].includes(content.media_type)
        ) {
            set({ error: '콘텐츠 정보가 올바르지 않습니다.' });
            return false;
        }

        const contentId = getContentId(content);

        set({ loading: true, error: null });

        try {
            await setDoc(
                doc(getWatchlistRef(user.uid, profile.id), contentId),
                {
                    id: content.id,
                    media_type: content.media_type,
                    title: content.title || content.name || '',
                    poster_path: content.poster_path || null,
                    backdrop_path: content.backdrop_path || null,
                    createdAt: serverTimestamp()
                }
            );

            if (
                auth.currentUser?.uid === user.uid &&
                useProfileStore.getState().currentProfile?.id === profile.id
            ) {
                await get().onLoadWatchlist();
            }

            return true;

        } catch (error) {
            console.error('찜 추가 오류:', error);
            set({ loading: false, error: error.message });
            return false;
        }
    },

    // 찜 목록에서 삭제
    onRemoveWatchlist: async (content) => {
        const user = auth.currentUser;
        const profile = useProfileStore.getState().currentProfile;

        if (!user || !profile) {
            set({ error: '프로필을 먼저 선택해 주세요.' });
            return false;
        }

        const contentId = getContentId(content);

        set({ loading: true, error: null });

        try {
            await deleteDoc(
                doc(getWatchlistRef(user.uid, profile.id), contentId)
            );

            if (
                auth.currentUser?.uid === user.uid &&
                useProfileStore.getState().currentProfile?.id === profile.id
            ) {
                await get().onLoadWatchlist();
            }

            return true;

        } catch (error) {
            console.error('찜 삭제 오류:', error);
            set({ loading: false, error: error.message });
            return false;
        }
    },

    // 찜 여부 확인
    isWatchlisted: (content) => {
        const user = auth.currentUser;
        const profile = useProfileStore.getState().currentProfile;
        const ownerKey = user && profile
            ? `${user.uid}_${profile.id}`
            : null;

        if (!ownerKey || get().ownerKey !== ownerKey) {
            return false;
        }

        const contentId = getContentId(content);

        return get().watchlist.some(
            (item) => item.docId === contentId
        );
    },

    // 찜 목록 초기화
    onResetWatchlist: () => {
        set({
            watchlist: [],
            ownerKey: null,
            loading: false,
            error: null
        });
    }
}));
