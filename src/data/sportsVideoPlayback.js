const VIDEO_ID = /^[\w-]{11}$/;

export function getSportsVideoId(video = {}) {
  for (const id of [video.videoId, video.id]) {
    if (typeof id === "string" && VIDEO_ID.test(id)) return id;
  }
  try {
    const url = new URL(video.url || video.watchUrl);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    let id = "";
    if (host === "youtu.be") id = url.pathname.split("/")[1];
    else if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
      const parts = url.pathname.split("/");
      id = url.searchParams.get("v") || (["embed", "shorts", "live"].includes(parts[1]) ? parts[2] : "");
    }
    return VIDEO_ID.test(id || "") ? id : "";
  } catch { return ""; }
}
