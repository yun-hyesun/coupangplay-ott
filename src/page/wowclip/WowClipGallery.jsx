import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { readClips } from '../../components/wowclip/clipStorage';
import { WowClipCard } from '../../components/wowclip/WowClipCard';
import './WowClipGallery.scss';

// Figma 시안에 등장하는 작품명을 활용한 데모 카드입니다. 실제 다른 사용자 게시물이 아닙니다.
export const SAMPLE_CLIPS = [
  { id: 'sample-snl', title: '웃음이 터지는 순간', contentTitle: 'SNL 코리아', ownerId: 'sample', seasonNumber: 1, episodeNumber: 1, startTime: 125, endTime: 142, status: 'published', visibility: 'public', updatedAt: '2026-11-04T12:00:00Z', demo: true },
  { id: 'sample-love', title: '다시 보고 싶은 장면', contentTitle: '너 말고 다른 연애', ownerId: 'sample', seasonNumber: 1, episodeNumber: 2, startTime: 210, endTime: 224, status: 'published', visibility: 'public', updatedAt: '2026-11-03T12:00:00Z', demo: true },
  { id: 'sample-office', title: '스포일러 보호된 장면', contentTitle: '직장인들', ownerId: 'sample', seasonNumber: 3, episodeNumber: 3, startTime: 134, endTime: 139, status: 'published', visibility: 'public', spoiler: true, updatedAt: '2026-11-02T12:00:00Z', demo: true },
  { id: 'sample-hidden', title: '놓치면 아쉬운 장면', contentTitle: '히든페이스', ownerId: 'sample', seasonNumber: 1, episodeNumber: 1, startTime: 180, endTime: 195, status: 'published', visibility: 'public', spoiler: true, updatedAt: '2026-11-01T12:00:00Z', demo: true },
];

export function WowClipGallery() {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const [order, setOrder] = useState('new');
  const clips = useMemo(() => [...readClips(user?.uid).filter((clip) => clip.status === 'published' && clip.visibility === 'public'), ...SAMPLE_CLIPS].sort((a, b) => order === 'old' ? new Date(a.updatedAt) - new Date(b.updatedAt) : new Date(b.updatedAt) - new Date(a.updatedAt)), [user?.uid, order]);
  return (
    <main className="wowclip-gallery">
      <div className="wowclip-gallery__inner">
        <header className="wowclip-gallery__header"><div><h1>와우 클립</h1><p>마음에 남는 장면을 짧은 클립으로 만나보세요.</p></div><div className="wowclip-gallery__controls"><label className="wowclip-gallery__sort">정렬 <select value={order} onChange={(e) => setOrder(e.target.value)}><option value="new">최신순</option><option value="old">오래된순</option></select></label><Link to="/my/review?tab=wowclip" className="wowclip-gallery__mine">내 클립</Link></div></header>
        {location.state?.clipNotice && <p className="wowclip-gallery__notice" role="status">{location.state.clipNotice}</p>}
        <p className="wowclip-gallery__local">Figma 시안 기반 예시 클립과 이 브라우저에서 만든 게시 기록을 함께 보여줍니다. 예시 클립은 실제 다른 사용자 게시물이 아니며, 서버 공개 기능은 연결되지 않았습니다.</p>
        {clips.length ? <section className="wowclip-gallery__grid" aria-label="와우 클립 목록">{clips.map((clip) => <WowClipCard key={clip.id} clip={clip} />)}</section> : <div className="wowclip-gallery__empty"><h2>아직 게시한 와우 클립이 없습니다.</h2><p>영상을 시청하면서 ‘AI로 클립 만들기’를 눌러 나만의 클립을 제작해 보세요.</p><Link to="/">영상 둘러보기</Link></div>}
      </div>
    </main>
  );
}
