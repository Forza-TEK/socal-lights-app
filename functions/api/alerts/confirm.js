// GET /api/alerts/confirm?t=<token> — turns the weekly email on.
import { page } from "./_page.js";

export async function onRequestGet({ request, env }) {
  const t = new URL(request.url).searchParams.get("t") || "", origin = new URL(request.url).origin;
  const row = t ? await env.DB.prepare("SELECT id, city, radius FROM alert_subs WHERE token = ?").bind(t).first() : null;
  if (!row) return page("That link has expired", "We could not find that sign-up. You can sign up again from the SoCal Lights menu.", origin);
  await env.DB.prepare("UPDATE alert_subs SET confirmed = 1, confirmed_at = datetime('now') WHERE id = ?").bind(row.id).run();
  return page("You are signed up", `Each week we will email lights and events within ${row.radius} miles of ${row.city}, when there are any. Every email has a link to stop them.`, origin);
}
