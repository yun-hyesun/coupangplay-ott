
import React from 'react';
import { Link } from 'react-router-dom';

import '../scss/MyPageHeader.scss';

export const MyPageHeader = ({ title, to = '/my' }) => {
    return (
        <div className="my-page-header">
            <Link
                to={to}
                className="my-page-header__back"
                aria-label="마이페이지로 돌아가기"
            >
                <img
                    src="/images/icon/icon-arrow_back_gray.svg"
                    alt=""
                />
            </Link>

            <h2>{title}</h2>
        </div>
    );
};
