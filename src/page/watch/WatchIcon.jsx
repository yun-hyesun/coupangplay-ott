import React from 'react';

// 플레이어 전용 아이콘: 다른 페이지의 아이콘/스타일에는 영향을 주지 않습니다.
const WatchIcon = ({ name }) => {
  const paths = {
    back: <path d="m15 18-6-6 6-6M9 12h12" />,
    play: <path d="m8 5 12 7-12 7z" fill="currentColor" stroke="none" />,
    pause: <><path d="M8 5v14M16 5v14" strokeWidth="4" /></>,
    replay: <><path d="M4 11a8 8 0 1 1 2 6M4 5v6h6" /><text x="12" y="15" fontSize="7" textAnchor="middle" stroke="none" fill="currentColor">10</text></>,
    forward: <><path d="M20 11a8 8 0 1 0-2 6M20 5v6h-6" /><text x="12" y="15" fontSize="7" textAnchor="middle" stroke="none" fill="currentColor">10</text></>,
    volume: <><path d="M11 5 6 9H3v6h3l5 4V5ZM15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12" /></>,
    mute: <><path d="M11 5 6 9H3v6h3l5 4V5ZM16 9l5 6m0-6-5 6" /></>,
    subtitles: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M6 11h5m-5 4h3m5-4h4m-4 4h4" /></>,
    episodes: <><path d="M4 6h16M4 12h16M4 18h16" /><path d="m7 4 3 2-3 2" /></>,
    chat: <><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M10 2h4l1 3 3 1 3-1 2 4-2 2v3l2 2-2 4-3-1-3 1-1 3h-4l-1-3-3-1-3 1-2-4 2-2v-3L1 9l2-4 3 1 3-1z" /></>,
    reviews: <><path d="M4 4h16v13H8l-4 4V4Z" /><path d="M8 9h8m-8 4h6" /></>,
    fullscreen: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
    close: <path d="M5 5 19 19M19 5 5 19" />,
    together: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 8h4m-2-2v4" /></>,
    chat: <><path d="M4 4h16v13H8l-4 4V4Z" /><path d="M8 9h8m-8 4h6" /></>
  };
  return <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
};


export default WatchIcon;
