// A homeowner's page for a home the organizer added to a contest: /photos/<token> shows this API's data. The organizer shares the link; the homeowner signs in with an email
// code or Google, links the home to their account, and from then on manages it. Their email is then on the entry (contest results and updates reach them).
//   GET                                   — the home and what this visitor may do: unclaimed (sign in to link it), mine (everything below), or linked to another account
//   POST   { action: "claim" }            — link the home to the signed-in account (first account to do so keeps it; the organizer can unlink)
//   POST   { action: "edit", title, desc, where, lights_on, visit, parking, accessible, radio } — edit the details
//   POST   { action: "hide" | "show", name } — hide a photo the organizer added from the public (it is not deleted), or show it again
//   POST   (multipart: photos)            — add photos (up to 8 on the home, hidden ones count)
//   DELETE ?name=<n>.jpg                  — delete one of the homeowner's OWN photos (the organizer's photos can only be hidden)
// The homeowner can never delete the home, nor the organizer's photos. Details and photos can change until voting closes; linking is possible until winners are announced.
// The token is a random 24-byte secret for one home; it only lets a person link the home to their own account. The organizer can replace it ("New link") or unlink a wrong person.
import { json, err } from "../../_lib/util.js";
import { getUser, sameOrigin } from "../../_lib/auth.js";
import { TOKEN_RE, addPhotos, removePhoto, setHidden, photosOpen, claimOpen, photoList, MAX_PHOTOS } from "../../_lib/entryphotos.js";
import { checkThrottle, hashKey } from "../../_lib/throttle.js";
import { normName, normText, normRadio, line } from "../../_lib/fields.js";
import { diff, logHome, HOME_FIELDS } from "../../_lib/changes.js";
import { clean } from "../../_lib/util.js";

const NO_STORE = { headers: { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow", "referrer-policy": "no-referrer" } };
const gone = () => err(404, "This link isn't active. Ask the organizer of the contest for a new one.");

async function load(env, token) {
  if (!TOKEN_RE.test(String(token || ""))) return null;
  const row = await env.DB.prepare("SELECT * FROM posts WHERE photo_token = ? AND contest_id IS NOT NULL").bind(token).first();
  if (!row || row.status !== "approved") return null;
  const c = await env.DB.prepare("SELECT name, org, city, slug, status, announced, vote_end FROM contests WHERE id = ?").bind(row.contest_id).first();
  return c ? { row, c } : null;
}
function view(row, c, user) {
  const state = !row.user_id ? "unclaimed" : user && row.user_id === user.id ? "mine" : "other";
  const out = { ok: true, state, signedIn: !!user, email: user ? user.email : "", open: photosOpen(c), canLink: claimOpen(c), announced: !!c.announced, voteEnd: c.vote_end, max: MAX_PHOTOS,
    contest: { name: c.name, org: c.org, city: c.city, slug: c.slug }, home: { title: row.title || row.biz || "Your home", address: row.address } };
  if (state === "mine") Object.assign(out, { details: { title: row.title || "", desc: row.descr || "", where: row.where_txt || "", lights_on: row.lights_on || "", visit: row.visit || "", parking: row.parking || "", accessible: !!row.accessible, radio: row.radio || "" }, photos: photoList(row) });
  return out;
}
const slow = async (env, request, token) => checkThrottle(env, [
  { kind: "hp-token", key: await hashKey(env, "t", token), max: 60, windowHours: 24, msg: "That is a lot of changes for one day. Please try again tomorrow." },
  { kind: "hp-ip", key: await hashKey(env, "ip", request.headers.get("CF-Connecting-IP") || "unknown"), max: 80, windowHours: 24, msg: "Too many changes from this connection today. Please try again tomorrow." },
]);
// Signed in, same origin, the home exists and is this person's, and changes are still open. Returns { x, user } or { res }.
async function mine(ctx, { needOpen = true } = {}) {
  const { params, request, env } = ctx;
  if (!sameOrigin(request)) return { res: err(403, "Not allowed.") };
  const x = await load(env, params.token); if (!x) return { res: gone() };
  const user = await getUser(request, env);
  if (!user) return { res: err(401, "Please sign in first.") };
  if (x.row.user_id !== user.id) return { res: err(403, "This home isn't linked to your account.") };
  if (needOpen && !photosOpen(x.c)) return { res: err(409, "Voting has closed, so this home can't be changed any more.") };
  const m = await slow(env, request, params.token); if (m) return { res: err(429, m) };
  return { x, user };
}
const fresh = async (env, id) => env.DB.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first();

export async function onRequestGet({ params, request, env }) {
  const x = await load(env, params.token); if (!x) return gone();
  return json(view(x.row, x.c, await getUser(request, env)), NO_STORE);
}

export async function onRequestPost(ctx) {
  const { params, request, env } = ctx;
  const ct = request.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const g = await mine(ctx); if (g.res) return g.res;
    let form; try { form = await request.formData(); } catch { return err(400, "The photos couldn't be read. Please try again."); }
    const files = form.getAll("photos").filter((f) => f && typeof f === "object" && f.size > 0);
    const r = await addPhotos(env, g.x.row, files, "owner");
    return r.error ? err(r.status, r.error) : json(view(r.row, g.x.c, g.user), NO_STORE);
  }
  const b = await request.json().catch(() => ({}));
  if (b.action === "claim") {
    if (!sameOrigin(request)) return err(403, "Not allowed.");
    const x = await load(env, params.token); if (!x) return gone();
    const user = await getUser(request, env);
    if (!user) return err(401, "Please sign in first.");
    if (!claimOpen(x.c)) return err(409, "The winners have been announced, so this home can't be linked any more.");
    const m = await slow(env, request, params.token); if (m) return err(429, m);
    if (!x.row.user_id) {
      const r = await env.DB.prepare("UPDATE posts SET user_id = ?, contact_email = ?, claimed_at = datetime('now') WHERE id = ? AND user_id = ''").bind(user.id, String(user.email || "").toLowerCase(), x.row.id).run();
      if (!(r.meta && r.meta.changes)) return err(409, "Someone linked this home a moment ago.");
    } else if (x.row.user_id !== user.id) return err(409, "This home is already linked to another account. Ask the organizer if that is a mistake.");
    return json(view(await fresh(env, x.row.id), x.c, user), NO_STORE);
  }
  const g = await mine(ctx); if (g.res) return g.res;
  const { row, c } = g.x;
  if (b.action === "hide" || b.action === "show") {
    const r = await setHidden(env, row, String(b.name || ""), b.action === "hide");
    return r.error ? err(r.status, r.error) : json(view(r.row, c, g.user), NO_STORE);
  }
  if (b.action === "edit") {
    const title = normName(clean(b.title ?? row.title, 90)), desc = normText(clean(b.desc ?? row.descr, 1200));
    if (title.length < 2) return err(400, "Give the home a name.");
    const next = { title, descr: desc || row.descr, where_txt: line(b.where ?? row.where_txt, 120), lights_on: line(b.lights_on ?? row.lights_on, 60),
      visit: ["drive", "walk", "both", ""].includes(b.visit) ? b.visit : row.visit, parking: ["free", "street", "none", ""].includes(b.parking) ? b.parking : row.parking,
      accessible: b.accessible === undefined ? row.accessible : b.accessible ? 1 : 0, radio: normRadio(clean(b.radio ?? row.radio, 40)) };
    const changes = diff(row, next, HOME_FIELDS);
    if (changes.length) {
      await env.DB.prepare("UPDATE posts SET biz = ?, title = ?, descr = ?, where_txt = ?, lights_on = ?, visit = ?, parking = ?, accessible = ?, radio = ? WHERE id = ?")
        .bind(next.title, next.title, next.descr, next.where_txt, next.lights_on, next.visit, next.parking, next.accessible, next.radio, row.id).run();
      await logHome(env, row.id, { email: g.user.email, name: g.user.name || row.biz || g.user.email, role: "homeowner" }, changes);
    }
    return json(view(await fresh(env, row.id), c, g.user), NO_STORE);
  }
  return err(400, "Unknown action.");
}

export async function onRequestDelete(ctx) {
  const g = await mine(ctx); if (g.res) return g.res;
  const r = await removePhoto(ctx.env, g.x.row, new URL(ctx.request.url).searchParams.get("name") || "", "owner");
  return r.error ? err(r.status, r.error) : json(view(r.row, g.x.c, g.user), NO_STORE);
}
