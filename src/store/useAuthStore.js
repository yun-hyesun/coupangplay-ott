import { create } from 'zustand';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

import { auth, googleProvider } from '../firebase/firebase';

import { useProfileStore } from './useProfileStore';

export const useAuthStore = create((set, get) => ({
  // 로그인한 사용자 정보
  user: null,

  // 로그인 상태 확인 중
  loading: true,

  // 에러 메시지
  error: null,

  // 사용자 정보 저장
  setUser: (user) => set({ user }),

  // 이메일 회원가입
  onEmailSignup: async (email, password) => {
    set({ error: null });

    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      set({ user: result.user });

      return result.user;
    } catch (error) {
      console.error('회원가입 오류:', error);
      set({ error: error.code });
      return null;
    }
  },

  // 이메일 로그인
  onEmailLogin: async (email, password) => {
    set({ error: null });

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      set({ user: result.user });
      return result.user;
    } catch (error) {
      console.error('로그인 오류:', error);
      set({ error: error.code });
      return null;
    }
  },

  // 구글 로그인
  onGoogleLogin: async () => {
    set({ error: null });

    try {
      const result = await signInWithPopup(auth, googleProvider);
      set({ user: result.user });
      return result.user;
    } catch (error) {
      console.error('구글 로그인 오류:', error);
      set({ error: error.code });
      return null;
    }
  },

  // 로그아웃
  onLogout: async () => {
    try {
      // 로그아웃 전 현재 계정의 프로필 정보 초기화
      const user = auth.currentUser;

      await signOut(auth);

      // 로그아웃 성공 후 저장된 프로필 정보 제거
      if (user) {
        localStorage.removeItem(`selectedProfile_${user.uid}`);
      }

      useProfileStore.getState().onResetProfiles();

      set({
        user: null,
        error: null
      });

    } catch (error) {
      console.error('로그아웃 오류:', error);
      set({ error: error.code });
    }
  },

  // 로그인 상태 감지
  onAuthCheck: () => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        // 다른 계정의 프로필 정보가 남지 않도록 초기화
        useProfileStore.setState({
          profiles: [],
          currentProfile: null
        });

        if (user) {
          // 로그인된 계정의 선택 프로필 복원
          await useProfileStore.getState().onRestoreProfile();
        }

        set({
          user,
          loading: false
        });
      },
      (error) => {
        console.error('인증 상태 확인 오류:', error);

        useProfileStore.setState({
          profiles: [],
          currentProfile: null
        });

        set({
          user: null,
          loading: false,
          error: error.code
        });
      }
    );

    return unsubscribe;
  }
}));
