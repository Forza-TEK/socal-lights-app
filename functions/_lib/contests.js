// Shared helpers for home decorating contests.
import { err, clean, nearestCounty } from "./util.js";
import { upsertEvent } from "./events.js";
import { r2Delete, photoKeys } from "./dbchunk.js";
import { logOp } from "./oplog.js";
import { takeOffMap, putBackOnMap, contestDeletedStatements } from "./orders.js";
import { CITY } from "../../public/cities.js";
import { SEASONS, defaultSeason } from "../../public/seasons.js";
import { ptToday } from "./time.js";

// Consumer mailbox providers: an address here proves nothing about who runs a website or an event.
export const FREE_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "outlook.com", "live.com", "msn.com", "yahoo.com", "ymail.com", "rocketmail.com", "icloud.com", "me.com", "mac.com", "aol.com",
  "proton.me", "protonmail.com", "pm.me", "gmx.com", "gmx.net", "gmx.us", "gmx.de", "mail.com", "email.com", "zoho.com", "zohomail.com", "fastmail.com", "fastmail.fm", "hey.com", "tutanota.com", "tuta.io", "hushmail.com",
  "comcast.net", "sbcglobal.net", "att.net", "cox.net", "verizon.net", "bellsouth.net", "charter.net", "earthlink.net", "frontier.com", "frontiernet.net", "optonline.net", "roadrunner.com", "pacbell.net", "ca.rr.com", "socal.rr.com", "centurylink.net", "windstream.net", "juno.com", "netzero.net", "prodigy.net",
  "yandex.com", "yandex.ru", "mail.ru", "qq.com", "163.com", "126.com", "naver.com", "web.de", "t-online.de", "orange.fr", "free.fr", "laposte.net", "libero.it", "btinternet.com", "sky.com", "inbox.com", "rediffmail.com",
]);
// Regional editions of the big providers (yahoo.ca, hotmail.co.uk, live.com.mx, outlook.fr ...)
const FREE_REGIONAL = /^(yahoo|hotmail|outlook|live|msn|gmx|aol|icloud)\.[a-z]{2,3}(\.[a-z]{2})?$/;
export const isFreeMail = (dom) => FREE_DOMAINS.has(dom) || FREE_REGIONAL.test(dom);

// Domains that many unrelated organizations share. An email at one of these is not a business address, and a website under one is not "their own".
// A domain counts as someone's own only with at least one label of its own beyond these (pasadena.gov yes; gov, ca.gov, k12.ca.us no).
const SHARED_SUFFIXES = new Set([
  "com", "net", "org", "edu", "gov", "mil", "int", "info", "biz", "us", "co", "io", "app", "dev", "me", "tv", "ca", "mx", "uk", "co.uk", "org.uk", "ac.uk", "gov.uk", "com.au", "com.mx",
  "ca.us", "ca.gov", "k12.ca.us", "cc.ca.us", "lib.ca.us", "state.ca.us", "ci.ca.us", "co.ca.us", "dst.ca.us", "tec.ca.us",
  "k12.us", "state.us", "city.us", "county.us", "fed.us", "nsn.us",
  "github.io", "pages.dev", "netlify.app", "vercel.app", "wixsite.com", "weebly.com", "blogspot.com", "wordpress.com", "squarespace.com", "herokuapp.com", "web.app", "firebaseapp.com",
]);
// Number of labels the name has beyond its shared suffix (the longest matching one, else the last label). pasadena.gov -> 1, ca.gov -> 0, dmv.ca.gov -> 1.
export function ownLabels(host) {
  const l = String(host || "").toLowerCase().replace(/\.$/, "").split(".").filter(Boolean);
  if (l.length < 2) return 0;
  for (let i = 0; i < l.length; i++) if (SHARED_SUFFIXES.has(l.slice(i).join("."))) return i;
  return l.length - 1;
}
export const hasOwnName = (host) => ownLabels(host) >= 1;
export const todayPT = ptToday;
export const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
export const addDays = (s, n) => new Date(new Date(s + "T12:00:00Z").getTime() + n * 86400_000).toISOString().slice(0, 10);

// Can this organizer's email be tied to the website they gave? match = goes live straight away; anything else waits for review.
export function trustOf(email, site) {
  const dom = String(email).split("@")[1] || "";
  if (!dom || isFreeMail(dom)) return "free";
  if (!site) return "none";
  let host = "";
  try { host = new URL(/^https?:/i.test(site) ? site : "https://" + site).hostname.replace(/^www\./, "").toLowerCase(); } catch { return "other"; }
  // The person's own domain must be somebody's own name (not "gov", "ca.gov" or "k12.ca.us", which every agency or school under it shares).
  if (!hasOwnName(dom)) return "other";
  return host === dom || host.endsWith("." + dom) || (dom.endsWith("." + host) && hasOwnName(host)) ? "match" : "other";
}

// Names that claim to be a government body, school, HOA or other official organizer ("City of Irvine Lights", "Oak Park HOA", "Official ..."). Used to hold such a contest
// for review when its organizer cannot be tied to a website (N-02). Plain community names ("Maple Street Lights") do not match.
const OFFICIAL = /\b(city|town of|county|counties|municipal|municipality|hoa|h\.o\.a|homeowners?|home ?owner'?s?|chamber|school|schools|unified|pta|ptsa|official|officially|sheriff|police)\b/i;
export const officialSounding = (...texts) => texts.some((t) => OFFICIAL.test(String(t || "")));

// Organizer-added homes allowed while a contest still has a review note (an organizer Admin has not vouched for yet).
export const UNTRUSTED_ADDED_CAP = 25;

export const getContest = (env, slug) => env.DB.prepare("SELECT * FROM contests WHERE slug = ?").bind(String(slug || "").toLowerCase()).first();

// What is open right now. The dates decide; the organizer can also pause entries or voting by hand.
export function windows(c, today = todayPT()) {
  const live = c.status === "live" && !c.announced;
  return {
    entriesOpen: live && !!c.entries_open && today <= c.entries_close,
    votingOpen: live && !!c.voting_open && today >= c.vote_start && today <= c.vote_end,
  };
}

const TYPE_BY_SEASON = { christmas: "drive", halloween: "family", newyear: "family", valentines: "family", spring: "festival", summer: "festival" };
export const seasonFor = (closeDate) => defaultSeason(closeDate);

// Lists the contest on the map as an event ("Home contest"), like any other event.
export async function listOnMap(env, c) {
  const types = SEASONS[c.season].types, type = types[TYPE_BY_SEASON[c.season]] ? TYPE_BY_SEASON[c.season] : Object.keys(types)[0];
  const [lat, lng] = CITY[c.city] || CITY["Irvine"];
  const id = `c-${c.slug}`.slice(0, 40);
  await upsertEvent(env, { id, name: c.name, county: c.county, city: c.city, type, start_date: todayPT(), end_date: c.vote_end, status: "confirmed", free: 1, price: "Free", hours: "", lat, lng, blurb: `${c.org} home decorating contest. ${c.descr}`.slice(0, 200), url: `https://socallights.app/c/${c.slug}`, season: c.season, venue: c.org, address: `${c.city}, CA` });
  await env.DB.prepare("UPDATE contests SET event_id = ? WHERE id = ?").bind(id, c.id).run();
  await putBackOnMap(env.DB, id); // coming back after an unpublish or decline: put back what its paid orders still owe
}
// Takes the contest's map event off. A paid placement on it goes with the row, so it is flagged refund due first (restorable: listOnMap undoes it). `by` says who did it.
export const unlistFromMap = async (env, c, by = "unpublished") => c.event_id ? takeOffMap(env.DB, c.event_id, by) : null;

export async function countyFor(env, city) {
  const [lat, lng] = CITY[city];
  const { results } = await env.DB.prepare("SELECT lat, lng, county FROM events").all();
  return nearestCounty(lat, lng, results);
}

// Moves an entry's photos from pending/ to p/ so the public photo route can serve them, then approves it.
export async function approveEntry(env, row) {
  const keys = JSON.parse(row.photos || "[]"), moved = [];
  for (const k of keys) {
    if (k.startsWith("p/")) { moved.push(k); continue; }
    const obj = await env.PHOTOS.get(k);
    if (!obj) continue;
    const nk = k.replace(/^pending\//, "p/");
    await env.PHOTOS.put(nk, obj.body, { httpMetadata: obj.httpMetadata });
    moved.push(nk);
  }
  await env.DB.prepare("UPDATE posts SET status='approved', photos=?, approved_at=datetime('now') WHERE id=?").bind(JSON.stringify(moved), row.id).run();
  await Promise.all(keys.filter((k) => k.startsWith("pending/")).map((k) => env.PHOTOS.delete(k)));
}

// The organizer's co-organizers (invited by email) can run the contest too.
export async function isStaff(env, c, user) {
  if (!c || !user) return false;
  if (c.owner_id === user.id) return true;
  return !!(await env.DB.prepare("SELECT 1 AS x FROM contest_staff WHERE contest_id = ? AND email = ?").bind(c.id, String(user.email || "").toLowerCase()).first());
}

// Gate for organizer-only routes (the owner or a co-organizer). `ownerOnly` is for things only the creator may do. Returns { c } or { res }.
export async function ownerOf(request, env, slug, getUser, ownerOnly = false) {
  const user = await getUser(request, env);
  if (!user) return { res: err(401, "Please sign in first.") };
  const c = await getContest(env, slug);
  if (!c || !(ownerOnly ? c.owner_id === user.id : await isStaff(env, c, user))) return { res: err(404, "That contest isn't yours or doesn't exist.") };
  return { c, user };
}
export const cats = (c) => { try { return JSON.parse(c.categories || "[]"); } catch { return []; } };
export { clean };

export const KIND_LABEL = { public: "People's Choice", judge: "Judges' Choice" };
export const modeOf = (c) => (["public", "judges", "both"].includes(c.mode) ? c.mode : "public");
export const hasPublic = (c) => modeOf(c) !== "judges";
export const hasJudges = (c) => modeOf(c) !== "public";
export const prizesOf = (c) => { try { return JSON.parse(c.prizes || "{}"); } catch { return {}; } };
// The prize for one award, from the contest's prize settings (one prize for all, or one per award)
export const prizeFor = (c, cat, kind) => (c.prize_mode === "one" ? c.prize || "" : c.prize_mode === "each" ? prizesOf(c)[`${cat}|${kind}`] || "" : "");

// Trimmed mean: with 5 or more judges the highest and lowest score for a home are dropped, so one very generous or harsh judge can't swing it.
export function trimmedAvg(vals) {
  const v = vals.slice().sort((a, b) => a - b); let tr = false;
  if (v.length >= 5) { v.shift(); v.pop(); tr = true; }
  return v.length ? { avg: v.reduce((n, x) => n + x, 0) / v.length, n: vals.length, tr } : null;
}

// Live tally for a contest: approved homes, public votes (voided ones don't count), judges' picks or scores (a judge's conflicts don't count)
// and the winner(s) of each category for each award. A flagged (dq) home stays on the ballot but can't win. With one_win a home that wins
// a category can't win a later one. Tied homes share the win; a tied public vote is broken by the judges when both vote.
export async function computeResults(env, c) {
  const categories = cats(c), mode = modeOf(c), method = c.judge_method === "score" ? "score" : "pick";
  const { results: posts } = await env.DB.prepare("SELECT id,title,biz,address,city,lat,lng,photos,descr,entry_no,user_id,dq FROM posts WHERE contest_id = ? AND status = 'approved' ORDER BY entry_no").bind(c.id).all();
  const counts = {};
  for (const r of (await env.DB.prepare("SELECT post_id, category, COUNT(*) AS n FROM votes WHERE contest_id = ? AND voided = 0 GROUP BY post_id, category").bind(c.id).all()).results) (counts[r.post_id] ||= {})[r.category] = r.n;
  // judges: picks (count per home per category) or scores (trimmed average per home per category)
  const jpick = {}, jscore = {};
  if (hasJudges(c)) try {
    const conf = new Set((await env.DB.prepare("SELECT judge_id, post_id FROM judge_conflicts WHERE contest_id = ?").bind(c.id).all()).results.map((r) => r.judge_id + "|" + r.post_id));
    if (method === "pick") for (const r of (await env.DB.prepare("SELECT judge_id, category, post_id FROM judge_picks WHERE contest_id = ?").bind(c.id).all()).results) { if (!conf.has(r.judge_id + "|" + r.post_id)) (jpick[r.post_id] ||= {})[r.category] = ((jpick[r.post_id] || {})[r.category] || 0) + 1; }
    else {
      const raw = {};
      for (const r of (await env.DB.prepare("SELECT judge_id, post_id, category, score FROM judge_scores WHERE contest_id = ?").bind(c.id).all()).results) if (!conf.has(r.judge_id + "|" + r.post_id)) ((raw[r.post_id] ||= {})[r.category] ||= []).push(r.score);
      for (const [pid, m] of Object.entries(raw)) for (const [k, v] of Object.entries(m)) (jscore[pid] ||= {})[k] = trimmedAvg(v);
    }
  } catch {}
  const jval = (id, k) => (method === "score" ? ((jscore[id] || {})[k] || { avg: 0 }).avg : (jpick[id] || {})[k] || 0);
  const pval = (id, k) => (counts[id] || {})[k] || 0;
  const run = (val, breaker) => {
    const out = {}, taken = new Set();
    for (const k of categories) {
      const pool = posts.filter((p) => !p.dq && !taken.has(p.id)), top = Math.max(0, ...pool.map((p) => val(p.id, k)));
      let w = top > 0 ? pool.filter((p) => val(p.id, k) === top) : [];
      if (w.length > 1 && breaker) { const t2 = Math.max(0, ...w.map((p) => breaker(p.id, k))), w2 = w.filter((p) => breaker(p.id, k) === t2); if (t2 > 0 && w2.length < w.length) w = w2; }
      out[k] = w.map((p) => p.id); if (c.one_win) out[k].forEach((id) => taken.add(id));
    }
    return out;
  };
  const winners = hasPublic(c) ? run(pval, mode === "both" ? jval : null) : {};
  const jwinners = hasJudges(c) ? run(jval, null) : {};
  return { categories, mode, method, posts, counts, jpick, jscore, winners, jwinners };
}

// The award list the pages show: every category, for People's Choice and/or Judges' Choice, with its prize and winner ids
export function awardList(c, r) {
  const out = [];
  for (const k of r.categories) {
    if (hasPublic(c)) out.push({ category: k, kind: "public", label: KIND_LABEL.public, ids: r.winners[k] || [], prize: prizeFor(c, k, "public") });
    if (hasJudges(c)) out.push({ category: k, kind: "judge", label: KIND_LABEL.judge, ids: r.jwinners[k] || [], prize: prizeFor(c, k, "judge") });
  }
  return out;
}

// Which judge row (if any) this account is on for a contest
export async function judgeOf(env, c, user) {
  if (!user || !hasJudges(c)) return null;
  try { return await env.DB.prepare("SELECT * FROM judges WHERE contest_id = ? AND email = ?").bind(c.id, user.email).first(); } catch { return null; }
}

// Removes a contest and everything that belongs to it: entries and their photos, votes, judges and their picks, sponsors and logos,
// co-organizers, visit counts, quote requests, the change log and the listing on the map. Used by the admin Contests tab.
export async function deleteContest(env, c) {
  const all = (sql) => env.DB.prepare(sql).bind(c.id).all().then((r) => r.results).catch((e) => { logOp(env, "contest", "delete: lookup failed: " + (e && e.message)); return []; });
  const entries = await all("SELECT id, photos, photos_hidden FROM posts WHERE contest_id = ?");
  await r2Delete(env, [...photoKeys(entries), ...(await all("SELECT logo, receipt FROM contest_sponsors WHERE contest_id = ?")).flatMap((x) => [x.logo, x.receipt])], "contest photos"); // R2 delete takes a list: one call per 1000 files
  const stmts = ["votes", "judge_picks", "judge_scores", "judge_conflicts", "judges", "contest_staff", "contest_hits", "contest_sponsors", "contest_leads", "contest_changes", "home_consents"]
    .map((t) => env.DB.prepare(`DELETE FROM ${t} WHERE contest_id = ?`).bind(c.id));
  stmts.push(env.DB.prepare("DELETE FROM posts WHERE contest_id = ?").bind(c.id), env.DB.prepare("DELETE FROM contests WHERE id = ?").bind(c.id));
  // Paid placements on the contest's map event and on its podium homes go with the rows: flag them refund due first, in the same batch.
  stmts.unshift(...contestDeletedStatements(env.DB, c.event_id, entries.map((r) => r.id)));
  if (c.event_id) stmts.push(env.DB.prepare("DELETE FROM events WHERE id = ?").bind(c.event_id));
  await env.DB.batch(stmts);
}
