
import React, { useEffect, useState } from 'react';

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY;
const IMAGE_URL = 'https://image.tmdb.org/t/p/w342';

export const ContentSelect = ({
    selectedContents,
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

            try {
                // 영화 2페이지 + TV 2페이지
                const requests = [
                    { type: 'movie', page: 1 },
                    { type: 'movie', page: 2 },
                    { type: 'tv', page: 1 },
                    { type: 'tv', page: 2 }
                ];

                const results = await Promise.all(
                    requests.map(async ({ type, page }) => {
                        const url =
                            `https://api.themoviedb.org/3/discover/${type}` +
                            `?api_key=${TMDB_KEY}` +
                            `&language=ko-KR` +
                            `&sort_by=popularity.desc` +
                            `&page=${page}`;

                        const response = await fetch(url, {
                            signal: controller.signal
                        });

                        if (!response.ok) {
                            throw new Error('콘텐츠를 불러오지 못했습니다.');
                        }

                        const data = await response.json();

                        return data.results.map(item => ({
                            id: `${type}-${item.id}`,
                            tmdbId: item.id,
                            mediaType: type,
                            title: type === 'movie' ? item.title : item.name,
                            posterPath: item.poster_path
                        }));
                    })
                );

                // 영화와 TV 콘텐츠 번갈아 배치
                const movies = [...results[0], ...results[1]];
                const tvShows = [...results[2], ...results[3]];

                const merged = [];
                const maxLength = Math.max(
                    movies.length,
                    tvShows.length
                );

                for (let i = 0; i < maxLength; i++) {
                    if (movies[i]) merged.push(movies[i]);
                    if (tvShows[i]) merged.push(tvShows[i]);
                }

                // 포스터가 있는 콘텐츠만 최대 80개 표시
                setContents(
                    merged
                        .filter(item => item.posterPath)
                        .slice(0, 80)
                );

            } catch (err) {
                if (err.name !== 'AbortError') {
                    setError(err.message);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchContents();

        return () => controller.abort();
    }, []);

    // 콘텐츠 선택 / 선택 해제
    const handleSelect = (content) => {
        const exists = selectedContents.some(
            item => item.id === content.id
        );

        if (exists) {
            onChange(
                selectedContents.filter(
                    item => item.id !== content.id
                )
            );
        } else {
            onChange([...selectedContents, content]);
        }
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
                                className={`content-item ${
                                    selected ? 'active' : ''
                                }`}
                                onClick={() => handleSelect(content)}
                                aria-pressed={selected}
                                aria-label={`${content.title} ${
                                    selected ? '선택 해제' : '선택'
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
                <button
                    type="button"
                    onClick={onNext}
                    disabled={
                        loading ||
                        !!error ||
                        selectedContents.length === 0
                    }
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
