// POST   /api/me/events/<submission id> { action: "edit" | "notice" | "copy" | "removephoto" | "coverphoto" } — the person who submitted an event manages it.
// PUT    /api/me/events/<submission id> (raw video bytes, Content-Type video/*) — the organizer's video clip (MP4, MOV or WebM, up to 40 MB). It waits for Admin's approval before visitors can watch it.
// POST   /api/me/events/<submission id> as multipart form data with "photos" — adds up to 4 photos of the event (see _lib/eventphotos.js).
// DELETE /api/me/events/<submission id> — removes the event from the map and the list (only the person who added it).
//   edit   : name, hours, price, free, blurb, url, venue, start, end, video (a YouTube or Vimeo link)
//   notice : "cancelled" | "postponed" | "" shows a tag on the event
//   copy   : "Run again next year": a new event with every date moved forward a year, marked Expected (the owner's photos are not copied)
//   removephoto / coverphoto { key } : remove one of the owner's photos, or make it the cover (the first one)
import { politeFetch } from "../../../_lib/botfetch.js";
import { json, err, clean, webUrl, newId, geocodeAddress } from "../../../_lib/util.js";
import { countyFor } from "../../../_lib/citycounty.js";
import { CITY } from "../../../../public/cities.js";
import { SEASONS } from "../../../../public/seasons.js";
import { needsReview } from "../../../_lib/moderation.js";
import { checkSubmitLimits, limitResponse } from "../../../_lib/submitlimit.js";
import { ipPruneStatements } from "../../../_lib/retention.js";
import { requireUser, sameOrigin, normEmail } from "../../../_lib/auth.js";
import { isDate, slug, upsertEvent, verifyEventPage } from "../../../_lib/events.js";
import { parseVideo } from "../../../../public/video.js";
import { refundDueStatements } from "../../../_lib/orders.js";
import { normName, line } from "../../../_lib/fields.js";
import { addEventPhotos, removeEventPhoto, coverEventPhoto, ownerKeys } from "../../../_lib/eventphotos.js";
import { checkThrottle, hashKey } from "../../../_lib/throttle.js";
import { setEventClip, setEventLink, clearEventVideo } from "../../../_lib/eventvideo.js";

const plusYear = (d) => { const x = new Date(d + "T12:00:00Z"); x.setUTCFullYear(x.getUTCFullYear() + 1); return x.toISOString().slice(0, 10); };

export async function onRequestPost({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const s = await env.DB.prepare("SELECT * FROM event_submissions WHERE id = ?").bind(params.id).first();
  if (!s || normEmail(s.contact_email) !== user.email) return err(404, "That event isn't yours.");
  const live = s.status === "published" && s.event_id;

  // Photos: a file upload (multipart) adds up to 4; removephoto and coverphoto are small JSON calls. Only the person who added the event, only while it is on the map.
  if (/multipart\/form-data/i.test(request.headers.get("content-type") || "")) {
    if (!live) return err(400, "Photos can be added once the event is on the map.");
    const slow = await checkThrottle(env, [{ kind: "event-photos", key: await hashKey(env, "u", user.id), max: 40, windowHours: 24, msg: "That is a lot of photo changes for one day. Please try again tomorrow." }]);
    if (slow) return err(429, slow);
    let form; try { form = await request.formData(); } catch { return err(400, "The photos couldn't be read. Please try again."); }
    const files = form.getAll("photos").filter((f) => f && typeof f === "object" && f.size > 0);
    const ev = await env.DB.prepare("SELECT id, owner_photos FROM events WHERE id = ?").bind(s.event_id).first();
    if (!ev) return err(400, "That event isn't on the map.");
    const r = await addEventPhotos(env, ev, files);
    if (r.error) return err(r.status || 400, r.error);
    return json({ ok: true, photos: r.photos });
  }
  const b = await request.json().catch(() => ({}));

  if (b.action === "removephoto" || b.action === "coverphoto") {
    if (!live) return err(400, "That event isn't on the map.");
    const ev = await env.DB.prepare("SELECT id, owner_photos FROM events WHERE id = ?").bind(s.event_id).first();
    if (!ev) return err(400, "That event isn't on the map.");
    const r = b.action === "removephoto" ? await removeEventPhoto(env, ev, String(b.key || "")) : await coverEventPhoto(env, ev, String(b.key || ""));
    if (r.error) return err(r.status || 400, r.error);
    return json({ ok: true, photos: r.photos });
  }

  if (b.action === "link") { // the shared video box: a YouTube or Vimeo link (public at once; an empty one removes the video)
    if (!live) return err(400, "That event isn't on the map.");
    const cur = await env.DB.prepare("SELECT id, video, video_file FROM events WHERE id = ?").bind(s.event_id).first();
    if (!cur) return err(400, "That event isn't on the map.");
    const r = await setEventLink(env, cur, b.url);
    if (r.error) return err(r.status, r.error);
    return json({ ok: true, video: r.video });
  }
  if (b.action === "removevideo" || b.action === "remove") {
    if (!live) return err(400, "That event isn't on the map.");
    const cur = await env.DB.prepare("SELECT id, video, video_file FROM events WHERE id = ?").bind(s.event_id).first();
    if (!cur) return err(400, "That event isn't on the map.");
    await clearEventVideo(env, cur);
    return json({ ok: true, video: { link: "", file: "", ok: false } });
  }

  if (b.action === "notice") {
    if (!live) return err(400, "That event isn't on the map.");
    const n = ["cancelled", "postponed", ""].includes(b.notice) ? b.notice : "";
    await env.DB.prepare("UPDATE events SET notice = ?, updated_at = datetime('now') WHERE id = ?").bind(n, s.event_id).run();
    return json({ ok: true });
  }
  if (b.action === "edit") {
    const name = normName(clean(b.name ?? s.name, 120)), blurb = line(b.blurb ?? s.blurb, 200), venue = normName(clean(b.venue ?? s.venue, 120));
    const start = clean(b.start ?? s.start_date, 10), end = clean(b.end ?? s.end_date, 10), hours = line(b.hours ?? s.hours, 120);
    const free = b.free === undefined ? s.free : b.free ? 1 : 0, price = line(b.price ?? s.price, 80) || (free ? "Free" : "Price not listed");
    // optional video: a YouTube or Vimeo link, stored in its clean form; an empty value removes it
    const vidIn = b.video === undefined ? undefined : clean(b.video, 300), vid = vidIn ? parseVideo(vidIn) : null;
    if (vidIn && !vid) return err(400, "That video link isn't a YouTube or Vimeo address. Paste the link from the video's Share button.");
    const urlRaw = clean(b.url ?? s.url, 300), url = urlRaw ? webUrl(urlRaw) : "";
    if (name.length < 4) return err(400, "Enter the event's name.");
    if (blurb.length < 20) return err(400, "Add a one- or two-sentence description (at least 20 characters).");
    if (venue.length < 3) return err(400, "Enter the venue or place name.");
    if (!isDate(start) || !isDate(end) || end < start) return err(400, "Check the start and end dates.");
    if (urlRaw && !url) return err(400, "That doesn't look like a valid web address.");
    // The same rules as a new event (functions/api/submit-event.js): the words that need a person's look are refused, a season needs one of its own types, the city must be listed,
    // the street address needs 6 characters, and a changed address is looked up again so the pin moves with it.
    const season = b.season === undefined ? s.season : SEASONS[b.season] ? b.season : "", type = b.type === undefined ? s.type : clean(b.type, 10);
    if (b.season !== undefined || b.type !== undefined) { if (!season || !SEASONS[season].types[type]) return err(400, "Choose a season and an event type."); }
    const city = b.city === undefined ? s.city : clean(b.city, 60), address = b.address === undefined ? String(s.address || "") : line(b.address, 160);
    if (needsReview(name, blurb, venue, hours, price, address, urlRaw)) return err(400, "That doesn't look like a community event listing."); // every text field, not only the name, blurb and venue (M3)
    if (b.city !== undefined && !CITY[city]) return err(400, "Choose a city from the list.");
    if (b.address !== undefined && address.length < 6) return err(400, "Enter the street address (or the two cross streets for a parade).");
    let { lat, lng, county } = s, located;
    if (CITY[city] && (city !== s.city || address.toLowerCase() !== String(s.address || "").toLowerCase())) {
      [lat, lng] = CITY[city]; const pt = await geocodeAddress(address, city, [lat, lng]); located = !!pt; if (pt) [lat, lng] = pt;
      county = await countyFor(env, city, lat, lng);
    }
    // A new web page, name or first day is checked the way a new event's page is: "Confirmed" only when the page mentions the event and its year, otherwise "Expected".
    const cur = live ? await env.DB.prepare("SELECT status FROM events WHERE id = ?").bind(s.event_id).first() : null;
    let status = cur ? cur.status : "expected", verified = s.verified, note = s.note;
    if (url !== (s.url || "") || name !== s.name || start !== s.start_date) {
      const ck = url ? await verifyEventPage(url, name, start, politeFetch(env)) : { ok: false }; status = "confirmed"; verified = ck.ok ? 1 : 0; // the organizer states the dates, so the event stays confirmed; `verified` only records that its page matched
      // M3: a NEW web page that could not be matched to the event no longer rides on "Confirmed": the event goes back to "Expected" and the note tells Admin why, until a person looks.
      if (url !== (s.url || "") && url && !ck.ok) { status = "expected"; note = `edited by the organizer: new web page did not match the event (${ck.note || "not checked"})`; }
    }
    await env.DB.prepare("UPDATE event_submissions SET name=?, blurb=?, venue=?, start_date=?, end_date=?, hours=?, free=?, price=?, url=?, season=?, type=?, city=?, address=?, lat=?, lng=?, county=?, verified=?, note=? WHERE id=?").bind(name, blurb, venue, start, end, hours, free, price, url, season, type, city, address, lat, lng, county, verified, note || "", s.id).run();
    if (live) await upsertEvent(env, { id: s.event_id, name, county, city, type, start_date: start, end_date: end, status, free, price, hours, lat, lng, blurb, url, season, venue, address });
    if (live && vidIn !== undefined) { // a link replaces a clip; clearing the field removes whichever video there is (a clip is only removed when the field was a link: the clip box has its own Remove)
      const cur = await env.DB.prepare("SELECT id, video, video_file FROM events WHERE id = ?").bind(s.event_id).first();
      if (cur && (vid || cur.video)) await setEventLink(env, cur, vid ? vid.watch : "");
    }
    return json({ ok: true, status, ...(located === undefined ? {} : { located }) });
  }
  if (b.action === "copy") {
    // H1: only an event that is on the map can be run again (an event in review or declined cannot be turned into a live one this way), and the copy goes through the same rules a new event does:
    // the review words, the per-account hourly and daily limits, and one copy for a given next-year date.
    if (!live) return err(400, "Only an event that is on the map can be run again next year.");
    if (needsReview(s.name, s.blurb, s.venue, s.hours, s.price, s.address, s.url)) return err(400, "That doesn't look like a community event listing.");
    const start = plusYear(s.start_date), end = plusYear(s.end_date), id = newId(), eventId = `u-${slug(s.name).slice(0, 24)}-${newId().slice(0, 6)}`;
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const there = await env.DB.prepare("SELECT 1 AS x FROM event_submissions WHERE lower(contact_email) = lower(?) AND lower(name) = lower(?) AND start_date = ? LIMIT 1").bind(s.contact_email, s.name, start).first();
    if (there) return err(409, "You already have this event for next year. Find it in your list and edit the dates there.");
    const lim = await checkSubmitLimits(env, { ip, user, kind: "event" });
    if (lim) return limitResponse(lim);
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO event_submissions (id,status,name,county,city,season,type,start_date,end_date,free,price,hours,lat,lng,blurb,url,venue,address,contact_email,verified,note,event_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, "published", s.name, s.county, s.city, s.season, s.type, start, end, s.free, s.price, s.hours, s.lat, s.lng, s.blurb, s.url, s.venue, s.address, s.contact_email, 0, "copied from last year by the organizer", eventId),
      env.DB.prepare("INSERT INTO submit_log (ip) VALUES (?)").bind(ip),
      ...ipPruneStatements(env),
    ]);
    await upsertEvent(env, { id: eventId, name: s.name, county: s.county, city: s.city, type: s.type, start_date: start, end_date: end, status: "expected", free: s.free, price: s.price, hours: s.hours, lat: s.lat, lng: s.lng, blurb: s.blurb, url: s.url, season: s.season, venue: s.venue, address: s.address });
    return json({ ok: true, id: eventId });
  }
  return err(400, "Unknown action.");
}

export async function onRequestDelete({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const s = await env.DB.prepare("SELECT * FROM event_submissions WHERE id = ?").bind(params.id).first();
  if (!s || normEmail(s.contact_email) !== user.email) return err(404, "That event isn't yours.");
  // A paid Featured placement goes with the event row (or was waiting on this submission): flag it refund due first.
  const stmts = [...refundDueStatements(env.DB, { events: ["sub:" + s.id, s.event_id] }, "The organizer deleted the event while a paid Featured placement was running or waiting. Refund it in Stripe, then mark it refunded here."), env.DB.prepare("DELETE FROM event_submissions WHERE id = ?").bind(s.id)];
  const own = s.event_id ? await env.DB.prepare("SELECT owner_photos FROM events WHERE id = ?").bind(s.event_id).first() : null;
  if (s.event_id) stmts.push(env.DB.prepare("DELETE FROM events WHERE id = ?").bind(s.event_id));
  await env.DB.batch(stmts);
  if (own) await Promise.all(ownerKeys(own.owner_photos).map((k) => env.PHOTOS.delete(k).catch(() => {}))); // the owner's photos go with the event
  return json({ ok: true });
}

// The organizer's video clip (raw bytes). Only the person who added the event, only while it is on the map. The clip waits for Admin's approval.
export async function onRequestPut({ params, request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const { user, res } = await requireUser(request, env);
  if (res) return res;
  const s = await env.DB.prepare("SELECT * FROM event_submissions WHERE id = ?").bind(params.id).first();
  if (!s || normEmail(s.contact_email) !== user.email) return err(404, "That event isn't yours.");
  if (!(s.status === "published" && s.event_id)) return err(400, "A video can be added once the event is on the map.");
  const slow = await checkThrottle(env, [{ kind: "event-video", key: await hashKey(env, "u", user.id), max: 12, windowHours: 24, msg: "That is a lot of video changes for one day. Try again tomorrow." }]);
  if (slow) return err(429, slow);
  if (Number(request.headers.get("content-length") || 0) > 45 * 1024 * 1024) return err(413, "That video is too large. Use one under 40 MB (about a minute from a phone).");
  const ev = await env.DB.prepare("SELECT id, video_file FROM events WHERE id = ?").bind(s.event_id).first();
  if (!ev) return err(400, "That event isn't on the map.");
  const r = await setEventClip(env, ev, await request.arrayBuffer());
  if (r.error) return err(r.status, r.error);
  return json({ ok: true, video: { link: "", file: r.video.file, ok: false, waiting: true } });
}
