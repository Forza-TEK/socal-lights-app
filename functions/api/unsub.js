// GET  /api/unsub?t=<token>              -> { email (masked), optout }
// POST /api/unsub { t, optout: true|false } -> turns notification emails off (or back on) for that address
// POST /api/unsub?t=<token> with any other body (a mail app's one-click unsubscribe) -> turns them off
import { json, err } from "../_lib/util.js";
import { prefsByToken, setOptout, maskEmail } from "../_lib/emailprefs.js";

export async function onRequestGet({ request, env }) {
  const t = new URL(request.url).searchParams.get("t") || "";
  const p = await prefsByToken(env, t);
  if (!p) return err(404, "This unsubscribe link isn't valid. If you copied it, check that the whole link was pasted.");
  return json({ email: maskEmail(p.email), optout: !!p.optout });
}
export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => ({}));
  // Mail apps' one-click unsubscribe (RFC 8058) POSTs a form body to the address in the List-Unsubscribe header, with the token in the query string.
  const t = String(b.t || new URL(request.url).searchParams.get("t") || "");
  const p = await prefsByToken(env, t);
  if (!p) return err(404, "This unsubscribe link isn't valid.");
  await setOptout(env, t, b.optout !== false);
  return json({ ok: true, email: maskEmail(p.email), optout: b.optout !== false });
}
