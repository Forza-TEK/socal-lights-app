// GET  /api/contests/<slug>/votes                       organizer only: every vote with who cast it, plus fraud flags.
// POST /api/contests/<slug>/votes { vote_id, voided }   void (or restore) one vote. A voided vote stops counting right away. Locked once winners are announced.
import { json, err } from "../../../_lib/util.js";
import { getUser, sameOrigin } from "../../../_lib/auth.js";
import { ownerOf, cats } from "../../../_lib/contests.js";

const ms = (s) => Date.parse(String(s).replace(" ", "T") + "Z");

export async function onRequestGet({ params, request, env }) {
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const { results } = await env.DB.prepare(
    `SELECT v.id, v.category, v.voided, v.created_at, u.id AS uid, u.email, p.title, p.biz, p.entry_no
     FROM votes v JOIN users u ON u.id = v.user_id JOIN posts p ON p.id = v.post_id WHERE v.contest_id = ? ORDER BY v.created_at DESC LIMIT 1000`).bind(c.id).all();
  // Flag: a voter who filled every category within a minute (typical of scripted or careless voting). It is a prompt to look, not proof.
  const by = {};
  for (const v of results) (by[v.uid] ||= []).push(ms(v.created_at));
  const n = cats(c).length, burst = new Set(Object.entries(by).filter(([, t]) => n >= 3 && t.length >= n && Math.max(...t) - Math.min(...t) <= 60_000).map(([u]) => u));
  return json({ locked: !!c.announced, votes: results.map((v) => ({ id: v.id, email: v.email, category: v.category, entry: v.title || v.biz, no: v.entry_no, at: v.created_at, voided: !!v.voided, flags: burst.has(v.uid) ? ["Voted in every category within a minute"] : [] })) }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  if (c.announced) return err(400, "The winners are announced and the results are locked.");
  const b = await request.json().catch(() => ({}));
  const r = await env.DB.prepare("UPDATE votes SET voided = ? WHERE id = ? AND contest_id = ?").bind(b.voided ? 1 : 0, String(b.vote_id || ""), c.id).run();
  if (!r.meta.changes) return err(404, "That vote doesn't exist.");
  return json({ ok: true });
}
