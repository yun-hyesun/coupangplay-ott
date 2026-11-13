
import React, { useEffect, useState } from 'react';

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;
const IMAGE_URL = 'https://image.tmdb.org/t/p/w342';

const GENRE_IDS = {
    드라마: { movie: [18], tv: [18] },
    예능: { tv: [10764, 10767] },
    로맨스: { movie: [10749] },
    액션: { movie: [28], tv: [10759] },
    코미디: { movie: [35], tv: [35] },
    스릴러: { movie: [53] },
    판타지: { movie: [14], tv: [10765] },
    공포: { movie: [27] },
    애니메이션: { movie: [16], tv: [16] },
    다큐멘터리: { movie: [99], tv: [99] },
    범죄: { movie: [80], tv: [80] },
    SF: { movie: [878], tv: [10765] },
    미스터리: { movie: [9648], tv: [9648] },
    가족: { movie: [10751], tv: [10751] },
};

export const ContentSelect = ({
    selectedContents,
    selectedGenres,
    genreIds,
    onChange,
    onNext,
    onPrev
}) => {
    const [contents, setContents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        const fetchContents = async () => {
            setLoading(true);
            setError('');
            setContents([]);

            try {
                const requests = ['movie', 'tv'].flatMap(type => {
                    const ids = [...new Set(
                        selectedGenres.flatMap(
                            (genre) => GENRE_IDS[genre]?.[type] ?? []
                        )
                    )];

                    const allMovies = type === 'movie' && selectedGenres.includes('영화');

                    if (!allMovies && ids.length === 0) return [];

                    return [1, 2].map(page => ({
                        type,
                        page,
                        genres: allMovies ? '' : ids.join('|'),
                    }));
                });

                if (requests.length === 0) {
                    setError('스포츠 경기 목록은 아직 연결되지 않았어요. 이전 단계에서 다른 장르도 선택해 주세요.');
                    return;
                }

                const results = await Promise.all(
                    requests.map(async ({ type, page, genres }) => {
                        const params = new URLSearchParams({
                            api_key: TMDB_KEY,
                            language: 'ko-KR',
                            sort_by: 'popularity.desc',
                            page: String(page),
                        });

                        if (genres) params.set('with_genres', genres);

                        const response = await fetch(
                            `https://api.themoviedb.org/3/discover/${type}?${params}`,
                            { signal: controller.signal }
                        );

                        if (!response.ok) {
                            throw new Error('콘텐츠를 불러오지 못했습니다.');
                        }

                        const data = await response.json();

                        return data.results.map(item => ({
                            id: `${type}-${item.id}`,
                            tmdbId: item.id,
                            mediaType: type,
                            title: type === 'movie' ? item.title : item.name,
                            posterPath: item.poster_path,
                        }));
                    })
                );

                if (controller.signal.aborted) return;

                const unique = [...new Map(
                    results.flat().map(item => [item.id, item])
                ).values()].filter(item => item.posterPath);

                const movies = unique.filter(item => item.mediaType === 'movie');
                const shows = unique.filter(item => item.mediaType === 'tv');
                const merged = [];

                for (let i = 0; i < Math.max(movies.length, shows.length); i++) {
                    if (movies[i]) merged.push(movies[i]);
                    if (shows[i]) merged.push(shows[i]);
                }

                setContents(merged.slice(0, 80));

                if (merged.length === 0) {
                    setError('선택한 장르에 해당하는 작품이 없어요.');
                }
            } catch (err) {
                if (!controller.signal.aborted) setError(err.message);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };

        fetchContents();
        return () => controller.abort();
    }, [selectedGenres]);

    const handleSelect = (content) => {
        const isSelected = selectedContents.some(
            (item) => item.id === content.id
        );

        onChange(
            isSelected
                ? selectedContents.filter((item) => item.id !== content.id)
                : [...selectedContents, content]
        );
    };

    return (
        <div className="content-select">
            <h2>좋아하는 콘텐츠를 선택해주세요</h2>

            <p>
                좋아하는 작품을 선택하면 취향에 맞는 콘텐츠를
                찾는 데 도움이 돼요.
            </p>

            {loading && (
                <p className="content-status">
                    콘텐츠를 불러오는 중...
                </p>
            )}

            {error && (
                <p className="content-status" role="alert">
                    {error}
                </p>
            )}

            {!loading && !error && (
                <div className="content-grid">
                    {contents.map(content => {
                        const selected = selectedContents.some(
                            item => item.id === content.id
                        );

                        return (
                            <button
                                type="button"
                                key={content.id}
                                className={`content-item ${selected ? 'active' : ''
                                    }`}
                                onClick={() => handleSelect(content)}
                                aria-pressed={selected}
                                aria-label={`${content.title} ${selected ? '선택 해제' : '선택'
                                    }`}
                            >
                                <img
                                    src={`${IMAGE_URL}${content.posterPath}`}
                                    alt={content.title}
                                    loading="lazy"
                                />

                                {selected && (
                                    <span
                                        className="content-check"
                                        aria-hidden="true"
                                    >
                                        ✓
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="content-buttons">
                <button type="button" className="step-back" onClick={onPrev}>
                    이전
                </button>

                <button
                    type="button"
                    className="step-primary"
                    onClick={onNext}
                    disabled={loading || !!error || selectedContents.length === 0}
                >
                    완료
                </button>
            </div>
        </div>
    );
};
