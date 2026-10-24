// POST /api/admin/events — create or update one event.
import { json, err, clean, safeUrl, COUNTIES } from "../../../_lib/util.js";

const TYPES = ["walk", "drive", "parade", "park", "tree", "tour"];
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export async function onRequestPost({ request, env }) {
  const b = await request.json().catch(() => null);
  if (!b) return err(400, "Send the event as JSON.");
  const e = {
    id: clean(b.id, 40).toLowerCase().replace(/[^a-z0-9-]/g, "-") || crypto.randomUUID().slice(0, 8),
    name: clean(b.name, 120), county: clean(b.county, 40), city: clean(b.city, 60), type: clean(b.type, 10),
    start: clean(b.start, 10), end: clean(b.end, 10), status: b.status === "confirmed" ? "confirmed" : "expected",
    free: b.free ? 1 : 0, price: clean(b.price, 80), hours: clean(b.hours, 200),
    lat: Number(b.lat), lng: Number(b.lng), blurb: clean(b.blurb, 600), url: safeUrl(b.url),
  };
  if (!e.name || !e.city) return err(400, "Name and city are required.");
  if (!COUNTIES.includes(e.county)) return err(400, "Choose one of the seven counties.");
  if (!TYPES.includes(e.type)) return err(400, "Choose an event type.");
  if (!isDate(e.start) || !isDate(e.end) || e.end < e.start) return err(400, "Check the start and end dates.");
  if (!(e.lat > 32 && e.lat < 35.8 && e.lng > -121.5 && e.lng < -114)) return err(400, "The location is outside Southern California.");

  await env.DB.prepare(
    `INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, county=excluded.county, city=excluded.city, type=excluded.type,
       start_date=excluded.start_date, end_date=excluded.end_date, status=excluded.status, free=excluded.free,
       price=excluded.price, hours=excluded.hours, lat=excluded.lat, lng=excluded.lng, blurb=excluded.blurb,
       url=excluded.url, updated_at=datetime('now')`
  ).bind(e.id, e.name, e.county, e.city, e.type, e.start, e.end, e.status, e.free, e.price, e.hours, e.lat, e.lng, e.blurb, e.url).run();
  return json({ ok: true, id: e.id });
}
