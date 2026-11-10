import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import WatchIcon from '../../watch/WatchIcon';

const clipIcons = { scissors: 'scissors', spoiler: 'eye-off' };

export const ClipIcon = ({ name, size = 24, filled = false }) => {
  if (name === 'heart' || name === 'like') return <span className="wowclip-icon" style={{ width: size, height: size, flexBasis: size }}><svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {name === 'heart' ? <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" /> : <><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 3a3.1 3.1 0 0 1 3 2.88Z" /><path d="M7 10v12" fill="none" stroke={filled ? 'var(--wow-card)' : 'currentColor'} /></>}
  </svg></span>;
  if (!clipIcons[name]) return <span className="wowclip-icon" style={{ width: size, height: size, flexBasis: size }}><span style={{ display: 'inline-flex', transform: 'scale(' + size / 24 + ')' }}><WatchIcon name={name} /></span></span>;
  return <span className="wowclip-icon" style={{ width: size, height: size, flexBasis: size }}><img src={`/images/wowclip/${clipIcons[name]}.svg`} alt="" width={24} height={24} style={{ transform: `scale(${size / 24})` }} /></span>;
};

export const IconButton = ({ icon, label, ...props }) => (
  <button type="button" className="wowclip-icon-button" aria-label={label} title={label} {...props}><ClipIcon name={icon} /></button>
);

export const ClipSort = ({ value, onChange, comments = false }) => (
  <div className="wowclip-sort" role="group" aria-label={comments ? '댓글 정렬' : '클립 정렬'}>
    {[['popular', comments ? '좋아요순' : '인기순'], ['recent', '최신순']].map(([key, label]) => (
      <button type="button" key={key} aria-pressed={value === key} onClick={() => onChange(key)}>{label}</button>
    ))}
  </div>
);

export const ClipModal = ({ title, onClose, children, className = '', icon }) => {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    dialog.focus();
    const keyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')]
        .filter((element) => !element.disabled && element.getClientRects().length);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement) || document.activeElement === dialog)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement) || document.activeElement === dialog)) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', keyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', keyDown);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <div className="wowclip-overlay" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`wowclip-modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} ref={dialogRef}>
        <div className="wowclip-modal-heading">
          {icon && <ClipIcon name={icon} />}
          <h2 id={titleId}>{title}</h2>
          <IconButton icon="close" label="닫기" onClick={onClose} />
        </div>
        {children}
      </section>
    </div>, document.body,
  );
};
