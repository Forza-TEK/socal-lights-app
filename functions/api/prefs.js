// Monthly update preferences by the link in the email (no login): /prefs?t=<token> (page: public/prefs.html).
// GET  /api/prefs?t=<token>                          -> { email (masked), active, role, topics, config }   404 for a bad token
// POST /api/prefs { t, action: "save", role, topics } -> changes role and topics
// POST /api/prefs { t, action: "unsubscribe" }        -> unsubscribes
// POST /api/prefs?t=<token> with any other body       -> unsubscribes (a mail app's one-click List-Unsubscribe-Post, RFC 8058)
import { json, err } from "../_lib/util.js";
import { maskEmail } from "../_lib/emailprefs.js";
import { config, optinByToken, savePrefs, unsubscribe } from "../_lib/newsletter.js";

const BAD = "This link isn't valid. If you copied it, check that the whole link was pasted.";
const view = (o) => ({ email: maskEmail(o.email), active: o.active, role: o.role, topics: o.topics, config: config() });

export async function onRequestGet({ request, env }) {
  const o = await optinByToken(env, new URL(request.url).searchParams.get("t") || "");
  if (!o) return err(404, BAD);
  return json(view(o), { headers: { "cache-control": "no-store" } });
}

export async function onRequestPost({ request, env }) {
  const b = (await request.json().catch(() => null)) || {};
  const t = String(b.t || new URL(request.url).searchParams.get("t") || "");
  if (b.action === "save") {
    const r = await savePrefs(env, t, b.role, b.topics);
    return r.ok ? json({ ok: true, ...view(await optinByToken(env, t)) }) : err(r.status, r.error);
  }
  if (!(await unsubscribe(env, { token: t }))) return err(404, BAD);
  return json({ ok: true, ...view(await optinByToken(env, t)) });
}
