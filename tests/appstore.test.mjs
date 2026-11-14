// App Store readiness (docs/app-store.md): in-app sign-in without Google, one account per email whichever way it is proven, the reviewer demo login,
// in-app account deletion (Apple 5.1.1(v)) and the native bridges (share sheet, reminders). Resend, Turnstile and Google are stubbed; nothing leaves the machine.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as start } from "../functions/api/auth/email/start.js";
import { onRequestPost as verify } from "../functions/api/auth/email/verify.js";
import { onRequestGet as gCallback } from "../functions/api/auth/google/callback.js";
import { onRequestGet as meGet } from "../functions/api/auth/me.js";
import { onRequestDelete as deleteMe } from "../functions/api/me/index.js";
import { requireAdmin } from "../functions/_lib/util.js";
import { getUser, appReviewCode, APP_REVIEW_EMAIL, sha256, COOKIE } from "../functions/_lib/auth.js";
import { newEnv, stubFetch, addUser } from "./_pay.mjs";

const ORIGIN = "https://socallights.app";
const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const post = (fn, env, path, body, { ip = "203.0.113.5", headers = {} } = {}) => fn({ request: new Request(ORIGIN + path, { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": ip, ...headers }, body: JSON.stringify(body) }), env });
const reqCode = (env, email, o) => post(start, env, "/api/auth/email/start", { email }, o);
const doVerify = (env, email, code, o) => post(verify, env, "/api/auth/email/verify", { email, code }, o);
const mailOk = () => stubFetch(() => new Response(JSON.stringify({ id: "m1" }), { status: 200 }));
const mails = (f) => f.calls.filter((c) => /resend\.com/.test(c.url));
const codeFrom = (f) => { const m = mails(f).map((c) => JSON.parse(c.init.body)).pop(); return m && (m.subject.match(/\d{6}/) || [])[0]; };
const G_ENV = { GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "csecret" };
const googleStub = (profile) => stubFetch((url) => (/oauth2\.googleapis\.com\/token/.test(url) ? new Response(JSON.stringify({ access_token: "at" })) : new Response(JSON.stringify(profile))));
const googleIn = (env) => gCallback({ request: new Request(`${ORIGIN}/api/auth/google/callback?code=c&state=s1`, { headers: { cookie: "scl_oauth=" + encodeURIComponent("s1|/") } }), env });

// ---- 1. In the app there is no Google button; the emailed code is the way in, and it reaches the same account as Google would
test("in the app the sign-in sheet leaves out Continue with Google (Google refuses embedded browsers; Apple 4.8 would otherwise need Sign in with Apple)", () => {
  const js = read("public/auth.js");
  assert.match(js, /if \(\/SoCalLightsApp\/\.test\(navigator\.userAgent\)\) m\.google = false;/, "the Google method is switched off for the app's browser string");
  // the Google link and the "or" divider are both drawn only from m.google, so with it off only the email-code form is left
  assert.match(js, /\$\{m\.google \? `<a class="gbtn"/);
  assert.match(js, /\$\{m\.google && m\.email \? `<div class="or">or<\/div>`/);
  assert.ok(js.indexOf("m.google = false") < js.indexOf("Continue with Google</a>"), "decided before the button is built");
  assert.equal((js.match(/auth\/google\/start/g) || []).length, 1, "the sheet is the only place that links to Google sign-in");
  const cfg = JSON.parse(read("app/capacitor.config.json")); assert.match(cfg.appendUserAgent, /SoCalLightsApp/, "the wrapper really sends that string");
});
test("a Google sign-in and an emailed-code sign-in for the same address are the SAME account (lowercase, no +tag, Gmail dots), in either order", async () => {
  for (const order of ["google-first", "code-first"]) {
    const { env, raw } = newEnv({ ...G_ENV, RESEND_API_KEY: "re_test" });
    const viaGoogle = async () => { const f = googleStub({ sub: "g-77", email: "Jane.Doe+lights@Gmail.com", email_verified: true, name: "Jane" }); try { const r = await googleIn(env); assert.equal(r.status, 302); } finally { f.restore(); } };
    const viaCode = async (typed) => { const f = mailOk(); try { assert.equal((await reqCode(env, typed, { ip: "203.0.113.50" })).status, 200); const r = await doVerify(env, typed, codeFrom(f), { ip: "203.0.113.50" }); assert.equal(r.status, 200); return (await r.json()).user; } finally { f.restore(); } };
    let user;
    if (order === "google-first") { await viaGoogle(); user = await viaCode("JANEDOE@googlemail.com"); } else { user = await viaCode("jane.doe@gmail.com"); await viaGoogle(); }
    const rows = raw.prepare("SELECT id, email, google_sub FROM users").all();
    assert.equal(rows.length, 1, order + ": one account, not two");
    assert.equal(rows[0].email, "janedoe@gmail.com");
    assert.equal(user.id, rows[0].id, order + ": the code sign-in returned that account");
    assert.equal(rows[0].google_sub, "g-77", order + ": the Google link is on the same row");
    // a second, differently spelled sign-in still lands there
    const again = await viaCode("Jane.Doe+other@gmail.com"); assert.equal(again.id, rows[0].id);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM users").get().n, 1);
  }
});

// ---- 2. Reviewer demo login
test("demo login: appReviewCode is on only for the one address and only when the secret is exactly six digits", () => {
  assert.equal(APP_REVIEW_EMAIL, "appreview@socallights.app");
  assert.equal(appReviewCode({ APP_REVIEW_CODE: "482915" }, "appreview@socallights.app"), "482915");
  assert.equal(appReviewCode({ APP_REVIEW_CODE: "482915" }, " AppReview+x@SocalLights.app "), "482915", "spelled like any other address, it is the same address");
  for (const bad of [undefined, "", "12345", "1234567", "abcdef", "12 456", 482915 + "x"]) assert.equal(appReviewCode({ APP_REVIEW_CODE: bad }, APP_REVIEW_EMAIL), "", "off for " + JSON.stringify(bad));
  assert.equal(appReviewCode({}, APP_REVIEW_EMAIL), "");
  assert.equal(appReviewCode({ APP_REVIEW_CODE: "482915" }, "someone@example.com"), "");
  assert.equal(appReviewCode({ APP_REVIEW_CODE: "482915" }, "appreview@socallights.app.evil.com"), "");
  assert.equal(appReviewCode({ APP_REVIEW_CODE: "482915" }, "xappreview@socallights.app"), "");
});
test("demo login: with the secret set, the code signs the demo address in and no mail is sent", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test", APP_REVIEW_CODE: "482915" }), f = mailOk();
  try {
    const r = await reqCode(env, "appreview@socallights.app");
    assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true }, "the answer looks like any other request");
    assert.equal(mails(f).length, 0, "nothing was mailed");
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM login_codes").get().n, 1, "it uses the ordinary code row (so every limit applies)");
    assert.ok(!JSON.stringify(raw.prepare("SELECT * FROM login_codes").all()).includes("482915"), "the code itself is not stored, only its hash");
    assert.equal((await doVerify(env, "appreview@socallights.app", "000000")).status, 400, "a wrong code is refused");
    const ok = await doVerify(env, "appreview@socallights.app", "482915");
    assert.equal(ok.status, 200); assert.equal((await ok.json()).user.email, "appreview@socallights.app");
    assert.ok((ok.headers.get("set-cookie") || "").startsWith(COOKIE + "="), "a normal session cookie");
    assert.equal((await doVerify(env, "appreview@socallights.app", "482915")).status, 400, "it works once per request, like any code");
    // the demo account is signed in as an ordinary user
    const cookie = (ok.headers.get("set-cookie") || "").split(";")[0];
    const who = await getUser(new Request(ORIGIN + "/api/auth/me", { headers: { cookie } }), env); assert.equal(who.email, "appreview@socallights.app");
  } finally { f.restore(); }
});
test("demo login: off when the secret is unset or malformed (normal mail is sent, and the would-be code does not work)", async () => {
  for (const secret of [undefined, "", "12345", "abcdef"]) {
    const { env, raw } = newEnv({ RESEND_API_KEY: "re_test", ...(secret === undefined ? {} : { APP_REVIEW_CODE: secret }) }), f = mailOk();
    try {
      assert.equal((await reqCode(env, "appreview@socallights.app")).status, 200);
      assert.equal(mails(f).length, 1, "a real mail is sent, as for anyone: " + JSON.stringify(secret));
      const real = codeFrom(f); assert.match(real, /^\d{6}$/);
      const guess = real === "482915" ? "482916" : "482915"; assert.equal((await doVerify(env, "appreview@socallights.app", guess)).status, 400);
      assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM users").get().n, 0);
    } finally { f.restore(); }
  }
});
test("demo login: the fixed code does not work for any other address, and cannot be used without asking for it first", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test", APP_REVIEW_CODE: "482915" }), f = mailOk();
  try {
    // nobody asked for a code: nothing to match
    assert.equal((await doVerify(env, "appreview@socallights.app", "482915")).status, 400);
    assert.equal((await doVerify(env, "victim@example.com", "482915")).status, 400);
    // someone else asks for a real code; the fixed code still fails for them
    assert.equal((await reqCode(env, "victim@example.com")).status, 200);
    assert.equal(mails(f).length, 1);
    assert.equal((await doVerify(env, "victim@example.com", "482915")).status, 400);
    // a row made for the demo address (hash of "<demo>:<code>") does not open another address either
    raw.prepare("INSERT INTO login_codes (email, code_hash, ip, expires_at) VALUES (?,?,?, datetime('now','+10 minutes'))").run("other@example.com", await sha256("appreview@socallights.app:482915"), "x");
    assert.equal((await doVerify(env, "other@example.com", "482915")).status, 400);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM users").get().n, 0, "no account was created by any of that");
  } finally { f.restore(); }
});
test("demo login is rate-limited like normal sign-in: 4 requests an hour per address, 5 tries per code, 30 verifies an hour per network address", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test", APP_REVIEW_CODE: "482915" }), f = mailOk();
  try {
    for (let i = 0; i < 4; i++) assert.equal((await reqCode(env, "appreview@socallights.app", { ip: "198.51.100." + i })).status, 200);
    assert.equal((await reqCode(env, "appreview@socallights.app", { ip: "198.51.100.9" })).status, 429, "the 5th request in an hour is refused");
    assert.equal(mails(f).length, 0);
    // five wrong tries lock the code; the right one is then refused until a new request
    for (let i = 0; i < 5; i++) assert.equal((await doVerify(env, "appreview@socallights.app", "11111" + i, { ip: "198.51.100.20" })).status, 400);
    assert.equal((await doVerify(env, "appreview@socallights.app", "482915", { ip: "198.51.100.20" })).status, 400, "locked after 5 tries");
    // per-IP: one address from one network address
    raw.prepare("DELETE FROM login_codes").run();
    let last = 200; for (let i = 0; i < 31 && last !== 429; i++) last = (await doVerify(env, "appreview@socallights.app", "000000", { ip: "198.51.100.77" })).status;
    assert.equal(last, 429, "the per-address verify cap applies to the demo address too");
  } finally { f.restore(); }
});
test("demo login: the demo account cannot reach Admin (Admin is Cloudflare Access only; a session cookie is not enough)", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test", APP_REVIEW_CODE: "482915", ACCESS_TEAM_DOMAIN: "forza.cloudflareaccess.com", ACCESS_AUD: "aud-1" }), f = mailOk();
  try {
    await reqCode(env, "appreview@socallights.app");
    const ok = await doVerify(env, "appreview@socallights.app", "482915"), cookie = (ok.headers.get("set-cookie") || "").split(";")[0];
    assert.equal(ok.status, 200);
    for (const url of ["https://socallights.app/api/admin/users", "https://socallights.app/admin/"]) assert.equal(await requireAdmin(new Request(url, { headers: { cookie } }), env), null);
    assert.equal(await requireAdmin(new Request("https://socallights.app/api/admin/users", { headers: { cookie, "Cf-Access-Jwt-Assertion": "a.b.c" } }), env), null, "a made-up Access token fails too");
    assert.ok(!raw.prepare("PRAGMA table_info(users)").all().some((c) => /^(is_)?admin$|^role$/i.test(c.name)), "accounts carry no admin flag to set");
    const gate = read("functions/api/admin/_middleware.js"); assert.match(gate, /requireAdmin/, "the admin API is gated by Access");
  } finally { f.restore(); }
});

// ---- 3. Account deletion inside the app (Apple 5.1.1(v))
test("a signed-in person can delete their account from the profile's Account tab, with a confirm step; nobody else can", async () => {
  const html = read("public/profile.html");
  assert.match(html, /<h2>Delete my account<\/h2>/); assert.match(html, /id="delacct"/);
  assert.match(html, /if \(!da\.dataset\.sure\) \{[^}]*Tap again to permanently delete/, "the first tap only asks; the second deletes");
  assert.match(html, /fetch\("\/api\/me", \{ method: "DELETE" \}\)/);
  // nothing in the markup hides it from the app, and it needs no email or website step
  assert.ok(!/SoCalLightsApp/.test(html), "the app sees the same Account tab");
  const priv = read("public/privacy.html"); assert.match(priv, /open your profile, choose the Account tab and tap Delete my account/);
  assert.match(read("public/chrome.js"), /\/profile/, "the account menu leads to the profile");
});
test("DELETE /api/me removes the account, its sessions and personal data, clears the cookie, and refuses signed-out and cross-site calls", async () => {
  const { env, raw } = newEnv({ PHOTOS: { delete: async () => {} } });
  const me = await addUser(raw, "uDel", "Del.Me@gmail.com");
  raw.prepare("INSERT INTO drafts (id, user_id, kind, data) VALUES ('d1','uDel','house','{}')").run();
  raw.prepare("INSERT INTO newsletter_optins (user_id, email, role, opted_in_at, token) VALUES ('uDel','delme@gmail.com','homeowner','2026-01-01','tk')").run();
  const del = (o = {}) => deleteMe({ request: new Request(ORIGIN + "/api/me", { method: "DELETE", headers: { ...(o.cookie === undefined ? { cookie: me.cookie } : o.cookie ? { cookie: o.cookie } : {}), ...(o.origin ? { origin: o.origin } : {}) } }), env });
  assert.equal((await del({ cookie: "" })).status, 401, "signed out");
  assert.equal((await del({ origin: "https://evil.example" })).status, 403, "another site");
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM users").get().n, 1, "refused calls changed nothing");
  const r = await del();
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), { ok: true });
  assert.match(r.headers.get("set-cookie") || "", /scl_session=;.*Max-Age=0/, "the session cookie is cleared");
  for (const [sql, what] of [["SELECT 1 FROM users WHERE id = 'uDel'", "account"], ["SELECT 1 FROM sessions WHERE user_id = 'uDel'", "sessions"], ["SELECT 1 FROM drafts WHERE user_id = 'uDel'", "drafts"], ["SELECT 1 FROM newsletter_optins WHERE user_id = 'uDel'", "monthly update"]]) assert.equal(raw.prepare(sql).get(), undefined, what + " removed");
  assert.ok(raw.prepare("SELECT COUNT(*) AS n FROM outreach_suppressions").get().n >= 1, "the do-not-contact rule from the privacy page: hash rows only");
  assert.ok(!JSON.stringify(raw.prepare("SELECT * FROM outreach_suppressions").all()).includes("delme@gmail.com"), "the address itself is not kept");
  assert.equal((await del()).status, 401, "the old cookie no longer signs anyone in");
  const j = await (await meGet({ request: new Request(ORIGIN + "/api/auth/me", { headers: { cookie: me.cookie } }), env })).json(); assert.equal(j.user, null);
});
test("the demo account can be deleted in the app too, and signing in again with the code simply makes a fresh account", async () => {
  const { env } = newEnv({ RESEND_API_KEY: "re_test", APP_REVIEW_CODE: "482915", PHOTOS: { delete: async () => {} } }), f = mailOk();
  try {
    await reqCode(env, "appreview@socallights.app");
    const ok = await doVerify(env, "appreview@socallights.app", "482915"), cookie = (ok.headers.get("set-cookie") || "").split(";")[0];
    assert.equal((await deleteMe({ request: new Request(ORIGIN + "/api/me", { method: "DELETE", headers: { cookie } }), env })).status, 200);
    await reqCode(env, "appreview@socallights.app", { ip: "203.0.113.99" });
    assert.equal((await doVerify(env, "appreview@socallights.app", "482915", { ip: "203.0.113.99" })).status, 200);
  } finally { f.restore(); }
});

// ---- 4. Native bridges
test("native.js: share sheet and reminders use the Capacitor plugins only inside the app and only when the build has them", async () => {
  const realNav = Object.getOwnPropertyDescriptor(globalThis, "navigator"), realWin = globalThis.window;
  const setUA = (ua) => Object.defineProperty(globalThis, "navigator", { value: { userAgent: ua }, configurable: true, writable: true });
  try {
    setUA("Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 SoCalLightsApp/1.0");
    const app = await import("../public/native.js?app");
    assert.equal(app.IN_APP, true);
    // no plugins yet: everything falls back
    globalThis.window = { Capacitor: { Plugins: {} } };
    assert.equal(await app.nativeShare({ title: "t", url: "u" }), false);
    assert.equal(await app.syncReminder({ id: "e1", n: "X", s: "2099-12-01" }, true), false);
    // share plugin
    const shared = []; globalThis.window = { Capacitor: { Plugins: { Share: { share: async (o) => { shared.push(o); } } } } };
    assert.equal(await app.nativeShare({ title: "Tree", text: "Tree on SoCal Lights", url: "https://socallights.app/e/1" }), true);
    assert.deepEqual(shared[0], { title: "Tree", text: "Tree on SoCal Lights", url: "https://socallights.app/e/1", dialogTitle: "Tree" });
    globalThis.window = { Capacitor: { Plugins: { Share: { share: async () => { throw new Error("Share canceled"); } } } } };
    assert.equal(await app.nativeShare({ title: "t", url: "u" }), true, "closing the sheet is not a failure, so no second share or copy follows");
    globalThis.window = { Capacitor: { Plugins: { Share: { share: async () => { throw new Error("boom"); } } } } };
    assert.equal(await app.nativeShare({ title: "t", url: "u" }), false, "a real failure falls back to the web share or a copied link");
    // reminders
    const calls = []; const N = { checkPermissions: async () => ({ display: "prompt" }), requestPermissions: async () => ({ display: "granted" }), schedule: async (o) => calls.push(["schedule", o]), cancel: async (o) => calls.push(["cancel", o]) };
    globalThis.window = { Capacitor: { Plugins: { LocalNotifications: N } } };
    assert.equal(await app.syncReminder({ id: "e1", n: "Tree Lighting", s: "2099-12-01" }, true), true);
    const n = calls[0][1].notifications[0]; assert.equal(n.title, "Tree Lighting"); assert.ok(Number.isInteger(n.id) && n.id > 0 && n.id < 2147483648);
    assert.deepEqual([n.schedule.at.getFullYear(), n.schedule.at.getMonth(), n.schedule.at.getDate(), n.schedule.at.getHours()], [2099, 11, 1, 9]);
    assert.equal(await app.syncReminder({ id: "e1", s: "2099-12-01" }, false), true); assert.equal(calls[1][0], "cancel"); assert.equal(calls[1][1].notifications[0].id, n.id, "the same id is cancelled");
    calls.length = 0;
    assert.equal(await app.syncReminder({ id: "old", n: "Past", s: "2001-12-01" }, true), false, "an event already under way gets no reminder"); assert.equal(calls.length, 0);
    globalThis.window = { Capacitor: { Plugins: { LocalNotifications: { ...N, checkPermissions: async () => ({ display: "denied" }) } } } };
    assert.equal(await app.syncReminder({ id: "e2", n: "X", s: "2099-12-01" }, true), false, "no permission, no schedule"); assert.equal(calls.length, 0);
    assert.equal(app.reminderTime("nonsense"), null);
    // a normal browser: never touches the plugins even if something named Capacitor exists
    setUA("Mozilla/5.0 (iPhone) Safari/604.1");
    const web = await import("../public/native.js?web");
    assert.equal(web.IN_APP, false);
    globalThis.window = { Capacitor: { Plugins: { Share: { share: async () => { throw new Error("must not be called"); } } } } };
    assert.equal(await web.nativeShare({ title: "t", url: "u" }), false);
  } finally { if (realNav) Object.defineProperty(globalThis, "navigator", realNav); else delete globalThis.navigator; if (realWin === undefined) delete globalThis.window; else globalThis.window = realWin; }
});
test("every Share button goes through the native share sheet first, and saving an event sets or clears its reminder", () => {
  const app = read("public/app.js"), tour = read("public/tour.js"), contest = read("public/contest.html");
  assert.equal((app.match(/await nativeShare\(/g) || []).length, 2, "place share and favorites share in app.js");
  for (const [src, name] of [[app, "app.js"], [tour, "tour.js"], [contest, "contest.html"]]) { assert.match(src, /import \{[^}]*nativeShare[^}]*\} from "\/native\.js\?v=\w+"/, name + " imports it"); assert.ok(src.indexOf("nativeShare(") < src.indexOf("navigator.share"), name + ": native first"); }
  assert.equal((app.match(/remind\(id, /g) || []).length, 3, "all three places that save or un-save an event");
  assert.equal(read("public/index.html").match(/native\.js\?v=(\w+)/)[1], app.match(/native\.js\?v=(\w+)/)[1]);
});
test("the app project lists the plugins the site relies on (share is installed; local notifications is the documented next step)", () => {
  const pkg = JSON.parse(read("app/package.json")); assert.ok(pkg.dependencies["@capacitor/share"], "share sheet plugin installed");
  assert.ok(!pkg.dependencies["@capacitor/local-notifications"], "if this plugin is added, update docs/app-store.md and the Podfile via cap sync, then drop this line");
  assert.match(read("docs/app-store.md"), /local-notifications/, "the remaining native step is written down");
});
