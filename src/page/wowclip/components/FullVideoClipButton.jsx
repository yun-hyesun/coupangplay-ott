import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/useAuthStore';
import { useProfileStore } from '../../../store/useProfileStore';
import { ClipEditor } from './ClipEditor';
import { ClipIcon } from './WowClipUi';
import { useWowClipLibrary } from '../hooks/useWowClipLibrary';
import '../scss/WowClip.scss';

// 원본 시청 플레이어에만 배치하는 진입점. 클립 감상 화면에서는 사용하지 않습니다.
export const FullVideoClipButton = ({ getSource, disabled = false }) => {
  const [source, setSource] = useState(null);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const profile = useProfileStore((state) => state.currentProfile);
  const library = useWowClipLibrary();
  const owner = { id: `${user?.uid || 'local'}:${profile?.id || 'default'}`, name: profile?.name || user?.displayName || '나', avatar: profile?.avatar || '/images/profile.svg' };
  const save = async (clip) => {
    await library.saveClip(clip);
    let notice = '클립을 저장했어요.';
    if (clip.visibility === 'link') {
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/wowclip?clip=${encodeURIComponent(clip.id)}`);
        notice = '클립 링크를 복사했어요.';
      } catch { notice = '클립을 저장했어요. 링크 복사 버튼으로 다시 복사해 주세요.'; }
    }
    navigate(`/wowclip?clip=${encodeURIComponent(clip.id)}`, { state: { createdClipId: clip.id, notice } });
  };
  return <>
    <button type="button" aria-label="클립 만들기" title={user ? '클립 만들기' : '로그인 후 클립 만들기'} disabled={disabled || authLoading} onClick={() => {
      if (!user) { navigate('/login'); return; }
      const original = getSource();
      if (original?.videoKey) setSource({ ...original, fullVideo: true });
    }}><ClipIcon name="scissors" /></button>
    {source && user && <ClipEditor owner={owner} source={source} onClose={() => setSource(null)} onSave={save} />}
  </>;
};
