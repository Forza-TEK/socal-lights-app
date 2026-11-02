// Shared helpers for the API functions.

export const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", ...(init.headers || {}) },
  });

export const err = (status, message) => json({ error: message }, { status });

export const COUNTIES = ["Los Angeles", "Orange", "Riverside", "San Bernardino", "San Diego", "Ventura", "Santa Barbara"];

export function safeUrl(u) {
  if (!u) return "";
  try {
    const x = new URL(String(u).trim());
    return /^https?:$/.test(x.protocol) ? x.href : "";
  } catch {
    return "";
  }
}

// A host name that follows the standard domain-name format (RFC 1035/1123): dot-separated labels of letters, digits and
// hyphens (1-63 characters, not starting or ending with a hyphen), at most 253 characters in all, and a real-looking
// top-level domain (letters only, or xn-- for international ones). Rejects IP addresses, "localhost" and bare words.
export function validHost(h) {
  h = String(h || "").toLowerCase().replace(/\.$/, "");
  if (!h || h.length > 253) return false;
  const labels = h.split(".");
  if (labels.length < 2) return false;
  if (!labels.every((l) => l.length >= 1 && l.length <= 63 && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(l))) return false;
  return /^([a-z]{2,63}|xn--[a-z0-9-]{1,59})$/.test(labels[labels.length - 1]);
}
// Like safeUrl, but the host must be a valid domain name. Adds https:// when the person typed just "example.com".
export function webUrl(u) {
  let s = String(u || "").trim();
  if (!s) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = "https://" + s;
  const ok = safeUrl(s);
  if (!ok) return "";
  try { return validHost(new URL(ok).hostname) ? ok : ""; } catch { return ""; }
}

export const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);

export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

export function rowToPost(r, admin = false) {
  const p = {
    id: r.id, biz: r.biz, title: r.title, city: r.city, county: r.county,
    lat: r.lat, lng: r.lng, web: r.web || "", phone: r.phone || "", where: r.where_txt || "",
    desc: r.descr, photos: JSON.parse(r.photos || "[]"), created: r.created_at, season: r.season || "christmas",
    address: r.address || "", // a home's street address is always public: the pin sits on it and visitors drive by (search finds it too)
    tonight: r.on_n || 0, tonightNear: r.on_near || 0, lon: r.lights_on || "", visit: r.visit || "", parking: r.parking || "", acc: !!r.accessible, radio: r.radio || "",
    inst: r.inst_slug ? { slug: r.inst_slug, name: r.inst_name, ok: !!r.installer_confirmed } : null, // the installer profile this home links to; ok = the installer confirmed it
    kind: r.poster_type === "installer" ? "installer" : "homeowner", street: r.street || "", state: r.state || "CA", zip: r.zip || "", area: r.service_area || "",
  };
  if (admin) { p.status = r.status; p.contact_email = r.contact_email || ""; p.approved = r.approved_at; p.show_address = !!r.show_address; }
  return p;
}

// Paid "Featured" placement. featured: 0 = off, 1 = gold pin + badge, 2 = also listed first. Ends after featured_until (YYYY-MM-DD, inclusive).
function featuredLevel(r) {
  if (!r.featured) return 0;
  if (r.featured_until && r.featured_until < new Date().toISOString().slice(0, 10)) return 0;
  return r.featured >= 2 ? 2 : 1;
}

// extra photos for an event: a JSON array of image URLs in events.images
function parseImgs(v) { try { const a = JSON.parse(v || "[]"); return Array.isArray(a) ? a.filter((x) => typeof x === "string").slice(0, 12) : []; } catch { return []; } }
export function rowToEvent(r) {
  return {
    id: r.id, n: r.name, c: r.county, city: r.city, t: r.type, s: r.start_date, e: r.end_date,
    st: r.status === "confirmed" ? "c" : "e", free: !!r.free, p: r.price || "", h: r.hours || "",
    lat: r.lat, lng: r.lng, b: r.blurb || "", u: r.url || "", sn: r.season || "christmas",
    v: r.venue || "", a: r.address || "", img: r.image || "", imgs: parseImgs(r.images),
    f: featuredLevel(r), nt: r.notice || "", lc: String(r.updated_at || "").slice(0, 10),
  };
}

/* ---------- Cloudflare Turnstile ---------- */
export async function verifyTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true; // not configured yet: allow (README explains turning it on)
  if (!token) return false;
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  const d = await r.json().catch(() => ({}));
  return !!d.success;
}

/* ---------- Cloudflare Access (admin) ----------
   Cloudflare Access sits in front of /admin and /api/admin and adds a signed JWT
   (Cf-Access-Jwt-Assertion). We verify its signature against the team's public keys
   so the admin API stays locked even if Access were misconfigured. */
let certCache = { at: 0, keys: null };

const b64url = (s) => {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};

async function accessKeys(team) {
  if (certCache.keys && Date.now() - certCache.at < 3600_000) return certCache.keys;
  const r = await fetch(`https://${team}/cdn-cgi/access/certs`);
  const { keys } = await r.json();
  certCache = { at: Date.now(), keys };
  return keys;
}

export async function requireAdmin(request, env) {
  // Local development only: `wrangler pages dev` with ADMIN_DEV_BYPASS=1 in .dev.vars
  if (env.ADMIN_DEV_BYPASS === "1" && new URL(request.url).hostname === "localhost") return { email: "dev@localhost" };
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return null;
  try {
    const [h, p, s] = token.split(".");
    const header = JSON.parse(new TextDecoder().decode(b64url(h)));
    const payload = JSON.parse(new TextDecoder().decode(b64url(p)));
    const jwk = (await accessKeys(env.ACCESS_TEAM_DOMAIN)).find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64url(s), new TextEncoder().encode(`${h}.${p}`));
    if (!ok) return null;
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!aud.includes(env.ACCESS_AUD)) return null;
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    if (payload.iss && payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return null;
    return { email: payload.email || "" };
  } catch {
    return null;
  }
}

export function nearestCounty(lat, lng, events) {
  let best = null, bd = Infinity;
  for (const e of events) {
    const d = (e.lat - lat) ** 2 + (e.lng - lng) ** 2;
    if (d < bd) { bd = d; best = e.county; }
  }
  return best;
}

/* ---------- Geocoding (street address -> pin) ---------- */
const kmBetween = (a, b) => {
  const R = 6371, rad = (d) => (d * Math.PI) / 180, dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
// Looks the address up (US Census first, OpenStreetMap as a fallback) and returns [lat, lng], or null when
// nothing is found. A match more than maxKm from the chosen city is rejected as a wrong hit.
export async function geocodeAddress(address, city, cityPoint, maxKm = 30, doFetch = fetch) {
  const q = `${address}, ${city}, CA`;
  const attempts = [
    async () => {
      const r = await doFetch(`https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(4000) });
      const c = (await r.json())?.result?.addressMatches?.[0]?.coordinates;
      return c ? [Number(c.y), Number(c.x)] : null;
    },
    async () => {
      const r = await doFetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`, { headers: { "user-agent": "SoCalLights.app (rey@forza-tek.com)" }, signal: AbortSignal.timeout(4000) });
      const h = (await r.json())?.[0];
      return h ? [Number(h.lat), Number(h.lon)] : null;
    },
  ];
  for (const go of attempts) {
    try {
      const pt = await go();
      if (pt && Number.isFinite(pt[0]) && Number.isFinite(pt[1]) && kmBetween(pt, cityPoint) <= maxKm) return pt;
    } catch { /* try the next geocoder */ }
  }
  return null;
}
