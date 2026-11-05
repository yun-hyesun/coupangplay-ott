import { create } from 'zustand';
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

import { auth, db } from '../firebase/firebase';

// 로그인한 계정의 프로필 컬렉션
const getProfilesRef = (uid) => {
    return collection(db, 'users', uid, 'profiles');
};

// 프로필 문서 참조
const getProfileRef = (uid, profileId) => {
    return doc(db, 'users', uid, 'profiles', profileId);
};

// 계정별 선택 프로필 저장 키
const getSelectedProfileKey = (uid) => {
    return `selectedProfile_${uid}`;
};

// 저장된 프로필 ID 가져오기
const getSavedProfileId = (uid) => {
    return localStorage.getItem(getSelectedProfileKey(uid));
};

// 선택한 프로필 ID 저장하기
const saveProfileId = (uid, profileId) => {
    localStorage.setItem(getSelectedProfileKey(uid), profileId);
};

// 저장된 프로필 ID 삭제하기
const clearSavedProfileId = (uid) => {
    localStorage.removeItem(getSelectedProfileKey(uid));
};

// 시연용 PIN 해시 생성 (실제 서비스에서는 서버에서 검증 필요)
const hashPin = async (pin) => {
    const data = new TextEncoder().encode(pin);
    const hash = await crypto.subtle.digest('SHA-256', data);

    return Array.from(new Uint8Array(hash))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
};

export const useProfileStore = create((set, get) => ({
    // 프로필 목록
    profiles: [],

    // 현재 선택한 프로필
    currentProfile: null,

    // 로딩 및 오류 상태
    loading: false,
    error: null,

    // 프로필 목록 불러오기
    onLoadProfiles: async () => {
        const user = auth.currentUser;
        console.log('현재 로그인 UID:', user?.uid);
        console.log('현재 로그인 이메일:', user?.email);

        if (!user) {
            set({
                profiles: [],
                currentProfile: null,
                loading: false,
                error: '로그인이 필요합니다.'
            });
            return [];
        }

        set({ loading: true, error: null });

        try {
            const snapshot = await getDocs(getProfilesRef(user.uid));

            const profiles = snapshot.docs.map((item) => ({
                id: item.id,
                ...item.data()
            }));

            // 생성된 순서대로 정렬
            profiles.sort((a, b) => {
                const aTime = a.createdAt?.toMillis?.() ?? 0;
                const bTime = b.createdAt?.toMillis?.() ?? 0;
                return aTime - bTime;
            });

            set({ profiles, loading: false });

            return profiles;
        } catch (error) {
            console.error('프로필 불러오기 오류:', error);
            set({ loading: false, error: error.message });
            return [];
        }
    },

    // 새 프로필 생성
    onAddProfile: async (name, avatar = '/images/profile.svg') => {
        const user = auth.currentUser;

        if (!user) {
            set({ error: '로그인이 필요합니다.' });
            return null;
        }

        const trimmedName = name.trim();

        if (trimmedName.length < 2 || trimmedName.length > 10) {
            set({ error: '프로필 이름은 2~10자로 입력해 주세요.' });
            return null;
        }

        set({ loading: true, error: null });

        try {
            const profileData = {
                name: trimmedName,
                avatar,
                isLocked: false,
                pinHash: null,
                rating: 'ALL',
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(
                getProfilesRef(user.uid),
                profileData
            );

            await get().onLoadProfiles();

            return docRef.id;
        } catch (error) {
            console.error('프로필 생성 오류:', error);
            set({ loading: false, error: error.message });
            return null;
        }
    },

    // 프로필 선택
    onSelectProfile: async (profileId, verifiedPin = '') => {
        const user = auth.currentUser;

        if (!user) {
            set({ error: '로그인이 필요합니다.' });
            return null;
        }

        set({ loading: true, error: null });

        try {
            const snapshot = await getDoc(
                getProfileRef(user.uid, profileId)
            );

            if (!snapshot.exists()) {
                set({
                    currentProfile: null,
                    loading: false,
                    error: '프로필을 찾을 수 없습니다.'
                });
                clearSavedProfileId(user.uid);
                return null;
            }

            const profile = {
                id: snapshot.id,
                ...snapshot.data()
            };

            // 잠금 프로필은 PIN 인증 후 선택 가능
            if (profile.isLocked) {
                const enteredHash = /^\d{4}$/.test(verifiedPin)
                    ? await hashPin(verifiedPin)
                    : null;

                if (profile.pinHash !== enteredHash || !enteredHash) {
                    set({
                        loading: false,
                        error: '잠금 설정된 프로필입니다. PIN 인증이 필요합니다.'
                    });
                    return null;
                }
            }

            // 선택한 프로필 ID 저장
            saveProfileId(user.uid, profileId);

            set({
                currentProfile: profile,
                loading: false,
                error: null
            });

            return profile;

        } catch (error) {
            console.error('프로필 선택 오류:', error);

            set({
                loading: false,
                error: error.message
            });

            return null;
        }
    },

    // 새로고침 후 선택한 프로필 복원
    onRestoreProfile: async () => {
        const user = auth.currentUser;

        if (!user) {
            set({ currentProfile: null });
            return null;
        }

        const savedProfileId = getSavedProfileId(user.uid);

        if (!savedProfileId) {
            set({ currentProfile: null });
            return null;
        }

        try {
            const snapshot = await getDoc(
                getProfileRef(user.uid, savedProfileId)
            );

            if (!snapshot.exists()) {
                clearSavedProfileId(user.uid);
                set({ currentProfile: null });
                return null;
            }

            const profile = {
                id: snapshot.id,
                ...snapshot.data()
            };

            // 잠금 설정된 프로필은 자동 복원하지 않음
            if (profile.isLocked) {
                clearSavedProfileId(user.uid);
                set({ currentProfile: null });
                return null;
            }

            // 요청 중 다른 계정으로 전환됐는지 확인
            if (auth.currentUser?.uid !== user.uid) {
                return null;
            }

            set({ currentProfile: profile });

            return profile;

        } catch (error) {
            console.error('프로필 복원 오류:', error);
            set({ currentProfile: null });
            return null;
        }
    },


    // 프로필 PIN 확인
    onVerifyProfilePin: async (profileId, pin) => {
        const user = auth.currentUser;

        if (!user) {
            set({ error: '로그인이 필요합니다.' });
            return false;
        }

        if (!/^\d{4}$/.test(pin)) {
            set({ error: 'PIN 번호 4자리를 입력해 주세요.' });
            return false;
        }

        try {
            const snapshot = await getDoc(
                getProfileRef(user.uid, profileId)
            );

            if (!snapshot.exists()) {
                set({ error: '프로필을 찾을 수 없습니다.' });
                return false;
            }

            const profile = snapshot.data();
            const enteredHash = await hashPin(pin);

            if (!profile.isLocked || profile.pinHash !== enteredHash) {
                set({ error: 'PIN 번호가 일치하지 않습니다.' });
                return false;
            }

            set({ error: null });
            return true;

        } catch (error) {
            console.error('PIN 확인 오류:', error);
            set({ error: error.message });
            return false;
        }
    },

    // 프로필 잠금 설정 및 해제
    onUpdateProfileLock: async (profileId, isLocked, pin = '') => {
        const user = auth.currentUser;

        if (!user) {
            set({ error: '로그인이 필요합니다.' });
            return false;
        }

        if (isLocked && !/^\d{4}$/.test(pin)) {
            set({ error: 'PIN 번호 4자리를 입력해 주세요.' });
            return false;
        }

        set({ loading: true, error: null });

        try {
            const updates = isLocked
                ? {
                    isLocked: true,
                    pinHash: await hashPin(pin)
                }
                : {
                    isLocked: false,
                    pinHash: null
                };

            await updateDoc(
                getProfileRef(user.uid, profileId),
                updates
            );

            await get().onLoadProfiles();

            const current = get().currentProfile;

            if (current?.id === profileId) {
                set({
                    currentProfile: {
                        ...current,
                        ...updates
                    }
                });
            }

            return true;

        } catch (error) {
            console.error('프로필 잠금 설정 오류:', error);
            set({ loading: false, error: error.message });
            return false;
        }
    },


    // 프로필 정보 수정
    onUpdateProfile: async (profileId, updates) => {
        const user = auth.currentUser;

        if (!user) {
            set({ error: '로그인이 필요합니다.' });
            return false;
        }

        // 수정 가능한 필드만 허용
        const allowedFields = ['name',
            'avatar',
            'rating',
            'favoriteGenres',
            'favoriteContents'];
        const safeUpdates = {};

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                safeUpdates[field] = updates[field];
            }
        }

        if (safeUpdates.name !== undefined) {
            safeUpdates.name = safeUpdates.name.trim();

            if (
                safeUpdates.name.length < 2 ||
                safeUpdates.name.length > 10
            ) {
                set({ error: '프로필 이름은 2~10자로 입력해 주세요.' });
                return false;
            }
        }

        if (Object.keys(safeUpdates).length === 0) {
            set({ error: '수정할 정보가 없습니다.' });
            return false;
        }

        set({ loading: true, error: null });

        try {
            await updateDoc(
                getProfileRef(user.uid, profileId),
                safeUpdates
            );

            await get().onLoadProfiles();

            const current = get().currentProfile;

            if (current?.id === profileId) {
                set({
                    currentProfile: {
                        ...current,
                        ...safeUpdates
                    }
                });
            }

            return true;
        } catch (error) {
            console.error('프로필 수정 오류:', error);
            set({ loading: false, error: error.message });
            return false;
        }
    },

    // 프로필 삭제
    onDeleteProfile: async (profileId) => {
        const user = auth.currentUser;

        if (!user) {
            set({ error: '로그인이 필요합니다.' });
            return false;
        }

        set({ loading: true, error: null });

        try {
            await deleteDoc(
                getProfileRef(user.uid, profileId)
            );

            // 삭제한 프로필이 저장된 프로필이라면 저장 정보 제거
            if (getSavedProfileId(user.uid) === profileId) {
                clearSavedProfileId(user.uid);
            }

            if (get().currentProfile?.id === profileId) {
                set({ currentProfile: null });
            }

            await get().onLoadProfiles();

            return true;
        } catch (error) {
            console.error('프로필 삭제 오류:', error);
            set({ loading: false, error: error.message });
            return false;
        }
    },

    // 선택한 프로필 초기화
    onClearProfile: () => {
        const user = auth.currentUser;

        if (user) {
            clearSavedProfileId(user.uid);
        }

        set({ currentProfile: null });
    },

    // 로그아웃 시 프로필 상태 전체 초기화
    onResetProfiles: () => {
        const user = auth.currentUser;

        if (user) {
            clearSavedProfileId(user.uid);
        }

        set({
            profiles: [],
            currentProfile: null,
            loading: false,
            error: null
        });
    }
}));
