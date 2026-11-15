// Web Bot Auth for SoCalLightsBot (Cloudflare's way to verify a bot: https://developers.cloudflare.com/bots/reference/bot-verification/web-bot-auth/, built on RFC 9421 HTTP Message Signatures).
// Our requests to other sites carry three headers (Signature-Agent, Signature-Input, Signature) signed with an Ed25519 key; the matching PUBLIC key is published at
// /.well-known/http-message-signatures-directory (functions/.well-known/http-message-signatures-directory.js). The private key lives only in the secret BOT_SIGNING_KEY
// (a private JWK as JSON; `node scripts/bot-keys.mjs` makes one); the public half is derived from it, so no key is ever kept in the repo. Without the secret nothing is signed.
// Signing proves WHO is asking; it does not hide anything and it is used with the same honest user-agent and robots.txt courtesy as before.
export const AGENT_URL = "https://socallights.app/.well-known/http-message-signatures-directory";

const enc = new TextEncoder();
const b64 = (u8) => { let s = ""; for (const b of u8) s += String.fromCharCode(b); return btoa(s); };
const b64url = (u8) => b64(u8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

/** Reads the private JWK secret. Returns { priv, pub: {kty,crv,x}, keyid } or null when there is no usable key. */
export async function loadBotKey(secret) {
  if (!secret) return null;
  let jwk; try { jwk = typeof secret === "string" ? JSON.parse(secret) : secret; } catch { return null; }
  if (!jwk || jwk.kty !== "OKP" || jwk.crv !== "Ed25519" || !jwk.d || !jwk.x) return null;
  const pub = { kty: "OKP", crv: "Ed25519", x: jwk.x };
  let priv;
  for (const alg of [{ name: "Ed25519" }, { name: "NODE-ED25519", namedCurve: "NODE-ED25519" }]) { try { priv = await crypto.subtle.importKey("jwk", { kty: "OKP", crv: "Ed25519", x: jwk.x, d: jwk.d }, alg, false, ["sign"]); break; } catch {} }
  if (!priv) return null;
  // JWK thumbprint (RFC 7638 / 8037): SHA-256 of the members in alphabetical order with no spaces
  const keyid = b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(`{"crv":"Ed25519","kty":"OKP","x":"${jwk.x}"}`))));
  return { priv, pub, keyid, algo: priv.algorithm };
}

const sign = async (key, base) => b64(new Uint8Array(await crypto.subtle.sign(key.algo.name === "NODE-ED25519" ? "NODE-ED25519" : "Ed25519", key.priv, enc.encode(base))));
const nonce = () => b64url(crypto.getRandomValues(new Uint8Array(24)));
const authority = (u) => { const x = new URL(u); return x.host.toLowerCase(); };

/** Headers for one request to `url`: the signature covers the target's @authority and our Signature-Agent. Valid for `ttl` seconds. */
export async function signedHeaders(url, key, { now = Date.now(), ttl = 60, agent = AGENT_URL, nonceValue = nonce() } = {}) {
  const created = Math.floor(now / 1000), expires = created + ttl, sigAgent = `"${agent}"`;
  const params = `("@authority" "signature-agent");created=${created};keyid="${key.keyid}";alg="ed25519";expires=${expires};nonce="${nonceValue}";tag="web-bot-auth"`;
  const base = `"@authority": ${authority(url)}\n"signature-agent": ${sigAgent}\n"@signature-params": ${params}`;
  return { "signature-agent": sigAgent, "signature-input": `sig1=${params}`, signature: `sig1=:${await sign(key, base)}:` };
}

/** The key directory: a JWKS with our public key, itself signed (tag http-message-signatures-directory) over the request's @authority. */
export async function directoryResponse(request, key, { now = Date.now(), ttl = 86400 } = {}) {
  const created = Math.floor(now / 1000), expires = created + ttl, n = nonce(), host = new URL(request.url).host.toLowerCase();
  const params = `("@authority";req);alg="ed25519";keyid="${key.keyid}";nonce="${n}";tag="http-message-signatures-directory";created=${created};expires=${expires}`;
  const base = `"@authority";req: ${host}\n"@signature-params": ${params}`;
  return new Response(JSON.stringify({ keys: [key.pub] }), { status: 200, headers: {
    "content-type": "application/http-message-signatures-directory+json", "cache-control": "public, max-age=3600",
    "signature-input": `sig1=${params}`, signature: `sig1=:${await sign(key, base)}:`,
  } });
}

/** Checks a signature the way a site would (for tests and `scripts/bot-keys.mjs --check`). Returns true or false. */
export async function verifyBase(pub, base, sigB64) {
  const alg = { name: "Ed25519" };
  const k = await crypto.subtle.importKey("jwk", { kty: "OKP", crv: "Ed25519", x: pub.x }, alg, false, ["verify"]);
  return crypto.subtle.verify("Ed25519", k, fromB64url(sigB64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")), enc.encode(base));
}

/** A fetch that is polite and, when the secret is set, signed: reads robots.txt first (a Disallow answers with a marker response, no request is made) and adds the Web Bot Auth headers. */
export function botFetch(env, { fetchFn = fetch, robots } = {}) {
  let keyP = null;
  return async (url, init = {}) => {
    if (robots && !(await robots(url, fetchFn))) return new Response("", { status: 403, headers: { "x-robots-blocked": "1" } });
    keyP ||= loadBotKey(env && env.BOT_SIGNING_KEY);
    const key = await keyP, headers = { ...(init.headers || {}) };
    if (key) Object.assign(headers, await signedHeaders(url, key));
    return fetchFn(url, { ...init, headers });
  };
}
