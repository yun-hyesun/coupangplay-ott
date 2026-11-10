export async function getMyTeamVideoCatalogPage(query, { signal } = {}) {
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value !== "" && value != null));
  const response = await fetch(`/api/my-team-videos?${params}`, { signal, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "마이팀 인기영상을 불러오지 못했습니다.");
  if (!Array.isArray(data.videos)) throw new Error("영상 응답 형식이 올바르지 않습니다.");
  return data;
}
