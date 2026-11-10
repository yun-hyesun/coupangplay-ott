import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import linkIcon from '../../assets/share/0ceb9.svg';
import facebookMask from '../../assets/share/93158.svg';
import facebookIcon from '../../assets/share/468c7.svg';
import closeIcon from '../../assets/share/19011.svg';
import emailIcon from '../../assets/share/b5c67.svg';
import './SharePopup.scss';

export const SharePopup = ({ title, type, url, onClose }) => {
  const dialogRef = useRef(null);
  const linkRef = useRef(null);
  const closeRef = useRef(null);
  const copying = useRef(false);
  const mounted = useRef(false);
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState(false);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    mounted.current = true;
    dialog.showModal();
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      mounted.current = false;
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);
  const copyLink = async () => {
    if (copying.current) return;
    copying.current = true;
    try {
      let success = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          success = true;
        }
      } catch { /* 권한 거부 또는 비보안 환경에서는 선택 복사를 시도합니다. */ }
      if (!mounted.current) return;
      if (!success) {
        linkRef.current.focus(); linkRef.current.select();
        success = document.execCommand('copy');
      }
      setCopied(success);
      setStatus(success ? '링크가 복사되었습니다.' : '자동 복사를 사용할 수 없습니다. 링크를 선택해 직접 복사해 주세요.');
    } catch {
      if (mounted.current) setStatus('링크를 선택해 직접 복사해 주세요.');
    } finally { copying.current = false; }
  };
  const encodedUrl = encodeURIComponent(url);
  return createPortal(<dialog ref={dialogRef} className="share-popup" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}>
    <div className="share-popup__content">
      <header className="share-popup__header">
        <h2 id={titleId}>공유하기</h2>
        <button ref={closeRef} className="share-popup__close" type="button" aria-label="공유하기 닫기" onClick={onClose}><img src={closeIcon} alt="" /></button>
      </header>
      <div className="share-popup__summary"><p>{type === 'tv' ? '시리즈' : '영화'}</p><h3>{title}</h3></div>
      <div className="share-popup__channels">
        <p>친구에게 콘텐츠를 공유해 보세요.</p>
        <div className="share-popup__socials">
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Facebook으로 공유 (새 창)">
            <span className="share-popup__icon-slot"><span className="share-popup__facebook" style={{ maskImage: `url(${facebookMask})` }}><img src={facebookIcon} alt="" /></span></span><span>Facebook</span>
          </a>
          <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(title)}`} target="_blank" rel="noopener noreferrer" aria-label="X로 공유 (새 창)"><span className="share-popup__icon-slot share-popup__x" aria-hidden="true">X</span><span>X</span></a>
          <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title}\n${url}`)}`} aria-label="이메일로 공유"><span className="share-popup__icon-slot"><img src={emailIcon} alt="" /></span><span>이메일</span></a>
        </div>
      </div>
      <div className="share-popup__links"><label htmlFor={`${titleId}-url`}>콘텐츠 링크</label>
        <div className="share-popup__link-row"><div className="share-popup__link-field"><img src={linkIcon} alt="" /><input ref={linkRef} id={`${titleId}-url`} value={url} readOnly onFocus={event => event.target.select()} /></div>
          <button type="button" className="share-popup__copy" onClick={copyLink}>{copied ? '복사 완료' : '링크 복사'}</button>
        </div>
        {status && <p className="share-popup__status" role="status">{status}</p>}
      </div>
      <p className="share-popup__hint">링크를 받은 사람은 콘텐츠 상세 페이지로 이동합니다.</p>
    </div>
  </dialog>, document.body);
};
