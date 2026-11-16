// GET   /api/contests/<slug>  the contest, its approved homes, prizes and (when allowed) the vote counts. Personalized, never cached.
// PATCH /api/contests/<slug>  organizer controls: pause/resume entries and voting, show counts, start voting now, announce winners.
// Announcing freezes the results into contests.results; from then on the page, the archive and the export read that snapshot, never the live votes.
import { logoUrl } from "./[slug]/logo.js";
import { json, err, clean, webUrl, newId } from "../../_lib/util.js";
import { enqueueMail, drainMail } from "../../_lib/mailbatch.js";
import { logOp } from "../../_lib/oplog.js";
import { inviteJudges } from "./[slug]/judges.js";
import { getUser, sameOrigin, okEmail } from "../../_lib/auth.js";
import { getContest, windows, states, contestSlug, withTail, todayPT, isDate, listOnMap, unlistFromMap, isStaff, trustOf, officialSounding, MAX_CATS, seasonFor, addDays, ownerOf, computeResults, awardList, prizeFor, modeOf, hasPublic, hasJudges, judgeOf, KIND_LABEL, cats } from "../../_lib/contests.js";
import { publicEntry } from "../../_lib/archive.js";
import { judgeProgress } from "../../_lib/judging.js";
import { diff, CONTEST_FIELDS, teamChanged } from "../../_lib/changes.js";
import { normName, normText } from "../../_lib/fields.js";
import { needsReview } from "../../_lib/moderation.js";
import { checkThrottle, hashKey } from "../../_lib/throttle.js";
import { tell } from "../../_lib/notify.js";
import { reserveSends } from "../../_lib/sendlimit.js";
import { isPublic, staffView, publicView } from "../../_lib/sponsors.js";
import { founderKeys, isFounder } from "../../_lib/founder.js";
import { liveGate, overAllowance, PAYWALL_MESSAGE } from "../../_lib/passkey.js";

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
  const ownRows = user ? (await env.DB.prepare("SELECT id, photo_token FROM posts WHERE contest_id = ? AND user_id = ?").bind(c.id, user.id).all()).results : [];
  const own = new Set(ownRows.map((r) => r.id)), ownTok = Object.fromEntries(ownRows.filter((r) => r.photo_token).map((r) => [r.id, "/photos/" + r.photo_token])); // the link to manage a home an organizer added: shown only to the person who linked it
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
        votes: showCounts && hasPublic(c) ? Object.fromEntries(categories.map((k) => [k, (live.counts[p.id] || {})[k] || 0])) : null, mine: own.has(p.id), manage: ownTok[p.id], flagged: isOwner ? !!p.dq : undefined,
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
    contest: { logo: logoUrl(c), founder: isFounder(await founderKeys(env), c.org_key), slug: c.slug, name: c.name, org: c.org, city: c.city, county: c.county, descr: c.descr, categories, approval: c.approval, showCounts: !!c.show_counts, oneWin: !!c.one_win, rules: c.rules || "", mode: modeOf(c), judgeMethod: c.judge_method === "score" ? "score" : "pick", prizeMode: c.prize_mode || "none", prize: c.prize || "", sponsor: c.sponsor || "", season: c.season, announced: !!c.announced, frozenAt: frozen ? frozen.at : null, votesRemoved: frozen ? frozen.voided || 0 : 0, status: c.status, unpublishedByOwner: c.status === "declined" && c.unpublished_by === "owner",  entriesClose: c.entries_close, voteStart: c.vote_start, voteEnd: c.vote_end, entriesOpen: w.entriesOpen, votingOpen: w.votingOpen, entriesPaused: !c.entries_open, votingPaused: !c.voting_open, ...states(c) },
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
    const today = todayPT(); // audit M1: a mis-click while voting is still open would freeze the results, email every entrant and close the votes for good, so it needs the confirmation too
    const early = today < c.vote_start ? "Voting hasn't started yet." : votesIn === 0 && judgeIn === 0 ? "Nobody has voted yet." : today <= c.vote_end ? `Voting is still open until ${c.vote_end}.` : "";
    const inc = hasJudges(c) ? (await judgeProgress(env, c, r)).filter((j) => j.done < j.total).map((j) => j.email) : [];
    if (!b.force && (early || inc.length)) return json({ ok: false, needs_force: true, reason: early || "Some judges haven't finished.", ...(inc.length ? { incomplete: inc } : {}) }, { status: 409 });
    const awards = awardList(c, r);
    const jv = {};
    if (hasJudges(c)) for (const p of r.posts) jv[p.id] = c.judge_method === "score" ? r.jscore[p.id] || null : r.jpick[p.id] || null;
    const voided = (await env.DB.prepare("SELECT COUNT(*) AS n FROM votes WHERE contest_id = ? AND voided = 1").bind(c.id).first()).n; // audit H3: the results page says how many votes were removed
    const snap = { at: todayPT(), voided, categories: r.categories, winners: r.winners, jwinners: r.jwinners, awards, jv,
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
  // Audit H2: only a contest that is (or was) really live can be run again. A declined, held-for-review or Admin-closed one never becomes live through a copy; one the creator unpublished
  // themselves can be put back with "publish again" first.
  if (!(c.status === "live" || c.announced)) return err(400, c.status === "pending" ? "This contest is still waiting for review, so it can't be run again yet." : c.status === "declined" && c.unpublished_by === "owner" ? "Put this contest back on the map first, then you can run it again." : "This contest can't be run again. Contact us if you think that is a mistake.");
  // A copy counts toward the same per-account daily cap as creating a new contest (POST /api/contests): the 4th create-or-clone in a day is refused with the same message.
  const today = (await env.DB.prepare("SELECT COUNT(*) AS n FROM contests WHERE owner_id = ? AND created_at > datetime('now','-1 day')").bind(user.id).first()).n;
  if (today >= 3) return err(429, "You've created several contests today. Try again tomorrow.");
  // Contest passes: a copy that goes live counts toward the organization's window like any other contest (a copy held for review does not count yet).
  const gate = await liveGate(env, user.email, c.site);
  if (!gate.ok) return json({ error: PAYWALL_MESSAGE, code: "pass_required", ...gate.view }, { status: 402 });
  const jn = (await env.DB.prepare("SELECT COUNT(*) AS n FROM judges WHERE contest_id = ?").bind(c.id).first()).n;
  if (jn) { const over = await reserveSends(env, user, c.id, "judge", jn); if (over) return err(429, over); }
  const closes = plusYear(c.entries_close); let vs = plusYear(c.vote_start), ve = plusYear(c.vote_end);
  if (vs <= closes) vs = addDays(closes, 1); // an organizer may have started voting early; the copy keeps the normal order
  if (ve <= vs) ve = addDays(vs, 14);
  const name = /\b20\d\d\b/.test(c.name) ? c.name.replace(/\b(20\d\d)\b/, (y) => String(+y + 1)) : `${c.name} ${closes.slice(0, 4)}`;
  let slug = contestSlug(name);
  if (await getContest(env, slug)) slug = withTail(slug, newId().slice(0, 5));
  const skip = new Set(["sponsor_token", "sponsor_link_on", "sponsor_admin_off", "sponsor_pay_hidden", "org_key", "live_at", "id", "slug", "name", "announced", "results", "event_id", "unpublished_by", "created_at", "updated_at", "remind_open", "remind_close", "remind_announce", "entries_close", "vote_start", "vote_end", "season", "status", "entries_open", "voting_open"]);
  const row = { ...Object.fromEntries(Object.entries(c).filter(([k]) => !skip.has(k))), id: newId(), slug, name, entries_close: closes, vote_start: vs, vote_end: ve, season: seasonFor(closes), status: "live", owner_id: c.owner_id }; // note stays with the copy (it is what limits organizer-added homes and sponsor payment text until Admin vouches)
  row.org_key = gate.key; row.live_at = row.status === "live" ? todayPT() : "";
  const cols = Object.keys(row);
  await env.DB.prepare(`INSERT INTO contests (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`).bind(...cols.map((k) => row[k])).run();
  // Audit M7: the gate above and this insert are separate statements, so two requests at the same moment could both pass it. Count again now that the row is in: over the allowance, take it back.
  if (await overAllowance(env, gate.key)) { await env.DB.prepare("DELETE FROM contests WHERE id = ?").bind(row.id).run(); return json({ error: PAYWALL_MESSAGE, code: "pass_required", ...gate.view }, { status: 402 }); }
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
    const next = [...new Set(b.cats.map((x) => clean(x, 30)).filter(Boolean))];
    if (!next.length) return err(400, "Keep at least one category.");
    if (next.length > MAX_CATS) return err(400, `Use at most ${MAX_CATS} categories.`);
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
  // Audit H2: the official-sounding / review-words hold also runs on edit. The contest stays live under its OLD text; the requested change waits for Admin ("Looks fine" applies it).
  // Not re-held: a verified/matching organizer, a name that was already official-sounding, or text that already carried a review word.
  const trust = trustOf(user.email, c.site);
  const newlyOfficial = trust !== "match" && officialSounding(name, org) && !officialSounding(c.name, c.org);
  const newlyWords = needsReview(name, org, descr, rules) && !needsReview(c.name, c.org, c.descr, c.rules);
  const hold = newlyOfficial || newlyWords;
  const want = { name, org, descr, rules }, keep = { name: c.name, org: c.org, descr: c.descr, rules: c.rules || "" };
  const held = hold && Object.keys(want).some((k) => want[k] !== keep[k]);
  const fin = held ? keep : want; // what is written now
  await env.DB.prepare("UPDATE contests SET installer_name=?, installer_email=?, installer_url=? WHERE id=?").bind(iname, iname ? iemail : "", iurl || "", c.id).run();
  await env.DB.prepare("UPDATE contests SET name=?, org=?, descr=?, entries_close=?, vote_start=?, vote_end=?, categories=?, rules=?, prize_mode=?, prize=?, prizes=?, sponsor=?, approval=?, updated_at=datetime('now') WHERE id=?")
    .bind(fin.name, fin.org, fin.descr, closes, vs, ve, JSON.stringify(categories), fin.rules, prizeMode, prize, JSON.stringify(prizes), sponsor, approval, c.id).run();
  if (held) {
    const note = `${newlyOfficial ? "official-sounding name" : "review words"} held on edit: wants name "${name}", org "${org}"`;
    await env.DB.prepare("UPDATE contests SET pending_edit = ?, note = CASE WHEN note = '' THEN ? ELSE note || '; ' || ? END WHERE id = ?").bind(JSON.stringify(want), note, note, c.id).run();
    if (!(await checkThrottle(env, [{ kind: "contest-review", key: await hashKey(env, "u", user.id), max: 1, windowHours: 1, msg: "" }]))) tell(env, waitUntil, env.ADMIN_NOTIFY_EMAIL || "rey@forza-tek.com", "contest_review", { name: c.name, org: c.org, city: c.city, email: user.email, note, what: "It stays live under its old name until you decide: Looks fine applies the requested change.", link: "https://socallights.app/admin/" });
  } else if (c.pending_edit) await env.DB.prepare("UPDATE contests SET pending_edit = '' WHERE id = ?").bind(c.id).run(); // a newer, ordinary edit replaces a held one
  if (c.status === "live") await listOnMap(env, { ...c, name: fin.name, org: fin.org, descr: fin.descr, vote_end: ve });
  await teamChanged(env, c, user, diff(c, { name: fin.name, org: fin.org, descr: fin.descr, entries_close: closes, vote_start: vs, vote_end: ve, categories: JSON.stringify(categories), rules: fin.rules, prize_mode: prizeMode, prize, prizes: JSON.stringify(prizes), sponsor, approval, installer_name: iname, installer_email: iname ? iemail : "", installer_url: iurl || "" }, CONTEST_FIELDS), waitUntil);
  return json({ ok: true, ...(held ? { held: true, message: "Saved. The new name or wording needs a quick look from our team first, so your contest keeps its current name until we approve it. Everything else you changed is saved." } : {}) });
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
