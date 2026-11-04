import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { policyData } from './policyData';
import './Policy.scss';

export const Policy = () => {
  const { pathname } = useLocation();
  const policy = policyData.find((item) => item.path === pathname) || policyData[0];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const closeRef = useRef(null);

  useEffect(() => {
    setIsModalOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  useEffect(() => {
    if (!isModalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setIsModalOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isModalOpen]);

  return (
    <main className="policy-page">
      <div className="policy-page__inner">
        <div className="policy-page__heading">
          <p className="policy-page__eyebrow">COUPANG PLAY</p>
          <h1>약관 및 정책</h1>
          <p>서비스 이용과 관련된 약관 및 정책을 확인할 수 있습니다.</p>
        </div>

        <nav className="policy-page__tabs" aria-label="약관 및 정책 종류">
          {policyData.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => `policy-page__tab${isActive ? ' is-selected' : ''}`}>
              {item.title}
            </NavLink>
          ))}
        </nav>

        <section className="policy-page__content" aria-labelledby="policy-title">
          <h2 id="policy-title">{policy.title}</h2>
          <p className="policy-page__notice">원문 기반 요약 시안 · 내용 확인 2026.10.28</p>
          <p className="policy-page__disclaimer">이 화면은 정책의 요약본이며 법적 효력을 가진 전문이 아닙니다. 정확한 조항과 최신 개정 내용은 공식 원문을 확인해 주세요.</p>
          <div className="policy-page__summaries">
            {policy.summary.map(([heading, content]) => (
              <article className="policy-page__summary" key={heading}>
                <h3>{heading}</h3>
                <p>{content}</p>
              </article>
            ))}
          </div>
          <button type="button" className="policy-page__button" onClick={() => setIsModalOpen(true)}>
            자세히 보기
          </button>
          <p className="policy-page__source">참조 원문 <a href={policy.url} target="_blank" rel="noopener noreferrer">{policy.url}</a></p>
        </section>
      </div>

      {isModalOpen && (
        <div className="policy-page__overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsModalOpen(false);
        }}>
          <section className="policy-page__modal" role="dialog" aria-modal="true" aria-labelledby="policy-modal-title">
            <header className="policy-page__modal-header">
              <h2 id="policy-modal-title">{policy.title}</h2>
              <button ref={closeRef} className="policy-page__button" type="button" onClick={() => setIsModalOpen(false)}>닫기</button>
            </header>
            <p className="policy-page__modal-description">Figma 원문 기반 요약 시안입니다. 법적 효력을 가진 전문은 공식 사이트에서 확인해 주세요.</p>
            <div className="policy-page__modal-scroll" tabIndex={0} aria-label="약관 요약 스크롤 영역">
              {policy.summary.map(([heading, content]) => (
                <article className="policy-page__summary" key={heading}>
                  <h3>{heading}</h3>
                  <p>{content}</p>
                </article>
              ))}
            </div>
            <footer className="policy-page__modal-footer">
              <a className="policy-page__button" href={policy.url} target="_blank" rel="noopener noreferrer">공식 사이트에서 전문 읽기</a>
              <span>공식 원문은 새 창에서 열립니다.</span>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
};
