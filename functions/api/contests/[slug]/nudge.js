// POST /api/contests/<slug>/nudge — organizer: remind the judges who haven't finished their ballot.
import { json, err } from "../../../_lib/util.js";
import { sendNow } from "../../../_lib/mailbatch.js";
import { getUser, sameOrigin } from "../../../_lib/auth.js";
import { ownerOf, computeResults, hasJudges } from "../../../_lib/contests.js";
import { judgeProgress } from "../../../_lib/judging.js";
import { reserveSends } from "../../../_lib/sendlimit.js";
import { fmtDate } from "../../../../public/contestfmt.js";

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res, user } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  if (!hasJudges(c) || c.announced) return err(400, "There are no judges to remind.");
  const late = (await judgeProgress(env, c, await computeResults(env, c))).filter((j) => j.done < j.total);
  const over = await reserveSends(env, user, c.id, "nudge", late.length);
  if (over) return err(429, over);
  const sent = (await sendNow(env, late.map((j) => ({ id: "judge_nudge", to: j.email, vars: { org: c.org, contest: c.name, done: j.done, total: j.total, link: `https://socallights.app/c/${c.slug}/judge`, vote_end: fmtDate(c.vote_end) } })), "judge_nudge")).filter(Boolean).length;
  return json({ ok: true, late: late.length, sent });
}
