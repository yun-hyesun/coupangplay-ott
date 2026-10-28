import React from 'react'
import { Link } from 'react-router-dom'
import  './scss/header-footer.scss'

export const Header = () => {
  // 메인메뉴
  const mainMenu = [
    {id: 1, menu: "스포츠", path: "/sports"},
    {id: 2, menu: "드라마", path: "/drama"},
    {id: 3, menu: "예능", path: "/entertainment"},
    {id: 4, menu: "영화", path: "/movie"},
    {id: 5, menu: "스토어", path: "/store"},
    {id: 6, menu: "키즈", path: "/kids"},
  ]

  return (
    <header className='header'>
      <div className='inner'>
        <div className='header-left'>
          <h1 className='header-logo'>
            <Link to="/"><img src="/images/header_footer/logo.svg" alt="쿠팡플레이 메인로고" /></Link>
          </h1>

          <nav className='header-nav'>
            <ul className='header-nav-menu'>
              {mainMenu.map((menu)=> (
                <li className='nav-menu-list' key={menu.id}><Link to={menu.path}>{menu.menu}</Link></li>
              ))}
            </ul>
          </nav>
        </div>
        <ul className='header-right'>
          <li className='header-login'><Link to>로그인</Link></li>
          <li className='header-search'>
            <form htmlFor="header-search-input" className='header-search-form'>
              <button type='button' className='header-search-btn' aria-label='검색'></button>

              <label><input type="search" id="header-search-input"/></label>
            </form>
          </li>
          <li className='header-myPage'>
            <button className='myPage-btn' aria-label='마이페이지'>
              <img src="/images/profile.svg" alt="" />
            </button>
          </li>
        </ul>
      </div>
    </header>
  )
}
