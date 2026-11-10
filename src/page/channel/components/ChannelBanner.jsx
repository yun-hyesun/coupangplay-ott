import { useEffect } from 'react';
import { useMovieStore } from '../../../store/useMovieStore';
import { railConfig } from '../../../data/railConfig';
import { makeParams, makeRailId } from '../../../data/contentQuery';

const EMPTY = [];

export const ChannelBanner = ({
  railKey,
  logo,
  name,
  description,
  onSubscribe,
  items: givenItems,
}) => {
  const config = railConfig[railKey];
  const railId = makeRailId(config ?? {});

  const items = useMovieStore(
    (state) => state.rails[railId] ?? EMPTY
  );
  const onFetchRail = useMovieStore(
    (state) => state.onFetchRail
  );

  useEffect(() => {
    if (!config || givenItems !== undefined) return;

    onFetchRail(railId, config.type, makeParams(config));
  }, [railId, config, givenItems, onFetchRail]);

  const image = (givenItems ?? items).find(
    (item) => item.backdrop_path
  );

  return (
    <section className="main-banner channel-page-banner">
      <div className='inner'>
        {image && (
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
            {name} 가입하기
          </button>
        </div>

      </div>
    </section>
  );
};