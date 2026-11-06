import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/useAuthStore';
import { readClips } from '../../../components/wowclip/clipStorage';
import { WowClipCard } from '../../../components/wowclip/WowClipCard';
import { SAMPLE_CLIPS } from '../data/sampleClips';
import '../scss/WowClipGallery.scss';

export function WowClipGallery() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const [order, setOrder] = useState('new');
  const clips = useMemo(() => [...readClips(user?.uid).filter((clip) => clip.status === 'published' && clip.visibility === 'public'), ...SAMPLE_CLIPS].sort((a, b) => order === 'like' ? new Date(a.updatedAt) - new Date(b.updatedAt) : new Date(b.updatedAt) - new Date(a.updatedAt)), [user?.uid, order]);
  return (
    <main className="wowclip-gallery">
      <div className="wowclip-gallery__inner">
        <header className="wowclip-gallery__header"><div><h1>와우 클립</h1><p>마음에 남는 장면을 짧은 클립으로 만나보세요.</p></div><div className="wowclip-gallery__controls"><label className="wowclip-gallery__sort">정렬 <select value={order} onChange={(e) => setOrder(e.target.value)}><option value="new">최신순</option><option value="like">인기순</option></select></label><Link to="/my/review?tab=wowclip" className="wowclip-gallery__mine">내 클립</Link></div></header>
        {location.state?.clipNotice && <p className="wowclip-gallery__notice" role="status">{location.state.clipNotice}</p>}
        <p className="wowclip-gallery__local">Figma 시안 기반 예시 클립과 이 브라우저에서 만든 게시 기록을 함께 보여줍니다. 예시 클립은 실제 다른 사용자 게시물이 아니며, 서버 공개 기능은 연결되지 않았습니다.</p>
        {clips.length ? <section className="wowclip-gallery__grid" aria-label="와우 클립 목록">{clips.map((clip) => <WowClipCard key={clip.id} clip={clip} />)}</section> : <div className="wowclip-gallery__empty"><h2>아직 게시한 와우 클립이 없습니다.</h2><p>영상을 시청하면서 ‘AI로 클립 만들기’를 눌러 나만의 클립을 제작해 보세요.</p><Link to="/">영상 둘러보기</Link></div>}
      </div>
    </main>
  );
}
