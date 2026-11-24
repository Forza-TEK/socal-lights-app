// GET /api/events/match?name=&city=&start=&end=&address= — listings already on the map that look like the event being added (the add-event form shows them so the organizer can update one
// instead of adding a second). Signed in only; returns public facts plus mine / managed (no names or emails of other organizers).
import { json, err, clean } from "../../_lib/util.js";
import { requireUser, sameOrigin } from "../../_lib/auth.js";
import { isDate } from "../../_lib/events.js";
import { ptToday } from "../../_lib/time.js";
import { findMatches } from "../../_lib/eventmatch.js";

export async function onRequestGet({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const sp = new URL(request.url).searchParams, start = clean(sp.get("start"), 10), end = clean(sp.get("end") || sp.get("start"), 10);
  if (!isDate(start) || !isDate(end)) return json({ matches: [] }, { headers: { "cache-control": "no-store" } });
  const matches = await findMatches(env, user, { name: clean(sp.get("name"), 120), city: clean(sp.get("city"), 60), start, end, address: clean(sp.get("address"), 160), today: ptToday() });
  return json({ matches }, { headers: { "cache-control": "no-store" } });
}
