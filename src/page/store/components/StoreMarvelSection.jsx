import { useEffect, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Keyboard } from 'swiper/modules';
import 'swiper/css';
import { Link } from 'react-router-dom';
import { useMovieStore } from '../../../store/useMovieStore';
import { railConfig } from '../../../data/railConfig';
import { makeParams, makeRailId } from '../../../data/contentQuery';
import { storeMarvelPosters } from './StoreMarvelData';
import chevronRight from '../assets/marvel/chevron-right.svg';

const config = railConfig['store-marvel'];
const railId = makeRailId(config);
const EMPTY = [];
const collectionHref = '/more?rail=store-marvel';
const normalize = value => (value || '').toLowerCase().replace(/[\s:.*·-]/g, '');

// Figma 5598:111960. 공용 카드 대신 공식 아트/작품 타이틀을 조합한 기획전 전용 카드입니다.
export const StoreMarvelSection = () => {
 const swiperRef = useRef(null);
 const [position,setPosition] = useState({prev:false,next:true});
 const items = useMovieStore(s=>s.rails[railId] ?? EMPTY);
 const onFetchRail = useMovieStore(s=>s.onFetchRail);
 useEffect(()=>{onFetchRail(railId,config.type,makeParams(config));},[onFetchRail]);
 const updatePosition = swiper => setPosition({
  prev: !swiper.isBeginning && !swiper.isLocked,
  next: !swiper.isEnd && !swiper.isLocked,
 });
 const move = direction => {
  const swiper = swiperRef.current;
  if (!swiper || swiper.destroyed) return;
  if (direction < 0) swiper.slidePrev(); else swiper.slideNext();
 };
 return <section className="store-marvel" aria-labelledby="store-marvel-title">
  <div className="store-marvel__panel">
   <div className="store-marvel__intro">
    <h2 id="store-marvel-title">마블 히어로즈<br/>정주행하기</h2>
    <p>마블의 세계를<br/>한 편씩 이어보세요.</p>
    <Link className="store-marvel__more" to={collectionHref} state={{from:'/store'}}>기획전 둘러보기</Link>
   </div>
   <div className="store-marvel__slider">
    <Swiper
     className="store-marvel__viewport"
     modules={[A11y, Keyboard]}
     slidesPerView="auto"
     slidesPerGroup={1}
     spaceBetween={20}
     watchOverflow
     grabCursor
     simulateTouch
     keyboard={{ enabled: true, onlyInViewport: true }}
     a11y={{ prevSlideMessage: '이전 마블 작품', nextSlideMessage: '다음 마블 작품' }}
     onSwiper={swiper => { swiperRef.current = swiper; updatePosition(swiper); }}
     onSlideChange={updatePosition}
     onResize={updatePosition}
     onLock={updatePosition}
     onUnlock={updatePosition}
    >
      {storeMarvelPosters.map(card=>{
       // 판매 데이터와 정확히 일치하는 작품만 상세로 연결합니다. 미조회 작품은 기획전으로 이동합니다.
       const item=items.find(item=>normalize(item.title || item.name)===normalize(card.name));
       return <SwiperSlide key={card.name}><Link className="store-marvel__card" to={item?`/detail/movie/${item.id}?from=store`:collectionHref} state={item?{fromStore:true,content:item}:{from:'/store'}} aria-label={`${card.name} ${item?'상세보기':'기획전 보기'}`}>
        <img className="store-marvel__art" src={card.poster} alt="" loading="lazy"/>
        <span className="store-marvel__shade"/>
        <img className="store-marvel__title" src={card.title} alt={card.name} style={card.titleBox} loading="lazy"/>
        <span className="store-marvel__badge">{card.badge}</span>
       </Link></SwiperSlide>;
      })}
    </Swiper>
    <button className="store-marvel__arrow store-marvel__arrow--prev" type="button" aria-label="이전 마블 작품" onClick={()=>move(-1)} disabled={!position.prev}><img src={chevronRight} alt=""/></button>
    <button className="store-marvel__arrow store-marvel__arrow--next" type="button" aria-label="다음 마블 작품" onClick={()=>move(1)} disabled={!position.next}><img src={chevronRight} alt=""/></button>
   </div>
  </div>
 </section>;
};
