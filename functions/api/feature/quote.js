// GET /api/feature/quote?start=YYYY-MM-DD&end=YYYY-MM-DD — what each event plan would cost and run for a NEW event with these dates, bought today (nothing held yet).
// The add-event page shows it before the event exists. Public, no account, no database: the same eventQuote() the checkout uses, so the page and the payment agree.
import { json, err } from "../../_lib/util.js";
import { EVENT_PLANS, eventQuote, ptToday } from "../../_lib/featured.js";

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));

export async function onRequestGet({ request }) {
  const u = new URL(request.url), start = u.searchParams.get("start") || "", end = u.searchParams.get("end") || start;
  if (!isDate(start) || !isDate(end) || end < start) return err(400, "Send the event's start and end dates (YYYY-MM-DD).");
  const today = ptToday(), quotes = {};
  for (const k of Object.keys(EVENT_PLANS)) { const q = eventQuote({ start_date: start, end_date: end }, k, today); quotes[k] = { cents: q.cents, from: q.from, to: q.to, season: q.season, capped: q.capped, days: q.days, added: q.added, components: q.components, problem: q.problem }; }
  return json({ today, quotes }, { headers: { "cache-control": "no-store" } });
}
