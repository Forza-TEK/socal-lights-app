// Grok event intake: rows Grok read in its own browser (docs/monetization/grok-browser-pass.md) are checked here with the same rules as the sweeps
// (scripts/event-rules.mjs, season/type lists, city list) and published as confirmed events whose id starts "grok-". Nothing Grok sends can edit or delete an existing event.
import { sha256 } from "./auth.js";
import { reply, adsError } from "./ads.js";
import { clean, webUrl, nearestCounty, geocodeAddress } from "./util.js";
import { line, normName } from "./fields.js";
import { slug, isDate } from "./events.js";
import { BAD } from "./moderation.js";
import { ptToday } from "./time.js";
import { CITY } from "../../public/cities.js";
import { SEASONS } from "../../public/seasons.js";
import { normalizeHours, freeFlagProblem } from "../../scripts/event-rules.mjs";

export const MAX_ROWS = 8;            // each row costs up to 2 geocoder calls and 2 database calls; a Pages Function may make 50 outgoing calls per request
export const RATE_PER_MIN = 30, PUBLISH_PER_DAY = 60, KEEP_REJECTED_DAYS = 30;
export const FIELDS = ["name", "city", "season", "type", "start", "end", "hours", "free", "price", "blurb", "url", "venue", "address", "shows", "evidence", "seen"];
export const SHOWS = ["date", "time", "place"];
export const ID_PREFIX = "grok-";

async function sameSecret(a, b) {
  const [x, y] = await Promise.all([sha256(String(a)), sha256(String(b))]);
  let d = 0; for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}

// { res } to send back as is, or { keyId } when the call may go on. 503 no key set, 401 wrong key, 405 wrong method, 429 over 30 calls a minute.
export async function intakeGuard(request, env, method) {
  const secret = env.GROK_INTAKE_KEY;
  if (!secret || String(secret).length < 16) return { res: adsError(503, "The Grok intake is not set up (GROK_INTAKE_KEY is missing). Ask the owner.") };
  const m = /^Bearer\s+(\S+)\s*$/i.exec(request.headers.get("authorization") || "");
  if (!m || !(await sameSecret(m[1], secret))) return { res: adsError(401, "Not allowed. Send the header Authorization: Bearer <GROK_INTAKE_KEY>.") };
  if (request.method !== method && !(method === "GET" && request.method === "HEAD")) return { res: adsError(405, `Use ${method} on this endpoint.`) };
  const keyId = (await sha256("intake|" + secret)).slice(0, 8), minute = Math.floor(Date.now() / 60000);
  try {
    const r = await env.DB.batch([
      env.DB.prepare("INSERT INTO outreach_rate (bucket, n) VALUES (?, 1) ON CONFLICT(bucket) DO UPDATE SET n = n + 1").bind(`${keyId}:${minute}`),
      env.DB.prepare("SELECT n FROM outreach_rate WHERE bucket = ?").bind(`${keyId}:${minute}`),
      env.DB.prepare("DELETE FROM outreach_rate WHERE CAST(substr(bucket, 10) AS INTEGER) < ?").bind(minute - 5),
    ]);
    if (r[1].results[0].n > RATE_PER_MIN) return { res: reply(429, { ok: false, error: `At most ${RATE_PER_MIN} requests a minute. Wait and retry.` }, { "retry-after": "30" }) };
  } catch { return { res: adsError(503, "Could not check the rate limit. Retry in a minute.") }; }
  return { keyId };
}

export const publishingOn = (env) => String(env.GROK_INTAKE_PUBLISH ?? "") !== "0"; // on by default: rows that pass every check publish at once; the secret GROK_INTAKE_PUBLISH=0 is the kill switch (rows are then held)
export const intakeId = async (name, start, city) => ID_PREFIX + slug(name).slice(0, 24).replace(/-+$/, "") + "-" + (await sha256(`${String(name).toLowerCase()}|${start}|${String(city).toLowerCase()}`)).slice(0, 6);

const monthsOut = (today, n) => { const d = new Date(today + "T12:00:00Z"); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
const km = (a, b) => { const R = 6371, r = Math.PI / 180, x = (b[0] - a[0]) * r, y = (b[1] - a[1]) * r, h = Math.sin(x / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

/** The checks that need no network: returns { row } (cleaned fields) or { problems: [..] }. Same rules as scripts/validate-migrations.mjs. */
export function checkFields(r, today = ptToday()) {
  const p = [];
  if (!r || typeof r !== "object" || Array.isArray(r)) return { problems: ["each row must be an object"] };
  for (const k of Object.keys(r)) if (!FIELDS.includes(k)) p.push(`unknown field "${k}" (allowed: ${FIELDS.join(", ")})`);
  const row = {
    name: normName(clean(r.name, 120)), city: clean(r.city, 60), season: clean(r.season, 20), type: clean(r.type, 10), start_date: clean(r.start, 10), end_date: clean(r.end || r.start, 10),
    hours: normalizeHours(line(r.hours, 120)), free: r.free === true || r.free === 1 ? 1 : 0, price: line(r.price, 80), blurb: line(r.blurb, 400), url: webUrl(clean(r.url, 300)),
    venue: normName(clean(r.venue, 120)), address: line(r.address, 160), evidence: line(r.evidence, 240), seen: clean(r.seen, 10),
  };
  if (typeof r.free !== "boolean" && r.free !== 0 && r.free !== 1) p.push("free must be true or false");
  if (row.name.length < 4) p.push("name is missing or too short");
  if (!CITY[row.city]) p.push(`city "${row.city}" is not one of our cities (use the exact spelling from public/cities.js; ask the owner to add a missing city)`);
  const S = SEASONS[row.season];
  if (!S) p.push(`season "${row.season}" is not one of: ${Object.keys(SEASONS).join(", ")}`);
  else if (!S.types[row.type]) p.push(`type "${row.type}" is not allowed for ${row.season} (allowed: ${Object.keys(S.types).join(", ")})`);
  if (!isDate(row.start_date) || !isDate(row.end_date)) p.push("start and end must be real dates like 2026-12-05");
  else {
    if (row.end_date < row.start_date) p.push("end is before start");
    if (row.end_date < today) p.push(`it ended ${row.end_date}`);
    if (row.start_date > monthsOut(today, 16)) p.push("it starts more than 16 months from now");
  }
  const shows = Array.isArray(r.shows) ? r.shows.map(String) : [];
  for (const s of SHOWS) if (!shows.includes(s)) p.push(`"shows" must list "${s}": only publish what the event's own page states (date, time and place)`);
  if (!row.hours || /check site/i.test(row.hours) || /^(tbd|tba|see site|varies)$/i.test(row.hours)) p.push("hours must be the real times from the page (not an estimate, TBD or \"check site\")");
  if (!row.url) p.push("url must be the event's own https page");
  else if (!/^https:\/\//i.test(row.url)) p.push("url must be https");
  if (!row.venue || row.venue.length < 3) p.push("venue is missing");
  if (row.address.length < 6) p.push("address is missing");
  else if (!/\b9\d{4}\b/.test(row.address) && !/&| and /i.test(row.address)) p.push("address needs a ZIP code (or two cross streets)");
  if (row.blurb.length < 20) p.push("blurb must be one or two sentences, at least 20 characters");
  else if (row.blurb.length > 180) p.push(`blurb is ${row.blurb.length} characters (max 180)`);
  if (/https?:\/\//i.test(row.blurb)) p.push("blurb must not contain a link");
  if (BAD.test(`${row.name} ${row.blurb} ${row.venue}`)) p.push("does not look like a community event listing");
  if (!row.price) row.price = row.free ? "Free" : "";
  if (!row.free && !row.price) row.price = "Price not listed";
  const fp = freeFlagProblem(row.free, row.price); if (fp) p.push(fp);
  if (row.evidence.length < 10) p.push("evidence must quote what the page says about the date, time and place (10+ characters)");
  if (!isDate(row.seen) || row.seen > today || row.seen < monthsOut(today, -1)) p.push("seen must be the day you read the page (within the last month)");
  return p.length ? { problems: p } : { row };
}

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const INSERT_INTAKE = `INSERT OR REPLACE INTO intake_events (id,status,reason,name,county,city,season,type,start_date,end_date,hours,free,price,blurb,url,venue,address,lat,lng,evidence,seen,received_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))`;
const INSERT_EVENT = `INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address,updated_at) VALUES (?,?,?,?,?,?,?,'confirmed',?,?,?,?,?,?,?,?,?,?,datetime('now')) ON CONFLICT(id) DO NOTHING`;
export const eventStatement = (env, x) => env.DB.prepare(INSERT_EVENT).bind(x.id, x.name, x.county, x.city, x.type, x.start_date, x.end_date, x.free ? 1 : 0, x.price, x.hours, x.lat, x.lng, x.blurb, x.url, x.season, x.venue, x.address);
const intakeStatement = (env, x, status, reason) => env.DB.prepare(INSERT_INTAKE).bind(x.id, status, reason, x.name, x.county || "", x.city, x.season, x.type, x.start_date, x.end_date, x.hours, x.free ? 1 : 0, x.price, x.blurb, x.url, x.venue, x.address, x.lat ?? null, x.lng ?? null, x.evidence, x.seen);

/** Checks every row and (unless dry_run) stores the verdicts. Returns { results: [{ index, name, verdict: published|held|duplicate|rejected, id?, reasons? }], published, held, duplicate, rejected }. */
export async function processRows(env, rows, { dryRun = false, doFetch = fetch, today = ptToday() } = {}) {
  const live = publishingOn(env);
  const { results: evs } = await env.DB.prepare("SELECT lat, lng, county FROM events").all();
  const { c: todays } = await env.DB.prepare("SELECT COUNT(*) AS c FROM intake_events WHERE status = 'published' AND received_at > datetime('now','-1 day')").first();
  let budget = Math.max(0, PUBLISH_PER_DAY - todays);
  const out = [], writes = [], seen = new Set();
  for (let i = 0; i < rows.length; i++) {
    const res = { index: i, name: String(rows[i] && rows[i].name || "").slice(0, 120) };
    out.push(res);
    const c = checkFields(rows[i], today);
    if (c.problems) { res.verdict = "rejected"; res.reasons = c.problems; if (!dryRun && rows[i] && typeof rows[i] === "object") { /* kept for the admin so the owner can see what Grok tried */ res._store = { id: "grokx-" + (await sha256(JSON.stringify(rows[i]) + today)).slice(0, 12), x: { name: String(rows[i].name || "").slice(0, 120), city: String(rows[i].city || "").slice(0, 60), season: String(rows[i].season || "").slice(0, 20), type: String(rows[i].type || "").slice(0, 10), start_date: String(rows[i].start || "").slice(0, 10), end_date: String(rows[i].end || rows[i].start || "").slice(0, 10), hours: "", free: 0, price: "", blurb: "", url: String(rows[i].url || "").slice(0, 300), venue: "", address: "", evidence: "", seen: "" } }; } continue; }
    const x = c.row; x.id = await intakeId(x.name, x.start_date, x.city); res.id = x.id;
    if (seen.has(x.id)) { res.verdict = "duplicate"; res.reasons = ["the same event appears twice in this call"]; continue; }
    seen.add(x.id);
    const dup = await env.DB.prepare(
      `SELECT id FROM events WHERE id = ?1 OR (lower(name) = lower(?2) AND start_date = ?3) OR (lower(address) = lower(?4) AND start_date = ?3 AND lower(city) = lower(?5)) OR (url = ?6 AND start_date = ?3)
       UNION SELECT id FROM intake_events WHERE status IN ('published','held','unpublished') AND (id = ?1 OR (lower(name) = lower(?2) AND start_date = ?3) OR (lower(address) = lower(?4) AND start_date = ?3 AND lower(city) = lower(?5))) LIMIT 1`
    ).bind(x.id, x.name, x.start_date, x.address, x.city, x.url).first();
    if (dup) { res.verdict = "duplicate"; res.reasons = ["already on the map, already sent, or taken down by the owner (an intake row never changes an existing event)"]; continue; }
    const info = {}, pt = await geocodeAddress(x.address, x.city, CITY[x.city], ["Los Angeles", "San Diego"].includes(x.city) ? 45 : 30, doFetch, info);
    if (!pt) { res.verdict = "rejected"; res.reasons = [info.down ? "the address lookup was unavailable; send this row again later" : info.far ? `the address is far from ${x.city}: check the city and address` : "the address was not found: use the full street address with ZIP"]; if (!info.down && !dryRun) res._store = { id: x.id, x, status: "rejected" }; continue; }
    [x.lat, x.lng] = pt; x.county = nearestCounty(x.lat, x.lng, evs);
    if (km(pt, CITY[x.city]) > 60) { res.verdict = "rejected"; res.reasons = ["the pin is too far from the city"]; continue; }
    if (live && budget > 0) { res.verdict = "published"; budget--; res.map = `https://socallights.app/#e-${x.id}`; if (!dryRun) writes.push(intakeStatement(env, x, "published", ""), eventStatement(env, x)); }
    else { res.verdict = "held"; res.reasons = [live ? "the daily publishing limit was reached" : "passed every check; publishing is switched off, so the owner publishes it from Admin"]; if (!dryRun) writes.push(intakeStatement(env, x, "held", res.reasons[0])); }
  }
  if (!dryRun) {
    for (const r of out) if (r._store) { const s = r._store, x = s.x; writes.push(intakeStatement(env, { ...x, id: s.id }, "rejected", (r.reasons || []).join("; ").slice(0, 400))); }
    writes.push(env.DB.prepare("DELETE FROM intake_events WHERE status = 'rejected' AND received_at < datetime('now', ?)").bind(`-${KEEP_REJECTED_DAYS} days`));
    if (writes.length) await env.DB.batch(writes);
  }
  for (const r of out) delete r._store;
  const n = (v) => out.filter((r) => r.verdict === v).length;
  return { results: out, published: n("published"), held: n("held"), duplicate: n("duplicate"), rejected: n("rejected") };
}
