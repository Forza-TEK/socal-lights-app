// The homeowner's photo link for a home the organizer added (user_id = ''): /photos/<token> shows this API's data.
//   GET    /api/home-photos/<token>               — the home, the contest, its photos and whether the link is still open
//   POST   /api/home-photos/<token>   (multipart: photos) — adds photos (up to 8 on the home)
//   DELETE /api/home-photos/<token>?key=p/<id>/<n>.jpg    — removes one photo
// Anyone holding the link can do this, with no sign-in, from the day the home is added until voting closes (photosOpen). The token is a random 24-byte secret that
// belongs to one home only; the organizer can replace it ("New link") if it was shared by mistake. Nothing here reaches any other home, contest or account.
import { json, err } from "../../_lib/util.js";
import { TOKEN_RE, addPhotos, removePhoto, photosOpen, MAX_PHOTOS } from "../../_lib/entryphotos.js";
import { checkThrottle, hashKey } from "../../_lib/throttle.js";

const NO_STORE = { headers: { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", "referrer-policy": "no-referrer" } };
const gone = () => err(404, "This photo link isn't active. Ask the organizer of the contest for a new one.");

async function load(env, token) {
  if (!TOKEN_RE.test(String(token || ""))) return null;
  const row = await env.DB.prepare("SELECT id, title, biz, address, photos, status, contest_id FROM posts WHERE photo_token = ? AND user_id = '' AND contest_id IS NOT NULL").bind(token).first();
  if (!row || row.status !== "approved") return null;
  const c = await env.DB.prepare("SELECT name, org, city, slug, status, announced, vote_end FROM contests WHERE id = ?").bind(row.contest_id).first();
  return c ? { row, c } : null;
}
const view = (row, c) => ({ ok: true, open: photosOpen(c), max: MAX_PHOTOS, voteEnd: c.vote_end, announced: !!c.announced,
  contest: { name: c.name, org: c.org, city: c.city }, home: { title: row.title || row.biz || "Your home", address: row.address },
  photos: (() => { try { return JSON.parse(row.photos || "[]").map((k) => ({ key: k, url: "/api/photo/" + k })); } catch { return []; } })() });
const slow = async (env, request, token) => checkThrottle(env, [
  { kind: "hp-token", key: await hashKey(env, "t", token), max: 40, windowHours: 24, msg: "That is a lot of changes for one day. Please try again tomorrow." },
  { kind: "hp-ip", key: await hashKey(env, "ip", request.headers.get("CF-Connecting-IP") || "unknown"), max: 80, windowHours: 24, msg: "Too many uploads from this connection today. Please try again tomorrow." },
]);

export async function onRequestGet({ params, env }) {
  const x = await load(env, params.token); if (!x) return gone();
  return json(view(x.row, x.c), NO_STORE);
}
export async function onRequestPost({ params, request, env }) {
  const x = await load(env, params.token); if (!x) return gone();
  if (!photosOpen(x.c)) return err(409, "Voting has closed, so photos can't be added any more.");
  const m = await slow(env, request, params.token); if (m) return err(429, m);
  let form; try { form = await request.formData(); } catch { return err(400, "The photos couldn't be read. Please try again."); }
  const files = form.getAll("photos").filter((f) => f && typeof f === "object" && f.size > 0);
  const r = await addPhotos(env, x.row, files);
  if (r.error) return err(r.status, r.error);
  return json(view({ ...x.row, photos: JSON.stringify(r.photos) }, x.c), NO_STORE);
}
export async function onRequestDelete({ params, request, env }) {
  const x = await load(env, params.token); if (!x) return gone();
  if (!photosOpen(x.c)) return err(409, "Voting has closed, so photos can't be changed any more.");
  const m = await slow(env, request, params.token); if (m) return err(429, m);
  const r = await removePhoto(env, x.row, new URL(request.url).searchParams.get("key") || "");
  if (r.error) return err(r.status, r.error);
  return json(view({ ...x.row, photos: JSON.stringify(r.photos) }, x.c), NO_STORE);
}
