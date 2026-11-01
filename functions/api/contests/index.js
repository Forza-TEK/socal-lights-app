// POST /api/contests — an organizer creates a contest (signed in). It goes live straight away when their email matches
// the website they gave; otherwise it waits for the site owner. GET lists the live contests.
import { json, err, clean, webUrl, newId } from "../../_lib/util.js";
import { slug as slugify } from "../../_lib/events.js";
import { requireUser, sameOrigin } from "../../_lib/auth.js";
import { CITY } from "../../../public/cities.js";
import { rulesDefault } from "../../../public/rules.js";
import { SEASONS } from "../../../public/seasons.js";
import { trustOf, windows, todayPT, isDate, seasonFor, countyFor, listOnMap, getContest, KIND_LABEL } from "../../_lib/contests.js";
import { inviteJudges } from "./[slug]/judges.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT slug,name,org,city,county,entries_close,vote_start,vote_end,announced,status,entries_open,voting_open FROM contests WHERE status='live' ORDER BY created_at DESC LIMIT 100").all();
  return json(results.map((c) => ({ slug: c.slug, name: c.name, org: c.org, city: c.city, county: c.county, entries_close: c.entries_close, vote_start: c.vote_start, vote_end: c.vote_end, announced: !!c.announced, ...windows(c) })), { headers: { "cache-control": "public, max-age=60" } });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const b = await request.json().catch(() => null);
  if (!b) return err(400, "The form couldn't be read. Please try again.");

  const name = clean(b.name, 90), org = clean(b.org, 80), city = clean(b.city, 60), descr = clean(b.descr, 200), siteRaw = clean(b.site, 200);
  const site = siteRaw ? webUrl(siteRaw) : "";
  const closes = clean(b.closes, 10), vs = clean(b.vs, 10), ve = clean(b.ve, 10), today = todayPT();
  const categories = [...new Set((Array.isArray(b.cats) ? b.cats : []).map((c) => clean(c, 30)).filter(Boolean))].slice(0, 8);
  if (name.length < 4) return err(400, "Give your contest a name (at least 4 letters).");
  if (org.length < 3) return err(400, "Tell us who is running the contest.");
  if (!CITY[city]) return err(400, "Choose the city where the homes are.");
  if (descr.length < 20) return err(400, "Write a sentence or two for the welcome message (at least 20 characters).");
  if (siteRaw && !site) return err(400, "Enter a valid website address, like example.com.");
  if (!isDate(closes) || closes < today) return err(400, "Pick an entry deadline that hasn't passed yet.");
  if (!isDate(vs) || vs <= closes) return err(400, "Voting should start after entries close.");
  if (!isDate(ve) || ve <= vs) return err(400, "Voting should end after it starts.");
  if (!categories.length) return err(400, "Keep at least one category.");
  // Who votes, how judges vote, and prizes
  const mode = ["public", "judges", "both"].includes(b.mode) ? b.mode : "public", method = b.judgeMethod === "score" ? "score" : "pick";
  const judgeEmails = mode === "public" ? [] : (Array.isArray(b.judges) ? b.judges : String(b.judges || "").split(/[\n,;]+/)).map((x) => String(x).trim()).filter(Boolean).slice(0, 15);
  const prizeMode = ["none", "one", "each"].includes(b.prizeMode) ? b.prizeMode : "none", prize = clean(b.prize, 140), sponsor = clean(b.sponsor, 80);
  const prizes = {}; if (prizeMode === "each" && b.prizes && typeof b.prizes === "object") for (const [k, v] of Object.entries(b.prizes)) { const [cat, kind] = String(k).split("|"); if (categories.includes(cat) && KIND_LABEL[kind] && clean(v, 100)) prizes[`${cat}|${kind}`] = clean(v, 100); }
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM contests WHERE owner_id = ? AND created_at > datetime('now','-1 day')").bind(user.id).first();
  if (n >= 3) return err(429, "You've created several contests today. Try again tomorrow.");

  const trust = trustOf(user.email, site), live = trust === "match";
  let slug = slugify(name).slice(0, 40) || "contest";
  if (await getContest(env, slug)) slug = `${slug.slice(0, 34)}-${newId().slice(0, 5)}`;
  const season = seasonFor(closes);
  const oneWin = b.oneWin === true, typed = String(b.rules || "").replace(/\r/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, 4000);
  const rules = typed.length >= 40 ? typed : rulesDefault({ name, org, city, closes, vs, ve, oneWin });
  if (!SEASONS[season]) return err(400, "That date isn't in a season we cover.");
  // Every home competes in every category, and each voter gets one vote per category, so vote_rule is always "cat"
  const c = {
    id: newId(), slug, owner_id: user.id, name, org, city, county: await countyFor(env, city), descr, site, contact_email: user.email, season,
    status: live ? "live" : "pending", entries_close: closes, vote_start: vs, vote_end: ve, categories: JSON.stringify(categories),
    vote_rule: "cat", approval: b.approval === "auto" ? "auto" : "manual", show_counts: b.showCounts === true ? 1 : 0, one_win: b.oneWin === true ? 1 : 0,
    note: live ? "" : `email ${trust === "free" ? "is a free-mail address" : trust === "none" ? "given with no website" : "does not match the website"}`,
  };
  await env.DB.prepare(
    `INSERT INTO contests (id,slug,owner_id,name,org,city,county,descr,site,contact_email,season,status,entries_close,vote_start,vote_end,categories,vote_rule,approval,show_counts,one_win,rules,note,mode,judge_method,prize_mode,prize,prizes,sponsor)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(c.id, c.slug, c.owner_id, c.name, c.org, c.city, c.county, c.descr, c.site, c.contact_email, c.season, c.status, c.entries_close, c.vote_start, c.vote_end, c.categories, c.vote_rule, c.approval, c.show_counts, c.one_win, rules, c.note, mode, method, prizeMode, prize, JSON.stringify(prizes), sponsor).run();
  if (live) await listOnMap(env, c);
  if (judgeEmails.length) await inviteJudges(env, { id: c.id, slug, name, org, judge_method: method }, judgeEmails);
  return json({ ok: true, slug, status: c.status, trust });
}
