// POST /api/auth/logout — ends this browser's session.
import { json, err } from "../../_lib/util.js";
import { COOKIE, readCookie, sha256, setCookie, sameOrigin } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const t = readCookie(request, COOKIE);
  if (t) await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(await sha256(t)).run();
  return json({ ok: true }, { headers: { "set-cookie": setCookie(request, COOKIE, "", 0) } });
}
