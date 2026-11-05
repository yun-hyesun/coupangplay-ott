import { clipImage, contentTitle } from './wowClipData';
import { clipPresentation, formatViews, sourceLeftPercent } from './clipPresentation';
import { ClipIcon } from './WowClipUi';
import './ClipCard.scss';

export const ClipCard = ({ clip, onOpen }) => {
  const { layout, cropX } = clipPresentation(clip);
  const image = clipImage(clip, clip.spoiler);
  const title = clip.spoiler ? contentTitle(clip.content) + '에서 오린 장면' : clip.title;
  return <button type="button" className={'wowclip-card wowclip-card--short wowclip-card--' + layout + (clip.spoiler ? ' is-protected' : '')} onClick={() => onOpen(clip)} aria-label={(clip.spoiler ? '스포일러 포함, ' : '') + title + ' 클립 보기'}>
    {image && <><img className="wowclip-card-backdrop" src={image} alt="" loading="lazy" /><span className="wowclip-card-picture"><img src={image} alt="" loading="lazy" style={layout === 'portrait' && !clip.spoiler ? { width: '316.049383%', left: sourceLeftPercent(cropX) + '%' } : undefined} /></span></>}
    {clip.spoiler && <span className="wowclip-spoiler-cover"><ClipIcon name="spoiler" /><span>스포일러가 있어요</span></span>}
    <span className="wowclip-card-caption"><strong>{title}</strong><span className="wowclip-card-author">{clip.author}</span><span className="wowclip-card-views"><svg aria-hidden="true" width="11" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"><path d="m3 2 7 4-7 4Z" /></svg><span className="sr-only">재생 수 </span>{formatViews(clip.views)}</span></span>
  </button>;
};
