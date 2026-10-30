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
          src={profile.avatar || '/images/profile.svg'}
          alt=""
        />

        {isEditMode && (
          <span className="profile-edit-icon" aria-hidden="true">
            ✎
          </span>
        )}
      </div>

      <span className="profile-card-name">
        {profile.name}
      </span>
    </button>
  )
}
