import CommonIcon from '../../../components/common/CommonIcon';
import { clipPreview } from '../utils/wowClipData';
import { clipPresentation, formatViews, sourceLeftPercent } from '../utils/clipPresentation';
import { ClipIcon } from './WowClipUi';
import '../scss/ClipCard.scss';

export const ClipCard = ({ clip, onOpen, protectedClip = clip.spoiler }) => {
  const { layout, cropX } = clipPresentation(clip);
  const { image, title } = clipPreview(clip, protectedClip);
  return <button type="button" className={'wowclip-card wowclip-card--short wowclip-card--' + layout + (protectedClip ? ' is-protected' : '')} onClick={() => onOpen(clip)} aria-label={(protectedClip ? '스포일러 포함, ' : '') + title + ' 클립 보기'}>
    {image && <><img className="wowclip-card-backdrop" src={image} alt="" loading="lazy" /><span className="wowclip-card-picture"><img src={image} alt="" loading="lazy" style={layout === 'portrait' && !protectedClip ? { width: '316.049383%', left: sourceLeftPercent(cropX) + '%' } : undefined} /></span></>}
    {protectedClip && <span className="wowclip-spoiler-cover"><ClipIcon name="spoiler" /><span>스포일러가 있어요</span></span>}
    <span className="wowclip-card-caption">
      <strong>{title}</strong>
      <span className="wowclip-card-author">{clip.author}</span>
      <span className="wowclip-card-views"><CommonIcon name="play-outline" size={12} /><span className="sr-only">재생 수 </span>{formatViews(clip.views)}</span>
    </span>
  </button>;
};
