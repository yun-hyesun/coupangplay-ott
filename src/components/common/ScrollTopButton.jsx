import { useEffect, useState } from 'react';
import './ScrollTopButton.scss';

export const ScrollTopButton = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const updateVisibility = () => {
            setVisible(window.scrollY > 100);
        };

        updateVisibility();
        window.addEventListener('scroll', updateVisibility, { passive: true });

        return () => window.removeEventListener('scroll', updateVisibility);
    }, []);

    const scrollToTop = () => {
        const reduceMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        window.scrollTo({
            top: 0,
            behavior: reduceMotion ? 'instant' : 'smooth',
        });
    };

    return (
        <button
            type="button"
            className={`scroll-top-button${visible ? ' is-visible' : ''}`}
            aria-label="맨 위로 이동"
            tabIndex={visible ? 0 : -1}
            onClick={scrollToTop}
        >
            <img
                className="scroll-top-button__icon"
                src="/images/icon/DesignSystem_Icon01/icon-arrow_back.svg"
                alt=""
            />
        </button>
    );
};