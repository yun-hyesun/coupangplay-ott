import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import { Link } from 'react-router-dom';

// Swiper 기본 스타일 임포트
import 'swiper/css';
import 'swiper/css/pagination';

const channelList = [
  { img: "/images/channal01.svg", art: "EBS ON", path: "/ebs" },
  { img: "/images/channal02.svg", art: "스포츠패스", path: "/sports" },
  { img: "/images/channal03.svg", art: "키즈+", path: "/kids" },
  { img: "/images/channal04.svg", art: "Adult", path: "/adult" },
  { img: "/images/channal05.svg", art: "K LEAGUE 1", path: "/kleague" },
  { img: "/images/channal07.svg", art: "JTBC", path: "/jtbc" },
  { img: "/images/channal08.svg", art: "CBS", path: "/cbs" },
  { img: "/images/channal09.svg", art: "SONY PICTURES", path: "/sony" },
  { img: "/images/channal10.svg", art: "M.OA", path: "/moa" },
  { img: "/images/channal11.svg", art: "JPlus", path: "/jplus" },
  { img: "/images/channal12.svg", art: "HBO", path: "/hbo" }
];

export const Channel = () => {
  const [isMobile, setIsMobile] = useState(false);

  // 화면 크기에 따라 모바일 여부 상태 업데이트 (기준: 768px)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 2410px)');
    
    // 초기값 설정
    setIsMobile(mediaQuery.matches);

    // 화면 크기가 바뀔 때마다 감지
    const handleResize = (e) => {
      setIsMobile(e.matches);
    };

    mediaQuery.addEventListener('change', handleResize);
    return () => mediaQuery.removeEventListener('change', handleResize);
  }, []);

  return (
    <div className="channel">
      {isMobile ? (
        /* 모바일 화면일 때: Swiper 슬라이드 적용 */
        <Swiper
          modules={[Pagination]}
          spaceBetween={12}
          slidesPerView="auto"
          observer={true}
          observeParents={true}
          className="channel-swiper"
        >
          {channelList.map((channel, id) => (
            <SwiperSlide key={id}>
              <Link to={channel.path} className="channel-item">
                <img src={channel.img} alt={channel.art} />
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      ) : (
        /* PC 화면일 때: 일반 리스트 (그리드 또는 Flex) */
        <div className="channel-flex">
          {channelList.map((channel, id) => (
            <Link to={channel.path} key={id} className="channel-item">
              <img src={channel.img} alt={channel.art} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}