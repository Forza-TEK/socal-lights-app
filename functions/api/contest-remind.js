// POST /api/contest-remind — called daily by a GitHub workflow with the shared key (the same ALERT_CRON_KEY as the weekly email).
// For each live contest it emails: when voting opens (entrants), and two days before voting closes (entrants and everyone who has voted).
// Each reminder is sent once per contest (remind_open / remind_close).
import { json, err } from "../_lib/util.js";
import { enqueueMail, drainMail } from "../_lib/mailbatch.js";
import { logOp } from "../_lib/oplog.js";
import { todayPT, addDays } from "../_lib/contests.js";

// Reminders go to the mail outbox (functions/_lib/mailbatch.js): one request can only make 50 outgoing calls on the free plan, so they are queued (a dedupe key makes a repeat harmless),
// the first 100 are sent now and the hourly outbox workflow sends the rest and retries failures. A contest is marked "reminded" once its messages are safely queued.
const CAP = 1000;
export async function onRequestPost({ request, env }) {
  const key = request.headers.get("x-alert-key") || "";
  if (!env.ALERT_CRON_KEY || key.length < 16 || key !== env.ALERT_CRON_KEY) return err(401, "Not allowed.");
  const today = todayPT(), soon = addDays(today, 2);
  const { results: cs } = await env.DB.prepare("SELECT * FROM contests WHERE status = 'live' AND announced = 0 AND vote_end >= ?").bind(today).all();
  const queued = { open: 0, close: 0 }, failed = { open: 0, close: 0 };
  const emails = async (sql, id, label) => {
    const all = [...new Set((await env.DB.prepare(sql).bind(id).all()).results.map((r) => r.email).filter(Boolean))];
    if (all.length > CAP) await logOp(env, "mail", `${label} for contest ${id}: ${all.length - CAP} recipients over the cap of ${CAP} were not queued`);
    return all.slice(0, CAP);
  };
  for (const c of cs) {
    const page = `https://socallights.app/c/${c.slug}`;
    for (const [flag, kind, due, tpl, sql] of [
      ["remind_open", "open", !c.remind_open && c.vote_start <= today, "contest_remind_open", "SELECT DISTINCT u.email FROM posts p JOIN users u ON u.id = p.user_id WHERE p.contest_id = ? AND p.status = 'approved'"],
      ["remind_close", "close", !c.remind_close && c.vote_start <= today && c.vote_end <= soon, "contest_remind_close", "SELECT u.email FROM users u WHERE u.id IN (SELECT user_id FROM votes WHERE contest_id = ?1 UNION SELECT user_id FROM posts WHERE contest_id = ?1 AND status = 'approved')"],
    ]) {
      if (!due) continue;
      try {
        const to = await emails(sql, c.id, tpl);
        const n = await enqueueMail(env, to.map((e) => ({ id: tpl, to: e, dedupe: `${flag}:${c.id}:${String(e).toLowerCase()}`, vars: { contest: c.name, vote_end: c.vote_end, link: page } })));
        queued[kind] += n;
        await env.DB.prepare(`UPDATE contests SET ${flag} = 1 WHERE id = ?`).bind(c.id).run();
      } catch (e) { failed[kind]++; await logOp(env, "mail", `${tpl} for contest ${c.id} could not be queued (will retry tomorrow): ` + (e && e.message)); }
    }
  }
  const sent = await drainMail(env);
  return json({ contests: cs.length, queued, failed, sent: sent.sent, retrying: sent.retrying });
}
