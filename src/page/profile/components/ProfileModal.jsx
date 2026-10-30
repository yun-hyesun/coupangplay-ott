import React, { useState } from 'react';

const ratingOptions = [
    { value: '19', label: '19세 이상' },
    { value: '15', label: '15세 이상' },
    { value: '12', label: '12세 이상' },
    { value: '7', label: '7세 이상' },
    { value: 'ALL', label: '전체 관람가' }
];

export const ProfileModal = ({
    isOpen,
    rating,
    onConfirm,
    onClose
}) => {
    const [selectedRating, setSelectedRating] = useState(rating);

    if (!isOpen) return null;

    return (
        <div className="profile-modal-overlay">
            <div
                className="profile-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-modal-title"
            >
                <button
                    type="button"
                    className="profile-modal-close"
                    onClick={onClose}
                    aria-label="닫기"
                >
                    ×
                </button>

                <h3 id="profile-modal-title">
                    프로필 시청등급 설정
                </h3>

                <p>
                    선택한 시청등급까지의 콘텐츠를 시청 가능합니다.
                </p>

                <div className="profile-modal-options">
                    {ratingOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={`profile-modal-option ${
                                selectedRating === option.value
                                    ? 'active'
                                    : ''
                            }`}
                            onClick={() => setSelectedRating(option.value)}
                        >
                            <span>
                                {selectedRating === option.value
                                    ? '✓'
                                    : '✓'}
                            </span>
                            {option.label}
                        </button>
                    ))}
                </div>

                <div className="profile-modal-buttons">
                    <button
                        type="button"
                        onClick={() => onConfirm(selectedRating)}
                    >
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
