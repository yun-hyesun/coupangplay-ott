import React from 'react';

// 장르 목록
const genres = [
    '드라마', '예능', '영화', '스포츠',
    '로맨스', '액션', '코미디', '스릴러',
    '판타지', '공포', '애니메이션', '다큐멘터리',
    '범죄', 'SF', '미스터리', '가족'
];

export const GenreSelect = ({
    selectedGenres,
    onChange,
    onNext,
    onPrev
}) => {
    const handleGenreClick = (genre) => {
        if (selectedGenres.includes(genre)) {
            onChange(selectedGenres.filter(item => item !== genre));
        } else {
            onChange([...selectedGenres, genre]);
        }
    };

    return (
        <div className="genre-select">
            <h2>좋아하는 장르를 선택해주세요</h2>

            <div className="genre-list">
                {genres.map(genre => (
                    <button
                        key={genre}
                        type="button"
                        className={`genre-item ${
                            selectedGenres.includes(genre) ? 'active' : ''
                        }`}
                        onClick={() => handleGenreClick(genre)}
                        aria-pressed={selectedGenres.includes(genre)}
                    >
                        {genre}
                    </button>
                ))}
            </div>

            <div className="genre-buttons">
                <button
                    type="button"
                    onClick={onNext}
                    disabled={selectedGenres.length === 0}
                >
                    다음
                </button>

                <button type="button" onClick={onPrev}>
                    이전
                </button>
            </div>
        </div>
    );
};
