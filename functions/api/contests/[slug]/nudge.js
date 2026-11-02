// POST /api/contests/<slug>/nudge — organizer: remind the judges who haven't finished their ballot.
import { json, err } from "../../../_lib/util.js";
import { getUser, sameOrigin, sendMail } from "../../../_lib/auth.js";
import { ownerOf, computeResults, hasJudges } from "../../../_lib/contests.js";
import { judgeProgress } from "../../../_lib/judging.js";

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  if (!hasJudges(c) || c.announced) return err(400, "There are no judges to remind.");
  const late = (await judgeProgress(env, c, await computeResults(env, c))).filter((j) => j.done < j.total);
  let sent = 0;
  for (const j of late) if (await sendMail(env, { to: j.email, subject: `Reminder: your judging for ${c.name}`, text: `${c.org} would like you to finish your ballot for ${c.name}. You have scored ${j.done} of ${j.total}.\n\nOpen your ballot: https://socallights.app/c/${c.slug}/judge\nVoting ends ${c.vote_end}.` })) sent++;
  return json({ ok: true, late: late.length, sent });
}
