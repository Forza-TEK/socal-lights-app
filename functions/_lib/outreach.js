// Read-only access for the outreach agent (Grok): "has this address already joined?" and "did anyone stop us?", plus daily counts of
// new accounts and listings. Everything here is read-only and PII-light: no names, ids, phone numbers or message text ever leave the site,
// and there is no way to list addresses, only to ask about addresses the caller already has.
// Auth: the secret OUTREACH_TOKEN (Pages secret, 32+ characters) sent as "Authorization: Bearer <token>". Without the secret the endpoints are off.
import { err } from "./util.js";

const enc = new TextEncoder();
async function digest(s) { return new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(String(s)))); }
// Compares the hashes, so the time taken does not depend on how many leading characters were right
async function sameSecret(a, b) { const [x, y] = await Promise.all([digest(a), digest(b)]); let d = 0; for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i]; return d === 0; }

// null when the request carries the right token, otherwise the Response to send back
export async function outreachDenied(request, env) {
  const secret = String((env && env.OUTREACH_TOKEN) || "");
  if (secret.length < 32) return err(503, "Outreach read access is not set up.");
  const m = /^Bearer\s+(\S{1,200})$/i.exec(request.headers.get("authorization") || "");
  if (!m || !(await sameSecret(m[1], secret))) return err(401, "Invalid or missing token.");
  return null;
}
