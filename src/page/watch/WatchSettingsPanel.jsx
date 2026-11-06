import WatchIcon from './WatchIcon';

const OPTIONS = [
  { tab: 'quality', label: '해상도' },
  { tab: 'speed', label: '재생속도' },
  { tab: 'subtitles', label: '자막' },
  { tab: 'audio', label: '음성' },
];
const SPEEDS = [0.5, 1, 1.5, 2];
const CHOICES = {
  quality: ['360', '480', '720', '1080'],
  subtitles: ['끄기', '한국어', '영어', '일본어', '중국어', '스페인어', '프랑스어'],
  audio: ['한국어', '영어'],
};

export default function WatchSettingsPanel({ tab, onTabChange, speed, quality, subtitle, audio, onSelect, onClose }) {
  const values = { quality, speed, subtitles: subtitle, audio };
  const choices = tab === 'speed'
    ? SPEEDS.map(value => ({ value, label: `${value.toFixed(1)}배속` }))
    : (CHOICES[tab] || []).map(value => ({ value, label: value }));

  return <aside className="watch-settings-popup" aria-label="영상 설정">
    <div className="watch-settings-popup__header">
      {tab !== 'main' && <button type="button" onClick={() => onTabChange('main')} aria-label="설정 메뉴로 돌아가기"><WatchIcon name="back" /></button>}
      <strong>{tab === 'main' ? '설정' : OPTIONS.find(option => option.tab === tab)?.label}</strong>
      <button type="button" className="watch-settings-popup__close" onClick={onClose} aria-label="설정 닫기"><WatchIcon name="close" /></button>
    </div>
    <div className="watch-settings-popup__list">
      {tab === 'main' ? OPTIONS.map(option => <button type="button" key={option.tab} onClick={() => onTabChange(option.tab)}>
        <span>{option.label}</span><span className="watch-settings-popup__meta">{option.tab === 'speed' ? `${speed.toFixed(1)}배속` : values[option.tab]} <span aria-hidden="true">›</span></span>
      </button>) : choices.map(choice => <button type="button" key={choice.label} aria-pressed={values[tab] === choice.value} onClick={() => onSelect(tab, choice.value)}>
        <span>{choice.label}</span>{values[tab] === choice.value && <span className="watch-settings-popup__check" aria-hidden="true">✓</span>}
      </button>)}
    </div>
  </aside>;
}
