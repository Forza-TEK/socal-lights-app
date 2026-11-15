#!/usr/bin/env node
// SoCalLightsBot's Web Bot Auth key (docs/verified-bot.md).
//   node scripts/bot-keys.mjs --make [file]     make a new Ed25519 key; the PRIVATE JWK is written to the file (default ./bot-signing-key.json, mode 600) and never printed.
//                                               Paste the file's contents into the Cloudflare Pages secret BOT_SIGNING_KEY, then delete the file. Prints the public key and key id.
//   node scripts/bot-keys.mjs --check [origin]  fetch <origin>/.well-known/http-message-signatures-directory (default https://socallights.app) and verify what a site would verify.
//   node scripts/bot-keys.mjs --crawltest       send one signed request to Cloudflare's test endpoint (crawltest.com): 401 = format fine, key not registered yet; 200 = verified; 400 = malformed.
//                                               Needs the private key in the environment variable BOT_SIGNING_KEY.
import { writeFileSync } from "node:fs";
import { loadBotKey, signedHeaders, verifyBase, AGENT_URL } from "../functions/_lib/webbotauth.js";

const args = process.argv.slice(2), opt = (n) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : null; };
if (args.includes("--make")) {
  const kp = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]), jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const out = opt("--make") || "bot-signing-key.json";
  writeFileSync(out, JSON.stringify({ kty: "OKP", crv: "Ed25519", x: jwk.x, d: jwk.d }), { mode: 0o600 });
  const key = await loadBotKey(readJson(out));
  console.log(`Wrote the PRIVATE key to ${out} (keep it secret; paste it into the Cloudflare Pages secret BOT_SIGNING_KEY, then delete the file).\nPublic key: ${JSON.stringify(key.pub)}\nKey id (JWK thumbprint): ${key.keyid}`);
} else if (args.includes("--check")) {
  const origin = (opt("--check") || "https://socallights.app").replace(/\/$/, ""), url = origin + "/.well-known/http-message-signatures-directory";
  const r = await fetch(url, { headers: { "user-agent": "SoCalLightsBot/1.0 (+https://socallights.app/bot)" } });
  const type = r.headers.get("content-type") || "", si = r.headers.get("signature-input") || "", sg = r.headers.get("signature") || "", body = await r.json().catch(() => null);
  const fail = (m) => { console.log("FAIL: " + m); process.exit(1); };
  if (r.status !== 200) fail(`${url} answered ${r.status} (is BOT_SIGNING_KEY set and the site redeployed?)`);
  if (!/^application\/http-message-signatures-directory\+json/.test(type)) fail("content-type is " + type);
  const k = body && body.keys && body.keys[0]; if (!k || k.kty !== "OKP" || k.crv !== "Ed25519" || !k.x || k.d) fail("the key set is wrong (needs kty, crv, x only)");
  const m = si.match(/^sig1=(\("@authority";req\);.*)$/); if (!m) fail("Signature-Input is not in the expected form: " + si);
  if (!/tag="http-message-signatures-directory"/.test(m[1])) fail("missing the directory tag");
  const sig = (sg.match(/^sig1=:(.+):$/) || [])[1]; if (!sig) fail("Signature header is not in the expected form");
  const base = `"@authority";req: ${new URL(url).host.toLowerCase()}\n"@signature-params": ${m[1]}`;
  if (!(await verifyBase(k, base, sig))) fail("the directory's signature does not verify with its own key");
  console.log(`OK: ${url} serves one Ed25519 key, signed correctly. Key id ${(m[1].match(/keyid="([^"]+)"/) || [])[1]}`);
} else if (args.includes("--crawltest")) {
  const key = await loadBotKey(process.env.BOT_SIGNING_KEY); if (!key) { console.error("Set BOT_SIGNING_KEY to the private JWK JSON first."); process.exit(1); }
  const url = "https://crawltest.com/cdn-cgi/web-bot-auth", h = await signedHeaders(url, key);
  const r = await fetch(url, { headers: { ...h, "user-agent": "SoCalLightsBot/1.0 (+https://socallights.app/bot)" } });
  console.log(`crawltest.com answered ${r.status}: ${r.status === 200 ? "verified" : r.status === 401 ? "format is right, the key is not registered with Cloudflare yet (expected before approval)" : r.status === 400 ? "the request is malformed" : "unexpected"}`);
} else { console.log("Use --make, --check or --crawltest (see the top of this file)."); }
function readJson(p) { return JSON.parse(readFileSync(p, "utf8")); }
import { readFileSync } from "node:fs";
