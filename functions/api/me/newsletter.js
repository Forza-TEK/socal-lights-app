// The monthly update permission for the signed-in person (Profile > Account, and the optional box on the last step of the add forms).
// GET  /api/me/newsletter                                    -> { optin: null | { role, topics, active, opted_in_at, method, ... }, config }
// POST /api/me/newsletter { optin: true, role, topics, method, source_page } -> opts in (or changes role and topics)
// POST /api/me/newsletter { optin: false }                    -> unsubscribes
// Nothing is ever turned on by itself: the person has to send optin: true.
import { json, err } from "../../_lib/util.js";
import { requireUser, sameOrigin } from "../../_lib/auth.js";
import { config, optinFor, saveOptin, unsubscribe } from "../../_lib/newsletter.js";

export async function onRequestGet({ request, env }) {
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  return json({ optin: await optinFor(env, user.email), config: config() }, { headers: { "cache-control": "no-store" } });
}

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const b = await request.json().catch(() => null);
  if (!b) return err(400, "That couldn't be saved.");
  if (b.optin === false) { await unsubscribe(env, { email: user.email }); return json({ ok: true, optin: await optinFor(env, user.email) }); }
  if (b.optin !== true) return err(400, "That couldn't be saved.");
  const r = await saveOptin(env, { user, role: b.role, topics: b.topics, method: b.method, source_page: b.source_page });
  return r.ok ? json({ ok: true, optin: r.optin }) : err(400, r.error);
}
