// POST /api/me/claims { event_id } — "this event is mine". A claim ONLY lets the person buy a Featured placement for that event; it
// gives no edit rights. Auto-approved when the person's own business email domain matches (or is a parent of) the event's own website
// and that website is not an aggregator; everything else waits for the admin (Event claims tab).
import { json, err, clean, newId } from "../../_lib/util.js";
import { requireUser, sameOrigin, isDisposable } from "../../_lib/auth.js";
import { trustOf } from "../../_lib/contests.js";
import { ptToday } from "../../_lib/time.js";

// Sites many unrelated events share: a matching email on these proves nothing about who runs the event.
const AGGREGATORS = [
  // social, listings and ticketing sites: many unrelated events share them ("eventbrite" also covers eventbrite.com, .co.uk, .ca ...)
  "eventbrite", "facebook", "instagram", "ticketmaster", "feverup", "fever", "meetup", "allevents", "yelp", "tripadvisor", "google", "youtube", "x.com", "twitter", "linkedin", "patch.com", "nextdoor", "runsignup", "raceroster", "momsla", "enjoyorangecounty",
  "stubhub", "axs", "seetickets", "universe", "dice", "ticketweb", "ticketleap", "bandsintown", "songkick", "seatgeek", "vividseats", "groupon", "livingsocial", "eventeny", "tiktok", "pinterest", "reddit", "linktr.ee", "linktree", "tix", "etix", "showclix", "brownpapertickets", "eventzilla", "ticketsauce", "evvnt", "visitcalifornia", "discoverlosangeles", "timeout", "laweekly", "ocregister", "patch", "kidsoutandabout", "macaronikid",
  // free website builders and shared hosts: anyone can put a page up there
  "wixsite.com", "wix.com", "squarespace.com", "weebly.com", "wordpress.com", "blogspot.com", "github.io", "godaddysites.com", "carrd.co", "business.site", "notion.site", "webflow.io", "netlify.app", "vercel.app", "pages.dev", "herokuapp.com", "web.app", "firebaseapp.com", "my.canva.site", "canva.com", "sites.google.com", "myshopify.com", "bigcartel.com", "strikingly.com", "jimdofree.com", "yolasite.com", "site123.me", "adobe.com",
];
export const isAggregator = (url) => {
  let h = ""; try { h = new URL(/^https?:/i.test(url) ? url : "https://" + url).hostname.toLowerCase(); } catch { return true; }
  return AGGREGATORS.some((a) => (a.includes(".") ? h === a || h.endsWith("." + a) : h.split(".").includes(a))); // "eventbrite" covers eventbrite.com, .co.uk, .ca ...
};

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Bad origin.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const h = { headers: { "cache-control": "no-store" } };
  const b = await request.json().catch(() => null);
  const eventId = clean(b && b.event_id, 60);
  const today = ptToday();
  const ev = eventId && await env.DB.prepare("SELECT id, url, end_date FROM events WHERE id = ?").bind(eventId).first();
  if (!ev || ev.end_date < today) return err(404, "We couldn't find that event, or it has already ended.");

  const have = await env.DB.prepare("SELECT status FROM event_claims WHERE event_id = ? AND user_id = ?").bind(ev.id, user.id).first();
  if (have && have.status !== "declined") return json({ ok: true, status: have.status }, h); // idempotent
  if (have) return err(403, "That claim was declined. Email info@socallights.app if that is a mistake.");

  const n = await env.DB.prepare("SELECT SUM(status = 'pending') AS p, SUM(created_at > datetime('now','-1 day')) AS d FROM event_claims WHERE user_id = ?").bind(user.id).first();
  if ((n.p || 0) >= 5) return err(429, "You already have 5 claims waiting for approval. We'll review them first.");
  if ((n.d || 0) >= 10) return err(429, "That's a lot of claims for one day. Please try again tomorrow.");

  const auto = !!ev.url && !isDisposable(user.email) && trustOf(user.email, ev.url) === "match" && !isAggregator(ev.url);
  const status = auto ? "approved" : "pending";
  await env.DB.prepare("INSERT OR IGNORE INTO event_claims (id,event_id,user_id,email,method,status,decided_at) VALUES (?,?,?,?,?,?,?)")
    .bind(newId(), ev.id, user.id, user.email, auto ? "domain" : null, status, auto ? new Date().toISOString().slice(0, 19).replace("T", " ") : null).run();
  return json({ ok: true, status }, h);
}
