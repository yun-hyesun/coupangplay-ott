import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './Popup.scss';

let openCount = 0;
let savedOverflow = '';
// 공통 팝업: 구매내역 숨김 양식, 포커스/스크롤/닫기/비동기 확인을 한 곳에서 관리합니다.
export const Popup = ({ title, description, children, icon = '!', onClose, onConfirm,
  confirmText = '확인', cancelText = '취소', busy = false, error = '', showClose = false, className = '' }) => {
  const ref = useRef(null);
  const initialFocus = useRef(null);
  const running = useRef(false);
  const mounted = useRef(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState('');
  const locked = busy || pending;
  const state = useRef({ locked, onClose });
  state.current = { locked, onClose };
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    mounted.current = true;
    if (openCount++ === 0) { savedOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    dialog.showModal();
    initialFocus.current?.focus();
    return () => {
      mounted.current = false;
      dialog.close();
      if (--openCount === 0) document.body.style.overflow = savedOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  const close = () => { if (!state.current.locked && !running.current) state.current.onClose(); };
  const confirm = async () => {
    if (running.current || locked) return;
    running.current = true; setPending(true); setFailure('');
    try {
      const result = await onConfirm();
      if (mounted.current && result !== false) onClose();
    } catch { if (mounted.current) setFailure('처리하지 못했습니다. 다시 시도해 주세요.'); }
    finally { running.current = false; if (mounted.current) setPending(false); }
  };
  return createPortal(<dialog ref={ref} className={`common-popup ${className}`} aria-labelledby={titleId}
    aria-describedby={description ? descriptionId : undefined} aria-busy={locked}
    onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target !== event.currentTarget) return; const r = ref.current.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); }}>
    <div className="common-popup__content">
      {showClose && <button className="common-popup__close" aria-label="팝업 닫기" type="button" onClick={close} disabled={locked}>×</button>}
      <div className="common-popup__icon" aria-hidden="true">{icon}</div>
      <h2 id={titleId} className="common-popup__title">{title}</h2>
      {description && <p id={descriptionId} className="common-popup__description">{description}</p>}
      {children && <div className="common-popup__body">{children}</div>}
      {(error || failure) && <p role="alert" className="common-popup__error">{error || failure}</p>}
      <div className="common-popup__actions">
        <button ref={initialFocus} type="button" className="common-popup__button common-popup__button--secondary" onClick={close} disabled={locked}>{cancelText}</button>
        {onConfirm && <button type="button" className="common-popup__button" onClick={confirm} disabled={locked}>{locked ? '처리 중…' : confirmText}</button>}
      </div>
    </div>
  </dialog>, document.body);
};
