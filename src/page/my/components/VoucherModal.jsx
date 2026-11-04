
import React, { useEffect, useState } from 'react';
import '../scss/VoucherModal.scss';

export const VoucherModal = ({ onClose, onRegister }) => {
    const [code, setCode] = useState('');
    const [message, setMessage] = useState('');

    // 코드 13자리 입력 여부
    const isValid = code.length === 13;

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!isValid) return;

        const result = onRegister(code);

        if (!result) {
            setMessage('유효하지 않은 이용권 코드입니다.');
        }
    };

    return (
        <div
            className="voucher-modal-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="voucher-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="voucher-modal-title"
            >
                <div className="voucher-modal-header">
                    <h3 id="voucher-modal-title">
                        이용권 코드 입력
                    </h3>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="닫기"
                    >
                        <img src="/images/icon/DesignSystem_Icon01/icon-close.svg" alt="" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => {
                            const value = e.target.value
                                .replace(/[^a-zA-Z0-9]/g, '')
                                .slice(0, 13);

                            setCode(value);
                            setMessage('');
                        }}
                        placeholder="코드 13자리를 입력해주세요"
                        maxLength={13}
                        autoFocus
                        aria-label="이용권 코드"
                    />

                    {message && (
                        <p className="voucher-message" role="status">
                            {message}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="voucher-submit"
                        disabled={!isValid}
                    >
                        다음
                    </button>
                </form>
            </div>
        </div>
    );
};
