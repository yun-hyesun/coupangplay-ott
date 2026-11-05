
import React from 'react'
import '../scss/ProfileCard.scss'

export const ProfileCard = ({ profile, isEditMode, onClick }) => {
  return (
    <button
      type="button"
      className="profile-card"
      onClick={onClick}
    >
      <div className="profile-card-img">
        <img
          src={profile.avatar || '/images/profile/profile-img/profile.svg'}
          alt=""
        />

        {isEditMode && (
          <span className="profile-edit-icon" aria-hidden="true">
            <img
              src="/images/icon/DesignSystem_Icon04/icon-edit.svg"
              alt=""
            />
          </span>
        )}

        {/* 잠금 설정된 프로필 아이콘 */}
        {profile.isLocked && !isEditMode && (
          <span className="profile-lock-icon" aria-label="잠긴 프로필">
            <img
              src="/images/icon/Lock.svg"
              alt=""
            />
          </span>
        )}
      </div>

      <span className="profile-card-name">
        {profile.name}
      </span>
    </button>
  )
}
