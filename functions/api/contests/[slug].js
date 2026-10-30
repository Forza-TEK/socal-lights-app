// GET   /api/contests/<slug>  the contest, its approved homes and (when allowed) the vote counts. Personalized, never cached.
// PATCH /api/contests/<slug>  organizer controls: pause/resume entries and voting, show counts, start voting now, announce winners.
// Announcing freezes the results into contests.results; from then on the page and the archive read that snapshot, never the live votes.
import { json, err } from "../../_lib/util.js";
import { getUser, sameOrigin, sendMail } from "../../_lib/auth.js";
import { getContest, windows, todayPT, ownerOf, computeResults } from "../../_lib/contests.js";

export async function onRequestGet({ params, request, env }) {
  const c = await getContest(env, params.slug);
  const user = await getUser(request, env);
  const isOwner = !!(user && c && user.id === c.owner_id);
  if (!c || (c.status !== "live" && !isOwner)) return err(404, "This contest isn't available.");
  const frozen = c.announced && c.results ? JSON.parse(c.results) : null;
  const live = frozen ? null : await computeResults(env, c);
  const categories = frozen ? frozen.categories : live.categories;
  const showCounts = !!c.show_counts || !!c.announced || isOwner;
  const mine = user ? (await env.DB.prepare("SELECT post_id, category FROM votes WHERE contest_id = ? AND user_id = ?").bind(c.id, user.id).all()).results : [];
  const own = new Set(user ? (await env.DB.prepare("SELECT id FROM posts WHERE contest_id = ? AND user_id = ?").bind(c.id, user.id).all()).results.map((r) => r.id) : []);
  const w = windows(c);
  // Every home competes in every category, so each home carries a vote count per category (null when counts are hidden)
  const entries = frozen
    ? frozen.entries.map((e) => ({ ...e, mine: own.has(e.id) }))
    : live.posts.map((p) => ({
        id: p.id, name: p.title || p.biz, biz: p.biz, address: p.address, city: p.city, lat: p.lat, lng: p.lng, photos: JSON.parse(p.photos || "[]"), no: p.entry_no,
        votes: showCounts ? Object.fromEntries(categories.map((k) => [k, (live.counts[p.id] || {})[k] || 0])) : null, mine: own.has(p.id), flagged: isOwner ? !!p.dq : undefined,
      }));
  return json({
    contest: { slug: c.slug, name: c.name, org: c.org, city: c.city, county: c.county, descr: c.descr, categories, approval: c.approval, showCounts: !!c.show_counts, oneWin: !!c.one_win, rules: c.rules || "", announced: !!c.announced, frozenAt: frozen ? frozen.at : null, status: c.status, entriesClose: c.entries_close, voteStart: c.vote_start, voteEnd: c.vote_end, entriesOpen: w.entriesOpen, votingOpen: w.votingOpen, entriesPaused: !c.entries_open, votingPaused: !c.voting_open },
    entries, winners: frozen ? frozen.winners : c.announced ? live.winners : {}, me: { signedIn: !!user, isOwner, votes: mine },
  }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPatch({ params, request, env, waitUntil }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  if (c.status !== "live") return err(400, "This contest isn't live yet.");
  const b = await request.json().catch(() => ({}));
  if (c.announced) return err(400, "The winners are announced and the results are locked.");
  const sets = { close_entries: ["entries_open", 0], open_entries: ["entries_open", 1], pause_voting: ["voting_open", 0], resume_voting: ["voting_open", 1], show_counts: ["show_counts", 1], hide_counts: ["show_counts", 0] }[b.action];
  if (sets) await env.DB.prepare(`UPDATE contests SET ${sets[0]} = ?, updated_at = datetime('now') WHERE id = ?`).bind(sets[1], c.id).run();
  else if (b.action === "start_voting") {
    const t = todayPT(), end = c.vote_end < t ? t : c.vote_end;
    await env.DB.prepare("UPDATE contests SET vote_start = ?, vote_end = ?, voting_open = 1, updated_at = datetime('now') WHERE id = ?").bind(c.vote_start > t ? t : c.vote_start, end, c.id).run();
  } else if (b.action === "announce") {
    const r = await computeResults(env, c);
    const snap = { at: todayPT(), categories: r.categories, winners: r.winners,
      entries: r.posts.map((p) => ({ id: p.id, name: p.title || p.biz, biz: p.biz, address: p.address, city: p.city, lat: p.lat, lng: p.lng, photos: JSON.parse(p.photos || "[]"), no: p.entry_no, dq: !!p.dq, votes: Object.fromEntries(r.categories.map((k) => [k, (r.counts[p.id] || {})[k] || 0])) })) };
    await env.DB.prepare("UPDATE contests SET announced = 1, results = ?, updated_at = datetime('now') WHERE id = ?").bind(JSON.stringify(snap), c.id).run();
    const job = notifyResults(env, c, r);
    if (waitUntil) waitUntil(job);
  } else return err(400, "Unknown action.");
  return json({ ok: true });
}

// Everyone who entered gets the results; winners get a congratulations. The organizer gets a receipt. Failures are ignored (email may be off).
async function notifyResults(env, c, r) {
  try {
    const won = new Map(); // post id -> categories won
    for (const [k, ids] of Object.entries(r.winners)) for (const id of ids) (won.get(id) || won.set(id, []).get(id)).push(k);
    const { results: rows } = await env.DB.prepare("SELECT p.id, u.email FROM posts p JOIN users u ON u.id = p.user_id WHERE p.contest_id = ? AND p.status = 'approved'").bind(c.id).all();
    const names = [...new Set([...won.keys()].map((id) => { const p = r.posts.find((x) => x.id === id); return p ? p.title || p.biz : ""; }).filter(Boolean))];
    const page = `https://socallights.app/c/${c.slug}`;
    const byEmail = new Map();
    for (const row of rows) { const e = byEmail.get(row.email) || { cats: [] }; e.cats.push(...(won.get(row.id) || [])); byEmail.set(row.email, e); }
    let sent = 0;
    for (const [to, e] of [...byEmail].slice(0, 200)) {
      const win = e.cats.length > 0;
      if (await sendMail(env, { to, subject: win ? `You won: ${c.name}` : `Results are in: ${c.name}`,
        text: win ? `Congratulations! Your home won ${e.cats.join(", ")} in ${c.name}. ${c.org} will contact you at this email address about any prize. A crown now shows next to your home. See the results: ${page}`
                  : `Thank you for entering ${c.name}. Winners: ${names.join(", ") || "to be announced"}. See the full results: ${page}` })) sent++;
    }
    await sendMail(env, { to: c.contact_email, subject: `Results sent: ${c.name}`, text: `You announced the winners of ${c.name}. ${sent} of ${byEmail.size} entrants were emailed. The results are locked. Download them from your dashboard: https://socallights.app/c/${c.slug}/manage` });
  } catch {}
}
