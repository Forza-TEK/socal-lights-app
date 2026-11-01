// POST /api/contests/<slug>/hit { src } — counts one visit to the contest page (QR code, link, ...). No personal data is stored.
import { json, err, clean } from "../../../_lib/util.js";
import { getContest, todayPT } from "../../../_lib/contests.js";

export async function onRequestPost({ params, request, env }) {
  const c = await getContest(env, params.slug);
  if (!c) return err(404, "Not found.");
  const b = await request.json().catch(() => ({}));
  const src = ["qr", "share", "map"].includes(b.src) ? b.src : "";
  await env.DB.prepare("INSERT INTO contest_hits (contest_id, day, src, n) VALUES (?, ?, ?, 1) ON CONFLICT(contest_id, day, src) DO UPDATE SET n = n + 1").bind(c.id, todayPT(), src).run();
  return json({ ok: true });
}
