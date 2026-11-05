import { useEffect, useState } from 'react';

const emptyRails = { live: [], highlights: [], replays: [], error: false };

export const useSportsRails = () => {
  const [rails, setRails] = useState(emptyRails);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSports() {
      try {
        const response = await fetch('/api/sports', { signal: controller.signal });
        if (!response.ok) throw new Error('스포츠 API 요청 실패');
        const data = await response.json();
        if (!controller.signal.aborted) setRails(data);
      } catch {
        if (!controller.signal.aborted) setRails({ ...emptyRails, error: true });
      }
    }

    loadSports();
    return () => controller.abort();
  }, []);

  return rails;
};

