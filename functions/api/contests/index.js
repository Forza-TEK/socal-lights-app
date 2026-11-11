// POST /api/contests — an organizer creates a contest (signed in). It goes live straight away when their email matches
// the website they gave; otherwise it waits for the site owner. GET lists the live contests.
import { json, err, clean, webUrl, newId } from "../../_lib/util.js";
import { slug as slugify } from "../../_lib/events.js";
import { requireUser, sameOrigin } from "../../_lib/auth.js";
import { CITY } from "../../../public/cities.js";
import { rulesDefault } from "../../../public/rules.js";
import { SEASONS } from "../../../public/seasons.js";
import { trustOf, officialSounding, windows, todayPT, isDate, seasonFor, countyFor, listOnMap, getContest, KIND_LABEL } from "../../_lib/contests.js";
import { inviteJudges } from "./[slug]/judges.js";
import { normName, normText } from "../../_lib/fields.js";
import { reserveSends } from "../../_lib/sendlimit.js";
import { tell } from "../../_lib/notify.js";
import { founderKeys, isFounder } from "../../_lib/founder.js";
import { sendReceipt } from "../../_lib/receipt.js";
import { liveGate, PAYWALL_MESSAGE } from "../../_lib/passkey.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT slug,name,org,org_key,city,county,entries_close,vote_start,vote_end,announced,status,entries_open,voting_open FROM contests WHERE status='live' ORDER BY created_at DESC LIMIT 100").all();
  const fk = await founderKeys(env);
  return json(results.map((c) => ({ founder: isFounder(fk, c.org_key), slug: c.slug, name: c.name, org: c.org, city: c.city, county: c.county, entries_close: c.entries_close, vote_start: c.vote_start, vote_end: c.vote_end, announced: !!c.announced, ...windows(c) })), { headers: { "cache-control": "public, max-age=60" } });
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const b = await request.json().catch(() => null);
  if (!b) return err(400, "The form couldn't be read. Please try again.");

  const name = normName(clean(b.name, 90)), org = normName(clean(b.org, 80)), city = clean(b.city, 60), descr = normText(clean(b.descr, 200)), siteRaw = clean(b.site, 200);
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

  if (judgeEmails.length) { const over = await reserveSends(env, user, null, "judge", judgeEmails.length); if (over) return err(429, over); }

  // A contest goes live right away, except one that uses an official-sounding name ("City of ...", HOA, chamber, school, "official") for an organizer we could not tie
  // to a website: that waits for Admin (N-02). Any other contest we could not match keeps a note for Admin and goes live, with fewer organizer-added homes until Admin looks.
  const trust = trustOf(user.email, site), official = trust !== "match" && officialSounding(name, org), live = !official;
  // Contest passes: a contest that would go live counts toward the organization's 12-month window. Over the allowance, the organizer gets the pass picker (402), not a silent failure.
  // A contest held for review (official-sounding name) is not live, so it does not count and needs no pass yet.
  const gate = await liveGate(env, user.email, site);
  if (live && !gate.ok) return json({ error: PAYWALL_MESSAGE, code: "pass_required", ...gate.view }, { status: 402 });
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
    note: trust === "match" ? "" : `${official ? "official-sounding name, " : ""}email ${trust === "free" ? "is a free-mail address" : trust === "none" ? "given with no website" : "does not match the website"}`,
  };
  await env.DB.prepare(
    `INSERT INTO contests (id,slug,owner_id,name,org,city,county,descr,site,contact_email,season,status,entries_close,vote_start,vote_end,categories,vote_rule,approval,show_counts,one_win,rules,note,mode,judge_method,prize_mode,prize,prizes,sponsor,org_key,live_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(c.id, c.slug, c.owner_id, c.name, c.org, c.city, c.county, c.descr, c.site, c.contact_email, c.season, c.status, c.entries_close, c.vote_start, c.vote_end, c.categories, c.vote_rule, c.approval, c.show_counts, c.one_win, rules, c.note, mode, method, prizeMode, prize, JSON.stringify(prizes), sponsor, gate.key, live ? todayPT() : "").run();
  if (live) await listOnMap(env, c);
  if (judgeEmails.length) await inviteJudges(env, { id: c.id, slug, name, org, judge_method: method }, judgeEmails);
  if (c.note) tell(env, waitUntil, env.ADMIN_NOTIFY_EMAIL || "rey@forza-tek.com", "contest_review", { name, org, city, email: user.email, note: c.note, what: official ? "It is not live yet: it waits for you, cannot add organizer-added homes and cannot buy a paid placement until you approve it." : "It is live, but until you click Looks fine the organizer can add only a few homes of their own (25) and cannot buy a paid placement.", link: "https://socallights.app/admin/" });
  const receipt = await sendReceipt(env, waitUntil, { id: c.status === "live" ? "contest_live_now" : "contest_received", to: user.email, vars: { name, link: `https://socallights.app/c/${slug}/manage`, page: `https://socallights.app/c/${slug}` } });
  return json({ ok: true, slug, status: c.status, trust, review: !!c.note, receipt: receipt === "queued" ? "sent" : "", email: user.email });
}
