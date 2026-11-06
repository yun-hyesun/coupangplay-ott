
import { useState } from 'react';
import '../scss/MyLanguageModal.scss';

export const LanguageModal = ({ onClose }) => {
  const [language, setLanguage] = useState(
    localStorage.getItem('language') || 'ko'
  );

  const handleComplete = () => {
    localStorage.setItem('language', language);
    onClose();
  };

  return (
    <div
      className="language-modal-overlay"
      onClick={onClose}
    >
      <div
        className="language-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="language-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="language-modal-title">언어 설정</h2>

        <p className="language-modal-description">
          언어는 기기의 모든 프로필에 적용됩니다.
        </p>

        <div className="language-modal-options">
          <button
            type="button"
            className={language === 'ko' ? 'active' : ''}
            onClick={() => setLanguage('ko')}
          >
            <span className="language-modal-check">
              {language === 'ko' ? '✓' : ''}
            </span>
            한국어
          </button>

          <button
            type="button"
            className={language === 'en' ? 'active' : ''}
            onClick={() => setLanguage('en')}
          >
            <span className="language-modal-check">
              {language === 'en' ? '✓' : ''}
            </span>
            English
          </button>
        </div>

        <p className="language-modal-notice">
          영문 버전은 한국에 거주하는 비한국어 사용자의
          <br />
          편의를 위해 제공되는 서비스로,
          <br />
          일부 내용이 지원되지 않을 수 있습니다.
          <br />
          영문과 국문이 다를 시 국문이 우선되므로,
          <br />
          정확한 정보 파악을 위해 한국어 버전을 확인해 주세요.
        </p>

        <div className="language-modal-buttons">
          <button type="button" onClick={handleComplete}>
            완료
          </button>
          <button type="button" onClick={onClose}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
};
