import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import YouTube from 'react-youtube';
import '../../watch/Watch.scss';

export const SportsWatch = () => {
  const { id } = useParams();
  const { state } = useLocation();
  const [failedVideoId, setFailedVideoId] = useState(null);
  const title = state?.title || '스포츠 영상';

  return (
    <main className="watch-page">
      <Link to="/">홈으로</Link>
      <h1>{title}</h1>

      {failedVideoId === id ? (
        <p>
          이 화면에서 영상을 재생할 수 없어요.{' '}
          <a href={`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`}>
            유튜브에서 보기
          </a>
        </p>
      ) : (
        <div className="watch-player">
          <YouTube
            key={id}
            videoId={id}
            title={title}
            className="watch-player__youtube"
            iframeClassName="watch-player__youtube-frame"
            opts={{
              width: '100%',
              height: '100%',
              playerVars: { autoplay: 1, playsinline: 1 },
            }}
            onError={() => setFailedVideoId(id)}
          />
        </div>
      )}
    </main>
  );
};