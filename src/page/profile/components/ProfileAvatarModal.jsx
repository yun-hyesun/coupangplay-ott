
import React, { useEffect } from 'react';
import '../scss/ProfileAvatarModal.scss';

const avatarList = [
    'profile.svg',
    ...Array.from(
        { length: 8 },
        (_, i) => `profile_${String(i + 1).padStart(2, '0')}.svg`
    )
].map(file => `/images/profile/profile-img/${file}`);

export const ProfileAvatarModal = ({
    isOpen,
    selectedAvatar,
    onSelect,
    onClose
}) => {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="profile-avatar-modal-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="profile-avatar-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="avatar-modal-title"
            >
                <button
                    type="button"
                    className="avatar-modal-close"
                    onClick={onClose}
                    aria-label="닫기"
                >
                    <img src="/images/icon/DesignSystem_Icon01/icon-close.svg" alt="" />
                </button>

                <h2 id="avatar-modal-title">
                    프로필 이미지 선택
                </h2>

                <div className="avatar-modal-content">
                    <h3>기본 이미지</h3>

                    <div className="avatar-modal-grid">
                        {avatarList.map((avatar, index) => {
                            const selected = selectedAvatar === avatar;

                            return (
                                <button
                                    key={avatar}
                                    type="button"
                                    className={`avatar-modal-item ${selected ? 'active' : ''
                                        }`}
                                    onClick={() => {
                                        onSelect(avatar);
                                        onClose();
                                    }}
                                    aria-label={`프로필 이미지 ${index + 1}`}
                                    aria-pressed={selected}
                                >
                                    <img
                                        src={avatar}
                                        alt=""
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
