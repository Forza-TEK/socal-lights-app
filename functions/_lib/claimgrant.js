// An approved event claim makes the person the event's manager: the event appears in Your profile > Events with Edit (details, ticket link, photos, video, notice), exactly like an event
// they added themselves. That is done with the same row an organizer's own submission has (event_submissions, status published, event_id pointing at the live event), so every existing
// owner tool works unchanged. Called when a claim is approved (automatically, by matching website, or by Admin). Safe to call again: one row per person and event.
import { newId } from "./util.js";

export async function grantEventOwnership(env, eventId, email) {
  const mail = String(email || "").trim().toLowerCase();
  if (!eventId || !mail) return false;
  const have = await env.DB.prepare("SELECT id FROM event_submissions WHERE event_id = ? AND lower(contact_email) = ?").bind(eventId, mail).first();
  if (have) return true;
  const e = await env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(eventId).first();
  if (!e) return false;
  await env.DB.prepare(`INSERT INTO event_submissions (id,status,name,county,city,season,type,start_date,end_date,free,price,hours,lat,lng,blurb,url,venue,address,contact_email,verified,note,event_id)
    VALUES (?,'published',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,'claimed by the organizer (claim approved)',?)`)
    .bind(newId(), e.name, e.county, e.city, e.season || "christmas", e.type, e.start_date, e.end_date, e.free ? 1 : 0, e.price || "", e.hours || "", e.lat, e.lng, e.blurb || "", e.url || "", e.venue || "", e.address || "", mail, e.id).run();
  return true;
}
