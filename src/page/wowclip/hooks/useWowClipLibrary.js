import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/useAuthStore';
import { wowClipService } from '../../../service/wowClipService';
import { clipCloudError } from '../utils/cloudClipData';

// 클립·댓글·공감은 Firestore에서만 읽고 저장합니다.
export const useWowClipLibrary = ({ selectedId = null } = {}) => {
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const [remote, setRemote] = useState({ scope: '', clips: [], error: '' });
  const [details, setDetails] = useState({ scope: '', comments: [], liked: false, error: '' });
  const [revision, setRevision] = useState(0);
  const uid = user?.uid || '';
  const scope = [uid, selectedId || '', revision].join('|');
  const detailsScope = scope;
  const loading = authLoading || remote.scope !== scope;

  useEffect(() => {
    if (authLoading) return;
    let alive = true;
    try {
      const stop = wowClipService.subscribe({ uid, selectedId },
        (clips) => { if (alive) setRemote({ scope, clips, error: '' }); },
        (failure) => { if (alive) setRemote({ scope, clips: [], error: clipCloudError(failure) }); });
      return () => { alive = false; stop(); };
    } catch (failure) {
      queueMicrotask(() => { if (alive) setRemote({ scope, clips: [], error: clipCloudError(failure) }); });
      return () => { alive = false; };
    }
  }, [authLoading, uid, selectedId, scope]);
  const remoteClips = remote.scope === scope ? remote.clips : [];
  const selectedRemote = remoteClips.some((clip) => clip.id === selectedId);
  useEffect(() => {
    if (!selectedId || !selectedRemote) return;
    let alive = true;
    const stop = wowClipService.subscribeDetails(selectedId, uid,
      (data) => { if (alive) setDetails({ ...data, scope: detailsScope, error: '' }); },
      (failure) => { if (alive) setDetails((previous) => ({ ...(previous.scope === detailsScope ? previous : { comments: [], liked: false }), scope: detailsScope, error: clipCloudError(failure) })); });
    return () => { alive = false; stop(); };
  }, [selectedId, selectedRemote, uid, detailsScope]);

  const run = async (action) => { try { return await action(); } catch (failure) { throw new Error(clipCloudError(failure), { cause: failure }); } };
  const clips = remoteClips.map((clip) => clip.id === selectedId && details.scope === detailsScope ? { ...clip, comments: details.comments, liked: details.liked } : clip);
  const saveClip = (clip) => run(() => wowClipService.saveClip(clip));
  const removeClip = (id) => run(() => wowClipService.removeClip(id));
  const toggleLike = (id, _ownerId, commentId) => run(() => wowClipService.toggleLike(id, commentId));
  const addComment = (id, text, owner, parentId = null) => run(() => wowClipService.addComment(id, text, owner, parentId));
  const editComment = (id, commentId, text) => run(() => wowClipService.editComment(id, commentId, text));
  const removeComment = (id, commentId) => run(() => wowClipService.removeComment(id, commentId));
  const recordView = (id) => run(() => wowClipService.recordView(id));
  const reload = useCallback(() => { setRevision((value) => value + 1); }, []);
  return { clips, loading, error: remote.scope === scope ? remote.error : '',
    commentsError: details.scope === detailsScope ? details.error : '',
    commentsLoading: !!selectedId && selectedRemote && details.scope !== detailsScope,
    saveClip, removeClip, toggleLike, addComment, editComment, removeComment, recordView, reload };
};
