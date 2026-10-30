// Your winner badges and where you show them.
// GET  /api/me/badges                        { badges: [{ id, a, k, s, c }], master, off }
// POST /api/me/badges { master, off }         master false hides every badge; off["<badge id>|list|popup|detail"] = true hides one place
import { json, err } from "../../_lib/util.js";
import { requireUser, sameOrigin } from "../../_lib/auth.js";
import { winnerBadges, parsePrefs, SURFACES } from "../../_lib/badges.js";

export async function onRequestGet({ request, env }) {
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  let prefs = { master: true, off: {} };
  try { prefs = parsePrefs((await env.DB.prepare("SELECT badges FROM users WHERE id = ?").bind(user.id).first() || {}).badges); } catch {}
  const mine = (await winnerBadges(env)).get(user.id) || [];
  return json({ badges: mine, master: prefs.master, off: prefs.off }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const b = await request.json().catch(() => null);
  if (!b) return err(400, "That couldn't be saved.");
  const off = {};
  if (b.off && typeof b.off === "object") for (const [k, v] of Object.entries(b.off)) if (v === true && SURFACES.includes(k.split("|").pop()) && k.length < 160) off[k] = true;
  await env.DB.prepare("UPDATE users SET badges = ? WHERE id = ?").bind(JSON.stringify({ master: b.master !== false, off }), user.id).run();
  return json({ ok: true });
}
