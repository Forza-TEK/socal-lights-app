// Web Bot Auth for SoCalLightsBot (functions/_lib/webbotauth.js, the key directory, the polite fetch).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadBotKey, signedHeaders, directoryResponse, verifyBase, botFetch, AGENT_URL } from "../functions/_lib/webbotauth.js";
import { onRequestGet as directory } from "../functions/.well-known/http-message-signatures-directory.js";
import { verifyEventPage, ROBOTS_NOTE } from "../functions/_lib/events.js";

async function newSecret() { const kp = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]), j = await crypto.subtle.exportKey("jwk", kp.privateKey); return JSON.stringify({ kty: "OKP", crv: "Ed25519", x: j.x, d: j.d }); }
const sigOf = (h) => h.signature.match(/^sig1=:(.+):$/)[1], paramsOf = (h) => h["signature-input"].replace(/^sig1=/, "");

test("a signed request verifies the way a site verifies it: covered @authority and signature-agent, tag web-bot-auth, short expiry, keyid is the JWK thumbprint", async () => {
  const secret = await newSecret(), key = await loadBotKey(secret);
  assert.deepEqual(Object.keys(key.pub).sort(), ["crv", "kty", "x"], "only the public members");
  const h = await signedHeaders("https://Visit.Example.org/holidays?x=1", key, { now: 1_800_000_000_000, ttl: 60, nonceValue: "n0nce" });
  assert.equal(h["signature-agent"], `"${AGENT_URL}"`);
  assert.equal(paramsOf(h), `("@authority" "signature-agent");created=1800000000;keyid="${key.keyid}";alg="ed25519";expires=1800000060;nonce="n0nce";tag="web-bot-auth"`);
  const base = `"@authority": visit.example.org\n"signature-agent": "${AGENT_URL}"\n"@signature-params": ${paramsOf(h)}`;
  assert.equal(await verifyBase(key.pub, base, sigOf(h)), true);
  assert.equal(await verifyBase(key.pub, base.replace("visit.example.org", "evil.example.org"), sigOf(h)), false, "a signature for one site is useless on another");
  // the key id is the RFC 7638 thumbprint of the public key
  const { createHash } = await import("node:crypto"); assert.equal(key.keyid, createHash("sha256").update(`{"crv":"Ed25519","kty":"OKP","x":"${key.pub.x}"}`).digest("base64url"));
});

test("the key directory: 404 without the secret; with it, a JWKS holding only the public key, the right content type, and a signature that verifies over the request's @authority", async () => {
  const none = await directory({ request: new Request("https://socallights.app/.well-known/http-message-signatures-directory"), env: {} });
  assert.equal(none.status, 404);
  const secret = await newSecret(), res = await directory({ request: new Request("https://socallights.app/.well-known/http-message-signatures-directory"), env: { BOT_SIGNING_KEY: secret } });
  assert.equal(res.status, 200); assert.match(res.headers.get("content-type"), /^application\/http-message-signatures-directory\+json/);
  const body = await res.json(), k = body.keys[0]; assert.equal(body.keys.length, 1); assert.deepEqual(Object.keys(k).sort(), ["crv", "kty", "x"]); assert.ok(!JSON.stringify(body).includes(JSON.parse(secret).d), "the private part is never served");
  const si = res.headers.get("signature-input"), m = si.match(/^sig1=(\("@authority";req\);.*)$/); assert.ok(m && /tag="http-message-signatures-directory"/.test(m[1]));
  const base = `"@authority";req: socallights.app\n"@signature-params": ${m[1]}`; assert.equal(await verifyBase(k, base, res.headers.get("signature").match(/^sig1=:(.+):$/)[1]), true);
  assert.equal(await loadBotKey("not json"), null); assert.equal(await loadBotKey(JSON.stringify({ kty: "OKP", crv: "Ed25519", x: "abc" })), null, "a public-only key cannot sign");
});

test("botFetch signs when the secret is set, sends nothing extra when it is not, and a robots.txt Disallow stops the request", async () => {
  const secret = await newSecret(), seen = [];
  const fetchFn = async (u, init) => { seen.push({ u, h: init.headers }); return new Response("ok"); };
  const signed = botFetch({ BOT_SIGNING_KEY: secret }, { fetchFn }); await signed("https://a.test/p", { headers: { "user-agent": "SoCalLightsBot/1.0" } });
  assert.ok(seen[0].h["signature"] && seen[0].h["signature-input"] && seen[0].h["signature-agent"] && seen[0].h["user-agent"]);
  const plain = botFetch({}, { fetchFn }); await plain("https://a.test/p", { headers: { "user-agent": "x" } }); assert.equal(seen[1].h.signature, undefined);
  const blocked = botFetch({}, { fetchFn, robots: async () => false }), n = seen.length, r = await blocked("https://a.test/no"); assert.equal(seen.length, n, "no request was made"); assert.equal(r.headers.get("x-robots-blocked"), "1");
});

test("verifyEventPage reports a robots.txt refusal honestly, with one try and no disguise", async () => {
  let n = 0; const f = botFetch({}, { fetchFn: async () => { n++; return new Response("x"); }, robots: async () => false });
  const r = await verifyEventPage("https://a.test/event", "Night in Bethlehem", "2026-12-11", f);
  assert.equal(n, 0); assert.equal(r.ok, false); assert.equal(r.blocked, true); assert.equal(r.note, ROBOTS_NOTE);
});

test("the directory is routed to its Function and the three server-side page checks use the polite fetch", () => {
  assert.ok(JSON.parse(readFileSync("public/_routes.json", "utf8")).include.includes("/.well-known/*"));
  for (const f of ["functions/api/submit-event.js", "functions/api/me/events/[id].js", "functions/api/verify-events.js"]) assert.match(readFileSync(f, "utf8"), /verifyEventPage\([^)]*politeFetch\(env\)\)/, f);
});

test("the bot page, the owner guide and the sweep rules exist and say what Cloudflare's policy needs", () => {
  const page = readFileSync("public/bot.html", "utf8"), guide = readFileSync("docs/verified-bot.md", "utf8"), sweep = readFileSync("docs/sweep-methods.md", "utf8"), br = readFileSync("docs/browser-pass.md", "utf8");
  for (const t of ["SoCalLightsBot/1.0; +https://socallights.app/bot", "robots.txt", "http-message-signatures-directory", "User-agent: SoCalLightsBot", "info@socallights.app"]) assert.ok(page.includes(t), "bot page mentions " + t);
  for (const t of ["BOT_SIGNING_KEY", "Bot Submission Form", "Request Signature", "crawltest.com", "scripts/signed-fetch.mjs", "Does not help"]) assert.ok(guide.includes(t), "guide mentions " + t);
  assert.match(sweep, /5\.3 How our bot behaves/); assert.match(br, /Tuesday and Friday at 10:23 AM Pacific/); assert.match(br, /Friday 2026-11-13/);
  for (const f of ["scripts/photo_pass.py", "scripts/video_pass.py"]) assert.match(readFileSync(f, "utf8"), /fetch_ok\(/, f + " checks robots.txt");
});
