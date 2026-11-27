// When a home that people voted for is taken out of a contest (the entrant withdraws it, or the homeowner does), tell each voter once, while voting is still open so they can vote again.
// Call BEFORE the votes are deleted. Never throws: a failed notice must not stop the withdrawal.
import { enqueueMail } from "./mailbatch.js";
import { windows } from "./contests.js";
import { logOp } from "./oplog.js";

export async function noticeVoters(env, contest, postId) {
  try {
    if (!windows(contest).votingOpen) return 0;
    const rows = (await env.DB.prepare("SELECT u.email AS email, GROUP_CONCAT(v.category, ', ') AS cats FROM votes v JOIN users u ON u.id = v.user_id WHERE v.post_id = ? AND COALESCE(v.voided, 0) = 0 AND u.email != '' GROUP BY u.id").bind(postId).all()).results;
    if (!rows.length) return 0;
    const link = `https://socallights.app/c/${contest.slug}`;
    return await enqueueMail(env, rows.map((r) => ({ id: "vote_withdrawn", to: r.email, dedupe: `votegone:${contest.id}:${postId}:${String(r.email).toLowerCase()}`, vars: { contest: contest.name, categories: r.cats, link } })));
  } catch (e) { await logOp(env, "mail", "voter notice could not be queued: " + (e && e.message)); return 0; }
}
