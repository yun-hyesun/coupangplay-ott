import { useEffect, useState } from "react";
import { getScheduleMatchVideos } from "../service/matchRelatedVideosService";

const EMPTY_VIDEOS = {};

export function useScheduleMatchVideos(games, dateKey) {
  const [result, setResult] = useState({ key: "", videos: EMPTY_VIDEOS });
  const queryKey = JSON.stringify([dateKey, games.map(game => ({
    gameId: game.gameId, competitionCode: game.competitionCode,
    utcDate: game.utcDate || game.startTime, matchday: game.matchday,
    scheduleSegment: game.scheduleSegment, raceName: game.raceName,
    home: { name: game.home?.name }, away: { name: game.away?.name },
  }))]);

  useEffect(() => {
    const controller = new AbortController();
    const [, matches] = JSON.parse(queryKey);
    getScheduleMatchVideos(matches, {
      signal: controller.signal,
      onVideos: (key, videos) => {
        if (!controller.signal.aborted) setResult(previous => ({
          key: queryKey,
          videos: { ...(previous.key === queryKey ? previous.videos : EMPTY_VIDEOS), [key]: videos },
        }));
      },
    }).catch(() => {});
    return () => controller.abort();
  }, [queryKey]);

  return result.key === queryKey ? result.videos : EMPTY_VIDEOS;
}
