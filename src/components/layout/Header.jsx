
import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { useProfileStore } from '../../store/useProfileStore'
import './scss/header-footer.scss'

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 로그인 상태
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const onLogout = useAuthStore((state) => state.onLogout);

  // 현재 선택된 프로필
  const currentProfile = useProfileStore(
    (state) => state.currentProfile
  );

  // 드롭다운 상태
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileMenuRef = useRef(null);

  // 메인 메뉴
  const mainMenu = [
    { id: 1, menu: "스포츠", path: "/sports" },
    { id: 2, menu: "드라마", path: "/drama" },
    { id: 3, menu: "예능", path: "/entertainment" },
    { id: 4, menu: "영화", path: "/movie" },
    { id: 5, menu: "스토어", path: "/store" },
    { id: 6, menu: "키즈", path: "/kids" },
  ];

  // 페이지 이동 시 드롭다운 닫기
  useEffect(() => {
    setIsProfileOpen(false);
  }, [location.pathname]);

  // 바깥 영역 클릭 및 ESC로 닫기
  useEffect(() => {
    if (!isProfileOpen) return;

    const handleOutsideClick = (e) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target)
      ) {
        setIsProfileOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileOpen]);

  // 로그아웃
  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await onLogout();

      // 로그아웃 성공 여부 확인
      if (!useAuthStore.getState().user) {
        setIsProfileOpen(false);
        navigate('/login', { replace: true });
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="header">
      <div className="inner">
        <div className="header-left">
          <h1 className="header-logo">
            <Link to="/">
              <img
                src="/images/header_footer/logo.svg"
                alt="쿠팡플레이 메인로고"
              />
            </Link>
          </h1>

          <nav className="header-nav">
            <ul className="header-nav-menu">
              {mainMenu.map((menu) => (
                <li className="nav-menu-list" key={menu.id}>
                  <Link to={menu.path}>
                    {menu.menu}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <ul className="header-right">
          {/* 로그인하지 않은 경우 */}
          {!authLoading && !user && (
            <li className="header-login">
              <Link to="/login">로그인</Link>
            </li>
          )}

          {/* 검색 */}
          <li className="header-search">
            <form
              className="header-search-form"
              onSubmit={(e) => e.preventDefault()}
            >
              <button
                type="button"
                className="header-search-btn"
                aria-label="검색"
              />

              <label
                htmlFor="header-search-input"
                className="sr-only"
              >
                검색
              </label>

              <input
                type="search"
                id="header-search-input"
              />
            </form>
          </li>

          {/* 로그인한 경우 프로필 메뉴 */}
          {!authLoading && user && (
            <li
              className="header-myPage"
              ref={profileMenuRef}
            >
              <button
                type="button"
                className="myPage-btn"
                aria-label="프로필 메뉴"
                aria-expanded={isProfileOpen}
                aria-controls="header-profile-dropdown"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                <img
                  src={
                    currentProfile?.avatar ||
                    '/images/profile.svg'
                  }
                  alt=""
                />
              </button>

              {isProfileOpen && (
                <div
                  className="profile-dropdown"
                  id="header-profile-dropdown"
                >
                  {/* 현재 프로필 */}
                  <Link
                    to="/profiles"
                    className="profile-dropdown-user"
                  >
                    <img
                      src={
                        currentProfile?.avatar ||
                        '/images/profile.svg'
                      }
                      alt=""
                      className="profile-dropdown-avatar"
                    />

                    <div className="profile-dropdown-user-info">
                      <strong>
                        {currentProfile?.name || '프로필 선택'}
                      </strong>

                      <span>
                        프로필 전환
                        <span aria-hidden="true"> ›</span>
                      </span>
                    </div>
                  </Link>

                  {/* 드롭다운 메뉴 */}
                  <div className="profile-dropdown-menu">
                    <Link to="/my">
                      MY
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate('/my');
                      }}
                    >
                      이용권 목록
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate('/my');
                      }}
                    >
                      쿠폰 등록
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate('/my');
                      }}
                    >
                      고객센터
                    </button>

                    <button
                      type="button"
                      className="profile-dropdown-logout"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                    >
                      {isLoggingOut
                        ? '로그아웃 중...'
                        : '로그아웃'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          )}
        </ul>
      </div>
    </header>
  );
};
