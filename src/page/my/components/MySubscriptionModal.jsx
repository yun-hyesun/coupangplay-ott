import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import '../scss/MySubscriptionModal.scss';

// 네이티브 dialog: 포커스 트랩, Escape, 모달 뒤 영역 접근 차단 및 포커스 복원.
export const MySubscriptionModal = ({title,onClose,children,busy=false}) => {
 const ref=useRef(null); const id=useId(); const closeRef=useRef(onClose); closeRef.current=onClose;
 useEffect(()=>{const previous=document.activeElement; const dialog=ref.current;const overflow=document.body.style.overflow;
 dialog.showModal();document.body.style.overflow='hidden';
 return ()=>{dialog.close();document.body.style.overflow=overflow;previous?.focus();};},[]);
 return createPortal(<dialog ref={ref} className="my-pass-modal" aria-labelledby={id}
 onCancel={e=>{e.preventDefault();if(!busy)closeRef.current();}}
 onClick={e=>{if(e.target===ref.current&&!busy){const r=ref.current.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeRef.current();}}}>
 <div className="my-pass-modal-heading"><h2 id={id}>{title}</h2><button type="button" className="my-pass-close" disabled={busy} onClick={onClose} aria-label="닫기">×</button></div>{children}</dialog>,document.body);
};
