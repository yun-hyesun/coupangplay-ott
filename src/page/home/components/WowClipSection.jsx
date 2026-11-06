import { Link, useNavigate } from 'react-router-dom';
import { ContentTitle } from '../../../components/content/ContentTitle';
import { ClipCard } from '../../wowclip/components/ClipCard';
import { useWowClipLibrary } from '../../wowclip/hooks/useWowClipLibrary';
import '../../wowclip/scss/WowClip.scss';
import '../scss/WowClipSection.scss';

export const WowClipSection = () => {
  const navigate = useNavigate();
  const { clips, error, reload } = useWowClipLibrary();
  const publicClips = clips.filter((clip) => clip.visibility === 'public')
    .sort((a, b) => b.likes.length - a.likes.length || new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  return <section className="home-wowclip wowclip-section" aria-label="함께 나누는 와우 클립">
    <div className="home-wowclip-heading">
      <ContentTitle title="함께 나누는 와우 클립" />
      <Link className="home-wowclip-more" to="/wowclip">전체 보기<img src="/images/wowclip/chevron-right.svg" alt="" width="16" height="16" /></Link>
    </div>
    {error ? <div className="home-wowclip-empty" role="alert"><p>{error}</p><button type="button" className="wowclip-text-button" onClick={reload}>다시 불러오기</button></div>
      : publicClips.length ? <div className="home-wowclip-grid">{publicClips.map((clip) => <ClipCard key={clip.id} clip={clip} onOpen={(selected) => navigate(`/wowclip?clip=${encodeURIComponent(selected.id)}`)} />)}</div>
        : <div className="home-wowclip-empty"><p>아직 공개된 클립이 없어요.</p><p>영상을 보다가 마음에 드는 장면을 클립으로 나눠보세요.</p></div>}
  </section>;
};
