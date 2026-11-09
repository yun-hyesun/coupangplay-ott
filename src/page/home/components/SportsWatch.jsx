import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import YouTube from 'react-youtube';
import WatchIcon from '../../watch/WatchIcon';
import '../../watch/Watch.scss';

export const SportsWatch = () => {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [failedVideoId, setFailedVideoId] = useState(null);
  const [playback, setPlayback] = useState({ id, status: 'loading' });
  const title = state?.title || '스포츠 영상';
  const validId = /^[\w-]{11}$/.test(id || '');
  const returnTo = typeof state?.returnTo === 'string' && (state.returnTo === '/sports' || state.returnTo.startsWith('/sports/')) ? state.returnTo : '/';
  const goBack = () => navigate(returnTo, { replace: true, state: { leagueTab: state?.returnTab || 'home' } });

  return (
    <main className="watch-page sports-watch" aria-label={title}>
      <div className="watch-player" data-video-id={id} data-playback-state={playback.id === id ? playback.status : 'loading'}>
        {!validId || failedVideoId === id ? (
          <div className="watch-player__placeholder sports-watch__error" role="status">
            <p>{validId ? '이 화면에서 영상을 재생할 수 없어요.' : '재생할 영상을 찾을 수 없습니다.'}</p>
            {validId && <div>
              <button type="button" onClick={() => { setFailedVideoId(null); setPlayback({ id, status: 'loading' }); }}>다시 시도</button>
              <a href={`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`} target="_blank" rel="noopener noreferrer">YouTube에서 보기</a>
            </div>}
          </div>
        ) : (
          <YouTube
            key={id}
            videoId={id}
            title={title}
            className="watch-player__youtube"
            iframeClassName="watch-player__youtube-frame"
            opts={{
              width: '100%',
              height: '100%',
              playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
            }}
            onReady={() => setPlayback({ id, status: 'ready' })}
            onPlay={() => setPlayback({ id, status: 'playing' })}
            onPause={() => setPlayback({ id, status: 'paused' })}
            onEnd={() => setPlayback({ id, status: 'ended' })}
            onError={() => { setFailedVideoId(id); setPlayback({ id, status: 'error' }); }}
          />
        )}
        <header className="watch-player__header">
          <button className="watch-icon-button" type="button" onClick={goBack} aria-label={returnTo === '/' ? '홈으로 돌아가기' : returnTo === '/sports' ? '스포츠 메인으로 돌아가기' : '동영상 목록으로 돌아가기'}><WatchIcon name="back" /></button>
          <h1>{title}</h1>
        </header>
      </div>
    </main>
  );
};
