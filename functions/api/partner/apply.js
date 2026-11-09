// POST /api/partner/apply  { event_id, site? } — uses one of the organization's Event Partner slots on an event the signed-in person runs: the Featured pin for its run window (see partner.js)
// and the "Event Partner" badge. Needs a plan or a comp. Never takes a price from the browser; nothing is charged here.
import { json, err, clean } from "../../_lib/util.js";
import { requireUser, sameOrigin } from "../../_lib/auth.js";
import { applyPartnerToEvent } from "../../_lib/partnerapply.js";
import { bump } from "../../_lib/funnel.js";

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Bad origin.");
  const { user, res } = await requireUser(request, env);
  if (res) return err(401, "Please sign in first.");
  const b = (await request.json().catch(() => null)) || {};
  const eventId = clean(b.event_id, 60);
  if (!eventId) return err(400, "Choose an event.");
  const r = await applyPartnerToEvent(env, user, eventId, clean(b.site, 200));
  if (r.error) return err(r.status, r.error);
  await bump(env, "fn:partner-applied");
  return json(r);
}
