// GET /api/partner/entitlement[?site=<organization website>] — where the signed-in person's organization stands on the Event Partner plan this season: events used x of 10, the covered events,
// the price (none when covered by a plan or a Founding partner comp: never a price under a comp). Read-only, never cached.
import { json, err } from "../../_lib/util.js";
import { requireUser } from "../../_lib/auth.js";
import { partnerView } from "../../_lib/partnerapply.js";

export async function onRequestGet({ request, env }) {
  const { user, res } = await requireUser(request, env);
  if (res) return err(401, "Please sign in first.");
  const u = new URL(request.url), v = await partnerView(env, user, u.searchParams.get("site") || "");
  delete v.user_key; // the key may contain the person's email; the page only needs the label
  return json(v, { headers: { "cache-control": "no-store" } });
}
