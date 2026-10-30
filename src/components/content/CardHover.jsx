
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './scss/CordHover.scss';

export const CardHover = ({ item, type, isHover }) => {
  const [videoKey, setVideoKey] = useState(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const name = item.title || item.name;
  const date = item.release_date || item.first_air_date;
  const year = date?.slice(0, 4);
  const rating = item.vote_average?.toFixed(1);

  // TMDB 예고편 가져오기
  useEffect(() => {
    if (!isHover) {
      setVideoKey(null);
      return;
    }

    const controller = new AbortController();

    const fetchVideo = async () => {
      try {
        const apiKey = import.meta.env.VITE_TMDB_API_KEY;

        const response = await fetch(
          `https://api.themoviedb.org/3/${type}/${item.id}/videos?api_key=${apiKey}&language=ko-KR`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error('영상 요청 실패');
        }

        const data = await response.json();
        console.log('TMDB 영상 데이터:', data.results);

        // 유튜브 예고편 우선 선택
        let video = data.results?.find(
          (video) =>
            video.site === 'YouTube' &&
            video.type === 'Trailer'
        );

        // 예고편 없으면 다른 영상 선택
        if (!video) {
          video = data.results?.find(
            (video) => video.site === 'YouTube'
          );
        }

        // 한국어 영상 없으면 영어 영상 조회
        if (!video) {
          const enResponse = await fetch(
            `https://api.themoviedb.org/3/${type}/${item.id}/videos?api_key=${apiKey}&language=en-US`,
            {
              signal: controller.signal,
            }
          );

          if (!enResponse.ok) {
            throw new Error('영어 영상 요청 실패');
          }

          const enData = await enResponse.json();

          video =
            enData.results?.find(
              (v) =>
                v.site === 'YouTube' &&
                v.type === 'Trailer'
            ) ||
            enData.results?.find(
              (v) => v.site === 'YouTube'
            );
        }

        console.log('선택된 영상:', video);
        console.log('영상 확인:', {
          title: item.title || item.name,
          type,
          id: item.id,
          videoKey: video?.key
        });
        setVideoKey(video?.key || null);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('영상 불러오기 실패:', error);
        }
      }
    };

    fetchVideo();

    return () => controller.abort();
  }, [isHover, item.id, type]);

  return (
    <div
      className="card-hover-content">
      <div className="preview-video-cover">
        {/* 영상이 준비되기 전까지 포스터 표시 */}
        <img
          className={`preview-poster ${isVideoReady ? 'hide' : ''}`}
          src={`https://image.tmdb.org/t/p/w780${
            item.backdrop_path || item.poster_path
          }`}
          alt={name}
        />

        {/* 영상 준비되면 표시 */}
        {isHover && videoKey && (
          <iframe
            key={`${item.id}-${videoKey}`}
            className="preview-video"
            src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoKey}&playsinline=1&disablekb=1&fs=0`}
            title={`${name} 예고편`}
            allow="autoplay; encrypted-media"
            onLoad={() => setIsVideoReady(true)}
            tabIndex={-1}
          />
        )}
      </div>

      <div className="content">
        <h4 className="content-title">{name}</h4>

        <div className="content-info">
          <p className="info-rating">{rating}</p>

          <p className="info-meta">
            <span className="meta-year">{year}</span>
            <span className="meta-genre">
              {type === 'movie' ? '영화' : '시리즈'}
            </span>
          </p>

          <p className="meta-tag quality">HD</p>
        </div>

        <div className="button-box">
          <Link
            to={`/${type}/${item.id}`}
            className="button main-btn icon-play"
          >
            재생하기
          </Link>

          <Link
            to={`/${type}/${item.id}`}
            className="button icon-details"
          >
            상세정보
          </Link>

          <button
            type="button"
            className="button circle-btn icon-dibs"
          >
            <span className="sr-only">찜하기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
