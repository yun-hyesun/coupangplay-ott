
import React, { useState } from 'react'
import { ProfileModal } from './ProfileModal'
import '../scss/ProfileForm.scss'

export const ProfileForm = ({
    initialName = '',
    initialAvatar = '/images/profile.svg',
    initialLocked = false,
    initialRating = 'ALL',
    onSubmit,
    onCancel,
    submitText = '다음',
    loading = false
}) => {
    const [name, setName] = useState(initialName);
    const [avatar] = useState(initialAvatar);
    const [isLocked, setIsLocked] = useState(initialLocked);
    const [rating, setRating] = useState(initialRating);
    const [message, setMessage] = useState('');

    // 시청 등급 모달 열림/닫힘 상태
    const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

    // 시청 등급 표시용 텍스트
    const ratingLabels = {
        'ALL': '전체 관람가',
        '7': '7세 이상',
        '12': '12세 이상',
        '15': '15세 이상',
        '19': '19세 이상'
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setMessage('');

        const trimmedName = name.trim();

        if (trimmedName.length < 2 || trimmedName.length > 10) {
            setMessage('프로필 이름은 2~10자로 입력해 주세요.');
            return;
        }

        onSubmit({
            name: trimmedName,
            avatar,
            isLocked,
            rating
        });
    };

    return (
        <form className="profile-form" onSubmit={handleSubmit}>
            {/* 프로필 이미지 */}
            <div className="profile-form-avatar">
                <img src={avatar} alt="프로필 이미지" />
            </div>

            {/* 프로필 이름 */}
            <div className="profile-form-field">
                <label htmlFor="profile-name" className="sr-only">
                    프로필 이름
                </label>

                <input
                    id="profile-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="프로필 이름을 입력해 주세요."
                    maxLength={10}
                    required
                />

                <p>
                    2자 이상 10자 이내의 한글, 영문, 숫자 입력이 가능합니다.
                </p>
            </div>



            {/* 프로필 설정 카드 */}
            <div className="profile-form-settings">

                {/* 프로필 잠금 설정 */}
                <div className="profile-setting-row">
                    <span>프로필 잠금 설정</span>

                    <button
                        type="button"
                        className={`profile-lock-toggle ${isLocked ? 'active' : ''}`}
                        role="switch"
                        aria-checked={isLocked}
                        aria-label="프로필 잠금 설정 (준비 중)"
                        disabled
                    >
                        <span />
                    </button>
                </div>

                {/* 성인 인증 */}
                <div className="profile-setting-row">
                    <span>성인 인증</span>

                    <span className="profile-setting-value">
                        인증 전
                    </span>
                </div>

                {/* 시청등급 설정 */}
                <div className="profile-setting-row">
                    <span>프로필 시청등급 설정</span>

                    <button
                        type="button"
                        className="profile-rating-btn"
                        onClick={() => setIsRatingModalOpen(true)}
                        disabled={loading}
                        aria-haspopup="dialog"
                    >
                        <span>{ratingLabels[rating] || '전체 관람가'}</span>
                        <span className="profile-rating-arrow" aria-hidden="true">
                            ›
                        </span>
                    </button>
                </div>

            </div>


            {/* 오류 메시지 */}
            {message && (
                <p className="profile-form-error" role="alert">
                    {message}
                </p>
            )}

            {/* 완료 / 취소 버튼 */}
            <div className="profile-form-buttons">
                <button type="submit" disabled={loading}>
                    {loading ? '저장 중...' : submitText}
                </button>

                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                >
                    취소
                </button>
            </div>

            {/* 시청 등급 선택 모달 */}
            {isRatingModalOpen && (
                <ProfileModal
                    rating={rating}
                    isOpen={isRatingModalOpen}
                    onConfirm={(selectedRating) => {
                        setRating(selectedRating);
                        setIsRatingModalOpen(false);
                    }}
                    onClose={() => setIsRatingModalOpen(false)}
                />
            )}
        </form>
    );
};
