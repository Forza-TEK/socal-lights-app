// GET /api/posts — approved showcased houses, for the public map. A home owned by a past contest winner carries `b`: the badges
// they chose to show (list card l, map pop-up p, details page d).
import { json, rowToPost } from "../_lib/util.js";
import { pairs } from "../_lib/addrkey.js";
import { winnerBadges, parsePrefs, shown, emailKey } from "../_lib/badges.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM posts WHERE status = 'approved' ORDER BY approved_at DESC LIMIT 500"
  ).all();
  // Where the admin chose the sweep record for an address, the post at that address is not shown on the map
  let hide = new Set();
  try {
    const chosen = (await env.DB.prepare("SELECT id, city, address FROM events WHERE keep_listed = 2 AND address != ''").all()).results;
    if (chosen.length) hide = new Set(pairs(results.filter((r) => !r.contest_id), chosen).exact.map((x) => x.post.id));
  } catch {}
  let byUser = new Map(), users = new Map(); // userId -> badges; userId -> { email, prefs }
  try {
    byUser = await winnerBadges(env);
    if (byUser.size) {
      const ids = [...byUser.keys()].slice(0, 200);
      for (const u of (await env.DB.prepare(`SELECT id, email, badges FROM users WHERE id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all()).results) users.set(u.id, { email: u.email, prefs: parsePrefs(u.badges) });
    }
  } catch {}
  const idByEmail = new Map([...users].map(([id, u]) => [u.email, id]));
  const out = results.filter((r) => !hide.has(r.id)).map((r) => {
    const p = rowToPost(r);
    const uid = r.user_id && users.has(r.user_id) ? r.user_id : idByEmail.get(emailKey(r.contact_email));
    if (uid && byUser.has(uid)) { const u = users.get(uid), b = byUser.get(uid).map((x) => shown(x, u.prefs)).filter((x) => x.l || x.p || x.d); if (b.length) p.b = b; }
    return p;
  });
  return json(out, { headers: { "cache-control": "public, max-age=60" } });
}
