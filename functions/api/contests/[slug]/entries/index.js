// POST /api/contests/<slug>/entries { homes: [{ address, name?, descr? }], confirm: true, dryRun?: true }
// The organizer (or a co-organizer) adds homes to her own contest herself, for contests that register residents elsewhere (a city form, a spreadsheet, email).
// dryRun only looks the addresses up and writes nothing. Otherwise each home that is found becomes an approved entry with no photos and no account behind it
// (user_id = '', added_by = the organizer), so nobody is blocked from voting or judging it and deleting the organizer's account never deletes it.
// Answer: { ok, dryRun, found: [..] (dry run), added: [..], failed: [{ index, address, reason }], skipped: [{ index, address, reason }] }
import { json, err, clean, newId } from "../../../../_lib/util.js";
import { newPhotoToken } from "../../../../_lib/entryphotos.js";
import { getUser, sameOrigin } from "../../../../_lib/auth.js";
import { getContest, isStaff, todayPT, UNTRUSTED_ADDED_CAP } from "../../../../_lib/contests.js";
import { teamChanged } from "../../../../_lib/changes.js";
import { normText } from "../../../../_lib/fields.js";
import { parseHome, homeKey, homeTitle, locate, pool, MAX_HOMES_PER_CALL, MAX_ADDED_PER_CONTEST, CALLS_PER_HOUR, HOMES_PER_HOUR, CONSENT_TEXT, CONSENT_VERSION } from "../../../../_lib/homes.js";

const NO_STORE = { headers: { "cache-control": "no-store" } };

export async function onRequestPost({ params, request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const user = await getUser(request, env);
  if (!user) return err(401, "Please sign in first.");
  const c = await getContest(env, params.slug);
  if (!c) return err(404, "That contest doesn't exist.");
  if (!(await isStaff(env, c, user))) return err(403, "Only the organizers of this contest can add homes.");
  if (c.announced) return err(409, "Results are locked.");
  if (c.status !== "live") return err(400, "This contest isn't live yet.");
  // Homes can still be added after entries close (organizers often register late), but not once voting has started: that would change the ballot under the voters.
  const started = todayPT() >= c.vote_start || (await env.DB.prepare("SELECT (SELECT COUNT(*) FROM votes WHERE contest_id = ?1) + (SELECT COUNT(*) FROM judge_picks WHERE contest_id = ?1) + (SELECT COUNT(*) FROM judge_scores WHERE contest_id = ?1) AS n").bind(c.id).first()).n > 0;
  if (started) return err(400, "Voting has started, so homes can't be added any more.");

  const b = await request.json().catch(() => ({}));
  const dryRun = b.dryRun === true;
  if (!dryRun && b.confirm !== true) return err(400, "Confirm that the residents agreed to have their address shown on the public map.");
  if (!Array.isArray(b.homes) || !b.homes.length) return err(400, "Add at least one home.");
  if (b.homes.length > MAX_HOMES_PER_CALL) return err(400, `Add up to ${MAX_HOMES_PER_CALL} homes at a time.`);
  if (!b.homes.every((h) => h && typeof h === "object" && typeof h.address === "string")) return err(400, "Each home needs an address.");
  if (!dryRun) {
    const { n: have } = await env.DB.prepare("SELECT COUNT(*) AS n FROM posts WHERE contest_id = ? AND photo_token IS NOT NULL AND status != 'declined'").bind(c.id).first();
    // N-02: until Admin has looked at a contest whose organizer we could not tie to a website (contests.note), the organizer may add only a few homes of their own
    const cap = c.note ? UNTRUSTED_ADDED_CAP : MAX_ADDED_PER_CONTEST;
    if (have + b.homes.length > cap) return err(400, c.note ? `Until we have looked at your contest (usually within a day), you can add up to ${UNTRUSTED_ADDED_CAP} homes this way. This one has room for ${Math.max(0, UNTRUSTED_ADDED_CAP - have)} more.` : `A contest can have up to ${MAX_ADDED_PER_CONTEST} homes added this way. This one has room for ${Math.max(0, MAX_ADDED_PER_CONTEST - have)} more.`);
  }

  // Per account and hour: up to HOMES_PER_HOUR homes and CALLS_PER_HOUR calls (checking addresses counts too: it asks the geocoders)
  const used = await env.DB.prepare("SELECT COUNT(*) AS calls, COALESCE(SUM(n),0) AS homes FROM entry_add_log WHERE user_id = ? AND created_at > datetime('now','-1 hour')").bind(user.id).first();
  if (used.calls >= CALLS_PER_HOUR || used.homes + b.homes.length > HOMES_PER_HOUR) return err(429, `You can add or check up to ${HOMES_PER_HOUR} homes an hour. Try again later.`);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO entry_add_log (user_id, contest_id, n) VALUES (?, ?, ?)").bind(user.id, c.id, b.homes.length),
    env.DB.prepare("DELETE FROM entry_add_log WHERE created_at < datetime('now','-1 day')"),
  ]);

  const failed = [], skipped = [], todo = [], pasted = new Set();
  const taken = new Set((await env.DB.prepare("SELECT street, address FROM posts WHERE contest_id = ? AND status != 'declined'").bind(c.id).all()).results.map((p) => homeKey(p.street || p.address)));
  b.homes.forEach((h, index) => {
    let [address, name] = String(h.address).split("|"); // "address | name" in one string is accepted too
    address = clean(address, 200); name = h.name || name;
    const p = parseHome(address, c.city);
    if (p.error) return failed.push({ index, address, reason: p.error });
    const key = homeKey(p.street);
    if (taken.has(key)) return skipped.push({ index, address, reason: pasted.has(key) ? "Listed twice." : "Already in this contest." });
    taken.add(key); pasted.add(key);
    todo.push({ index, address, key, ...p, title: homeTitle(name, p.street), descr: normText(clean(h.descr, 300)) || `Entry in ${c.name}` });
  });

  const found = [];
  await pool(todo, 5, async (h) => {
    const r = await locate(h, c);
    if (r.reason) failed.push({ index: h.index, address: h.address, reason: r.reason });
    else found.push({ ...h, pt: r.pt, matched: r.matched });
  });
  found.sort((a, z) => a.index - z.index);

  const view = (h) => ({ index: h.index, address: h.address, street: h.street, city: h.city, matched: h.matched || "", title: h.title });
  const byIndex = (a, z) => a.index - z.index;
  failed.sort(byIndex); skipped.sort(byIndex);
  if (dryRun) return json({ ok: true, dryRun: true, found: found.map(view), failed, skipped }, NO_STORE);

  const rows = found.map((h) => ({ ...h, id: newId(), token: newPhotoToken() }));
  if (rows.length) {
    // PL-01: keep who confirmed, when, for which contest, how many homes and the exact wording, and link each home to that record. Written in the same batch as the homes.
    const consentId = newId();
    await env.DB.batch([env.DB.prepare("INSERT INTO home_consents (id, contest_id, user_id, email, n, version, text) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(consentId, c.id, user.id, String(user.email || "").toLowerCase(), rows.length, CONSENT_VERSION, CONSENT_TEXT), ...rows.map((h) => env.DB.prepare(
      `INSERT INTO posts (id,status,biz,title,city,county,lat,lng,web,phone,where_txt,descr,photos,contact_email,season,address,show_address,poster_type,street,state,zip,service_area,contest_id,category,user_id,added_by,entry_no,approved_at,consent_id,photo_token)
       VALUES (?,'approved',?,?,?,?,?,?,'','','',?,'[]','',?,?,1,'homeowner',?,'CA',?,'',?,'','',?,(SELECT COALESCE(MAX(entry_no),0)+1 FROM posts WHERE contest_id = ?),datetime('now'),?,?)`
    ).bind(h.id, h.title, h.title, h.city, c.county || "", h.pt[0], h.pt[1], h.descr, c.season, `${h.street}, ${h.city}, CA${h.zip ? " " + h.zip : ""}`, h.street, h.zip, c.id, user.id, c.id, consentId, h.token))]);
    await teamChanged(env, c, user, [{ label: "Entries", old: "", new: `Added ${rows.length} ${rows.length === 1 ? "home" : "homes"}` }], waitUntil);
  }
  const nos = new Map((await env.DB.prepare(`SELECT id, entry_no FROM posts WHERE id IN (${rows.map(() => "?").join(",") || "''"})`).bind(...rows.map((r) => r.id)).all()).results.map((r) => [r.id, r.entry_no]));
  return json({ ok: true, dryRun: false, added: rows.map((h) => ({ ...view(h), id: h.id, entry_no: nos.get(h.id) })), failed, skipped }, NO_STORE);
}
