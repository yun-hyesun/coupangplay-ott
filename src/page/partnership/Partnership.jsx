import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './scss/Partnership.scss';

const AD_URL = 'https://forms.cloud.microsoft/pages/responsepage.aspx?id=lo8J4xs2xkep9Kt7r8r_6XojZXEatm9OgglP0cXlG4dUOENVQVJHMTlSWTVBMFJRVkpNWE1FOFk1Ry4u&route=shorturl';
const TYPES = [
  ['콘텐츠·중계', '콘텐츠 공급, 공동 제작, 스포츠 중계'],
  ['서비스·마케팅', '구독 결합, 서비스 연동, 공동 프로모션'],
  ['기타 사업 제휴', '새로운 협업 및 비즈니스 제안'],
];
const INITIAL = { type: '', company: '', contact: '', email: '', phone: '', title: '', content: '', url: '', requiredConsent: false, phoneConsent: false };
const MAX_SIZE = 10 * 1024 * 1024;

export const Partnership = () => {
  const [values, setValues] = useState(INITIAL);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [fileError, setFileError] = useState('');
  const [status, setStatus] = useState('idle');
  const [receipt, setReceipt] = useState('');
  const formRef = useRef(null);
  const headingRef = useRef(null);
  const pending = useRef(false);
  const endpoint = import.meta.env.VITE_PARTNERSHIP_ENDPOINT?.trim();

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    if (status === 'success' || status === 'demo') {
      window.scrollTo(0, 0);
      headingRef.current?.focus();
    }
  }, [status]);

  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setValues((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value, ...(name === 'phoneConsent' && !checked ? { phone: '' } : {}) }));
    setErrors((current) => ({ ...current, [name]: '', submit: '' }));
  };
  const addFiles = (event) => {
    const incoming = [...event.target.files];
    event.target.value = '';
    const next = [...files];
    let message = '';
    for (const file of incoming) {
      if (!/\.(pdf|pptx|docx)$/i.test(file.name)) { message = 'PDF, PPTX, DOCX 파일만 첨부할 수 있습니다.'; break; }
      if (file.size > MAX_SIZE || file.size === 0) { message = '비어 있지 않은 10MB 이하의 파일을 선택해 주세요.'; break; }
      if (next.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) continue;
      next.push(file);
      if (next.length > 3) { message = '파일은 최대 3개까지 첨부할 수 있습니다.'; break; }
    }
    // 잘못된 선택은 기존 첨부 목록을 유지합니다.
    if (!message) setFiles(next);
    setFileError(message);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    const next = {};
    if (!values.type) next.type = '제휴 분야를 선택해 주세요.';
    for (const [key, label] of [['company', '기업명'], ['contact', '담당자명'], ['title', '제안 제목'], ['content', '제안 내용']]) {
      if (!values[key].trim()) next[key] = `${label}을 입력해 주세요.`;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = '올바른 이메일 주소를 입력해 주세요.';
    if (values.phoneConsent && values.phone.trim() && !/^[+\d\s()-]{7,24}$/.test(values.phone.trim())) next.phone = '연락처 형식을 확인해 주세요.';
    if (values.url.trim()) {
      try { if (!['https:', 'http:'].includes(new URL(values.url.trim()).protocol)) throw new Error(); }
      catch { next.url = 'http:// 또는 https://로 시작하는 URL을 입력해 주세요.'; }
    }
    if (!values.requiredConsent) next.requiredConsent = '필수 개인정보 수집·이용에 동의해 주세요.';
    setErrors(next);
    if (Object.keys(next).length) {
      const first = formRef.current.elements.namedItem(Object.keys(next)[0]);
      (first?.focus ? first : first?.[0])?.focus();
      return;
    }
    // 서버 주소가 없을 때는 접수 사실을 만들지 않고 시연 결과만 표시합니다.
    if (!endpoint) { setStatus('demo'); return; }
    pending.current = true;
    setStatus('submitting');
    try {
      const body = new FormData();
      const payload = { ...values, phone: values.phoneConsent ? values.phone.trim() : '' };
      for (const [key, value] of Object.entries(payload)) body.append(key, typeof value === 'string' ? value.trim() : String(value));
      files.forEach((file) => body.append('files', file));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      let response;
      try { response = await fetch(endpoint, { method: 'POST', body, signal: controller.signal }); }
      finally { clearTimeout(timeout); }
      if (!response.ok) throw new Error('request-failed');
      const result = await response.json();
      if (result.success !== true || typeof result.receiptId !== 'string' || !result.receiptId.trim()) throw new Error('invalid-response');
      setReceipt(result.receiptId);
      setStatus('success');
    } catch {
      setStatus('idle');
      setErrors({ submit: '전송하지 못했습니다. 작성 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.' });
    } finally { pending.current = false; }
  };
  const error = (name) => errors[name] ? <p id={`partnership-${name}-error`} className="partnership__error" role="alert">{errors[name]}</p> : null;
  const field = (name, label, placeholder, type = 'text', optional = false, maxLength = 100) => <div className="partnership__field" key={name}>
    <label htmlFor={`partnership-${name}`}>{label}{optional ? ' (선택)' : <span aria-label="필수"> *</span>}</label>
    <input id={`partnership-${name}`} name={name} type={type} value={values[name]} onChange={change} placeholder={placeholder} maxLength={maxLength} required={!optional} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `partnership-${name}-error` : undefined} />
    {error(name)}
  </div>;

  if (status === 'success' || status === 'demo') return <main className="partnership partnership--complete">
    <div className="partnership__complete">
      <h1 ref={headingRef} tabIndex={-1}>{status === 'demo' ? '제안 작성 시연이 완료되었습니다.' : '제안이 접수되었습니다.'}</h1>
      <p>{status === 'demo' ? '현재는 시연 화면으로, 입력하신 내용과 파일은 전송·저장되지 않았습니다.' : '보내주신 제안은 담당 부서에서 검토합니다. 추가 협의가 필요한 경우 입력하신 이메일로 연락드립니다.'}</p>
      {receipt && <p>접수번호: {receipt}</p>}
      <button className="button main-btn partnership__submit" onClick={() => { setStatus('idle'); window.scrollTo(0, 0); }}>제휴문의로 돌아가기</button>
    </div>
  </main>;

  return <main className="partnership">
    <div className="partnership__inner">
      <header className="partnership__intro">
        <p className="partnership__eyebrow">BUSINESS PARTNERSHIP</p>
        <h1>함께 만드는 더 큰 즐거움</h1>
        <h2>비즈니스 제휴문의</h2>
        <p className="partnership__lead">콘텐츠부터 새로운 서비스까지, 쿠팡플레이와 함께할 가능성을 제안해 주세요.</p>
        <aside className="partnership__notice">광고 집행을 원하시나요? <a href={AD_URL} target="_blank" rel="noopener noreferrer">광고문의 ↗</a><span>서비스 이용 중 불편사항은 <Link to="/my/support?category=FAQ">고객센터</Link>에서 문의해 주세요.</span></aside>
      </header>
      <form ref={formRef} onSubmit={submit} noValidate>
        <fieldset className="partnership__section partnership__types" aria-describedby={errors.type ? 'partnership-type-error' : undefined}>
          <legend>01　어떤 제휴를 제안하시나요? <span aria-label="필수">*</span></legend>
          <div className="partnership__cards">{TYPES.map(([title, description]) => <label className={`partnership__card${values.type === title ? ' is-selected' : ''}`} key={title}>
            <input type="radio" name="type" value={title} checked={values.type === title} onChange={change} required aria-invalid={!!errors.type} />
            <strong>{title}</strong><span>{description}</span>
          </label>)}</div>{error('type')}
        </fieldset>
        <section className="partnership__section" aria-labelledby="partnership-company-heading">
          <h2 id="partnership-company-heading">02　기업 및 담당자 정보</h2><p className="partnership__hint">* 필수 입력 항목</p>
          <div className="partnership__grid">{field('company', '기업명', '기업 또는 단체명')}{field('contact', '담당자명', '담당자 이름')}{field('email', '업무용 이메일', 'example@company.com', 'email')}{field('phone', '연락처', '연락 가능한 전화번호', 'tel', true, 24)}</div>
        </section>
        <section className="partnership__section" aria-labelledby="partnership-proposal-heading">
          <h2 id="partnership-proposal-heading">03　제안 내용을 알려주세요</h2>
          {field('title', '제안 제목', '제안의 핵심 내용을 간단히 입력해 주세요.', 'text', false, 150)}
          <div className="partnership__field"><label htmlFor="partnership-content">제안 내용 <span aria-label="필수">*</span></label>
            <textarea id="partnership-content" name="content" value={values.content} onChange={change} required maxLength={5000} placeholder={'제안 배경과 목적, 구체적인 협업 방식, 기대 효과를 작성해 주세요.\n\n진행을 희망하는 일정이 있다면 함께 알려주세요.'} aria-invalid={!!errors.content} aria-describedby="partnership-content-help partnership-content-error" />
            {error('content')}<p id="partnership-content-help" className="partnership__hint">개인정보나 외부에 공개하기 어려운 기밀정보는 입력하지 말아 주세요. <span>{values.content.length.toLocaleString()} / 5,000</span></p>
          </div>
          {field('url', '관련 URL', 'https://', 'url', true, 2000)}
          <div className="partnership__field"><label htmlFor="partnership-files">첨부파일 (선택)</label>
            <div className="partnership__upload"><label className="button partnership__file-button" htmlFor="partnership-files">파일 선택<input id="partnership-files" type="file" multiple accept=".pdf,.pptx,.docx" onChange={addFiles} aria-describedby="partnership-files-help partnership-files-error" /></label><span aria-live="polite">{files.length ? `${files.length}개 파일 선택됨` : '선택된 파일이 없습니다.'}</span></div>
            {files.length > 0 && <ul className="partnership__files">{files.map((file, index) => <li key={`${file.name}-${file.lastModified}`}><span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)</span><button type="button" onClick={() => { setFiles((current) => current.filter((_, i) => i !== index)); setFileError(''); }} aria-label={`${file.name} 삭제`}>삭제</button></li>)}</ul>}
            <p id="partnership-files-help" className="partnership__hint">PDF, PPTX, DOCX · 파일당 최대 10MB, 최대 3개</p><p id="partnership-files-error" className="partnership__error" role="alert">{fileError}</p>
          </div>
        </section>
        <section className="partnership__section partnership__privacy" aria-labelledby="partnership-privacy-heading">
          <h2 id="partnership-privacy-heading">04　개인정보 수집·이용 동의</h2>
          <dl className="partnership__privacy-table"><div><dt>수집·이용 목적</dt><dd>제휴 제안 접수 및 검토, 검토 과정의 연락 및 결과 안내</dd></div><div><dt>필수 수집 항목</dt><dd>담당자명, 업무용 이메일</dd></div><div><dt>보유·이용 기간</dt><dd>제휴 검토 종료 후 지체 없이 파기 (제안 문구 · 운영 확인 필요)</dd></div></dl>
          <p>동의를 거부할 수 있으나, 필수 항목 수집·이용에 동의하지 않으면 제휴문의 접수가 어렵습니다.</p>
          <label className="partnership__check"><input name="requiredConsent" type="checkbox" checked={values.requiredConsent} onChange={change} required aria-invalid={!!errors.requiredConsent} aria-describedby={errors.requiredConsent ? 'partnership-requiredConsent-error' : undefined} />[필수] 개인정보 수집·이용에 동의합니다.</label>{error('requiredConsent')}
          <label className="partnership__check"><input name="phoneConsent" type="checkbox" checked={values.phoneConsent} onChange={change} />[선택] 연락처 수집·이용에 동의합니다.</label>
          <p className="partnership__hint">선택 항목: 연락처 / 목적: 추가 협의 연락 / 보유 기간: 위와 동일<br />선택 동의 없이도 제휴문의를 접수할 수 있습니다. 미동의 시 연락처는 전송하지 않습니다.</p>
          <Link className="partnership__policy" to="/privacy">개인정보처리방침 보기 ↗</Link>
        </section>
        <div className="partnership__actions">
          {/* {!endpoint && <p className="partnership__hint">현재는 시연용 페이지입니다. 입력한 내용과 파일은 전송·저장되지 않습니다.</p>} */}
          {errors.submit && <p className="partnership__error" role="alert">{errors.submit}</p>}
          <button className="button main-btn partnership__submit" type="submit" disabled={status === 'submitting'}>{status === 'submitting' ? '제안 전송 중…' : '제휴 제안 보내기'}</button>
          <p className="partnership__hint">접수된 제안은 담당 부서에서 검토하며, 추가 협의가 필요한 경우 연락드립니다.</p>
        </div>
      </form>
    </div>
  </main>;
};
