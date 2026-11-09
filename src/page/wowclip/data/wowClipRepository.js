import { collection, doc, getDocFromServer, onSnapshot, query, where, orderBy, runTransaction, serverTimestamp } from 'firebase/firestore';
import { cloudClip, cloudComment, newCloudClip } from '../utils/cloudClipData.js';

// 인증과 Firestore 인스턴스를 주입해 실제 앱과 에뮬레이터에서 같은 저장 코드를 검수합니다.
export const createWowClipRepository = ({ database, currentUser }) => {
  const clipRef = (id) => {
    if (typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id)) throw new Error('올바르지 않은 클립 링크예요.');
    return doc(database, 'wowClips', id);
  };
  const requireUser = () => {
    const user = currentUser();
    if (!user?.uid) throw new Error('로그인한 후 이용해 주세요.');
    return user;
  };
  const requireClip = (snapshot) => {
    if (!snapshot.exists() || snapshot.data().deleted) throw new Error('삭제되었거나 찾을 수 없는 클립이에요.');
    return snapshot.data();
  };

  const subscribe = ({ uid, selectedId }, onData, onError) => {
    if (selectedId) clipRef(selectedId);
    const groups = new Map(), ready = new Set(), stops = [];
    const total = 1 + Number(!!uid) + Number(!!selectedId);
    let alive = true, failed = false;
    const emit = () => {
      if (!alive || failed || ready.size < total) return;
      const merged = new Map();
      groups.forEach((clips) => clips.forEach((clip) => merged.set(clip.id, clip)));
      onData([...merged.values()].filter((clip) => !clip.deleted));
    };
    const listen = (key, reference, single = false) => {
      stops.push(onSnapshot(reference, (snapshot) => {
        if (!alive) return;
        const documents = single ? (snapshot.exists() ? [snapshot] : []) : snapshot.docs;
        groups.set(key, documents.map((item) => cloudClip(item.id, item.data())));
        ready.add(key); emit();
      }, (failure) => { if (alive) { failed = true; onError(failure); } }));
    };
    listen('public', query(collection(database, 'wowClips'), where('visibility', '==', 'public'), where('deleted', '==', false)));
    if (uid) listen('mine', query(collection(database, 'wowClips'), where('authorUid', '==', uid), where('deleted', '==', false)));
    if (selectedId) listen('selected', clipRef(selectedId), true);
    return () => { alive = false; stops.forEach((stop) => stop()); };
  };

  const subscribeDetails = (id, uid, onData, onError) => {
    let comments = [], liked = false, likedComments = new Set(), alive = true;
    const ready = new Set(), total = uid ? 3 : 1;
    const emit = () => { if (alive && ready.size === total) onData({ id, liked, comments: comments.map((comment) => ({ ...comment, liked: likedComments.has(comment.id) })) }); };
    const stops = [onSnapshot(query(collection(clipRef(id), 'comments'), orderBy('createdAt', 'asc')), (snapshot) => {
      comments = snapshot.docs.map((item) => cloudComment(item.id, item.data())); ready.add('comments'); emit();
    }, onError)];
    if (uid) {
      stops.push(onSnapshot(doc(clipRef(id), 'likes', uid), (snapshot) => { liked = snapshot.exists(); ready.add('like'); emit(); }, onError));
      stops.push(onSnapshot(query(collection(clipRef(id), 'commentLikes'), where('uid', '==', uid)), (snapshot) => {
        likedComments = new Set(snapshot.docs.map((item) => item.data().commentId)); ready.add('commentLikes'); emit();
      }, onError));
    }
    return () => { alive = false; stops.forEach((stop) => stop()); };
  };

  const saveClip = async (clip) => {
    const user = requireUser();
    const data = newCloudClip(clip, user, serverTimestamp());
    await runTransaction(database, async (transaction) => {
      const existing = await transaction.get(clipRef(clip.id));
      if (existing.exists()) throw new Error('이미 저장된 클립이에요. 목록을 새로고침해 주세요.');
      transaction.set(clipRef(clip.id), data);
    });
    return clip.id;
  };

  const removeClip = async (id) => {
    const user = requireUser();
    await runTransaction(database, async (transaction) => {
      const data = requireClip(await transaction.get(clipRef(id)));
      if (data.authorUid !== user.uid) throw new Error('본인이 만든 클립만 삭제할 수 있어요.');
      // 부모 삭제로 댓글을 고아 문서로 남기지 않고 같은 부모의 접근을 함께 차단합니다.
      transaction.update(clipRef(id), { deleted: true });
    });
  };

  const toggleLike = async (id, commentId) => {
    const user = requireUser();
    const parent = clipRef(id);
    const target = commentId ? doc(parent, 'comments', commentId) : parent;
    const reaction = commentId ? doc(parent, 'commentLikes', commentId + '_' + user.uid) : doc(parent, 'likes', user.uid);
    await runTransaction(database, async (transaction) => {
      const parentData = requireClip(await transaction.get(parent));
      const targetData = commentId ? (await transaction.get(target)) : null;
      if (targetData && !targetData.exists()) throw new Error('댓글을 찾을 수 없어요.');
      const previous = await transaction.get(reaction);
      if (previous.exists()) transaction.delete(reaction);
      else transaction.set(reaction, { uid: user.uid, ...(commentId ? { commentId } : {}), createdAt: serverTimestamp() });
      const count = Math.max(0, Number(targetData ? targetData.data().likeCount : parentData.likeCount) || 0);
      transaction.update(target, { likeCount: Math.max(0, count + (previous.exists() ? -1 : 1)) });
    });
  };

  const addComment = async (id, text, owner, parentId = null) => {
    const user = requireUser();
    const value = text.trim();
    if (!value || value.length > 1000) throw new Error('댓글은 1~1000자로 작성해 주세요.');
    const parent = clipRef(id), comment = doc(collection(parent, 'comments'));
    await runTransaction(database, async (transaction) => {
      const data = requireClip(await transaction.get(parent));
      if (parentId) {
        const root = await transaction.get(doc(parent, 'comments', parentId));
        if (!root.exists() || root.data().parentId) throw new Error('답글을 달 원댓글을 찾을 수 없어요.');
      }
      const profileId = owner.id?.startsWith(user.uid + ':') ? owner.id.slice(user.uid.length + 1) : 'default';
      transaction.set(comment, { text: value, parentId, authorUid: user.uid, profileId, ownerId: user.uid + ':' + profileId,
        author: String(owner.name || user.displayName || '사용자').slice(0, 100), avatar: owner.avatar || '/images/profile.svg',
        createdAt: serverTimestamp(), likeCount: 0 });
      transaction.update(parent, { commentCount: data.commentCount + 1, lastCommentId: comment.id });
    });
    return comment.id;
  };

  const hasRecordedView = async (id, uid) => {
    if (!uid || currentUser()?.uid !== uid) return false;
    return (await getDocFromServer(doc(clipRef(id), 'views', uid))).exists();
  };

  const recordView = async (id) => {
    const user = currentUser();
    if (!user?.uid) return;
    const parent = clipRef(id), view = doc(parent, 'views', user.uid);
    await runTransaction(database, async (transaction) => {
      const data = requireClip(await transaction.get(parent));
      if ((await transaction.get(view)).exists()) return;
      transaction.set(view, { uid: user.uid, createdAt: serverTimestamp() });
      transaction.update(parent, { views: data.views + 1 });
    });
  };
  return { subscribe, subscribeDetails, saveClip, removeClip, toggleLike, addComment, hasRecordedView, recordView };
};
