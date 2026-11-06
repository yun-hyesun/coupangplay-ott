
import React, { useEffect, useState } from 'react';
import { useSubscriptionStore } from '../../../store/useSubscriptionStore';
import '../scss/MyVoucherModal.scss';

export const VoucherModal = ({
    onClose,
    onRegister,
    registering = false
}) => {
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

    // 이용권 등록
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isValid || registering) return;

        setMessage('');

        const success = await onRegister(code);

        if (!success) {
            const latestError =
                useSubscriptionStore.getState().error;

            setMessage(
                latestError ||
                '이용권 등록에 실패했습니다. 코드를 확인해 주세요.'
            );
        }
    };

    return (
        <div
            className="voucher-modal-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !registering) {
                    onClose();
                }
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
                        disabled={registering}
                    >
                        <img
                            src="/images/icon/DesignSystem_Icon01/icon-close.svg"
                            alt=""
                        />
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
                        disabled={registering}
                    />

                    {message && (
                        <p
                            className="voucher-message"
                            role="alert"
                        >
                            {message}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="voucher-submit"
                        disabled={!isValid || registering}
                    >
                        {registering ? '등록 중...' : '다음'}
                    </button>
                </form>
            </div>
        </div>
    );
};
