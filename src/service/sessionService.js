import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { contentKey, episodeKey } from '../data/communityData';

const PRESENCE_INTERVAL = 30_000;
const PRESENCE_TIMEOUT = 90_000;
const accountDoc = (sessionId, uid) => doc(db, 'watchSessions', sessionId, 'members', uid);
const profiles = (sessionId) => collection(db, 'watchSessions', sessionId, 'profileMembers');
const connections = (sessionId) => collection(db, 'watchSessions', sessionId, 'presence');
export const watchMemberId = (uid, profileId) => `${uid}:${profileId}`;
export const WATCH_PROFILE_KICKED = 'watch-profile-kicked';

const memberDetails = (user, memberName, role) => ({
  uid: user.uid, name: (memberName?.trim() || user.displayName?.trim() || '사용자').slice(0, 100),
  role, joinedAt: serverTimestamp(),
});

const joinProfile = async (sessionId, session, user, profileId, memberName) => {
  const accountRef = accountDoc(sessionId, user.uid);
  const profileRef = doc(profiles(sessionId), watchMemberId(user.uid, profileId));
  await runTransaction(db, async transaction => {
    const member = await transaction.get(profileRef);
    if (member.data()?.kickedAt) {
      const error = new Error('이 프로필은 같이 보기 방에서 추방되었어요.');
      error.code = WATCH_PROFILE_KICKED;
      throw error;
    }
    if (member.exists()) return;
    const account = await transaction.get(accountRef);
    const hostAccount = session.hostId === user.uid;
    const hostProfile = hostAccount && (!session.hostProfileId || session.hostProfileId === profileId);
    if (!account.exists()) transaction.set(accountRef, memberDetails(user, memberName, hostAccount ? 'host' : 'member'));
    transaction.set(profileRef, { ...memberDetails(user, memberName, hostProfile ? 'host' : 'member'), profileId });
  });
};

export const createWatchSession = async ({ type, contentId, season, episode, profileId, memberName }) => {
  const user = auth.currentUser;
  if (!user) throw new Error('같이 보기를 사용하려면 로그인해 주세요.');
  if (!profileId) throw new Error('프로필을 선택한 뒤 같이 보기를 시작해 주세요.');
  const data = {
    contentId: contentKey(type, contentId), episodeId: episodeKey(season, episode),
    hostId: user.uid, hostProfileId: profileId, status: 'active', createdAt: serverTimestamp(), endedAt: null,
  };
  const session = await addDoc(collection(db, 'watchSessions'), data);
  await joinProfile(session.id, data, user, profileId, memberName);
  return session.id;
};

export const joinWatchSession = async (sessionId, { type, contentId, season, episode, profileId, memberName }) => {
  const user = auth.currentUser;
  if (!user) throw new Error('같이 보기를 사용하려면 로그인해 주세요.');
  if (!profileId) throw new Error('프로필을 선택한 뒤 같이 보기에 참여해 주세요.');
  const session = await getDoc(doc(db, 'watchSessions', sessionId));
  if (!session.exists() || session.data().status !== 'active') throw new Error('종료되었거나 존재하지 않는 시청 세션입니다.');
  if (session.data().contentId !== contentKey(type, contentId) || session.data().episodeId !== episodeKey(season, episode)) throw new Error('다른 콘텐츠 또는 회차의 시청 세션입니다.');
  await joinProfile(sessionId, session.data(), user, profileId, memberName);
  return sessionId;
};

export const trackWatchPresence = (sessionId, profileId, onKicked, onError) => {
  const uid = auth.currentUser.uid;
  const connection = doc(connections(sessionId));
  let interval;
  let pending = 0;
  let kicked = false;

  const renew = (entering = false) => {
    if ((!entering && pending) || kicked || auth.currentUser?.uid !== uid) return;
    pending++;
    setDoc(connection, { uid, profileId, seenAt: serverTimestamp() }).catch(error => {
      if (interval !== undefined && !kicked) onError(error);
    }).finally(() => { pending--; });
  };
  const enter = () => {
    if (interval !== undefined || kicked) return;
    interval = window.setInterval(renew, PRESENCE_INTERVAL);
    renew(true);
  };
  const leave = () => {
    if (interval === undefined) return;
    window.clearInterval(interval);
    interval = undefined;
    void deleteDoc(connection).catch(() => {});
  };
  const stopMember = onSnapshot(doc(profiles(sessionId), watchMemberId(uid, profileId)), snapshot => {
    if (!snapshot.data()?.kickedAt || kicked) return;
    kicked = true;
    leave();
    onKicked();
  }, onError);

  window.addEventListener('pagehide', leave);
  window.addEventListener('pageshow', enter);
  enter();
  return () => {
    window.removeEventListener('pagehide', leave);
    window.removeEventListener('pageshow', enter);
    stopMember();
    leave();
  };
};

export const subscribeWatchMembers = (sessionId, onData, onError) => {
  let members;
  let leases;
  let expiryTimer;
  const publish = () => {
    window.clearTimeout(expiryTimer);
    if (!members || !leases) return;
    const now = Date.now();
    const present = new Set();
    let nextExpiry = Infinity;
    for (const { uid, profileId, seenAt } of leases) {
      const expires = seenAt?.toMillis() + PRESENCE_TIMEOUT;
      if (!(expires > now)) continue;
      present.add(watchMemberId(uid, profileId));
      nextExpiry = Math.min(nextExpiry, expires);
    }
    onData({ members, participants: members.filter(member => !member.kicked && present.has(member.id)) });
    if (Number.isFinite(nextExpiry)) expiryTimer = window.setTimeout(publish, nextExpiry - now);
  };
  const membersQuery = query(profiles(sessionId), orderBy('joinedAt'));
  const stopMembers = onSnapshot(membersQuery, snapshot => {
    members = snapshot.docs.map(item => {
      const { name, role, kickedAt } = item.data();
      return { id: item.id, name, role, kicked: Boolean(kickedAt) };
    });
    publish();
  }, onError);
  const stopPresence = onSnapshot(connections(sessionId), snapshot => {
    leases = snapshot.docs.map(item => item.data());
    publish();
  }, onError);
  return () => {
    stopMembers();
    stopPresence();
    window.clearTimeout(expiryTimer);
  };
};

export const kickWatchMember = (sessionId, memberId) => updateDoc(doc(profiles(sessionId), memberId), { kickedAt: serverTimestamp() });

export const endWatchSession = async (sessionId) => {
  if (!auth.currentUser) throw new Error('로그인이 필요합니다.');
  await updateDoc(doc(db, 'watchSessions', sessionId), { status: 'ended', endedAt: serverTimestamp() });
};
