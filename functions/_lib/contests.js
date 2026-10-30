// Shared helpers for home decorating contests.
import { err, clean, nearestCounty } from "./util.js";
import { upsertEvent } from "./events.js";
import { CITY } from "../../public/cities.js";
import { SEASONS, defaultSeason } from "../../public/seasons.js";

const FREE_DOMAINS = new Set(["gmail.com", "googlemail.com", "hotmail.com", "outlook.com", "live.com", "msn.com", "yahoo.com", "icloud.com", "me.com", "aol.com", "proton.me", "protonmail.com"]);
export const todayPT = () => new Date(Date.now() - 8 * 3600_000).toISOString().slice(0, 10); // roughly Pacific time
export const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
export const addDays = (s, n) => new Date(new Date(s + "T12:00:00Z").getTime() + n * 86400_000).toISOString().slice(0, 10);

// Can this organizer's email be tied to the website they gave? match = goes live straight away; anything else waits for review.
export function trustOf(email, site) {
  const dom = String(email).split("@")[1] || "";
  if (!dom || FREE_DOMAINS.has(dom)) return "free";
  if (!site) return "none";
  let host = "";
  try { host = new URL(/^https?:/i.test(site) ? site : "https://" + site).hostname.replace(/^www\./, "").toLowerCase(); } catch { return "other"; }
  return host === dom || host.endsWith("." + dom) || dom.endsWith("." + host) ? "match" : "other";
}

export const getContest = (env, slug) => env.DB.prepare("SELECT * FROM contests WHERE slug = ?").bind(String(slug || "").toLowerCase()).first();

// What is open right now. The dates decide; the organizer can also pause entries or voting by hand.
export function windows(c, today = todayPT()) {
  const live = c.status === "live" && !c.announced;
  return {
    entriesOpen: live && !!c.entries_open && today <= c.entries_close,
    votingOpen: live && !!c.voting_open && today >= c.vote_start && today <= c.vote_end,
  };
}

const TYPE_BY_SEASON = { christmas: "drive", halloween: "family", newyear: "family", spring: "festival", summer: "festival" };
export const seasonFor = (closeDate) => defaultSeason(closeDate);

// Lists the contest on the map as an event ("Home contest"), like any other event.
export async function listOnMap(env, c) {
  const types = SEASONS[c.season].types, type = types[TYPE_BY_SEASON[c.season]] ? TYPE_BY_SEASON[c.season] : Object.keys(types)[0];
  const [lat, lng] = CITY[c.city] || CITY["Irvine"];
  const id = `c-${c.slug}`.slice(0, 40);
  await upsertEvent(env, { id, name: c.name, county: c.county, city: c.city, type, start_date: todayPT(), end_date: c.vote_end, status: "confirmed", free: 1, price: "Free", hours: "", lat, lng, blurb: `${c.org} home decorating contest. ${c.descr}`.slice(0, 200), url: `https://socallights.app/c/${c.slug}`, season: c.season, venue: c.org, address: `${c.city}, CA` });
  await env.DB.prepare("UPDATE contests SET event_id = ? WHERE id = ?").bind(id, c.id).run();
}
export const unlistFromMap = (env, c) => c.event_id ? env.DB.prepare("DELETE FROM events WHERE id = ?").bind(c.event_id).run() : null;

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

// Gate for owner-only routes. Returns { c } or { res }.
export async function ownerOf(request, env, slug, getUser) {
  const user = await getUser(request, env);
  if (!user) return { res: err(401, "Please sign in first.") };
  const c = await getContest(env, slug);
  if (!c || c.owner_id !== user.id) return { res: err(404, "That contest isn't yours or doesn't exist.") };
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
  const { results: posts } = await env.DB.prepare("SELECT id,title,biz,address,city,lat,lng,photos,entry_no,user_id,dq FROM posts WHERE contest_id = ? AND status = 'approved' ORDER BY entry_no").bind(c.id).all();
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
