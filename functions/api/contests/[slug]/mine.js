// PATCH /api/contests/<slug>/mine { id, name, desc } and DELETE ?id= — an entrant edits the name and description of their own home, or withdraws it.
// Photos and the address can't change here (they need a fresh review): withdraw and enter again.
import { json, err, clean } from "../../../_lib/util.js";
import { getUser, sameOrigin } from "../../../_lib/auth.js";
import { getContest } from "../../../_lib/contests.js";
import { needsReview } from "../../../_lib/moderation.js";
import { ptToday } from "../../../_lib/time.js";
import { logContest } from "../../../_lib/changes.js";

async function mine(request, env, slug, id) {
  const user = await getUser(request, env);
  if (!user) return { res: err(401, "Please sign in first.") };
  const c = await getContest(env, slug);
  if (!c) return { res: err(404, "Not found.") };
  if (c.announced) return { res: err(409, "Results are locked.") };
  if (c.vote_end && c.vote_end < ptToday()) return { res: err(409, "Voting has closed, so this entry can't be changed or withdrawn any more. Use \"Ask us to remove it\" from your profile.") };
  const row = await env.DB.prepare("SELECT * FROM posts WHERE id = ? AND contest_id = ? AND user_id = ?").bind(id, c.id, user.id).first();
  if (!row || row.status === "declined") return { res: err(404, "That entry isn't yours.") };
  return { c, row, user };
}
export async function onRequestPatch({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const b = await request.json().catch(() => ({}));
  const { c, row, user, res } = await mine(request, env, params.slug, String(b.id || ""));
  if (res) return res;
  const name = clean(b.name, 80), desc = clean(b.desc, 300);
  if (name.length < 2) return err(400, "Add the name for the entry.");
  const descr = desc || `Entry in ${params.slug}`, changed = name !== (row.title || row.biz) || descr !== (row.descr || "");
  // Audit M2: the text goes on the public contest page, the map and the results archive. An approved entry whose new text trips the word filter goes back to the organizer's review list
  // (off the ballot until approved again); any other change to an approved entry is written to the contest's change log so the organizer can see it.
  const back = row.status === "approved" && changed && needsReview(name, desc);
  await env.DB.prepare(`UPDATE posts SET biz = ?, title = ?, descr = ?${back ? ", status = 'pending', approved_at = NULL" : ""} WHERE id = ?`).bind(name, name, descr, row.id).run();
  if (row.status === "approved" && changed) await logContest(env, c.id, { email: user.email, name: user.name || user.email }, [{ label: `Entry ${row.entry_no ? "#" + row.entry_no + " " : ""}text changed by the entrant${back ? " (sent back for review)" : ""}`, old: `${row.title || row.biz}: ${(row.descr || "").slice(0, 80)}`, new: `${name}: ${desc.slice(0, 80)}` }]);
  return json({ ok: true, ...(back ? { review: true } : {}) });
}
export async function onRequestDelete({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, row, user, res } = await mine(request, env, params.slug, new URL(request.url).searchParams.get("id") || "");
  if (res) return res;
  if (row.photo_token) return err(403, "The organizer added this home to the contest, so it can't be withdrawn here. You can edit it and hide the organizer's photos. Ask the organizer if it should come off the ballot.");
  const removed = (await env.DB.prepare("SELECT COUNT(*) AS n FROM votes WHERE post_id = ?").bind(row.id).first()).n;
  await Promise.all(JSON.parse(row.photos || "[]").map((k) => env.PHOTOS.delete(k)));
  await env.DB.batch([env.DB.prepare("UPDATE posts SET status='declined', photos='[]', review_note='withdrawn' WHERE id = ?").bind(row.id), env.DB.prepare("DELETE FROM votes WHERE post_id = ?").bind(row.id)]);
  if (removed) await logContest(env, c.id, { email: user.email, name: user.name || user.email }, [{ label: `Entry ${row.entry_no ? "#" + row.entry_no + " " : ""}withdrawn by the entrant`, old: `${removed} vote${removed === 1 ? "" : "s"} counted`, new: `${removed} vote${removed === 1 ? "" : "s"} removed with the entry` }]); // audit L7
  return json({ ok: true });
}
