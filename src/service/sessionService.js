import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { contentKey, displayName, episodeKey } from '../data/communityData';

export const createWatchSession = async ({ type, contentId, season, episode }) => {
  const user = auth.currentUser;
  if (!user) throw new Error('같이 보기를 사용하려면 로그인해 주세요.');
  const session = await addDoc(collection(db, 'watchSessions'), {
    contentId: contentKey(type, contentId), episodeId: episodeKey(season, episode),
    hostId: user.uid, status: 'active', createdAt: serverTimestamp(), endedAt: null,
  });
  await setDoc(doc(db, 'watchSessions', session.id, 'members', user.uid), {
    uid: user.uid, name: displayName(user), role: 'host', joinedAt: serverTimestamp(),
  });
  return session.id;
};

export const joinWatchSession = async (sessionId, { type, contentId, season, episode }) => {
  const user = auth.currentUser;
  if (!user) throw new Error('같이 보기를 사용하려면 로그인해 주세요.');
  const session = await getDoc(doc(db, 'watchSessions', sessionId));
  if (!session.exists() || session.data().status !== 'active') throw new Error('종료되었거나 존재하지 않는 시청 세션입니다.');
  if (session.data().contentId !== contentKey(type, contentId) || session.data().episodeId !== episodeKey(season, episode)) throw new Error('다른 콘텐츠 또는 회차의 시청 세션입니다.');
  const memberRef = doc(db, 'watchSessions', sessionId, 'members', user.uid);
  if ((await getDoc(memberRef)).exists()) return sessionId;
  await setDoc(memberRef, {
    uid: user.uid, name: displayName(user), role: session.data().hostId === user.uid ? 'host' : 'member', joinedAt: serverTimestamp(),
  });
  return sessionId;
};

export const endWatchSession = async (sessionId) => {
  if (!auth.currentUser) throw new Error('로그인이 필요합니다.');
  await updateDoc(doc(db, 'watchSessions', sessionId), { status: 'ended', endedAt: serverTimestamp() });
};
