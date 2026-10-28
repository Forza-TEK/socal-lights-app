// POST /api/submit — public "Showcase a House" form (multipart/form-data).
// Saves the post as 'pending' and its photos under pending/<id>/ in R2.
import { json, err, clean, safeUrl, newId, verifyTurnstile, nearestCounty } from "../_lib/util.js";
import { CITY } from "../../public/cities.js";
import { SEASONS } from "../../public/seasons.js";

const MAX_PHOTOS = 8;
const MAX_BYTES = 6 * 1024 * 1024; // the browser resizes photos first, so real uploads are far smaller

function sniff(bytes) {
  const b = new Uint8Array(bytes.slice(0, 12));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", type: "image/png" };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
    return { ext: "webp", type: "image/webp" };
  return null;
}

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  let form;
  try { form = await request.formData(); } catch { return err(400, "The form couldn't be read. Please try again."); }

  if (!(await verifyTurnstile(env, form.get("cf-turnstile-response"), ip)))
    return err(400, "Please complete the 'I am human' check and send again.");

  // Throttle: 5 submissions per hour per connection
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM submit_log WHERE ip = ? AND created_at > datetime('now','-1 hour')").bind(ip).first();
  if (n >= 5) return err(429, "Too many submissions from this connection. Try again in an hour.");

  const biz = clean(form.get("biz"), 80);
  const title = clean(form.get("title"), 90);
  const city = clean(form.get("city"), 60);
  const descr = clean(form.get("desc"), 1200);
  const email = clean(form.get("email"), 120);
  const webRaw = clean(form.get("web"), 200);
  const web = safeUrl(webRaw);
  const phone = clean(form.get("phone"), 80);
  const where = clean(form.get("where"), 120);
  const address = clean(form.get("address"), 160);
  const showAddress = form.get("show_address") ? 1 : 0;
  const season = SEASONS[form.get("season")] ? form.get("season") : "christmas";

  if (!biz || !title || !descr) return err(400, "Fill in your name or business, display name and description.");
  if (!CITY[city]) return err(400, "Choose a city from the list.");
  if (address.length < 5) return err(400, "Enter the street address of the house.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err(400, "Enter an email address so the site owner can reach you.");
  if (webRaw && !web) return err(400, "The website needs to start with http:// or https://");

  const files = form.getAll("photos").filter((f) => f && typeof f === "object" && f.size > 0);
  if (files.length > MAX_PHOTOS) return err(400, `Send up to ${MAX_PHOTOS} photos.`);

  const id = newId();
  const keys = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.size > MAX_BYTES) throw new Error("A photo is too large. Use photos under 6 MB.");
      const buf = await f.arrayBuffer();
      const kind = sniff(buf);
      if (!kind) throw new Error("Photos must be JPG, PNG or WebP.");
      const key = `pending/${id}/${i + 1}.${kind.ext}`;
      await env.PHOTOS.put(key, buf, { httpMetadata: { contentType: kind.type } });
      keys.push(key);
    }
  } catch (e) {
    await Promise.all(keys.map((k) => env.PHOTOS.delete(k)));
    return err(400, e.message || "A photo couldn't be saved.");
  }

  const [lat, lng] = CITY[city];
  const { results: evs } = await env.DB.prepare("SELECT lat, lng, county FROM events").all();
  const county = nearestCounty(lat, lng, evs);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO posts (id,status,biz,title,city,county,lat,lng,web,phone,where_txt,descr,photos,contact_email,season,address,show_address)
       VALUES (?,'pending',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(id, biz, title, city, county, lat, lng, web, phone, where, descr, JSON.stringify(keys), email, season, address, showAddress),
    env.DB.prepare("INSERT INTO submit_log (ip) VALUES (?)").bind(ip),
    env.DB.prepare("DELETE FROM submit_log WHERE created_at < datetime('now','-1 day')"),
  ]);

  return json({ ok: true, id });
}
