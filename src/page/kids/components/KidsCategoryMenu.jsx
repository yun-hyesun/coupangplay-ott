import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, A11y } from 'swiper/modules';
import { categorySections } from '../../../data/categoryConfig';
import { ContentTitle } from '../../../components/content/ContentTitle';
import 'swiper/css';
import 'swiper/css/navigation';
import './KidsCategoryMenu.scss';

export const KidsCategoryMenu = () => (
  <section className="kidsCategoryMenu">
    <div className="kidsCategoryMenu-heading">
      <ContentTitle title="좋아하는 캐릭터를 만나보세요" />
      <Link to="/category/kids/all">전체 보기</Link>
    </div>
    <Swiper
      modules={[Navigation, A11y]}
      navigation
      slidesPerView="auto"
      spaceBetween={10}
    >
      {categorySections.kids.categories.filter((item) => item.image).map((item) => (
        <SwiperSlide key={item.id}>
          <Link to={`/category/kids/${item.id}`} aria-label={`${item.label} 모아보기`}>
            <img src={item.image} alt={item.label} loading="lazy" />
          </Link>
        </SwiperSlide>
      ))}
    </Swiper>
  </section>
);
