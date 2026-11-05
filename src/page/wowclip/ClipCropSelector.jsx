import { useRef } from 'react';
import { clipPresentation, cropLeftPercent, PORTRAIT_CROP_WIDTH } from './clipPresentation';

export const ClipCropSelector = ({ value, onChange }) => {
  const dragRef = useRef(null);
  return <div className="wowclip-crop-overlay"><button type="button" className="wowclip-crop-frame" role="slider" aria-label="세로 화면 위치" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} aria-valuetext={Math.round(value) + '%'} style={{ width: PORTRAIT_CROP_WIDTH * 100 + '%', left: cropLeftPercent(value) + '%' }} onPointerDown={(event) => {
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, value, width: event.currentTarget.parentElement.clientWidth * (1 - PORTRAIT_CROP_WIDTH) };
  }} onPointerMove={(event) => { const drag = dragRef.current; if (drag) onChange(clipPresentation({ cropX: drag.value + (event.clientX - drag.x) / drag.width * 100 }).cropX); }} onPointerUp={() => { dragRef.current = null; }} onLostPointerCapture={() => { dragRef.current = null; }} onKeyDown={(event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 100 : value + (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 10 : 1);
    onChange(clipPresentation({ cropX: next }).cropX);
  }}><i /><i /><i /><i /></button></div>;
};
