// GET /api/alerts/unsubscribe?t=<token> — removes the person completely.
import { page } from "./_page.js";

export async function onRequestGet({ request, env }) {
  const t = new URL(request.url).searchParams.get("t") || "", origin = new URL(request.url).origin;
  if (t) await env.DB.prepare("DELETE FROM alert_subs WHERE token = ?").bind(t).run();
  return page("You are unsubscribed", "We deleted your email address and will not send any more alerts.", origin);
}

// Mail apps' one-click unsubscribe (List-Unsubscribe-Post) POSTs here; same result as the link.
export async function onRequestPost({ request, env }) {
  const t = new URL(request.url).searchParams.get("t") || "";
  if (t) await env.DB.prepare("DELETE FROM alert_subs WHERE token = ?").bind(t).run();
  return new Response("ok", { status: 200 });
}
