// GET   /api/contests/<slug>  the contest, its approved homes, prizes and (when allowed) the vote counts. Personalized, never cached.
// PATCH /api/contests/<slug>  organizer controls: pause/resume entries and voting, show counts, start voting now, announce winners.
// Announcing freezes the results into contests.results; from then on the page, the archive and the export read that snapshot, never the live votes.
import { json, err, clean, webUrl, newId } from "../../_lib/util.js";
import { enqueueMail, drainMail } from "../../_lib/mailbatch.js";
import { logOp } from "../../_lib/oplog.js";
import { slug as slugify } from "../../_lib/events.js";
import { inviteJudges } from "./[slug]/judges.js";
import { getUser, sameOrigin, okEmail } from "../../_lib/auth.js";
import { getContest, windows, todayPT, isDate, listOnMap, unlistFromMap, isStaff, seasonFor, addDays, ownerOf, computeResults, awardList, prizeFor, modeOf, hasPublic, hasJudges, judgeOf, KIND_LABEL, cats } from "../../_lib/contests.js";
import { publicEntry } from "../../_lib/archive.js";
import { judgeProgress } from "../../_lib/judging.js";
import { diff, CONTEST_FIELDS, teamChanged } from "../../_lib/changes.js";
import { normName, normText } from "../../_lib/fields.js";
import { reserveSends } from "../../_lib/sendlimit.js";
import { isPublic, staffView, publicView } from "../../_lib/sponsors.js";
import { founderKeys, isFounder } from "../../_lib/founder.js";
import { liveGate, PAYWALL_MESSAGE } from "../../_lib/passkey.js";

export async function onRequestGet({ params, request, env }) {
  const c = await getContest(env, params.slug);
  const user = await getUser(request, env);
  const isOwner = await isStaff(env, c, user);
  if (!c || (c.status !== "live" && !isOwner)) return err(404, "This contest isn't available.");
  const frozen = c.announced && c.results ? JSON.parse(c.results) : null;
  const live = frozen ? null : await computeResults(env, c);
  const categories = frozen ? frozen.categories : live.categories;
  const showCounts = !!c.show_counts || !!c.announced || isOwner;
  const mine = user ? (await env.DB.prepare("SELECT post_id, category FROM votes WHERE contest_id = ? AND user_id = ?").bind(c.id, user.id).all()).results : [];
  const own = new Set(user ? (await env.DB.prepare("SELECT id FROM posts WHERE contest_id = ? AND user_id = ?").bind(c.id, user.id).all()).results.map((r) => r.id) : []);
  const jrow = await judgeOf(env, c, user);
  const w = windows(c);
  const jshow = (id) => { // judges' picks or scores for one home: only the organizer sees them before winners are announced
    const src = frozen ? frozen.jv && frozen.jv[id] : c.judge_method === "score" ? live.jscore[id] : live.jpick[id];
    return src ? Object.fromEntries(categories.map((k) => [k, c.judge_method === "score" ? (src[k] ? { avg: Math.round(src[k].avg * 100) / 100, n: src[k].n, tr: !!src[k].tr } : null) : src[k] || 0])) : null;
  };
  // Every home competes in every category, so each home carries a vote count per category (null when counts are hidden)
  const entries = frozen
    ? frozen.entries.map((e) => ({ ...publicEntry(e), mine: own.has(e.id) }))
    : live.posts.map((p) => ({
        id: p.id, name: p.title || p.biz, biz: p.biz, address: p.address, city: p.city, lat: p.lat, lng: p.lng, photos: JSON.parse(p.photos || "[]"), no: p.entry_no, descr: /^Entry in /.test(p.descr || "") ? "" : (p.descr || "").slice(0, 300),
        votes: showCounts && hasPublic(c) ? Object.fromEntries(categories.map((k) => [k, (live.counts[p.id] || {})[k] || 0])) : null, mine: own.has(p.id), flagged: isOwner ? !!p.dq : undefined,
        jv: isOwner && hasJudges(c) ? jshow(p.id) : undefined,
      }));
  const awards = frozen ? frozen.awards : c.announced ? awardList(c, live) : null;
  // What each award is worth, shown from the start so people know what they are competing for
  const prizes = categories.flatMap((k) => [hasPublic(c) ? { category: k, kind: "public", label: KIND_LABEL.public, prize: prizeFor(c, k, "public") } : null, hasJudges(c) ? { category: k, kind: "judge", label: KIND_LABEL.judge, prize: prizeFor(c, k, "judge") } : null]).filter((x) => x && x.prize);
  const sponsors = (await env.DB.prepare("SELECT * FROM contest_sponsors WHERE contest_id = ? ORDER BY CASE tier WHEN 'presenting' THEN 0 WHEN 'gold' THEN 1 WHEN 'silver' THEN 2 ELSE 3 END, created_at").bind(c.id).all()).results;
  return json({
    sponsors: sponsors.filter((x) => isOwner || isPublic(x)).map((x) => (isOwner ? staffView(x) : publicView(x))), // the public sees only sponsors that are shown (logo, name, website); the organizer team sees the records
    installer: c.installer_name ? { name: c.installer_name, url: c.installer_url || "", slug: (await env.DB.prepare("SELECT slug FROM installers WHERE lower(name) = lower(?) AND status = 'active'").bind(c.installer_name).first())?.slug || "" } : null,
    ...(isOwner ? { installerEmail: c.installer_email || "" } : {}),
    contest: { founder: isFounder(await founderKeys(env), c.org_key), slug: c.slug, name: c.name, org: c.org, city: c.city, county: c.county, descr: c.descr, categories, approval: c.approval, showCounts: !!c.show_counts, oneWin: !!c.one_win, rules: c.rules || "", mode: modeOf(c), judgeMethod: c.judge_method === "score" ? "score" : "pick", prizeMode: c.prize_mode || "none", prize: c.prize || "", sponsor: c.sponsor || "", season: c.season, announced: !!c.announced, frozenAt: frozen ? frozen.at : null, status: c.status, unpublishedByOwner: c.status === "declined" && c.unpublished_by === "owner",  entriesClose: c.entries_close, voteStart: c.vote_start, voteEnd: c.vote_end, entriesOpen: w.entriesOpen, votingOpen: w.votingOpen, entriesPaused: !c.entries_open, votingPaused: !c.voting_open },
    entries, winners: frozen ? frozen.winners : c.announced ? live.winners : {}, jwinners: frozen ? frozen.jwinners || {} : c.announced ? live.jwinners : {}, awards, prizes,
    me: { signedIn: !!user, isOwner, isCreator: !!user && !!c.owner_id && c.owner_id === user.id, isJudge: !!jrow, votes: mine },
  }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPatch({ params, request, env, waitUntil }) {
  const W = waitUntil;
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  // Changing the contest itself (details, dates, open/close, announcing winners) is for the person who created it. Admin does it from the Admin tab.
  const { c, res, user } = await ownerOf(request, env, params.slug, getUser, true);
  if (res) return res;
  const b = await request.json().catch(() => ({}));
  if (b.action === "edit") return editContest(env, c, b, user, W);
  if (b.action === "clone") return cloneContest(env, c, user);
  // Take the contest off the map and hide it from the public (the creator only), and put it back. Entries, votes and the dashboard stay as they are.
  // It uses the same "declined" state Admin's Unpublish uses; unpublished_by = 'owner' marks that the creator did it, so only they can undo it.
  if (b.action === "unpublish") {
    if (c.status !== "live") return err(400, "This contest isn't on the map right now.");
    await env.DB.prepare("UPDATE contests SET status = 'declined', unpublished_by = 'owner', updated_at = datetime('now') WHERE id = ?").bind(c.id).run();
    await unlistFromMap(env, c, "unpublished by its creator");
    await teamChanged(env, c, user, [{ label: "Contest page", old: "Public, on the map", new: "Unpublished by the creator" }], W);
    return json({ ok: true });
  }
  if (b.action === "publish_again") {
    if (!(c.status === "declined" && c.unpublished_by === "owner")) return err(400, "Only you can put it back, and only if you were the one who unpublished it. Contact us if it was taken off the map for another reason.");
    await env.DB.prepare("UPDATE contests SET status = 'live', unpublished_by = '', updated_at = datetime('now') WHERE id = ?").bind(c.id).run();
    await listOnMap(env, { ...c, status: "live" });
    await teamChanged(env, c, user, [{ label: "Contest page", old: "Unpublished by the creator", new: "Public, on the map" }], W);
    return json({ ok: true });
  }
  if (c.status !== "live") return err(400, "This contest isn't live yet.");
  if (c.announced) return err(400, "The winners are announced and the results are locked.");
  const sets = { close_entries: ["entries_open", 0], open_entries: ["entries_open", 1], pause_voting: ["voting_open", 0], resume_voting: ["voting_open", 1], show_counts: ["show_counts", 1], hide_counts: ["show_counts", 0] }[b.action];
  if (sets) { await env.DB.prepare(`UPDATE contests SET ${sets[0]} = ?, updated_at = datetime('now') WHERE id = ?`).bind(sets[1], c.id).run(); await teamChanged(env, c, user, diff(c, { [sets[0]]: sets[1] }, CONTEST_FIELDS), W); }
  else if (b.action === "start_voting") {
    const t = todayPT(), end = c.vote_end < t ? t : c.vote_end;
    await env.DB.prepare("UPDATE contests SET vote_start = ?, vote_end = ?, voting_open = 1, updated_at = datetime('now') WHERE id = ?").bind(c.vote_start > t ? t : c.vote_start, end, c.id).run();
    await teamChanged(env, c, user, diff(c, { vote_start: c.vote_start > t ? t : c.vote_start, vote_end: end, voting_open: 1 }, CONTEST_FIELDS), W);
  } else if (b.action === "announce") {
    const r = await computeResults(env, c);
    // Ask the organizer to confirm before the results are locked when voting hasn't started, nobody has voted or judged, or judges haven't finished
    const votesIn = Object.values(r.counts).reduce((n, m) => n + Object.values(m).reduce((a, x) => a + x, 0), 0), judgeIn = Object.keys(r.jpick).length + Object.keys(r.jscore).length;
    const early = todayPT() < c.vote_start ? "Voting hasn't started yet." : votesIn === 0 && judgeIn === 0 ? "Nobody has voted yet." : "";
    const inc = hasJudges(c) ? (await judgeProgress(env, c, r)).filter((j) => j.done < j.total).map((j) => j.email) : [];
    if (!b.force && (early || inc.length)) return json({ ok: false, needs_force: true, reason: early || "Some judges haven't finished.", ...(inc.length ? { incomplete: inc } : {}) }, { status: 409 });
    const awards = awardList(c, r);
    const jv = {};
    if (hasJudges(c)) for (const p of r.posts) jv[p.id] = c.judge_method === "score" ? r.jscore[p.id] || null : r.jpick[p.id] || null;
    const snap = { at: todayPT(), categories: r.categories, winners: r.winners, jwinners: r.jwinners, awards, jv,
      entries: r.posts.map((p) => ({ id: p.id, name: p.title || p.biz, biz: p.biz, address: p.address, city: p.city, lat: p.lat, lng: p.lng, photos: JSON.parse(p.photos || "[]"), no: p.entry_no, dq: !!p.dq, votes: hasPublic(c) ? Object.fromEntries(r.categories.map((k) => [k, (r.counts[p.id] || {})[k] || 0])) : null,
        jv: jv[p.id] ? Object.fromEntries(r.categories.map((k) => [k, c.judge_method === "score" ? (jv[p.id][k] ? { avg: Math.round(jv[p.id][k].avg * 100) / 100, n: jv[p.id][k].n, tr: !!jv[p.id][k].tr } : null) : jv[p.id][k] || 0])) : undefined })) };
    // One write only: a double click or a second tab changes no row here and gets the usual "locked" answer
    const wrote = await env.DB.prepare("UPDATE contests SET announced = 1, results = ?, updated_at = datetime('now') WHERE id = ? AND announced = 0").bind(JSON.stringify(snap), c.id).run();
    if (!wrote.meta || !wrote.meta.changes) return err(400, "The winners are announced and the results are locked.");
    await teamChanged(env, c, user, [{ label: "Winners", old: "Not announced", new: "Announced and locked" }], W);
    await queueResults(env, c, r, awards); // queued (never lost); the first 100 go out now, the rest on the hourly run (functions/_lib/mailbatch.js)
    const job = drainMail(env).catch((e) => logOp(env, "mail", "results: first send failed: " + (e && e.message)));
    if (waitUntil) waitUntil(job);
  } else return err(400, "Unknown action.");
  return json({ ok: true });
}

// "Run it again next year": a new contest with the same settings, rules, prizes, sponsors and judges, and every date a year later.
const plusYear = (d) => { const x = new Date(d + "T12:00:00Z"); x.setUTCFullYear(x.getUTCFullYear() + 1); return x.toISOString().slice(0, 10); };
async function cloneContest(env, c, user) {
  // Contest passes: a copy that goes live counts toward the organization's window like any other contest (a copy held for review does not count yet).
  const gate = await liveGate(env, user.email, c.site);
  if (c.status !== "pending" && !gate.ok) return json({ error: PAYWALL_MESSAGE, code: "pass_required", ...gate.view }, { status: 402 });
  const jn = (await env.DB.prepare("SELECT COUNT(*) AS n FROM judges WHERE contest_id = ?").bind(c.id).first()).n;
  if (jn) { const over = await reserveSends(env, user, c.id, "judge", jn); if (over) return err(429, over); }
  const closes = plusYear(c.entries_close); let vs = plusYear(c.vote_start), ve = plusYear(c.vote_end);
  if (vs <= closes) vs = addDays(closes, 1); // an organizer may have started voting early; the copy keeps the normal order
  if (ve <= vs) ve = addDays(vs, 14);
  const name = /\b20\d\d\b/.test(c.name) ? c.name.replace(/\b(20\d\d)\b/, (y) => String(+y + 1)) : `${c.name} ${closes.slice(0, 4)}`;
  let slug = slugify(name).slice(0, 40) || "contest";
  if (await getContest(env, slug)) slug = `${slug.slice(0, 34)}-${newId().slice(0, 5)}`;
  const skip = new Set(["sponsor_token", "sponsor_link_on", "sponsor_admin_off", "sponsor_pay_hidden", "org_key", "live_at", "id", "slug", "name", "announced", "results", "event_id", "note", "created_at", "updated_at", "remind_open", "remind_close", "entries_close", "vote_start", "vote_end", "season", "status", "entries_open", "voting_open"]);
  const row = { ...Object.fromEntries(Object.entries(c).filter(([k]) => !skip.has(k))), id: newId(), slug, name, entries_close: closes, vote_start: vs, vote_end: ve, season: seasonFor(closes), status: c.status === "pending" ? "pending" : "live", owner_id: c.owner_id };
  row.org_key = gate.key; row.live_at = row.status === "live" ? todayPT() : "";
  const cols = Object.keys(row);
  await env.DB.prepare(`INSERT INTO contests (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`).bind(...cols.map((k) => row[k])).run();
  // sponsors (their logos are copied so removing one contest's logo never affects the other) and judges
  const sp = (await env.DB.prepare("SELECT * FROM contest_sponsors WHERE contest_id = ?").bind(c.id).all()).results;
  for (const x of sp) {
    const id = newId(); let logo = "";
    if (x.logo) { const obj = await env.PHOTOS.get(x.logo); if (obj) { logo = x.logo.replace(c.id, row.id).replace(/[^/]+(\.\w+)$/, id + "$1"); await env.PHOTOS.put(logo, obj.body, { httpMetadata: obj.httpMetadata }); } }
    // A copy starts as an unconfirmed draft: last year's payment, receipt and permission do not carry over (the organizer confirms them again), so nothing shows until then.
    await env.DB.prepare("INSERT INTO contest_sponsors (id,contest_id,name,contact_name,tier,url,phone,email,logo,basis,show_public,permission,hidden_by_admin,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'',0,0,?,datetime('now'))").bind(id, row.id, x.name, x.contact_name || "", x.tier, x.url, x.phone || "", x.email || "", logo, x.hidden_by_admin ? 1 : 0).run();
  }
  const js = (await env.DB.prepare("SELECT email FROM judges WHERE contest_id = ?").bind(c.id).all()).results;
  if (js.length) await inviteJudges(env, { id: row.id, slug, name, org: c.org, judge_method: c.judge_method }, js.map((j) => j.email));
  if (row.status === "live") await listOnMap(env, row);
  return json({ ok: true, slug });
}

// The organizer changes the contest's details. Dates, text, prizes and rules can change until winners are announced;
// the categories only while nobody has voted yet, because a vote belongs to a category.
async function editContest(env, c, b, user, waitUntil) {
  if (c.announced) return err(400, "The winners are announced and the results are locked.");
  const today = todayPT(), name = normName(clean(b.name, 90)), org = normName(clean(b.org, 80)), descr = normText(clean(b.descr, 200));
  const closes = clean(b.closes, 10), vs = clean(b.vs, 10), ve = clean(b.ve, 10);
  if (name.length < 4) return err(400, "Give your contest a name (at least 4 letters).");
  if (org.length < 3) return err(400, "Tell us who is running the contest.");
  if (descr.length < 20) return err(400, "Write a sentence or two for the welcome message (at least 20 characters).");
  if (!isDate(closes) || !isDate(vs) || !isDate(ve)) return err(400, "Check the dates.");
  if (vs <= closes) return err(400, "Voting should start after entries close.");
  if (ve <= vs) return err(400, "Voting should end after it starts.");
  if (ve < today) return err(400, "The voting end date has already passed.");
  let categories = cats(c);
  if (Array.isArray(b.cats)) {
    const next = [...new Set(b.cats.map((x) => clean(x, 30)).filter(Boolean))].slice(0, 8);
    if (!next.length) return err(400, "Keep at least one category.");
    if (JSON.stringify(next) !== JSON.stringify(categories)) {
      const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM votes WHERE contest_id = ?").bind(c.id).first();
      if (n) return err(400, "Categories can't change after voting has started, because votes belong to a category.");
      categories = next;
    }
  }
  const prizeMode = ["none", "one", "each"].includes(b.prizeMode) ? b.prizeMode : "none", prize = clean(b.prize, 140), sponsor = clean(b.sponsor, 80);
  const prizes = {}; if (prizeMode === "each" && b.prizes && typeof b.prizes === "object") for (const [k, v] of Object.entries(b.prizes)) { const [cat, kind] = String(k).split("|"); if (categories.includes(cat) && KIND_LABEL[kind] && clean(v, 100)) prizes[`${cat}|${kind}`] = clean(v, 100); }
  const rules = String(b.rules || "").replace(/\r/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, 4000);
  if (rules.length < 40) return err(400, "The official rules need at least a few sentences.");
  const approval = b.approval === "auto" ? "auto" : "manual";
  const iname = clean(b.installerName, 80), iemail = clean(b.installerEmail, 120).toLowerCase(), iurl = clean(b.installerUrl, 200) ? webUrl(clean(b.installerUrl, 200)) : "";
  if (iname && !okEmail(iemail)) return err(400, "Enter the email where quote requests should go.");
  await env.DB.prepare("UPDATE contests SET installer_name=?, installer_email=?, installer_url=? WHERE id=?").bind(iname, iname ? iemail : "", iurl || "", c.id).run();
  await env.DB.prepare("UPDATE contests SET name=?, org=?, descr=?, entries_close=?, vote_start=?, vote_end=?, categories=?, rules=?, prize_mode=?, prize=?, prizes=?, sponsor=?, approval=?, updated_at=datetime('now') WHERE id=?")
    .bind(name, org, descr, closes, vs, ve, JSON.stringify(categories), rules, prizeMode, prize, JSON.stringify(prizes), sponsor, approval, c.id).run();
  if (c.status === "live") await listOnMap(env, { ...c, name, org, descr, vote_end: ve });
  await teamChanged(env, c, user, diff(c, { name, org, descr, entries_close: closes, vote_start: vs, vote_end: ve, categories: JSON.stringify(categories), rules, prize_mode: prizeMode, prize, prizes: JSON.stringify(prizes), sponsor, approval, installer_name: iname, installer_email: iname ? iemail : "", installer_url: iurl || "" }, CONTEST_FIELDS), waitUntil);
  return json({ ok: true });
}

// Everyone who entered gets the results; winners get a congratulations with their prize. Judges and the organizer are told too.
// Queued in mail_outbox (a request can only make 50 outgoing calls on the free plan); a repeat of this call queues nothing twice (dedupe key per contest, template and address).
async function queueResults(env, c, r, awards) {
  try {
    const won = new Map(); // post id -> [{ category, label, prize }]
    for (const a of awards) for (const id of a.ids) (won.get(id) || won.set(id, []).get(id)).push(a);
    const { results: rows } = await env.DB.prepare("SELECT p.id, u.email FROM posts p JOIN users u ON u.id = p.user_id WHERE p.contest_id = ? AND p.status = 'approved'").bind(c.id).all();
    const names = [...new Set([...won.keys()].map((id) => { const p = r.posts.find((x) => x.id === id); return p ? p.title || p.biz : ""; }).filter(Boolean))];
    const page = `https://socallights.app/c/${c.slug}`;
    const byEmail = new Map();
    for (const row of rows) { const e = byEmail.get(row.email) || { wins: [] }; e.wins.push(...(won.get(row.id) || [])); byEmail.set(row.email, e); }
    const items = [];
    for (const [to, e] of byEmail) {
      const win = e.wins.length > 0, pz = e.wins.filter((w) => w.prize).map((w) => `${w.category} (${w.label}): ${w.prize}`), id = win ? "results_winner" : "results_entrant";
      items.push({ id, to, dedupe: `results:${c.id}:${id}:${String(to).toLowerCase()}`, vars: win ? { contest: c.name, wins: e.wins.map((w) => `${w.category} (${w.label})`).join(", "), prize: pz.join("; "), org: c.org, link: page } : { contest: c.name, winners: names.join(", ") || "to be announced", link: page } });
    }
    if (hasJudges(c)) { const { results: js } = await env.DB.prepare("SELECT email FROM judges WHERE contest_id = ?").bind(c.id).all(); for (const j of js) items.push({ id: "results_judge", to: j.email, dedupe: `results:${c.id}:results_judge:${String(j.email).toLowerCase()}`, vars: { contest: c.name, winners: names.join(", ") || "to be announced", link: page } }); }
    items.push({ id: "results_organizer", to: c.contact_email, dedupe: `results:${c.id}:results_organizer`, vars: { contest: c.name, sent: byEmail.size, total: byEmail.size, link: `https://socallights.app/c/${c.slug}/manage` } });
    await enqueueMail(env, items);
  } catch (e) { await logOp(env, "mail", `results emails for contest ${c.id} could not be queued: ` + (e && e.message)); }
}
