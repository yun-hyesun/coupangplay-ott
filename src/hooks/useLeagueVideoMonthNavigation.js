import { useEffect, useRef, useState } from "react";
import { getLeagueMonthNeighbors } from "../service/leagueMonthAvailabilityService";

export function useLeagueVideoMonthNavigation(leagueId, month, maxMonth, enabled, onChange) {
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const lastAttempt = useRef(0);
  const key = `${leagueId}:${month}:${maxMonth}:${attempt}`;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const force = attempt > lastAttempt.current;
    lastAttempt.current = attempt;
    getLeagueMonthNeighbors(leagueId, month, maxMonth, { signal: controller.signal, force }).then(data => {
      if (controller.signal.aborted) return;
      if (data.status === "inactive" && (data.previous || data.next)) onChange(data.previous || data.next);
      else setResult({ ...data, key });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ key, previous: null, next: null, incomplete: true });
    });
    return () => controller.abort();
  }, [leagueId, month, maxMonth, enabled, attempt, key, onChange]);
  return { ...(result?.key === key ? result : { previous: null, next: null }), retry: () => setAttempt(value => value + 1) };
}
