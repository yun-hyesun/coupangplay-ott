import {
  runTransaction, addDoc, collection, collectionGroup, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { contentKey, displayName, episodeKey, toDate } from '../data/communityData';

const reviewCollection = (type, contentId, season, episode) =>
  collection(db, 'contents', contentKey(type, contentId), 'episodes', episodeKey(season, episode), 'reviews');

export const subscribeEpisodeReviews = (type, contentId, season, episode, onData, onError) => {
  const q = query(reviewCollection(type, contentId, season, episode), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, snapshot => onData(snapshot.docs.map(item => {
    const data = item.data();
    return { ...data, id: item.id, documentPath: item.ref.path, author: data.authorName || '사용자', content: data.text, createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt) };
  })), onError);
};

export const createEpisodeReview = async ({ type = 'tv', contentId, season, episode, text, rating = 5, spoiler = false }) => {
  const user = auth.currentUser;
  if (!user) throw new Error('리뷰를 작성하려면 로그인해 주세요.');
  const value = text.trim();
  if (!value || value.length > 2000) throw new Error('리뷰는 1~2000자로 작성해 주세요.');
  if (
    !Number.isFinite(rating) ||
    rating < 1 ||
    rating > 5 ||
    !Number.isInteger(rating * 2)
  ) {
    throw new Error("별점은 1.0~5.0 사이에서 0.5점 단위로 선택해주세요.");
  }
  return addDoc(reviewCollection(type, contentId, season, episode), {
    authorId: user.uid, authorName: displayName(user), text: value, rating, spoiler: !!spoiler,
    likes: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), isEdited: false,
  });
};

export const updateEpisodeReview = async ({ type = 'tv', contentId, season, episode, reviewId, text }) => {
  if (!auth.currentUser) throw new Error('로그인이 필요합니다.');
  const value = text.trim();
  if (!value || value.length > 2000) throw new Error('리뷰는 1~2000자로 작성해 주세요.');
  return updateDoc(doc(reviewCollection(type, contentId, season, episode), reviewId), {
    text: value, updatedAt: serverTimestamp(), isEdited: true,
  });
};

export const deleteEpisodeReview = async ({ type = 'tv', contentId, season, episode, reviewId }) => {
  if (!auth.currentUser) throw new Error('로그인이 필요합니다.');
  return deleteDoc(doc(reviewCollection(type, contentId, season, episode), reviewId));
};


/**
 * 로그인한 사용자가 작성한 모든 회차 리뷰 조회
 * Firestore collectionGroup을 이용해
 * 여러 콘텐츠의 reviews 하위 컬렉션을 한 번에 검색
 */
export const subscribeMyReviews = (userId, onData, onError) => {
  if (!userId) {
    onData([]);
    return () => { };
  }

  const q = query(
    collectionGroup(db, 'reviews'),
    where('authorId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const reviews = snapshot.docs.map((item) => {
        const data = item.data();

        // contents/{contentKey}/episodes/{episodeKey}/reviews/{reviewId}
        const episodeRef = item.ref.parent.parent;
        const contentRef = episodeRef?.parent.parent;

        return {
          ...data,
          id: item.id,
          author: data.authorName || '사용자',
          content: data.text || '',
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
          contentKey: contentRef?.id || '',
          episodeKey: episodeRef?.id || '',
          documentPath: item.ref.path
        };
      });

      reviews.sort(
        (a, b) =>
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
      );

      onData(reviews);
    },
    onError
  );
};

// 좋아요 기록은 계정 uid를 문서 ID로 사용하여 리뷰당 1회만 허용합니다.
const getReviewRef = (documentPath) => {
  if (!/^contents\/(movie|tv)-[^/]+\/episodes\/[^/]+\/reviews\/[^/]+$/.test(documentPath || '')) {
    throw new Error('리뷰 경로가 올바르지 않습니다.');
  }
  return doc(db, documentPath);
};

export const subscribeReviewLike = (documentPath, uid, onData, onError) => {
  if (!uid) { onData(false); return () => {}; }
  return onSnapshot(doc(getReviewRef(documentPath), 'likes', uid), snapshot => onData(snapshot.exists()), onError);
};

export const likeReviewOnce = async (documentPath) => {
  const user = auth.currentUser;
  if (!user) throw new Error('좋아요를 누르려면 로그인해 주세요.');
  const reviewRef = getReviewRef(documentPath);
  const likeRef = doc(reviewRef, 'likes', user.uid);
  return runTransaction(db, async transaction => {
    const review = await transaction.get(reviewRef);
    const previous = await transaction.get(likeRef);
    if (!review.exists()) throw new Error('삭제되었거나 존재하지 않는 리뷰입니다.');
    if (previous.exists()) return false;
    const count = review.data().likes;
    if (!Number.isInteger(count) || count < 0) throw new Error('리뷰의 좋아요 수를 확인할 수 없습니다.');
    transaction.set(likeRef, { uid: user.uid, createdAt: serverTimestamp() });
    transaction.update(reviewRef, { likes: count + 1 });
    return true;
  });
};
