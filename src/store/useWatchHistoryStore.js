
import { create } from 'zustand';
import {
    collection,
    doc,
    getDocs,
    setDoc,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';

import { auth, db } from '../firebase/firebase';
import { createSeriesHistoryWriter } from '../data/seriesHistoryWriter';
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

const isCurrentProfile = (uid, profileId) => auth.currentUser?.uid === uid &&
    useProfileStore.getState().currentProfile?.id === profileId;

let loadRequest = 0;
const seriesHistoryWriter = createSeriesHistoryWriter({
    database: db,
    currentUid: () => auth.currentUser?.uid,
    onError: (error, { uid, profileId }) => {
        console.error('시청내역 저장 오류:', error);
        if (isCurrentProfile(uid, profileId)) useWatchHistoryStore.setState({ error: error.message });
    },
    onRetrySaved: ({ uid, profileId }) => {
        if (isCurrentProfile(uid, profileId)) void useWatchHistoryStore.getState().onLoadHistory();
    }
});

export const useWatchHistoryStore = create((set, get) => ({
    history: [],
    loading: false,
    error: null,
    ownerKey: null,

    // 시청내역 불러오기
    onLoadHistory: async () => {
        const request = ++loadRequest;
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
        const isCurrentRequest = () => request === loadRequest && isCurrentProfile(user.uid, profile.id);

        set((state) => ({
            loading: true,
            error: null,
            ...(state.ownerKey === ownerKey ? {} : { history: [], ownerKey: null })
        }));
        seriesHistoryWriter.retry();

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

            if (!isCurrentRequest()) return [];

            set({
                history,
                ownerKey,
                loading: false
            });

            return history;

        } catch (error) {
            if (!isCurrentRequest()) return [];
            console.error('시청내역 불러오기 오류:', error);

            set({
                loading: false,
                error: error.message
            });

            return [];
        }
    },

    onDeleteHistory: async (ids) => {
        const user = auth.currentUser;
        const profile = useProfileStore.getState().currentProfile;
        if (!user || !profile || !ids.length) return false;

        try {
            const historyRef = getHistoryRef(user.uid, profile.id);
            const refs = ids.map((id) => doc(historyRef, id));
            await seriesHistoryWriter.discard(refs);
            for (let start = 0; start < refs.length; start += 500) {
                const batch = writeBatch(db);
                refs.slice(start, start + 500).forEach((ref) => batch.delete(ref));
                await batch.commit();
            }
            return true;
        } finally {
            await get().onLoadHistory();
        }
    },

    // 시청내역 저장
    onSaveHistory: async (content, expectedOwner) => {
        console.log('[시청내역 저장값]', {
            title: content.title,
            position: content.position,
            duration: content.duration,
        });
        const user = auth.currentUser;
        const profile = useProfileStore.getState().currentProfile;

        if (!user || !profile) return false;

        if (expectedOwner && expectedOwner !== `${user.uid}_${profile.id}`) return false;

        const mediaType = content.media_type === 'movie'
            ? 'movie'
            : 'tv';

        const contentId = String(content.id);

        const historyDoc = doc(
            getHistoryRef(user.uid, profile.id),
            `${mediaType}_${contentId}`
        );

        try {
            const entry = {
                id: content.id,
                title: content.title || content.name || '',
                media_type: mediaType,
                backdrop_path: content.backdrop_path || '',
                poster_path: content.poster_path || '',
                progress: content.progress ?? 0,
                info: content.info || '',
                position: content.position ?? 0,
                duration: content.duration ?? 0,
                seasonNumber: content.seasonNumber ?? 1,
                episodeNumber: content.episodeNumber ?? 1,
                videoSrc: content.videoSrc || '',
                youtubeKey: content.youtubeKey || '',
                completed: content.completed === true,
                updatedAt: serverTimestamp()
            };

            if (mediaType === 'tv') {
                return await seriesHistoryWriter.save(historyDoc, entry, user.uid, profile.id);
            }

            await setDoc(historyDoc, entry, { merge: true });
            return true;

        } catch (error) {
            console.error('시청내역 저장 오류:', error);
            set({ error: error.message });
            return false;
        }
    },

    // 시청내역 초기화
    onResetHistory: () => {
        loadRequest++;
        set({
            history: [],
            loading: false,
            error: null,
            ownerKey: null
        });
    }
}));

