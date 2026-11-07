// GET /api/contest-pass/entitlement[?site=<contest website>] — what the signed-in organizer's organization may run in its current 12-month window: contests used, the cap, the exact window
// dates, the passes it could buy (priced as the difference when it already holds one) and any comp (shown as "Founding partner: free through <date>", never with a price).
// With ?site= (even empty) the organization is worked out from that website like a new contest would be; without it, from the organizer's latest live contest, else the account itself.
// Read-only. Never cached.
import { json, err } from "../../_lib/util.js";
import { requireUser } from "../../_lib/auth.js";
import { keyForUser } from "../../_lib/passkey.js";
import { orgState, entitlementView } from "../../_lib/passes.js";

export async function onRequestGet({ request, env }) {
  const { user, res } = await requireUser(request, env);
  if (res) return err(401, "Please sign in first.");
  const u = new URL(request.url), key = await keyForUser(env, user, u.searchParams.has("site") ? u.searchParams.get("site") : null);
  return json(entitlementView(key, await orgState(env, key)), { headers: { "cache-control": "no-store" } });
}
