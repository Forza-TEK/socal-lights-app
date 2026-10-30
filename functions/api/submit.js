// POST /api/submit — public "Showcase a House" form (multipart/form-data).
// Saves the post as 'pending' and its photos under pending/<id>/ in R2.
import { json, err, clean, webUrl, newId, verifyTurnstile, nearestCounty, geocodeAddress } from "../_lib/util.js";
import { CITY } from "../../public/cities.js";
import { SEASONS } from "../../public/seasons.js";
import { getUser } from "../_lib/auth.js";
import { getContest, windows } from "../_lib/contests.js";

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

  // Entering a contest needs a signed-in account (that replaces the "I am human" check)
  const contestSlug = clean(form.get("contest"), 60);
  let contest = null, cu = null;
  if (contestSlug) {
    cu = await getUser(request, env);
    if (!cu) return err(401, "Please sign in to enter this contest.");
    contest = await getContest(env, contestSlug);
    if (!contest || contest.status !== "live") return err(404, "This contest isn't available.");
    if (!windows(contest).entriesOpen) return err(400, "Entries for this contest are closed.");
    if (form.get("rules") !== "1") return err(400, "Please accept the official rules to enter.");
  } else if (!(await verifyTurnstile(env, form.get("cf-turnstile-response"), ip)))
    return err(400, "Please complete the 'I am human' check and send again.");

  // Throttle: 5 submissions per hour per connection
  const { n } = await env.DB.prepare("SELECT COUNT(*) AS n FROM submit_log WHERE ip = ? AND created_at > datetime('now','-1 hour')").bind(ip).first();
  // Contest entries are tied to a signed-in account, so a shared network (an event night, a school Wi-Fi) gets a higher limit
  if (n >= (contest ? 60 : 5)) return err(429, "Too many submissions from this connection. Try again in an hour.");

  const biz = clean(form.get("biz"), 80);
  const title = clean(form.get("title"), 90) || (contest ? clean(form.get("biz"), 80) : "");
  const city = clean(form.get("city"), 60);
  const descr = clean(form.get("desc"), 1200) || (contest ? `Entry in ${contest.name}` : "");
  const email = contest ? cu.email : clean(form.get("email"), 120);
  const webRaw = clean(form.get("web"), 200);
  const kind = form.get("kind") === "installer" ? "installer" : "homeowner";
  const pro = kind === "installer";
  const web = pro ? webUrl(webRaw) : ""; // website, phone and service area belong to professional installers only
  const phone = pro ? clean(form.get("phone"), 80) : "";
  const area = pro ? clean(form.get("area"), 120) : "";
  const where = clean(form.get("where"), 120);
  const street = clean(form.get("street"), 120);
  const zip = clean(form.get("zip"), 10);
  // The one-line address is built from the parts (older cached forms still send a single "address" box)
  const address = street ? `${street}, ${city}, CA ${zip}` : clean(form.get("address"), 160);
  const season = contest ? contest.season : SEASONS[form.get("season")] ? form.get("season") : "christmas";

  if (!biz || !title || !descr) return err(400, "Fill in your name or business, display name and description.");
  if (!CITY[city]) return err(400, "Choose a city from the list.");
  if (street && !/^\d{5}$/.test(zip)) return err(400, "Enter the 5-digit ZIP code.");
  if (address.length < 5) return err(400, "Enter the street address of the house.");
  if (pro && !web && !phone) return err(400, "Installers: add a website or a phone number for quotes.");
  if (pro && !form.get("permission")) return err(400, "Confirm you have the homeowner's permission to show this address.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err(400, "Enter an email address so the site owner can reach you.");
  if (pro && webRaw && !web) return err(400, "Enter a valid website address, like example.com.");

  if (contest) {
    const { n: mine } = await env.DB.prepare("SELECT COUNT(*) AS n FROM posts WHERE contest_id = ? AND user_id = ? AND status != 'declined'").bind(contest.id, cu.id).first();
    if (mine >= 5) return err(400, "You've reached the limit of 5 entries in this contest.");
  }
  const autoApprove = !!contest && contest.approval === "auto";
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
      const key = `${autoApprove ? "p" : "pending"}/${id}/${i + 1}.${kind.ext}`;
      await env.PHOTOS.put(key, buf, { httpMetadata: { contentType: kind.type } });
      keys.push(key);
    }
  } catch (e) {
    await Promise.all(keys.map((k) => env.PHOTOS.delete(k)));
    return err(400, e.message || "A photo couldn't be saved.");
  }

  // The pin goes on the exact address; if it can't be found it falls back to the city center (the admin can fix it)
  let [lat, lng] = CITY[city];
  const pt = await geocodeAddress(address, city, [lat, lng]); if (pt) [lat, lng] = pt;
  const { results: evs } = await env.DB.prepare("SELECT lat, lng, county FROM events").all();
  const county = nearestCounty(lat, lng, evs);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO posts (id,status,biz,title,city,county,lat,lng,web,phone,where_txt,descr,photos,contact_email,season,address,show_address,poster_type,street,state,zip,service_area,contest_id,category,user_id,entry_no,approved_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'CA',?,?,?,?,?,${contest ? "(SELECT COALESCE(MAX(entry_no),0)+1 FROM posts WHERE contest_id = ?)" : "NULL"},${autoApprove ? "datetime('now')" : "NULL"})`
    ).bind(id, autoApprove ? "approved" : "pending", biz, title, city, county, lat, lng, web, phone, where, descr, JSON.stringify(keys), email, season, address, 1, kind, street, zip, area, contest ? contest.id : null, "", cu ? cu.id : null, ...(contest ? [contest.id] : [])),
    env.DB.prepare("INSERT INTO submit_log (ip) VALUES (?)").bind(ip),
    env.DB.prepare("DELETE FROM submit_log WHERE created_at < datetime('now','-1 day')"),
  ]);

  return json({ ok: true, id });
}
