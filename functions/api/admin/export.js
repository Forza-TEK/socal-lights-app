// GET /api/admin/export?type=houses|events|installers|contests|orders|users|submissions|claims|reports[&status=...] — a spreadsheet (CSV) of a list, for Admin's Download buttons.
// Every cell goes through csvCell (functions/_lib/csv.js): a leading = + - @ is defused so a spreadsheet never runs it as a formula.
import { err } from "../../_lib/util.js";
import { csvResponse as csv } from "../../_lib/csv.js";

const dollars = (c) => (c == null || c === "" ? "" : (Number(c) / 100).toFixed(2));

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url), type = u.searchParams.get("type") || "", status = u.searchParams.get("status") || "";
  const all = async (sql, ...b) => (await env.DB.prepare(sql).bind(...b).all()).results;
  const day = new Date().toISOString().slice(0, 10);
  if (type === "houses") {
    const st = ["pending", "approved", "declined"].includes(status) ? status : "";
    const rows = await all(`SELECT p.id, p.status, p.title, p.biz, p.poster_type, p.street, p.city, p.zip, p.county, p.season, p.phone, p.web, p.service_area, p.contact_email, p.created_at, p.approved_at, i.name AS installer FROM posts p LEFT JOIN installers i ON i.id = p.installer_id WHERE p.contest_id IS NULL ${st ? "AND p.status = ?" : ""} ORDER BY p.created_at DESC`, ...(st ? [st] : []));
    return csv(`socal-lights-houses${st ? "-" + st : ""}-${day}.csv`, ["id", "status", "title", "name", "posted by", "street", "city", "zip", "county", "season", "phone", "website", "areas served", "contact email", "added", "published", "installer"],
      rows.map((r) => [r.id, r.status, r.title, r.biz, r.poster_type, r.street, r.city, r.zip, r.county, r.season, r.phone, r.web, r.service_area, r.contact_email, r.created_at, r.approved_at, r.installer]));
  }
  if (type === "events") {
    const season = u.searchParams.get("season") || "";
    const rows = await all(`SELECT id, name, status, season, type, city, county, venue, address, start_date, end_date, free, price, hours, url, featured FROM events ${season ? "WHERE season = ?" : ""} ORDER BY start_date, name`, ...(season ? [season] : []));
    return csv(`socal-lights-events${season ? "-" + season : ""}-${day}.csv`, ["id", "name", "status", "season", "type", "city", "county", "venue", "address", "starts", "ends", "free", "price", "hours", "website", "featured"],
      rows.map((r) => [r.id, r.name, r.status, r.season, r.type, r.city, r.county, r.venue, r.address, r.start_date, r.end_date, r.free ? "yes" : "", r.price, r.hours, r.url, r.featured ? "yes" : ""]));
  }
  if (type === "installers") {
    const rows = await all("SELECT i.name, i.slug, i.status, i.web, i.phone, i.area, i.email, i.owner_email, i.created_at, (SELECT COUNT(*) FROM posts p WHERE p.installer_id = i.id AND p.status = 'approved') AS homes FROM installers i ORDER BY lower(i.name)");
    return csv(`socal-lights-installers-${day}.csv`, ["name", "page", "status", "website", "phone", "areas served", "confirmation email", "owner email", "homes", "added"], rows.map((r) => [r.name, "https://socallights.app/installer/" + r.slug, r.status, r.web, r.phone, r.area, r.email, r.owner_email, r.homes, r.created_at]));
  }
  if (type === "contests") {
    const rows = await all("SELECT c.name, c.slug, c.status, c.org, c.city, c.entries_close, c.vote_start, c.vote_end, c.announced, c.note, u.email AS owner_email, (SELECT COUNT(*) FROM posts p WHERE p.contest_id = c.id) AS entries, (SELECT COUNT(*) FROM votes v WHERE v.contest_id = c.id) AS votes FROM contests c LEFT JOIN users u ON u.id = c.owner_id ORDER BY c.created_at DESC");
    return csv(`socal-lights-contests-${day}.csv`, ["name", "page", "status", "run by", "city", "organizer", "entries close", "voting starts", "voting ends", "winners announced", "entries", "votes", "review note"], rows.map((r) => [r.name, "https://socallights.app/c/" + r.slug, r.status, r.org, r.city, r.owner_email, r.entries_close, r.vote_start, r.vote_end, r.announced ? "yes" : "", r.entries, r.votes, r.note]));
  }
  if (type === "orders") { // every Featured, banner, home and contest-pass order, with its refund state, the buyer's email and the Stripe ids (for bookkeeping and tax)
    const rows = await all(`SELECT o.session_id, o.created_at, o.target, o.plan, o.amount, o.currency, o.status, o.refunded_at, o.note, o.email, o.payment_intent, o.charge_id, o.applied, o.renewal,
        o.event_id, COALESCE(e.name, s.name, hp.title, ins.name) AS name, u.email AS account_email
      FROM feature_orders o LEFT JOIN events e ON o.target = 'event' AND e.id = o.event_id LEFT JOIN event_submissions s ON o.event_id = 'sub:' || s.id
      LEFT JOIN posts hp ON o.target = 'home' AND hp.id = o.event_id LEFT JOIN installers ins ON o.target = 'installer' AND ins.id = o.event_id LEFT JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC`);
    const refund = { refunded: "refunded", refund_due: "refund due", disputed: "disputed", dispute_won: "dispute won" };
    return csv(`socal-lights-orders-${day}.csv`, ["ordered", "order id", "for", "what", "plan", "amount dollars", "currency", "status", "refund status", "refunded", "buyer email", "account email", "stripe payment", "stripe charge", "placement applied", "renewal", "note"],
      rows.map((r) => [r.created_at, r.session_id, r.name || r.event_id, r.target, r.plan, dollars(r.amount), (r.currency || "usd").toLowerCase(), r.status || "paid", refund[r.status] || "", r.refunded_at, r.email, r.account_email, r.payment_intent, r.charge_id, r.applied ? "yes" : "", r.renewal ? "yes" : "", r.note]));
  }
  if (type === "users") {
    const rows = await all(`SELECT u.email, u.name, u.city, u.created_at, u.last_login, u.status, u.admin_note, (u.google_sub IS NOT NULL) AS google,
        (SELECT COUNT(*) FROM feature_orders o WHERE o.user_id = u.id OR lower(o.email) = lower(u.email)) AS buys,
        (SELECT COALESCE(SUM(o.amount), 0) FROM feature_orders o WHERE o.status IN ('paid','held','dispute_won') AND (o.user_id = u.id OR lower(o.email) = lower(u.email))) AS spent
      FROM users u ORDER BY u.created_at DESC`);
    return csv(`socal-lights-users-${day}.csv`, ["email", "name", "city", "joined", "last sign in", "status", "google", "purchases", "paid dollars", "admin note"], rows.map((r) => [r.email, r.name, r.city, r.created_at, r.last_login, r.status, r.google ? "yes" : "", r.buys, dollars(r.spent), r.admin_note]));
  }
  if (type === "submissions") { // people's own "Add your event" submissions
    const st = ["pending", "published", "declined"].includes(status) ? status : "";
    const rows = await all(`SELECT id, status, name, city, county, season, type, start_date, end_date, free, price, venue, address, url, contact_email, verified, note, event_id, created_at FROM event_submissions ${st ? "WHERE status = ?" : ""} ORDER BY created_at DESC`, ...(st ? [st] : []));
    return csv(`socal-lights-submitted-events${st ? "-" + st : ""}-${day}.csv`, ["id", "status", "name", "city", "county", "season", "type", "starts", "ends", "free", "price", "venue", "address", "website", "contact email", "page checked", "note", "event id on the map", "submitted"],
      rows.map((r) => [r.id, r.status, r.name, r.city, r.county, r.season, r.type, r.start_date, r.end_date, r.free ? "yes" : "", r.price, r.venue, r.address, r.url, r.contact_email, r.verified ? "yes" : "", r.note, r.event_id, r.created_at]));
  }
  if (type === "claims") {
    const rows = await all("SELECT c.id, c.status, c.method, c.email, c.event_id, c.note, c.created_at, c.decided_at, e.name AS event, u.email AS account_email FROM event_claims c LEFT JOIN events e ON e.id = c.event_id LEFT JOIN users u ON u.id = c.user_id ORDER BY c.created_at DESC");
    return csv(`socal-lights-event-claims-${day}.csv`, ["id", "status", "how decided", "event", "event id", "claimed by (email)", "account email", "note", "claimed", "decided"], rows.map((r) => [r.id, r.status, r.method, r.event, r.event_id, r.email, r.account_email, r.note, r.created_at, r.decided_at]));
  }
  if (type === "reports") { // messages from the Report buttons; the contact is whatever the visitor typed
    const rows = await all("SELECT id, ref, name, message, contact, created_at FROM reports ORDER BY created_at DESC");
    return csv(`socal-lights-reports-${day}.csv`, ["id", "about (id on the site)", "name", "message", "contact", "received"], rows.map((r) => [r.id, r.ref, r.name, r.message, r.contact, r.created_at]));
  }
  return err(400, "Choose what to export: houses, events, installers, contests, orders, users, submissions, claims or reports.");
}
