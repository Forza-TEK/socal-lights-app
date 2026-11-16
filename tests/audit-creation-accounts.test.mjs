// 2026-11-16 audit of the creation flows (docs/audit/2026-11-16): accounts, email and small endpoints.
// M9 sign-in code tied to the browser, L2 mail to the address typed, L4/L5 unsubscribe pages, L8 address lookup, L10 avatar, L11 removal acknowledgment.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as start } from "../functions/api/auth/email/start.js";
import { onRequestPost as verify, FOREIGN_GUESSES_PER_EMAIL_HOUR } from "../functions/api/auth/email/verify.js";
import { onRequestGet as addressGet, ADDRESS_PER_MINUTE } from "../functions/api/address.js";
import { onRequestPost as avatarPost } from "../functions/api/me/avatar.js";
import { onRequestPost as removeHome } from "../functions/api/remove-home.js";
import { sendReceipt } from "../functions/_lib/receipt.js";
import { saveOptin, monthlyMayReceive, unsubscribe } from "../functions/_lib/newsletter.js";
import { mailAddress, sha256 } from "../functions/_lib/auth.js";
import { setOptout, prefsFor } from "../functions/_lib/emailprefs.js";
import { addSuppression } from "../functions/_lib/outreach.js";
import { newEnv, addUser, stubFetch } from "./_pay.mjs";

const ORIGIN = "https://socallights.app";
const read = (p) => readFileSync(p, "utf8");
const post = (fn, env, path, body, { ip = "203.0.113.5", headers = {} } = {}) => fn({ request: new Request(ORIGIN + path, { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": ip, ...headers }, body: JSON.stringify(body) }), env });
const mailOk = () => stubFetch(() => new Response(JSON.stringify({ id: "m1" }), { status: 200 }));
const codeFrom = (f) => { const m = f.calls.filter((c) => /resend\.com/.test(c.url)).map((c) => JSON.parse(c.init.body)).pop(); return m && (m.subject.match(/\d{6}/) || [])[0]; };
const cookieOf = (res) => (res.headers.get("set-cookie") || "").split(";")[0];
const EMAIL = "victim@example.com";

// ---------- M9 ----------
test("M9: asking for a code sets a short-lived browser cookie and stores only its hash with the code", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test" }), f = mailOk();
  try {
    const r = await post(start, env, "/api/auth/email/start", { email: EMAIL });
    assert.equal(r.status, 200); const set = r.headers.get("set-cookie");
    assert.match(set, /^scl_code_nonce=[0-9a-f]{32};/); assert.match(set, /HttpOnly/); assert.match(set, /Max-Age=600/);
    const nonce = set.match(/scl_code_nonce=([0-9a-f]{32})/)[1], row = raw.prepare("SELECT nonce_hash FROM login_codes").get();
    assert.equal(row.nonce_hash, await sha256("code-nonce:" + nonce)); assert.ok(!JSON.stringify(row).includes(nonce));
  } finally { f.restore(); }
});
test("M9: a stranger's wrong guesses (no cookie) do not use up the real person's five tries; the real browser still signs in", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test" }), f = mailOk();
  try {
    const mine = cookieOf(await post(start, env, "/api/auth/email/start", { email: EMAIL })), code = codeFrom(f);
    for (let i = 0; i < FOREIGN_GUESSES_PER_EMAIL_HOUR; i++) {
      const r = await post(verify, env, "/api/auth/email/verify", { email: EMAIL, code: String(100000 + i).replace(code, "999999") }, { ip: "198.51.100." + i });
      assert.equal(r.status, 400); assert.match((await r.json()).error, /doesn't match/);
    }
    assert.equal(raw.prepare("SELECT tries FROM login_codes").get().tries, 0, "the code's tries were not touched");
    const over = await post(verify, env, "/api/auth/email/verify", { email: EMAIL, code: "000000" }, { ip: "198.51.100.99" }); assert.equal(over.status, 429, "the per-address cap for other browsers");
    const ok = await post(verify, env, "/api/auth/email/verify", { email: EMAIL, code }, { headers: { cookie: mine } });
    assert.equal(ok.status, 200, "the real code still works from the browser that asked"); assert.match(ok.headers.get("set-cookie") || "", /scl_session=/);
  } finally { f.restore(); }
});
test("M9: from the browser that asked, five wrong tries still lock the code; a correct code from another device works (and is not counted as a try)", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test" }), f = mailOk();
  try {
    const mine = cookieOf(await post(start, env, "/api/auth/email/start", { email: EMAIL })), code = codeFrom(f), wrong = code === "111111" ? "222222" : "111111";
    for (let i = 0; i < 5; i++) assert.equal((await post(verify, env, "/api/auth/email/verify", { email: EMAIL, code: wrong }, { headers: { cookie: mine } })).status, 400);
    assert.equal(raw.prepare("SELECT tries FROM login_codes").get().tries, 5);
    assert.match((await (await post(verify, env, "/api/auth/email/verify", { email: EMAIL, code }, { headers: { cookie: mine } })).json()).error, /expired/);
    // another request, another code: the person types it on their phone, which did not ask for it
    await post(start, env, "/api/auth/email/start", { email: EMAIL }, { ip: "198.51.100.8" }); const code2 = codeFrom(f);
    const other = await post(verify, env, "/api/auth/email/verify", { email: EMAIL, code: code2 }, { ip: "198.51.100.9" }); assert.equal(other.status, 200);
  } finally { f.restore(); }
});

// ---------- L2 ----------
test("L2: sign-in keeps the address as typed; receipts and the entry mail go there, the account stays keyed by the stripped address", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test" }), f = mailOk();
  try {
    const mine = cookieOf(await post(start, env, "/api/auth/email/start", { email: "Ann+Lights@School.org" })), code = codeFrom(f);
    const ok = await post(verify, env, "/api/auth/email/verify", { email: "Ann+Lights@School.org", code }, { headers: { cookie: mine } }); assert.equal(ok.status, 200);
    const u = raw.prepare("SELECT email, login_email FROM users").get(); assert.equal(u.email, "ann@school.org"); assert.equal(u.login_email, "ann+lights@school.org");
    assert.equal(await mailAddress(env, "ann@school.org"), "ann+lights@school.org");
    assert.equal(await mailAddress(env, "someone@else.org"), "someone@else.org", "an address that is not an account is left as given");
    raw.prepare("UPDATE users SET login_email = 'other@else.org'").run(); assert.equal(await mailAddress(env, "ann@school.org"), "ann@school.org", "a stored address for a different mailbox is never used");
    raw.prepare("UPDATE users SET login_email = 'ann+lights@school.org'").run();
    f.calls.length = 0;
    assert.equal(await sendReceipt(env, null, { id: "home_live", to: "ann@school.org", vars: { name: "X", city: "Pasadena", map: "https://socallights.app/", link: "https://socallights.app/profile" } }), "queued");
    assert.deepEqual(f.calls.filter((c) => /resend/.test(c.url)).map((c) => JSON.parse(c.init.body).to), [["ann+lights@school.org"]]);
  } finally { f.restore(); }
});
test("L2: the same typed address signing in again replaces an older one (no stale alias)", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test" }), f = mailOk();
  try {
    for (const typed of ["bob+a@example.com", "bob@example.com"]) {
      const mine = cookieOf(await post(start, env, "/api/auth/email/start", { email: typed }, { ip: "198.51.100." + typed.length })), code = codeFrom(f);
      assert.equal((await post(verify, env, "/api/auth/email/verify", { email: typed, code }, { headers: { cookie: mine }, ip: "198.51.100." + typed.length })).status, 200);
    }
    assert.equal(raw.prepare("SELECT login_email FROM users").get().login_email, "bob@example.com");
  } finally { f.restore(); }
});

// ---------- L4 / L5 ----------
test("L4: the monthly sender's one check honors the monthly unsubscribe, the reminder opt-out and hard bounces, and lets a person who opted in again receive it", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "fan@example.com");
  assert.equal(await monthlyMayReceive(env, "fan@example.com"), false, "never opted in");
  await saveOptin(env, { user: u, role: "family", topics: [], method: "profile checkbox", source_page: "profile" });
  assert.equal(await monthlyMayReceive(env, "fan@example.com"), true);
  const p = await prefsFor(env, "fan@example.com"); await setOptout(env, (await env.DB.prepare("SELECT token FROM email_prefs WHERE email = 'fan@example.com'").first()).token, true);
  assert.equal(await monthlyMayReceive(env, "fan@example.com"), false, "reminder opt-out");
  raw.prepare("UPDATE email_prefs SET optout = 0").run(); assert.equal(await monthlyMayReceive(env, "fan@example.com"), true);
  await unsubscribe(env, { email: "fan@example.com" }); assert.equal(await monthlyMayReceive(env, "fan@example.com"), false, "monthly unsubscribe");
  await saveOptin(env, { user: u, role: "family", topics: [], method: "profile checkbox", source_page: "profile" });
  assert.equal(await monthlyMayReceive(env, "fan@example.com"), true, "opted in again after unsubscribing: the do-not-contact entry it left does not block it");
  const u2 = await addUser(raw, "u2", "angry@example.com"); await saveOptin(env, { user: u2, role: "family", topics: [], method: "profile checkbox", source_page: "profile" });
  assert.equal(await monthlyMayReceive(env, "angry@example.com"), true);
  await addSuppression(env, "angry@example.com", "complaint", "test"); assert.equal(await monthlyMayReceive(env, "angry@example.com"), false, "a complaint blocks it");
  assert.ok(p);
});
test("L4/L5: each page says which list it controls and links to the other way; both announce changes and move focus", () => {
  const un = read("public/unsubscribe.html"), pf = read("public/prefs.html");
  assert.match(un, /This page covers reminders, updates and result emails only\. The monthly update is a separate list/);
  assert.match(pf, /This page covers the monthly update only\. Reminders and result emails have their own unsubscribe link/);
  for (const h of [un, pf]) {
    assert.match(h, /id="live" role="status" aria-live="polite"/, "one live region that is always on the page");
    assert.match(h, /e\.setAttribute\("tabindex", "-1"\); if \(h\) e\.focus\(\)/, "the heading takes focus after a change");
    assert.match(h, /href="\/profile#account"/, "the lost-link state points to Your profile");
  }
  assert.ok(!/class="ok" role="status"/.test(pf), "no status span that is inserted already filled");
});

// ---------- L8 ----------
test("L8: the street lookup answers only our own pages, needs a number and two words, and is capped per connection", async () => {
  const { env } = newEnv({ GEOAPIFY_KEY: "k" }); let hits = 0;
  const f = stubFetch(() => { hits++; return new Response(JSON.stringify({ results: [{ housenumber: "27", street: "Via Alicia", city: "Laguna Niguel", postcode: "92677", lat: 33.5, lon: -117.7, state_code: "CA", country_code: "us" }] })); });
  const get = (q, { ip = "203.0.113.5", headers = {} } = {}) => addressGet({ request: new Request(ORIGIN + "/api/address?q=" + encodeURIComponent(q), { headers: { "CF-Connecting-IP": ip, ...headers } }), env });
  try {
    assert.equal((await get("27 Via Alicia", { headers: { origin: "https://evil.example" } })).status, 403); assert.equal(hits, 0);
    assert.equal((await get("27 Via Alicia", { headers: { referer: "https://evil.example/x" } })).status, 403);
    assert.deepEqual((await (await get("27viaalicia")).json()).suggestions, [], "one word is not an address"); assert.equal(hits, 0);
    const ok = await get("27 Via Alicia", { headers: { referer: ORIGIN + "/add-house" } }); assert.equal(ok.status, 200); assert.equal((await ok.json()).suggestions.length, 1); assert.equal(hits, 1);
    for (let i = 1; i < ADDRESS_PER_MINUTE; i++) await get("27 Via Alicia " + i);
    const over = await (await get("27 Via Alicia again")).json(); assert.deepEqual(over.suggestions, []); assert.equal(over.limited, true); assert.equal(hits, ADDRESS_PER_MINUTE);
    assert.equal((await (await get("27 Via Alicia", { ip: "198.51.100.7" })).json()).suggestions.length, 1, "another connection is not limited");
  } finally { f.restore(); }
});

// ---------- L10 ----------
test("L10: a profile picture is judged by its bytes, not by the type the browser declared, and changes are capped at 10 a day", async () => {
  const store = new Map(), bucket = { put: async (k, v) => { store.set(k, v); }, delete: async (k) => { store.delete(k); } };
  const { env, raw } = newEnv({ PHOTOS: bucket }); const u = await addUser(raw, "u1", "a@example.com");
  const png = new Uint8Array(200); png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const send = (bytes, type = "image/png") => avatarPost({ request: new Request(ORIGIN + "/api/me/avatar", { method: "POST", headers: { cookie: u.cookie, "content-type": type }, body: bytes }), env });
  const fake = await send(new Uint8Array(300).fill(60)); assert.equal(fake.status, 400); assert.match((await fake.json()).error, /JPG, PNG or WebP/); assert.equal(store.size, 0);
  for (let i = 0; i < 10; i++) assert.equal((await send(png)).status, 200, "change " + (i + 1));
  const slow = await send(png); assert.equal(slow.status, 429); assert.match((await slow.json()).error, /try again tomorrow/);
});

// ---------- L11 ----------
test("L11: the acknowledgment never repeats text typed into the form; the team's own mail still gets it", async () => {
  const { env } = newEnv({ RESEND_API_KEY: "re_test", ADMIN_NOTIFY_EMAIL: "team@example.com" }), f = mailOk();
  try {
    const r = await post(removeHome, env, "/api/remove-home", { email: "victim@example.org", address: "Visit mycasino.example for free spins 12345", note: "hello" });
    assert.equal(r.status, 200);
    const sent = f.calls.filter((c) => /resend/.test(c.url)).map((c) => JSON.parse(c.init.body));
    const ack = sent.find((m) => m.to[0] === "victim@example.org"), team = sent.find((m) => m.to[0] === "team@example.com");
    assert.ok(ack && !/mycasino/.test(ack.text + ack.subject + (ack.html || "")), "no typed text in the acknowledgment"); assert.match(ack.text, /the home you described/);
    assert.ok(team && /mycasino/.test(team.text + (team.html || "")), "the team sees what was typed");
  } finally { f.restore(); }
});
