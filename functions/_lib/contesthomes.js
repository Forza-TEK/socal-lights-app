// The homes entered in a contest, for its event card on the map (GET /api/events/c-<slug>) and its page (/e/c-<slug>).
// Only approved homes. Up to LIMIT are returned with the total, so a card can say "See all 40 homes".
// Homes with a photo come first, then by entry number. While voting is open the photo homes rotate by day, so the first people to enter aren't always in front.
export const HOME_LIMIT = 12;
const todayPT = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

export function pickHomes(rows, { voting = false, day = 0, limit = HOME_LIMIT } = {}) {
  const homes = rows.map((r) => ({ id: r.id, name: r.title || r.biz || "", address: r.address || r.city || "", photo: (JSON.parse(r.photos || "[]")[0]) || "", no: r.entry_no || 0, lat: r.lat, lng: r.lng }))
    .sort((a, z) => (a.photo ? 0 : 1) - (z.photo ? 0 : 1) || a.no - z.no);
  const withPhoto = homes.filter((h) => h.photo), without = homes.filter((h) => !h.photo);
  const turn = voting && withPhoto.length > 1 ? day % withPhoto.length : 0;
  return { total: homes.length, homes: [...withPhoto.slice(turn), ...withPhoto.slice(0, turn), ...without].slice(0, limit) };
}

// null when the id isn't a live contest's event
export async function contestHomes(env, eventId) {
  if (!String(eventId).startsWith("c-")) return null;
  const c = await env.DB.prepare("SELECT id, slug, name, logo, vote_start, vote_end FROM contests WHERE event_id = ? AND status = 'live'").bind(eventId).first();
  if (!c) return null;
  const { results } = await env.DB.prepare("SELECT id, title, biz, address, city, photos, entry_no, lat, lng FROM posts WHERE contest_id = ? AND status = 'approved' ORDER BY entry_no").bind(c.id).all();
  const today = todayPT(), voting = c.vote_start <= today && today <= c.vote_end;
  return { slug: c.slug, name: c.name, logo: c.logo ? `/api/contests/${encodeURIComponent(c.slug)}/logo?v=${(c.logo.match(/\/(\d+)\.\w+$/) || [])[1] || "1"}` : "", ...pickHomes(results, { voting, day: Math.floor(Date.parse(today) / 86400000) }) };
}
