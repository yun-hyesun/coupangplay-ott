import { useEffect, useState } from 'react';

const getItemKey = (item) => `${item.media_type}-${item.id}`;

export const useMyListArtwork = (items, { keepMissing = false } = {}) => {
    const [artworkByKey, setArtworkByKey] = useState({});

    const requestKey = JSON.stringify(
        items
            .filter((item) =>
                item.id &&
                ['movie', 'tv'].includes(item.media_type) &&
                (!item.backdrop_path || !item.logo_path)
            )
            .slice(0, 20)
            .map(({ id, media_type }) => ({ id, media_type }))
    );

    useEffect(() => {
        const apiKey = import.meta.env.VITE_TMDB_API_KEY;
        const targets = JSON.parse(requestKey);

        if (!apiKey || targets.length === 0) return;

        const controller = new AbortController();
        const params = new URLSearchParams({
            api_key: apiKey,
            language: 'ko-KR',
            append_to_response: 'images',
            include_image_language: 'ko,en,null',
        });

        for (const item of targets) {
            const loadArtwork = async () => {
                try {
                    const response = await fetch(
                        `https://api.themoviedb.org/3/${item.media_type}/${item.id}?${params}`,
                        { signal: controller.signal }
                    );

                    if (!response.ok) return;

                    const detail = await response.json();
                    const logos = detail.images?.logos ?? [];
                    const logo =
                        logos.find((image) => image.iso_639_1 === 'ko') ||
                        logos.find((image) => image.iso_639_1 === 'en') ||
                        logos[0];

                    if (controller.signal.aborted) return;

                    setArtworkByKey((previous) => ({
                        ...previous,
                        [getItemKey(item)]: {
                            backdrop_path: detail.backdrop_path,
                            poster_path: detail.poster_path,
                            logo_path: logo?.file_path,
                        },
                    }));
                } catch {
                    // 조회에 실패하면 기존에 저장된 이미지 사용
                }
            };

            void loadArtwork();
        }

        return () => controller.abort();
    }, [requestKey]);

    return items
        .map((item) => {
            const artwork = artworkByKey[getItemKey(item)];

            return {
                ...item,
                backdrop_path:
                    item.backdrop_path ||
                    artwork?.backdrop_path ||
                    item.poster_path ||
                    artwork?.poster_path,
                logo_path: item.logo_path || artwork?.logo_path,
            };
        })
        .filter((item) => keepMissing || item.backdrop_path);
};