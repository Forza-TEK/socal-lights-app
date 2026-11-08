// POST /api/chat/act { action, fields: {...}, page?, summary? } — the visitor tapped an action card in the AI assistant (docs/ai-assistant-actions-design.md).
// The model never calls this: the widget does, after the visitor filled in and confirmed the card. Checks, in order: assistant switched on, same origin,
// the signed chat cookie (this browser passed the "I am human" check), the tier switch, the allowlist and the field rules, an hourly limit, then the same
// logic the site's own forms use. Counters only (chat_actions): no text, address or visitor id is stored.
import { json, err } from "../../_lib/util.js";
import { sameOriginStrict } from "../../_lib/auth.js";
import { validSession } from "../../_lib/chatsession.js";
import { checkThrottle, hashKey } from "../../_lib/throttle.js";
import { readSettings, isLive } from "../../_lib/chatsettings.js";
import { ACTIONS, validate, runAction, bumpAction } from "../../_lib/chatactions.js";

const NO_STORE = { "cache-control": "no-store" };
export async function onRequestPost({ request, env }) {
  const settings = await readSettings(env);
  if (!isLive(settings, env)) return json({ error: "The AI assistant is not available right now.", off: true }, { status: 404, headers: NO_STORE });
  if (!sameOriginStrict(request)) return err(403, "Not allowed.");
  const raw = await request.text().catch(() => "");
  if (raw.length > 6000) return err(413, "That is too long.");
  let b; try { b = JSON.parse(raw); } catch { return err(400, "That could not be read."); }
  if (!(await validSession(env, request))) return json({ error: "Please ask the assistant a question first, then try again.", needCheck: true }, { status: 403, headers: NO_STORE });
  const id = b && typeof b.action === "string" ? b.action : "", a = ACTIONS[id];
  if (!a) return err(400, "That action is not available.");
  if (!settings.tiers[a.tier]) return err(404, "That is not available right now.");
  const v = validate(id, b.fields);
  if (!v.ok) return err(400, v.error);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const slow = await checkThrottle(env, [{ kind: "chat-act", key: await hashKey(env, "chat", ip), max: 10, windowHours: 1, msg: "That is a lot of requests from this connection. Please try again in a little while, or email info@socallights.app." }]);
  if (slow) return json({ error: slow, limited: true }, { status: 429, headers: NO_STORE });
  let r;
  try { r = await runAction(env, request, id, v.values, { page: String(b.page || "").slice(0, 200), summary: String(b.summary || "").slice(0, 800) }); } catch { r = { ok: false, error: "Something went wrong. Please try again, or email info@socallights.app." }; }
  await bumpAction(env, id, r.ok ? "done" : "failed");
  if (!r.ok) return json({ error: r.error }, { status: r.status || 400, headers: NO_STORE });
  return json({ ok: true, done: a.done }, { headers: NO_STORE });
}
