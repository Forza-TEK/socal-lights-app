// Turns a YouTube or Vimeo link into one clean form, or null. Used by the server (what is allowed to be stored) and the map (how to play it), so both agree.
// A video is only ever played after a tap, from the privacy-friendly player addresses (youtube-nocookie.com, player.vimeo.com): nothing is loaded from either site just by opening a card.
const YT = /^[A-Za-z0-9_-]{11}$/;
export function parseVideo(input) {
  let u; try { u = new URL(String(input || "").trim()); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const h = u.hostname.toLowerCase().replace(/^(www|m)\./, ""), parts = u.pathname.split("/").filter(Boolean);
  let id = "";
  if (h === "youtu.be") id = parts[0] || "";
  else if (h === "youtube.com" || h === "youtube-nocookie.com") id = parts[0] === "watch" ? u.searchParams.get("v") || "" : ["embed", "shorts", "live", "v"].includes(parts[0]) ? parts[1] || "" : "";
  if (id && YT.test(id)) return { kind: "youtube", id, watch: `https://www.youtube.com/watch?v=${id}`, embed: `https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1` };
  if (h === "vimeo.com" || h === "player.vimeo.com") {
    const v = h === "player.vimeo.com" ? (parts[0] === "video" ? parts[1] : "") : (parts.find((p) => /^\d{5,12}$/.test(p)) || "");
    if (/^\d{5,12}$/.test(v)) return { kind: "vimeo", id: v, watch: `https://vimeo.com/${v}`, embed: `https://player.vimeo.com/video/${v}?autoplay=1` };
  }
  return null;
}
