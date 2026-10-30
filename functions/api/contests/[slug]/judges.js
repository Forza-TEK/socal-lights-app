// Organizer only: invite and manage the judges.
// GET    /api/contests/<slug>/judges              judges with their progress and private link
// POST   /api/contests/<slug>/judges { emails }   invite judges (one per line or comma separated); each gets an email with a private link
// DELETE /api/contests/<slug>/judges?id=<judge>   remove a judge and their picks, scores and conflicts
import { json, err, newId } from "../../../_lib/util.js";
import { getUser, sameOrigin, normEmail, okEmail, sendMail } from "../../../_lib/auth.js";
import { ownerOf, computeResults, hasJudges } from "../../../_lib/contests.js";
import { judgeProgress } from "../../../_lib/judging.js";

export async function inviteJudges(env, c, emails, origin = "https://socallights.app") {
  const have = new Set((await env.DB.prepare("SELECT email FROM judges WHERE contest_id = ?").bind(c.id).all()).results.map((r) => r.email));
  const out = [];
  for (const raw of emails) {
    if (!okEmail(raw)) continue; const email = normEmail(raw); if (have.has(email)) continue; have.add(email);
    const j = { id: newId(), email, token: newId() + newId() };
    await env.DB.prepare("INSERT INTO judges (id,contest_id,email,token) VALUES (?,?,?,?)").bind(j.id, c.id, email, j.token).run();
    out.push({ ...j, to: String(raw).trim() });
  }
  for (const j of out) await sendMail(env, { to: j.to, subject: `You're invited to judge ${c.name}`, text: `${c.org} invited you to be a judge for ${c.name}.\n\nOpen your judges' ballot (sign in with this email address):\n${origin}/c/${c.slug}/judge\n\nJudges vote separately from the public. ${c.judge_method === "score" ? "Score every home from 1 to 10 in each category." : "Pick one favorite home in each category."} Judge on first impression, creativity, theme, craftsmanship and variety of lights. If you know a household, mark it so your vote for it doesn't count.` }).catch(() => {});
  return out.length;
}

export async function onRequestGet({ params, request, env }) {
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  if (!hasJudges(c)) return json({ judges: [] });
  const r = await computeResults(env, c);
  return json({ judges: await judgeProgress(env, c, r), method: c.judge_method === "score" ? "score" : "pick" }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  if (!hasJudges(c)) return err(400, "This contest has no judges. Judges are chosen when you create a contest.");
  if (c.announced) return err(400, "The winners are announced and the results are locked.");
  const b = await request.json().catch(() => ({}));
  const emails = (Array.isArray(b.emails) ? b.emails : String(b.emails || "").split(/[\n,;]+/)).map((x) => String(x).trim()).filter(Boolean);
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM judges WHERE contest_id = ?").bind(c.id).first();
  if (n + emails.length > 15) return err(400, "A contest can have up to 15 judges.");
  const added = await inviteJudges(env, c, emails);
  return json({ ok: true, added });
}

export async function onRequestDelete({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  if (c.announced) return err(400, "The winners are announced and the results are locked.");
  const id = new URL(request.url).searchParams.get("id") || "";
  await env.DB.batch(["judge_picks", "judge_scores", "judge_conflicts"].map((t) => env.DB.prepare(`DELETE FROM ${t} WHERE contest_id = ? AND judge_id = ?`).bind(c.id, id)).concat(env.DB.prepare("DELETE FROM judges WHERE contest_id = ? AND id = ?").bind(c.id, id)));
  return json({ ok: true });
}
