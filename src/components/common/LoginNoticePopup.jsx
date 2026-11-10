import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import closeIcon from '../../assets/share/19011.svg';
import './LoginNoticePopup.scss';

export const LoginNoticePopup = ({ onClose }) => {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const navigate = useNavigate();
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="login-notice-popup"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }}
    >
      <div className="login-notice-popup__content">
        <header className="login-notice-popup__header">
          <h2 id={titleId}>로그인 후 이용해 주세요</h2>
          <button ref={closeRef} className="login-notice-popup__close" type="button" aria-label="로그인 안내 닫기" onClick={onClose}>
            <img src={closeIcon} alt="" />
          </button>
        </header>
        <p id={descriptionId} className="login-notice-popup__description">
          찜한 콘텐츠를 저장하려면<br />로그인 후 프로필을 선택해 주세요.
        </p>
        <div className="login-notice-popup__actions">
          <button className="login-notice-popup__cancel" type="button" onClick={onClose}>취소</button>
          <button className="login-notice-popup__login" type="button" onClick={() => { onClose(); navigate('/login'); }}>로그인</button>
        </div>
      </div>
    </dialog>, document.body
  );
};
