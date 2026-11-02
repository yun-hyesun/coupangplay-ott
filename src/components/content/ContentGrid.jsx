import { ContentCard } from './ContentCard';
import './scss/ContentRail.scss';
import './scss/ContentGrid.scss';

// 더보기·검색에서 재사용. API 호출 없이 전달된 items만 그린다.
export const ContentGrid = ({ items = [], type = 'all', imageType = '세로', variant = 'default' }) => {
  const visible = items.filter((item) => imageType === '세로' ? item.poster_path : item.backdrop_path);
  
  return (
    <div className="contentGrid">
      {visible.map((item, index) => (
        <ContentCard key={`${item.media_type || type}-${item.id}`} item={item} type={type} imageType={imageType} variant={variant} index={index} />
      ))}
    </div>
  );
};
