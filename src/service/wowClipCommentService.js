import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const commentsRef = collection(db, 'wowClipComments');
export function subscribeClipComments(clipId, onData, onError) {
  return onSnapshot(query(commentsRef, where('clipId', '==', clipId)), (snapshot) => {
    const comments = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    comments.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    onData(comments);
  }, onError);
}
export async function createClipComment(clipId, user, body, parentId = null) {
  const text = body.trim();
  if (!user?.uid) throw new Error('댓글을 작성하려면 로그인이 필요합니다.');
  if (!text || text.length > 500) throw new Error('댓글은 1~500자로 입력해주세요.');
  return addDoc(commentsRef, {
    clipId, authorId: user.uid, authorName: user.displayName || user.email?.split('@')[0] || '사용자',
    body: text, parentId, createdAt: serverTimestamp(),
  });
}
export async function deleteClipComment(comment, user) {
  if (!user?.uid || comment.authorId !== user.uid) throw new Error('본인의 댓글만 삭제할 수 있습니다.');
  return deleteDoc(doc(db, 'wowClipComments', comment.id));
}
