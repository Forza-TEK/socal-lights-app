// GET   /api/contests/<slug>  the contest, its approved homes and (when allowed) the vote counts. Personalized, never cached.
// PATCH /api/contests/<slug>  organizer controls: pause/resume entries and voting, show counts, start voting now, announce winners.
import { json, err } from "../../_lib/util.js";
import { getUser, sameOrigin } from "../../_lib/auth.js";
import { getContest, windows, cats, todayPT, ownerOf } from "../../_lib/contests.js";

export async function onRequestGet({ params, request, env }) {
  const c = await getContest(env, params.slug);
  const user = await getUser(request, env);
  const isOwner = !!(user && c && user.id === c.owner_id);
  if (!c || (c.status !== "live" && !isOwner)) return err(404, "This contest isn't available.");
  const { results: posts } = await env.DB.prepare("SELECT id,title,biz,category,address,city,lat,lng,photos,entry_no,user_id FROM posts WHERE contest_id = ? AND status = 'approved' ORDER BY entry_no").bind(c.id).all();
  const showCounts = !!c.show_counts || !!c.announced || isOwner;
  const counts = {};
  if (showCounts) for (const r of (await env.DB.prepare("SELECT post_id, COUNT(*) AS n FROM votes WHERE contest_id = ? GROUP BY post_id").bind(c.id).all()).results) counts[r.post_id] = r.n;
  const mine = user ? (await env.DB.prepare("SELECT post_id, category FROM votes WHERE contest_id = ? AND user_id = ?").bind(c.id, user.id).all()).results : [];
  const w = windows(c);
  const entries = posts.map((p) => {
    const votes = showCounts ? counts[p.id] || 0 : null;
    return { id: p.id, name: p.title || p.biz, biz: p.biz, category: p.category, address: p.address, city: p.city, lat: p.lat, lng: p.lng, photos: JSON.parse(p.photos || "[]"), no: p.entry_no, votes, mine: !!(user && p.user_id === user.id) };
  });
  // winners: the home with the most votes overall (one vote total) or in each category
  let winners = [];
  if (c.announced) {
    const groups = c.vote_rule === "cat" ? cats(c) : [""];
    for (const g of groups) {
      const pool = entries.filter((e) => !g || e.category === g);
      const top = Math.max(0, ...pool.map((e) => e.votes || 0));
      if (top > 0) winners.push(...pool.filter((e) => e.votes === top).map((e) => e.id));
    }
  }
  return json({
    contest: { slug: c.slug, name: c.name, org: c.org, city: c.city, county: c.county, descr: c.descr, categories: cats(c), rule: c.vote_rule, approval: c.approval, showCounts: !!c.show_counts, announced: !!c.announced, status: c.status, entriesClose: c.entries_close, voteStart: c.vote_start, voteEnd: c.vote_end, entriesOpen: w.entriesOpen, votingOpen: w.votingOpen, entriesPaused: !c.entries_open, votingPaused: !c.voting_open },
    entries, winners, me: { signedIn: !!user, isOwner, votes: mine },
  }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPatch({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  if (c.status !== "live") return err(400, "This contest isn't live yet.");
  const b = await request.json().catch(() => ({}));
  const sets = { close_entries: ["entries_open", 0], open_entries: ["entries_open", 1], pause_voting: ["voting_open", 0], resume_voting: ["voting_open", 1], show_counts: ["show_counts", 1], hide_counts: ["show_counts", 0] }[b.action];
  if (sets) await env.DB.prepare(`UPDATE contests SET ${sets[0]} = ?, updated_at = datetime('now') WHERE id = ?`).bind(sets[1], c.id).run();
  else if (b.action === "start_voting") {
    const t = todayPT(), end = c.vote_end < t ? t : c.vote_end;
    await env.DB.prepare("UPDATE contests SET vote_start = ?, vote_end = ?, voting_open = 1, updated_at = datetime('now') WHERE id = ?").bind(c.vote_start > t ? t : c.vote_start, end, c.id).run();
  } else if (b.action === "announce") await env.DB.prepare("UPDATE contests SET announced = 1, updated_at = datetime('now') WHERE id = ?").bind(c.id).run();
  else return err(400, "Unknown action.");
  return json({ ok: true });
}
