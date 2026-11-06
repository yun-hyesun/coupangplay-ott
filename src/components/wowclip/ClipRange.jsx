import { formatClipTime } from './formatClipTime';

// A focused, keyboard-accessible 20-second context window, matching the Figma trim bar.
export function ClipRange({ start, end, onChange, min, max }) {
  const span = Math.max(1, max - min);
  const left = ((start - min) / span) * 100;
  const right = ((end - min) / span) * 100;
  const changeStart = (value) => onChange(Math.min(Number(value), end - 1), end);
  const changeEnd = (value) => onChange(start, Math.max(Number(value), start + 1));
  return (
    <div className="wow-clip-range">
      <div className="wow-clip-range__labels"><span>{formatClipTime(min)}</span><span>{formatClipTime(max)}</span></div>
      <div className="wow-clip-range__track" aria-label="클립 구간 선택">
        <div className="wow-clip-range__ticks" aria-hidden="true" />
        <div className="wow-clip-range__selection" style={{ left: `${left}%`, width: `${right - left}%` }} aria-hidden="true" />
        <input className="wow-clip-range__input wow-clip-range__input--start" type="range" min={min} max={Math.max(min, end - 1)} step="1" value={start} onChange={(event) => changeStart(event.target.value)} aria-label="클립 시작 시간" aria-valuetext={formatClipTime(start)} />
        <input className="wow-clip-range__input wow-clip-range__input--end" type="range" min={Math.min(max, start + 1)} max={max} step="1" value={end} onChange={(event) => changeEnd(event.target.value)} aria-label="클립 종료 시간" aria-valuetext={formatClipTime(end)} />
      </div>
      <div className="wow-clip-range__summary"><span>시작 {formatClipTime(start)}{'\u3000'} 종료 {formatClipTime(end)}</span><strong>{end - start}초</strong></div>
    </div>
  );
}
