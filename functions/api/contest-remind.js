// POST /api/contest-remind — called daily by a GitHub workflow with the shared key (the same ALERT_CRON_KEY as the weekly email).
// For each live contest it emails: when voting opens (entrants), and two days before voting closes (entrants and everyone who has voted).
// Each reminder is sent once per contest (remind_open / remind_close).
import { json, err } from "../_lib/util.js";
import { sendTemplate } from "../_lib/mailtpl.js";
import { prefsFor } from "../_lib/emailprefs.js";
import { todayPT, addDays } from "../_lib/contests.js";

const CAP = 150;
const optedOut = async (env, e) => { const p = await prefsFor(env, e).catch(() => null); return !!(p && p.optout); }; // a skipped send (unsubscribed) is not a failure
export async function onRequestPost({ request, env }) {
  const key = request.headers.get("x-alert-key") || "";
  if (!env.ALERT_CRON_KEY || key.length < 16 || key !== env.ALERT_CRON_KEY) return err(401, "Not allowed.");
  const today = todayPT(), soon = addDays(today, 2);
  const { results: cs } = await env.DB.prepare("SELECT * FROM contests WHERE status = 'live' AND announced = 0 AND vote_end >= ?").bind(today).all();
  const sent = { open: 0, close: 0 }, failed = { open: 0, close: 0 };
  const emails = async (sql, id) => [...new Set((await env.DB.prepare(sql).bind(id).all()).results.map((r) => r.email).filter(Boolean))].slice(0, CAP);
  for (const c of cs) {
    const page = `https://socallights.app/c/${c.slug}`;
    if (!c.remind_open && c.vote_start <= today) {
      const to = await emails("SELECT DISTINCT u.email FROM posts p JOIN users u ON u.id = p.user_id WHERE p.contest_id = ? AND p.status = 'approved'", c.id);
      let ok = 0, bad = 0;
      for (const e of to) { const r = await sendTemplate(env, "contest_remind_open", e, { contest: c.name, vote_end: c.vote_end, link: page }); if (r) ok++; else if (!(await optedOut(env, e))) bad++; }
      sent.open += ok; failed.open += bad;
      // Marked done only if something went out (or nothing failed: no one to tell, or everyone unsubscribed); if every email failed, tomorrow's run tries again
      if (!bad || ok) await env.DB.prepare("UPDATE contests SET remind_open = 1 WHERE id = ?").bind(c.id).run();
    }
    if (!c.remind_close && c.vote_start <= today && c.vote_end <= soon) {
      const to = await emails("SELECT u.email FROM users u WHERE u.id IN (SELECT user_id FROM votes WHERE contest_id = ?1 UNION SELECT user_id FROM posts WHERE contest_id = ?1 AND status = 'approved')", c.id);
      let ok = 0, bad = 0;
      for (const e of to) { const r = await sendTemplate(env, "contest_remind_close", e, { contest: c.name, vote_end: c.vote_end, link: page }); if (r) ok++; else if (!(await optedOut(env, e))) bad++; }
      sent.close += ok; failed.close += bad;
      if (!bad || ok) await env.DB.prepare("UPDATE contests SET remind_close = 1 WHERE id = ?").bind(c.id).run();
    }
  }
  return json({ contests: cs.length, sent, failed });
}
