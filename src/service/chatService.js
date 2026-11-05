import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { displayName, toDate } from '../data/communityData';

const messages = (sessionId) => collection(db, 'watchSessions', sessionId, 'messages');

export const subscribeSessionMessages = (sessionId, onData, onError) =>
  onSnapshot(query(messages(sessionId), orderBy('createdAt', 'desc'), limit(50)), snapshot => {
    onData(snapshot.docs.map(item => ({ ...item.data(), id: item.id, createdAt: toDate(item.data().createdAt) })).reverse());
  }, onError);

export const sendSessionMessage = async (sessionId, text) => {
  const user = auth.currentUser;
  if (!user) throw new Error('채팅을 보내려면 로그인해 주세요.');
  const value = text.trim();
  if (!value || value.length > 300) throw new Error('메시지는 1~300자로 작성해 주세요.');
  return addDoc(messages(sessionId), {
    senderId: user.uid, senderName: displayName(user), text: value,
    type: 'text', createdAt: serverTimestamp(),
  });
};
