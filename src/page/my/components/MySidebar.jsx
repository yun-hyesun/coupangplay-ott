import React from 'react'
import { Link } from 'react-router-dom'
import "../scss/MySidebar.scss"

const MyMenus = [
    { id: 1, title: "내 티켓", path: "/my/ticket" },
    { id: 2, title: "내 리뷰 관리", path: "/my/review" },
    { id: 3, title: "할인 쿠폰", path: "/my/coupon" },
    { id: 4, title: "피드백 남기기", path: "/my/feedback" },
    { id: 5, title: "언어 설정", path: "/my/language" },
    { id: 6, title: "고객센터", path: "/my/support" },
    { id: 7, title: "문의 내역", path: "/my/inquiry" },
    { id: 8, title: "공지사항", path: "/my/notice" },
    { id: 9, title: "이벤트", path: "/my/event" },
]

export const MySidebar = () => {
    return (
        <div className='my-sidebar'>
            <div className="my-profile">
                <div className="my-profile-info">
                    <div className="my-avatar"></div>
                    <span className="my-username">ㅇㅇㅇ</span>
                    <button type='button' className='profile-change'>
                        프로필 전환
                    </button>
                </div>

                <button type='button' className='my-premium'>
                    <img src="" alt="프리미엄 패스 아이콘" />
                    <img src="" alt="화살표 아이콘" />
                </button>
            </div>

            <nav className="my-menu" aria-label='마이페이지 메뉴'>
                <ul>
                    {MyMenus.map((menu) => (
                        <li key={menu.id}>
                            <Link to={menu.path}>
                                {menu.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    )
}
