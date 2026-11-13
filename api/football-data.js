export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { leagueId, resource, ...query } = req.query;

  if (
    typeof leagueId !== 'string' ||
    !/^[A-Za-z0-9]+$/.test(leagueId) ||
    !['matches', 'standings'].includes(resource)
  ) {
    return res.status(400).json({ error: 'Invalid Football-Data request' });
  }

  const token = process.env.FOOTBALL_DATA_KEY;
  if (!token) {
    return res.status(503).json({ error: 'FOOTBALL_DATA_KEY is missing' });
  }

  const url = new URL(
    `https://api.football-data.org/v4/competitions/${leagueId}/${resource}`,
  );

  for (const [name, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === 'string') url.searchParams.append(name, item);
    }
  }

  try {
    const response = await fetch(url, {
      headers: { 'X-Auth-Token': token },
      signal: AbortSignal.timeout(8000),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch {
    return res.status(502).json({ error: 'Football-Data request failed' });
  }
}