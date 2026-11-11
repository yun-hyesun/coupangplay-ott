import { useEffect } from 'react';
import { useMovieStore } from '../../../store/useMovieStore';
import { railConfig } from '../../../data/railConfig';
import {
  makeParams,
  makeRailId,
} from '../../../data/contentQuery';

const EMPTY = [];

export const ChannelBanner = ({
  railKey,
  contentId,
  logo,
  name,
  buttonImg,
  description,
  onSubscribe,
  items: givenItems,
}) => {
  const config = railConfig[railKey];
  const railId = makeRailId(config ?? {});
  const detailKey = `tv-${contentId}`;

  // 채널 작품 목록
  const items = useMovieStore(
    (state) => state.rails[railId] ?? EMPTY
  );

  const onFetchRail = useMovieStore(
    (state) => state.onFetchRail
  );

  // 직접 지정한 작품 정보
  const content = useMovieStore(
    (state) => state.contentDetails[detailKey]
  );

  const onFetchContentDetail = useMovieStore(
    (state) => state.onFetchContentDetail
  );

  useEffect(() => {
    // contentId가 있으면 지정한 작품을 불러오기
    if (contentId) {
      onFetchContentDetail('tv', contentId);
      return;
    }

    // 외부에서 목록을 받았으면 별도로 조회하지 않기
    if (givenItems !== undefined || !config) return;

    // 지정 작품이 없으면 채널 목록 불러오기
    onFetchRail(railId, config.type, makeParams(config));
  }, [
    contentId,
    givenItems,
    config,
    railId,
    onFetchContentDetail,
    onFetchRail,
  ]);

  const image = contentId
    ? content
    : (givenItems ?? items).find(
        (item) => item.backdrop_path
      );

  return (
    <section className="main-banner channel-page-banner">
      <div className='inner'>
        {image?.backdrop_path && (
          <img
            className="banner-image"
            src={`https://image.tmdb.org/t/p/original${image.backdrop_path}`}
            alt=""
          />
        )}
  
        <div className="channel-info">
          <h2 className='channel-title'>
            <img src={logo} alt={name} />
          </h2>
  
          <p>{description}</p>
  
          <button
            type="button"
            className="channel-sign button"
            onClick={onSubscribe}
          >
            <img src={buttonImg} alt={name} /> 구독하기
          </button>
        </div>

      </div>
    </section>
  );
};