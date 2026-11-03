import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useMovieStore } from '../../store/useMovieStore';
import { ContentRail } from '../../components/content/ContentRail';
import './Detail.scss';

const EMPTY = [];
const IMG = 'https://image.tmdb.org/t/p/original';
const imageUrl = (path) => path ? `${IMG}${path}` : '';

export const Detail = () => {
  const { type, id } = useParams();
  const { state } = useLocation();
  const [season, setSeason] = useState('1');
  const [openedEpisode, setOpenedEpisode] = useState(null);

  const key = `${type}-${id}`;
  const fetched = useMovieStore(s => s.contentDetails[key]);
  const recommendations = useMovieStore(s => s.detailRecommendations[key] ?? EMPTY);
  const loading = useMovieStore(s => s.detailLoading[key]);
  const error = useMovieStore(s => s.detailErrors[key]);
  const onFetchContentDetail = useMovieStore(s => s.onFetchContentDetail);
  const seasons = useMovieStore(s => s.seasons[id] ?? EMPTY);
  const episodes = useMovieStore(s => s.episodes[`${id}-${season}`] ?? EMPTY);
  const onFetchSeason = useMovieStore(s => s.onFetchSeason);
  const onFetchEpisode = useMovieStore(s => s.onFetchEpisode);

  useEffect(() => {
    if ((type === 'tv' || type === 'movie') && id) {
      onFetchContentDetail(type, id);
      if (type === 'tv') onFetchSeason(id);
    }
  }, [type, id, onFetchContentDetail, onFetchSeason]);

  useEffect(() => {
    if (type !== 'tv' || !id || !seasons.length) return;
    const available = seasons.filter(s => s.season_number >= 0);
    const selected = available.some(s => String(s.season_number) === season) ? season : String(available[0]?.season_number ?? 1);
    if (selected !== season) { setSeason(selected); return; }
    onFetchEpisode(id, Number(selected));
  }, [type, id, seasons, season, onFetchEpisode]);

  const content = fetched ?? state?.content ?? {};
  const title = content.title || content.name || '작품 정보';
  const overview = content.overview || '등록된 작품 소개가 없습니다.';
  const backdrop = imageUrl(content.backdrop_path);
  const watchState = { content, episodes, seasonNumber: Number(season) };

  return (
    <main className="detail-page">
      <div className="detail-page__inner">
        {loading && !fetched && <p role="status">작품 정보를 불러오는 중입니다.</p>}
        {error && <p role="alert">{error}</p>}
        <section className="detail-hero" aria-labelledby="detail-title">
          {backdrop && <img className="detail-hero__image" src={backdrop} alt="" />}
          <div className="detail-hero__shade" />
          <div className="detail-hero__content">
            <span className="detail-hero__category">{type === 'tv' ? '시리즈' : '영화'}</span>
            <h1 id="detail-title">{title}</h1>
            <p className="detail-hero__description">{overview}</p>
            <div className="detail-hero__actions">
              <Link className="detail-button detail-button--primary" to={`/watch/${type}/${id}`} state={watchState}>▶ 재생하기</Link>
              <button className="detail-button detail-button--outline" type="button" disabled title="찜 기능 연결 예정">＋ 찜하기</button>
            </div>
          </div>
        </section>

        <section className="detail-info" aria-label="작품 정보">
          <div className="detail-info__main"><h2>작품 정보</h2><p>{overview}</p></div>
          <dl className="detail-info__metadata">
            <div><dt>공개</dt><dd>{content.first_air_date || content.release_date || '정보 없음'}</dd></div>
            <div><dt>평점</dt><dd>{typeof content.vote_average === 'number' ? content.vote_average.toFixed(1) : '정보 없음'}</dd></div>
            <div><dt>장르</dt><dd>{(content.genres ?? []).map(g => g.name).join(', ') || '정보 없음'}</dd></div>
          </dl>
        </section>

        {type === 'tv' && (
          <section className="detail-episodes" aria-labelledby="episodes-title">
            <div className="detail-section-heading">
              <h2 id="episodes-title">회차</h2>
              <label className="detail-season-select"><span className="sr-only">시즌 선택</span>
                <select value={season} onChange={e => { setSeason(e.target.value); setOpenedEpisode(null); }}>
                  {seasons.filter(s => s.season_number >= 0).map(s => <option key={s.id} value={s.season_number}>{s.name || `시즌 ${s.season_number}`}</option>)}
                  {!seasons.length && <option value="1">시즌 1</option>}
                </select>
              </label>
            </div>
            <div className="detail-episodes__list">
              {!episodes.length && <p className="detail-empty">회차 정보를 불러오는 중이거나 등록된 회차가 없습니다.</p>}
              {episodes.map(ep => (
                <article className="episode-item" key={ep.id}>
                  <div className="episode-item__main">
                    <Link className="episode-item__thumbnail" to={`/watch/tv/${id}`} state={{ ...watchState, episodeNumber: ep.episode_number }} aria-label={`${ep.episode_number}화 재생`}>
                      {ep.still_path ? <img src={imageUrl(ep.still_path)} alt="" /> : <span className="episode-item__placeholder">{ep.episode_number}화</span>}
                      <span className="episode-item__play">▶</span>
                    </Link>
                    <div className="episode-item__body">
                      <div className="episode-item__top"><h3>{ep.episode_number}화 · {ep.name}</h3><span>{ep.runtime ? `${ep.runtime}분` : ''}</span></div>
                      <p>{ep.overview || '줄거리가 등록되지 않았습니다.'}</p>
                      <div className="episode-item__bottom"><span>★ {typeof ep.vote_average === 'number' ? ep.vote_average.toFixed(1) : '-'}</span>
                        <button type="button" aria-expanded={openedEpisode === ep.id} onClick={() => setOpenedEpisode(openedEpisode === ep.id ? null : ep.id)}>
                          리뷰 {openedEpisode === ep.id ? '접기 ▲' : '보기 ▼'}
                        </button>
                      </div>
                    </div>
                  </div>
                  {openedEpisode === ep.id && <div className="episode-item__reviews"><div className="episode-item__reviews-head"><h4>{ep.episode_number}화 감상평</h4></div><p>이곳에 팀 프로젝트의 리뷰 데이터를 연결할 수 있어요.</p></div>}
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="detail-recommend" aria-labelledby="recommend-title">
          {recommendations.length > 0 && (
            <div className="detail-recommend">
              <ContentRail
                title="이런 작품은 어때요?"
                type={type}
                imageType="가로"
                slideView={6}
                items={recommendations}
                showMore={false}
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
