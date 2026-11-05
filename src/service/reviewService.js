import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { contentKey, displayName, episodeKey, toDate } from '../data/communityData';

const reviewCollection = (type, contentId, season, episode) =>
  collection(db, 'contents', contentKey(type, contentId), 'episodes', episodeKey(season, episode), 'reviews');

export const subscribeEpisodeReviews = (type, contentId, season, episode, onData, onError) => {
  const q = query(reviewCollection(type, contentId, season, episode), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(q, snapshot => onData(snapshot.docs.map(item => {
    const data = item.data();
    return { ...data, id: item.id, author: data.authorName || '사용자', content: data.text, createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt) };
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
