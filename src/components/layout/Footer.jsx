import React from 'react'
import { Link } from 'react-router-dom'

export const Footer = () => {
  const footerMenus = [
    { label: "개인정보 처리방침", path: "/privacy" },
    { label: "쿠팡 이용 약관", path: "/terms" },
    { label: "와우 멤버십 서비스 이용 약관", path: "/wow-terms" },
    { label: "쿠팡플레이 이용 기준", path: "/play-standard" },
    { label: "쿠팡플레이 유료서비스 이용 약관", path: "/paid-terms" },
  ]

  const footerInquiry = [
    { label: "광고 문의", path: "/ad-inquiry" },
    { label: "제휴 문의", path: "/partnership" },
    { label: "자주 묻는 질문", path: "/faq" },
  ]

  const footerSns = [
    { 
      label: 'youtube', 
      img: '/images/header_footer/sns-youtube.svg', 
      url: 'https://www.youtube.com/channel/UCjn-VbcIkAeXQKCmLJY8YwQ' 
    },
    { 
      label: 'facebook', 
      img: '/images/header_footer/sns-facebook.svg', 
      url: 'https://www.facebook.com/CoupangPlay/' 
    },
    { 
      label: 'instagram', 
      img: '/images/header_footer/sns-Instagram.svg', 
      url: 'https://www.instagram.com/coupangplay/' 
    },
    { 
      label: 'twitter', 
      img: '/images/header_footer/sns-x.svg', 
      url: 'https://www.twitter.com/coupangplay' 
    },
  ]
  return (
    <footer className='footer'>
      
      <div className='inner'>
        <div className='footer-left'>
          <p className='footer-logo'><img src="/images/header_footer/logo.svg" alt="쿠팡 로고"/></p>

          <address className='footer-address'>
            <p>쿠팡(주) · 대표이사: 로저스 해롤드 린 (Rogers Harold Lynn)</p>
            <p>사업자 등록번호: 120-88-00767 · 사업자정보 확인</p>
            <p>통신판매업신고: 2026-서울광진-1253</p>
            <p>주소: (05050) 서울특별시 광진구 아차산로 412, 2층 (자양동)</p>
            <p>호스팅 서비스 사업자: AWS 코리아</p>
          </address>

          <nav className='footer-nav'>
            <ul className='footer-nav-menu'>
              {footerMenus.map((menu, id)=> (
                <li key={id}><Link to={menu.path}>{menu.label}</Link></li>
              ))}
            </ul>
          </nav>
        </div>
        <div className='footer-right'>
          <ul className='footer-inquiry'>
            {footerInquiry.map((inquiry, id)=> (
              <li key={id}><Link to={inquiry.path}>{inquiry.label}</Link></li>
            ))}
          </ul>
          <dl className='footer-info'>
            <div className='footer-info-list'>
              <dt>고객센터</dt>
              <dd>1600-9800</dd>
            </div>
            <div className='footer-info-list'>
              <dt>운영 시간</dt>
              <dd>유료 · 365일, 24시간</dd>
            </div>
            <div className='footer-info-list'>
              <dt>대표 이메일</dt>
              <dd>playrepresent@coupang.com</dd>
            </div>
          </dl>
          <ul className='footer-sns'>
            {footerSns.map((sns, id)=> (
              <li key={id}>
                <a href={sns.url} target='_blank' rel="noopener noreferrer" aria-label={sns.label}>
                  <img src={sns.img} alt="" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
