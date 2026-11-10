// public/images/icon/DesignSystem_Icon01~04의 원본 SVG를 공통으로 사용합니다.
// 장식 아이콘은 aria-hidden으로 처리하고, 버튼의 aria-label은 부모가 제공합니다.
const iconPaths = {
  "back": "/images/icon/DesignSystem_Icon01/icon-arrow_back.svg",
  "play": "/images/icon/DesignSystem_Icon03/icon-play_filled.svg",
  "play-outline": "/images/icon/DesignSystem_Icon02/icon-play_arrow.svg",
  "pause": "/images/icon/DesignSystem_Icon03/icon-pause.svg",
  "replay": "/images/icon/DesignSystem_Icon03/icon-replay_10.svg",
  "forward": "/images/icon/DesignSystem_Icon03/icon-forward_10.svg",
  "volume": "/images/icon/DesignSystem_Icon03/icon-volume_up.svg",
  "mute": "/images/icon/DesignSystem_Icon03/icon-volume_off.svg",
  "subtitles": "/images/icon/DesignSystem_Icon03/icon-subtitles.svg",
  "episodes": "/images/icon/DesignSystem_Icon03/icon-playlist.svg",
  "settings": "/images/icon/DesignSystem_Icon03/icon-settings.svg",
  "fullscreen": "/images/icon/DesignSystem_Icon03/icon-fullscreen.svg",
  "close": "/images/icon/DesignSystem_Icon01/icon-close.svg",
  "together": "/images/icon/DesignSystem_Icon04/icon-subscriptions.svg",
  "chat": "/images/icon/DesignSystem_Icon04/icon-rate_review.svg",
  "reviews": "/images/icon/DesignSystem_Icon04/icon-rate_review.svg",
  "share": "/images/icon/DesignSystem_Icon01/icon-share.svg",
  "like": "/images/icon/DesignSystem_Icon02/icon-favorite_add.svg",
  "liked": "/images/icon/DesignSystem_Icon02/icon-favorite_added.svg",
  "star": "/images/icon/DesignSystem_Icon02/icon-star.svg",
  "star-outline": "/images/icon/DesignSystem_Icon02/icon-star_border.svg",
  "chevron-down": "/images/icon/DesignSystem_Icon01/icon-expand_more.svg",
  "chevron-up": "/images/icon/DesignSystem_Icon01/icon-expand_less.svg",
  "more-vertical": "/images/icon/DesignSystem_Icon04/icon-more_vert.svg",
  "refresh": "/images/icon/DesignSystem_Icon04/icon-refresh.svg",
  "external": "/images/icon/DesignSystem_Icon01/icon-open_in_new.svg",
  "check": "/images/icon/DesignSystem_Icon02/icon-check.svg",
};

export default function CommonIcon({ name, size = 24, className = "", style }) {
  const src = iconPaths[name];
  if (!src) return null;
  return <img src={src} alt="" aria-hidden="true" className={className} style={{ width: size, height: size, flexShrink: 0, objectFit: "contain", ...style }} />;
}
