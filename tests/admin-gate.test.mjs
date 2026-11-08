// The admin API gate (requireAdmin in functions/_lib/util.js): a Cloudflare Access JWT signed with the team's key, checked for signature, audience, issuer and expiry.
// A real RSA key is generated here and the certs endpoint is stubbed, so no network is used.
import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign as nodeSign } from "node:crypto";
import { requireAdmin } from "../functions/_lib/util.js";
import { stubFetch, freezeNow } from "./_pay.mjs";

const TEAM = "forza.cloudflareaccess.com", AUD = "aud-123", KID = "kid-1";
const mk = () => generateKeyPairSync("rsa", { modulusLength: 2048 });
const good = mk(), other = mk();
const b64 = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
const jwkOf = (pub, kid) => ({ ...pub.export({ format: "jwk" }), kid, alg: "RS256", use: "sig" });
const jwt = (payload, { priv = good.privateKey, kid = KID } = {}) => {
  const h = b64({ alg: "RS256", kid, typ: "JWT" }), p = b64(payload), sig = nodeSign("sha256", Buffer.from(`${h}.${p}`), priv).toString("base64url");
  return `${h}.${p}.${sig}`;
};
const env = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD };
const req = (token, url = "https://socallights.app/api/admin/x") => new Request(url, { headers: token ? { "Cf-Access-Jwt-Assertion": token } : {} });

// The certs list is cached for an hour inside the module, so each case moves the frozen clock past that and gets a fresh fetch.
let clock = Date.parse("2026-11-07T12:00:00Z");
const claims = (o = {}) => ({ aud: [AUD], iss: `https://${TEAM}`, exp: Math.floor(clock / 1000) + 600, email: "rey@forza-tek.com", ...o });
async function withCerts(keys, fn) {
  clock += 2 * 3600_000;
  const restoreNow = freezeNow(new Date(clock).toISOString());
  const f = stubFetch((url) => { assert.equal(String(url), `https://${TEAM}/cdn-cgi/access/certs`); return new Response(JSON.stringify({ keys }), { status: 200 }); });
  try { return await fn(f); } finally { f.restore(); restoreNow(); }
}

test("valid token: returns the email", async () => {
  await withCerts([jwkOf(good.publicKey, KID)], async () => {
    assert.deepEqual(await requireAdmin(req(jwt(claims())), env), { email: "rey@forza-tek.com" });
  });
});
test("audience may be a plain string or one of several", async () => {
  await withCerts([jwkOf(good.publicKey, KID)], async () => {
    assert.ok(await requireAdmin(req(jwt(claims({ aud: AUD }))), env));
    assert.ok(await requireAdmin(req(jwt(claims({ aud: ["x", AUD] }))), env));
  });
});
test("wrong audience, expired, wrong issuer are refused", async () => {
  await withCerts([jwkOf(good.publicKey, KID)], async () => {
    assert.equal(await requireAdmin(req(jwt(claims({ aud: ["other"] }))), env), null);
    assert.equal(await requireAdmin(req(jwt(claims({ exp: Math.floor(clock / 1000) - 1 }))), env), null);
    assert.equal(await requireAdmin(req(jwt(claims({ iss: "https://evil.cloudflareaccess.com" }))), env), null);
  });
});
test("bad signature (another key under the same kid), unknown kid, tampered payload, garbage", async () => {
  await withCerts([jwkOf(good.publicKey, KID)], async () => {
    assert.equal(await requireAdmin(req(jwt(claims(), { priv: other.privateKey })), env), null);
    assert.equal(await requireAdmin(req(jwt(claims(), { kid: "unknown" })), env), null);
    const t = jwt(claims()).split("."); t[1] = b64(claims({ email: "attacker@example.com" }));
    assert.equal(await requireAdmin(req(t.join(".")), env), null);
    assert.equal(await requireAdmin(req("not.a.jwt"), env), null);
    assert.equal(await requireAdmin(req("x"), env), null);
  });
});
test("missing header, or Access not configured: refused without any network call", async () => {
  const f = stubFetch(() => { throw new Error("no network expected"); });
  try {
    assert.equal(await requireAdmin(req(null), env), null);
    assert.equal(await requireAdmin(req(jwt(claims())), {}), null, "no team domain or audience configured");
    assert.equal(await requireAdmin(req(jwt(claims())), { ACCESS_TEAM_DOMAIN: TEAM }), null);
    assert.equal(f.calls.length, 0);
  } finally { f.restore(); }
});
test("certs endpoint down: refused, never open", async () => {
  clock += 2 * 3600_000;
  const restoreNow = freezeNow(new Date(clock).toISOString());
  const f = stubFetch(() => { throw new Error("offline"); });
  try { assert.equal(await requireAdmin(req(jwt(claims())), env), null); } finally { f.restore(); restoreNow(); }
});
test("ADMIN_DEV_BYPASS works only on localhost and only when set to 1", async () => {
  const f = stubFetch(() => { throw new Error("no network expected"); });
  try {
    assert.deepEqual(await requireAdmin(req(null, "http://localhost:8788/api/admin/x"), { ADMIN_DEV_BYPASS: "1" }), { email: "dev@localhost" });
    assert.equal(await requireAdmin(req(null, "https://socallights.app/api/admin/x"), { ADMIN_DEV_BYPASS: "1" }), null, "production host");
    assert.equal(await requireAdmin(req(null, "https://localhost.evil.example/api/admin/x"), { ADMIN_DEV_BYPASS: "1" }), null, "lookalike host");
    assert.equal(await requireAdmin(req(null, "http://localhost:8788/api/admin/x"), { ADMIN_DEV_BYPASS: "0" }), null);
    assert.equal(await requireAdmin(req(null, "http://localhost:8788/api/admin/x"), {}), null);
  } finally { f.restore(); }
});
test("a token with no exp claim is accepted (Cloudflare always sets one): documents the current behavior", async () => {
  await withCerts([jwkOf(good.publicKey, KID)], async () => {
    const { exp, ...noExp } = claims();
    assert.ok(await requireAdmin(req(jwt(noExp)), env));
  });
});
