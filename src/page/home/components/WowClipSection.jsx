import { Link, useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Navigation } from 'swiper/modules';
import { ContentTitle } from '../../../components/content/ContentTitle';
import { ClipCard } from '../../wowclip/components/ClipCard';
import { useWowClipLibrary } from '../../wowclip/hooks/useWowClipLibrary';
import { clipLikeCount } from '../../wowclip/utils/cloudClipData';
import 'swiper/css';
import 'swiper/css/navigation';
import '../../../components/content/scss/ContentRail.scss';
import '../../wowclip/scss/WowClip.scss';
import '../scss/WowClipSection.scss';

export const WowClipSection = () => {
  const navigate = useNavigate();
  const { clips, error, reload, loading } = useWowClipLibrary();
  const publicClips = clips.filter((clip) => clip.visibility === 'public')
    .sort((a, b) => clipLikeCount(b) - clipLikeCount(a) || new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  return <section className="home-wowclip wowclip-section" aria-label="함께 나누는 와우 클립">
    <div className="home-wowclip-heading">
      <ContentTitle title="함께 나누는 와우 클립" />
      <Link className="contentRail-more" to="/wowclip">더보기</Link>
    </div>
    {loading ? <div className="home-wowclip-empty" role="status">클립을 불러오고 있어요.</div> : error ? <div className="home-wowclip-empty" role="alert"><p>{error}</p><button type="button" className="wowclip-text-button" onClick={reload}>다시 불러오기</button></div>
      : publicClips.length ? <Swiper
          className="home-wowclip-slider"
          modules={[Navigation, A11y]}
          slidesPerView="auto"
          spaceBetween={12}
          breakpoints={{ 641: { spaceBetween: 20 } }}
          navigation
          grabCursor
          watchOverflow
          a11y={{
            notificationClass: 'sr-only',
            containerMessage: '함께 나누는 와우 클립 슬라이드',
            containerRoleDescriptionMessage: '슬라이드',
            itemRoleDescriptionMessage: '클립',
            prevSlideMessage: '이전 클립',
            nextSlideMessage: '다음 클립',
            firstSlideMessage: '첫 번째 클립이에요.',
            lastSlideMessage: '마지막 클립이에요.',
            slideLabelMessage: '{{index}} / {{slidesLength}}',
          }}
        >{publicClips.map((clip) => <SwiperSlide key={clip.id}><ClipCard clip={clip} onOpen={(selected) => navigate(`/wowclip?clip=${encodeURIComponent(selected.id)}`)} /></SwiperSlide>)}</Swiper>
        : <div className="home-wowclip-empty"><p>아직 공개된 클립이 없어요.</p><p>영상을 보다가 마음에 드는 장면을 클립으로 나눠보세요.</p></div>}
  </section>;
};
