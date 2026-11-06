import { Link, useNavigate, useParams } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import { categorySections } from '../../data/categoryConfig';

import 'swiper/css';
import 'swiper/css/navigation';
import './scss/CategoryMenu.scss';

export const CategoryMenu = ({ section, variant = 'slide' }) => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const config = categorySections[section];

  if (!config) return null;

  if (variant === 'dropdown') {
    return (
      <div className="categoryMenu categoryMenu--dropdown">
        <label htmlFor="category-select" className="sr-only">
          {config.label} 카테고리 선택
        </label>

        <select
          id="category-select"
          value={categoryId || ''}
          onChange={(event) => {
            navigate(`/category/${section}/${event.target.value}`);
          }}
        >
          <option value="" disabled>카테고리 선택</option>

          {config.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <nav
      className="categoryMenu categoryMenu--slide"
      aria-label={`${config.label} 카테고리`}
    >
      <Swiper
        modules={[Navigation]}
        navigation
        slidesPerView="auto"
        spaceBetween={10}
        watchOverflow
      >
        {config.categories.map((category) => (
          <SwiperSlide key={category.id}>
            <Link
              className="categoryMenu-button"
              to={`/category/${section}/${category.id}`}
            >
              {category.label}
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </nav>
  );
};