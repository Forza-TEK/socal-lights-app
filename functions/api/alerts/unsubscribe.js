// GET /api/alerts/unsubscribe?t=<token> — removes the person completely.
// The address also goes on the shared do-not-contact list (a one-way hash, source "app") so outreach never mails someone who unsubscribed from a SoCal Lights email.
import { page } from "./_page.js";
import { suppressFromApp } from "../../_lib/outreach.js";

async function remove(env, t) {
  if (!t) return;
  const row = await env.DB.prepare("SELECT email FROM alert_subs WHERE token = ?").bind(t).first();
  await env.DB.prepare("DELETE FROM alert_subs WHERE token = ?").bind(t).run();
  if (row && row.email) await suppressFromApp(env, row.email);
}

export async function onRequestGet({ request, env }) {
  const t = new URL(request.url).searchParams.get("t") || "", origin = new URL(request.url).origin;
  await remove(env, t);
  return page("You are unsubscribed", "We deleted your email address and will not send any more alerts.", origin);
}

// Mail apps' one-click unsubscribe (List-Unsubscribe-Post) POSTs here; same result as the link.
export async function onRequestPost({ request, env }) {
  await remove(env, new URL(request.url).searchParams.get("t") || "");
  return new Response("ok", { status: 200 });
}
