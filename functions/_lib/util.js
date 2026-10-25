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

export const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);

export const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

export function rowToPost(r, admin = false) {
  const p = {
    id: r.id, biz: r.biz, title: r.title, city: r.city, county: r.county,
    lat: r.lat, lng: r.lng, web: r.web || "", phone: r.phone || "", where: r.where_txt || "",
    desc: r.descr, photos: JSON.parse(r.photos || "[]"), created: r.created_at, season: r.season || "christmas",
  };
  if (admin) { p.status = r.status; p.contact_email = r.contact_email || ""; p.approved = r.approved_at; }
  return p;
}

export function rowToEvent(r) {
  return {
    id: r.id, n: r.name, c: r.county, city: r.city, t: r.type, s: r.start_date, e: r.end_date,
    st: r.status === "confirmed" ? "c" : "e", free: !!r.free, p: r.price || "", h: r.hours || "",
    lat: r.lat, lng: r.lng, b: r.blurb || "", u: r.url || "", sn: r.season || "christmas",
    v: r.venue || "", a: r.address || "",
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
