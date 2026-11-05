import React, { useState } from 'react';
import { formatClipTime } from './ClipRange';

export function WowClipCard({ clip, actions }) {
  const [revealed, setRevealed] = useState(!clip.spoiler);
  const duration = Math.max(0, (clip.endTime || 0) - (clip.startTime || 0));
  return (
    <article className="wowclip-card">
      <div className={`wowclip-card__poster ${clip.spoiler && !revealed ? 'wowclip-card__poster--hidden' : ''}`}>
        <div className="wowclip-card__art"><span>WOW CLIP</span><strong>{clip.contentTitle || '와우 클립'}</strong></div>
        {clip.spoiler && !revealed ? <button type="button" className="wowclip-card__reveal" onClick={() => setRevealed(true)}>◉ 스포일러 보기</button> : <span className="wowclip-card__play" aria-hidden="true">▶</span>}
        <span className="wowclip-card__duration">{formatClipTime(duration)}</span>
      </div>
      <div className="wowclip-card__info">
        <h3>{clip.spoiler && !revealed ? '스포일러가 포함된 클립' : clip.title}</h3>
        <p>{clip.contentTitle || '원본 영상'} · {clip.seasonNumber || 1}시즌 {clip.episodeNumber || 1}화</p>
        <div className="wowclip-card__meta"><span>● {clip.ownerId === 'guest' ? '내 클립' : '제작자'} · {new Date(clip.updatedAt || Date.now()).toLocaleDateString('ko-KR')}</span><span>{clip.demo ? '예시 클립' : clip.status === 'draft' ? '임시 저장' : clip.visibility === 'link' ? '링크 전용' : '게시 기록'}</span></div>
        {actions && <div className="wowclip-card__actions">{actions(clip)}</div>}
      </div>
    </article>
  );
}
