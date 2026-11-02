// GET   /api/contests/<slug>  the contest, its approved homes, prizes and (when allowed) the vote counts. Personalized, never cached.
// PATCH /api/contests/<slug>  organizer controls: pause/resume entries and voting, show counts, start voting now, announce winners.
// Announcing freezes the results into contests.results; from then on the page, the archive and the export read that snapshot, never the live votes.
import { json, err, clean, webUrl, newId } from "../../_lib/util.js";
import { slug as slugify } from "../../_lib/events.js";
import { inviteJudges } from "./[slug]/judges.js";
import { getUser, sameOrigin, sendMail, okEmail } from "../../_lib/auth.js";
import { getContest, windows, todayPT, isDate, listOnMap, isStaff, seasonFor, addDays, ownerOf, computeResults, awardList, prizeFor, modeOf, hasPublic, hasJudges, judgeOf, KIND_LABEL, cats } from "../../_lib/contests.js";
import { judgeProgress } from "../../_lib/judging.js";

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
    ? frozen.entries.map((e) => ({ ...e, mine: own.has(e.id) }))
    : live.posts.map((p) => ({
        id: p.id, name: p.title || p.biz, biz: p.biz, address: p.address, city: p.city, lat: p.lat, lng: p.lng, photos: JSON.parse(p.photos || "[]"), no: p.entry_no, descr: /^Entry in /.test(p.descr || "") ? "" : (p.descr || "").slice(0, 300),
        votes: showCounts && hasPublic(c) ? Object.fromEntries(categories.map((k) => [k, (live.counts[p.id] || {})[k] || 0])) : null, mine: own.has(p.id), flagged: isOwner ? !!p.dq : undefined,
        jv: isOwner && hasJudges(c) ? jshow(p.id) : undefined,
      }));
  const awards = frozen ? frozen.awards : c.announced ? awardList(c, live) : null;
  // What each award is worth, shown from the start so people know what they are competing for
  const prizes = categories.flatMap((k) => [hasPublic(c) ? { category: k, kind: "public", label: KIND_LABEL.public, prize: prizeFor(c, k, "public") } : null, hasJudges(c) ? { category: k, kind: "judge", label: KIND_LABEL.judge, prize: prizeFor(c, k, "judge") } : null]).filter((x) => x && x.prize);
  const sponsors = (await env.DB.prepare("SELECT id,name,tier,url,logo FROM contest_sponsors WHERE contest_id = ? ORDER BY CASE tier WHEN 'presenting' THEN 0 WHEN 'gold' THEN 1 WHEN 'silver' THEN 2 ELSE 3 END, created_at").bind(c.id).all()).results;
  return json({
    sponsors: sponsors.map((x) => ({ id: x.id, name: x.name, tier: x.tier, url: x.url, logo: !!x.logo })),
    installer: c.installer_name ? { name: c.installer_name, url: c.installer_url || "", slug: (await env.DB.prepare("SELECT slug FROM installers WHERE lower(name) = lower(?) AND status = 'active'").bind(c.installer_name).first())?.slug || "" } : null,
    ...(isOwner ? { installerEmail: c.installer_email || "" } : {}),
    contest: { slug: c.slug, name: c.name, org: c.org, city: c.city, county: c.county, descr: c.descr, categories, approval: c.approval, showCounts: !!c.show_counts, oneWin: !!c.one_win, rules: c.rules || "", mode: modeOf(c), judgeMethod: c.judge_method === "score" ? "score" : "pick", prizeMode: c.prize_mode || "none", prize: c.prize || "", sponsor: c.sponsor || "", season: c.season, announced: !!c.announced, frozenAt: frozen ? frozen.at : null, status: c.status, entriesClose: c.entries_close, voteStart: c.vote_start, voteEnd: c.vote_end, entriesOpen: w.entriesOpen, votingOpen: w.votingOpen, entriesPaused: !c.entries_open, votingPaused: !c.voting_open },
    entries, winners: frozen ? frozen.winners : c.announced ? live.winners : {}, jwinners: frozen ? frozen.jwinners || {} : c.announced ? live.jwinners : {}, awards, prizes,
    me: { signedIn: !!user, isOwner, isJudge: !!jrow, votes: mine },
  }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPatch({ params, request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res, user } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const b = await request.json().catch(() => ({}));
  if (b.action === "edit") return editContest(env, c, b);
  if (b.action === "clone") return cloneContest(env, c, user);
  if (c.status !== "live") return err(400, "This contest isn't live yet.");
  if (c.announced) return err(400, "The winners are announced and the results are locked.");
  const sets = { close_entries: ["entries_open", 0], open_entries: ["entries_open", 1], pause_voting: ["voting_open", 0], resume_voting: ["voting_open", 1], show_counts: ["show_counts", 1], hide_counts: ["show_counts", 0] }[b.action];
  if (sets) await env.DB.prepare(`UPDATE contests SET ${sets[0]} = ?, updated_at = datetime('now') WHERE id = ?`).bind(sets[1], c.id).run();
  else if (b.action === "start_voting") {
    const t = todayPT(), end = c.vote_end < t ? t : c.vote_end;
    await env.DB.prepare("UPDATE contests SET vote_start = ?, vote_end = ?, voting_open = 1, updated_at = datetime('now') WHERE id = ?").bind(c.vote_start > t ? t : c.vote_start, end, c.id).run();
  } else if (b.action === "announce") {
    const r = await computeResults(env, c);
    // Judges who haven't finished: ask the organizer to confirm before the results are locked
    if (hasJudges(c) && !b.force) { const inc = (await judgeProgress(env, c, r)).filter((j) => j.done < j.total); if (inc.length) return json({ ok: false, incomplete: inc.map((j) => j.email) }, { status: 409 }); }
    const awards = awardList(c, r);
    const jv = {};
    if (hasJudges(c)) for (const p of r.posts) jv[p.id] = c.judge_method === "score" ? r.jscore[p.id] || null : r.jpick[p.id] || null;
    const snap = { at: todayPT(), categories: r.categories, winners: r.winners, jwinners: r.jwinners, awards, jv,
      entries: r.posts.map((p) => ({ id: p.id, name: p.title || p.biz, biz: p.biz, address: p.address, city: p.city, lat: p.lat, lng: p.lng, photos: JSON.parse(p.photos || "[]"), no: p.entry_no, dq: !!p.dq, votes: hasPublic(c) ? Object.fromEntries(r.categories.map((k) => [k, (r.counts[p.id] || {})[k] || 0])) : null,
        jv: jv[p.id] ? Object.fromEntries(r.categories.map((k) => [k, c.judge_method === "score" ? (jv[p.id][k] ? { avg: Math.round(jv[p.id][k].avg * 100) / 100, n: jv[p.id][k].n, tr: !!jv[p.id][k].tr } : null) : jv[p.id][k] || 0])) : undefined })) };
    await env.DB.prepare("UPDATE contests SET announced = 1, results = ?, updated_at = datetime('now') WHERE id = ?").bind(JSON.stringify(snap), c.id).run();
    const job = notifyResults(env, c, r, awards);
    if (waitUntil) waitUntil(job);
  } else return err(400, "Unknown action.");
  return json({ ok: true });
}

// "Run it again next year": a new contest with the same settings, rules, prizes, sponsors and judges, and every date a year later.
const plusYear = (d) => { const x = new Date(d + "T12:00:00Z"); x.setUTCFullYear(x.getUTCFullYear() + 1); return x.toISOString().slice(0, 10); };
async function cloneContest(env, c, user) {
  const closes = plusYear(c.entries_close); let vs = plusYear(c.vote_start), ve = plusYear(c.vote_end);
  if (vs <= closes) vs = addDays(closes, 1); // an organizer may have started voting early; the copy keeps the normal order
  if (ve <= vs) ve = addDays(vs, 14);
  const name = /\b20\d\d\b/.test(c.name) ? c.name.replace(/\b(20\d\d)\b/, (y) => String(+y + 1)) : `${c.name} ${closes.slice(0, 4)}`;
  let slug = slugify(name).slice(0, 40) || "contest";
  if (await getContest(env, slug)) slug = `${slug.slice(0, 34)}-${newId().slice(0, 5)}`;
  const skip = new Set(["id", "slug", "name", "announced", "results", "event_id", "note", "created_at", "updated_at", "remind_open", "remind_close", "entries_close", "vote_start", "vote_end", "season", "status", "entries_open", "voting_open"]);
  const row = { ...Object.fromEntries(Object.entries(c).filter(([k]) => !skip.has(k))), id: newId(), slug, name, entries_close: closes, vote_start: vs, vote_end: ve, season: seasonFor(closes), status: c.status === "pending" ? "pending" : "live", owner_id: c.owner_id };
  const cols = Object.keys(row);
  await env.DB.prepare(`INSERT INTO contests (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`).bind(...cols.map((k) => row[k])).run();
  // sponsors (their logos are copied so removing one contest's logo never affects the other) and judges
  const sp = (await env.DB.prepare("SELECT * FROM contest_sponsors WHERE contest_id = ?").bind(c.id).all()).results;
  for (const x of sp) {
    const id = newId(); let logo = "";
    if (x.logo) { const obj = await env.PHOTOS.get(x.logo); if (obj) { logo = x.logo.replace(c.id, row.id).replace(/[^/]+(\.\w+)$/, id + "$1"); await env.PHOTOS.put(logo, obj.body, { httpMetadata: obj.httpMetadata }); } }
    await env.DB.prepare("INSERT INTO contest_sponsors (id,contest_id,name,tier,url,logo) VALUES (?,?,?,?,?,?)").bind(id, row.id, x.name, x.tier, x.url, logo).run();
  }
  const js = (await env.DB.prepare("SELECT email FROM judges WHERE contest_id = ?").bind(c.id).all()).results;
  if (js.length) await inviteJudges(env, { id: row.id, slug, name, org: c.org, judge_method: c.judge_method }, js.map((j) => j.email));
  if (row.status === "live") await listOnMap(env, row);
  return json({ ok: true, slug });
}

// The organizer changes the contest's details. Dates, text, prizes and rules can change until winners are announced;
// the categories only while nobody has voted yet, because a vote belongs to a category.
async function editContest(env, c, b) {
  if (c.announced) return err(400, "The winners are announced and the results are locked.");
  const today = todayPT(), name = clean(b.name, 90), org = clean(b.org, 80), descr = clean(b.descr, 200);
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
  return json({ ok: true });
}

// Everyone who entered gets the results; winners get a congratulations with their prize. Judges and the organizer are told too.
async function notifyResults(env, c, r, awards) {
  try {
    const won = new Map(); // post id -> [{ category, label, prize }]
    for (const a of awards) for (const id of a.ids) (won.get(id) || won.set(id, []).get(id)).push(a);
    const { results: rows } = await env.DB.prepare("SELECT p.id, u.email FROM posts p JOIN users u ON u.id = p.user_id WHERE p.contest_id = ? AND p.status = 'approved'").bind(c.id).all();
    const names = [...new Set([...won.keys()].map((id) => { const p = r.posts.find((x) => x.id === id); return p ? p.title || p.biz : ""; }).filter(Boolean))];
    const page = `https://socallights.app/c/${c.slug}`;
    const byEmail = new Map();
    for (const row of rows) { const e = byEmail.get(row.email) || { wins: [] }; e.wins.push(...(won.get(row.id) || [])); byEmail.set(row.email, e); }
    let sent = 0;
    for (const [to, e] of [...byEmail].slice(0, 200)) {
      const win = e.wins.length > 0, pz = e.wins.filter((w) => w.prize).map((w) => `${w.category} (${w.label}): ${w.prize}`);
      if (await sendMail(env, { to, subject: win ? `You won: ${c.name}` : `Results are in: ${c.name}`,
        text: win ? `Congratulations! Your home won ${e.wins.map((w) => `${w.category} (${w.label})`).join(", ")} in ${c.name}.${pz.length ? ` Prize: ${pz.join("; ")}.` : ""} ${c.org} will contact you at this email address about any prize. A crown now shows on your home, and you can choose where to show your badge in your profile. See the results: ${page}`
                  : `Thank you for entering ${c.name}. Winners: ${names.join(", ") || "to be announced"}. See the full results: ${page}` })) sent++;
    }
    if (hasJudges(c)) { const { results: js } = await env.DB.prepare("SELECT email FROM judges WHERE contest_id = ?").bind(c.id).all(); for (const j of js) await sendMail(env, { to: j.email, subject: `Results are in: ${c.name}`, text: `Thank you for judging ${c.name}. The winners are ${names.join(", ") || "to be announced"}. ${page}` }); }
    await sendMail(env, { to: c.contact_email, subject: `Results sent: ${c.name}`, text: `You announced the winners of ${c.name}. ${sent} of ${byEmail.size} entrants were emailed. The results are locked. Download them from your dashboard: https://socallights.app/c/${c.slug}/manage` });
  } catch {}
}
