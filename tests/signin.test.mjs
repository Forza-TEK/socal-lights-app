// Email sign-in (request a code) and Google sign-in (start and callback). Resend, Turnstile and Google are stubbed; nothing leaves the machine.
// Verifying a code (attempt limits, per-address cap) is covered in signin-attempts.test.mjs; here: codes, expiry, session creation, redirects.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as start } from "../functions/api/auth/email/start.js";
import { onRequestPost as verify } from "../functions/api/auth/email/verify.js";
import { onRequestGet as gStart } from "../functions/api/auth/google/start.js";
import { onRequestGet as gCallback } from "../functions/api/auth/google/callback.js";
import { getUser, safeNext, normEmail, sha256, COOKIE } from "../functions/_lib/auth.js";
import { newEnv, stubFetch } from "./_pay.mjs";

const ORIGIN = "https://socallights.app";
const post = (fn, env, path, body, { ip = "203.0.113.5", headers = {} } = {}) => fn({ request: new Request(ORIGIN + path, { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": ip, ...headers }, body: JSON.stringify(body) }), env });
const reqCode = (env, body, o) => post(start, env, "/api/auth/email/start", body, o);
const doVerify = (env, body, o) => post(verify, env, "/api/auth/email/verify", body, o);
const sendOk = () => stubFetch(() => new Response(JSON.stringify({ id: "m1" }), { status: 200 }));
// The code the stub "mail service" was last asked to send
const codeFrom = (f) => { const m = f.calls.filter((c) => /resend\.com/.test(c.url)).map((c) => JSON.parse(c.init.body)).pop(); return m && (m.subject.match(/\d{6}/) || [])[0]; };
const cookieOf = (res) => (res.headers.get("set-cookie") || "").split(";")[0];

test("request: a valid address gets a mailed code; only its hash is stored; it expires in 10 minutes", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test" }), f = sendOk();
  try {
    const r = await reqCode(env, { email: "Person+tag@Example.com" });
    assert.equal(r.status, 200);
    const code = codeFrom(f); assert.match(code, /^\d{6}$/);
    const row = raw.prepare("SELECT * FROM login_codes").get();
    assert.equal(row.email, "person@example.com", "normalized (lowercase, +tag removed)");
    assert.equal(row.code_hash, await sha256(`person@example.com:${code}`));
    assert.ok(!JSON.stringify(row).includes(code), "the code itself is not stored");
    const mins = raw.prepare("SELECT (julianday(expires_at) - julianday('now')) * 1440 AS m FROM login_codes").get().m;
    assert.ok(mins > 9 && mins <= 10.1, "expires in about 10 minutes, got " + mins);
    assert.equal(f.calls.find((c) => /resend/.test(c.url)).init.headers.authorization, "Bearer re_test");
  } finally { f.restore(); }
});
test("request: bad input, throwaway domains, other sites, suspended accounts, mail not switched on, mail service down", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test" }), f = sendOk();
  try {
    assert.equal((await reqCode(env, { email: "nope" })).status, 400);
    assert.equal((await reqCode(env, {})).status, 400);
    assert.equal((await reqCode(env, { email: "x@mailinator.com" })).status, 400);
    assert.equal((await reqCode(env, { email: "a@example.com" }, { headers: { origin: "https://evil.example" } })).status, 403);
    raw.prepare("INSERT INTO users (id,email,name,status) VALUES ('u9','banned@example.com','','suspended')").run();
    assert.equal((await reqCode(env, { email: "banned@example.com" })).status, 403);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM login_codes").get().n, 0, "none of those stored a code");
    assert.equal((await reqCode({ ...env, RESEND_API_KEY: "" }, { email: "a@example.com" })).status, 503);
  } finally { f.restore(); }
  const down = stubFetch(() => new Response("no", { status: 500 }));
  try { assert.equal((await reqCode(env, { email: "b@example.com" })).status, 502); } finally { down.restore(); }
});
test("request: Turnstile is enforced when configured (missing and failed token refused, good token accepted)", async () => {
  const { env } = newEnv({ RESEND_API_KEY: "re_test", TURNSTILE_SECRET: "ts_secret" });
  const f = stubFetch((url, init) => /turnstile/.test(url) ? new Response(JSON.stringify({ success: init.body.get("response") === "good" })) : new Response("{}", { status: 200 }));
  try {
    assert.equal((await reqCode(env, { email: "a@example.com" })).status, 400, "no token");
    assert.equal((await reqCode(env, { email: "a@example.com", "cf-turnstile-response": "bad" })).status, 400);
    assert.equal((await reqCode(env, { email: "a@example.com", "cf-turnstile-response": "good" })).status, 200);
  } finally { f.restore(); }
});
test("request: at most 4 codes per address and 12 per network address an hour", async () => {
  const { env } = newEnv({ RESEND_API_KEY: "re_test" }), f = sendOk();
  try {
    for (let i = 0; i < 4; i++) assert.equal((await reqCode(env, { email: "p@example.com" }, { ip: "198.51.100.1" })).status, 200);
    assert.equal((await reqCode(env, { email: "p@example.com" }, { ip: "198.51.100.1" })).status, 429, "5th for the address");
    assert.equal((await reqCode(env, { email: "q@example.com" }, { ip: "198.51.100.2" })).status, 200, "other address and ip are fine");
    for (let i = 0; i < 12; i++) assert.equal((await reqCode(env, { email: `n${i}@example.com` }, { ip: "198.51.100.9" })).status, 200);
    assert.equal((await reqCode(env, { email: "late@example.com" }, { ip: "198.51.100.9" })).status, 429, "13th from one network address");
  } finally { f.restore(); }
});
test("request: dev mode hands the code back only on localhost with no mail key", async () => {
  const { env } = newEnv({ DEV_AUTH: "1" }), f = sendOk();
  try {
    const prod = await reqCode(env, { email: "a@example.com" }); // not localhost: tries to mail, which has no key
    assert.notEqual(prod.status, 200);
    const local = await start({ request: new Request("http://localhost:8788/api/auth/email/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "a@example.com" }) }), env });
    assert.match((await local.json()).devCode, /^\d{6}$/);
  } finally { f.restore(); }
});

test("full flow: request, verify, session cookie works, the code is single use, an expired code is refused", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test" }), f = sendOk();
  try {
    await reqCode(env, { email: "new@example.com" });
    const code = codeFrom(f);
    const v = await doVerify(env, { email: "new@example.com", code });
    assert.equal(v.status, 200);
    const sc = v.headers.get("set-cookie"); assert.match(sc, new RegExp("^" + COOKIE + "=")); assert.match(sc, /HttpOnly/); assert.match(sc, /Secure/); assert.match(sc, /SameSite=Lax/);
    const me = await getUser(new Request(ORIGIN + "/", { headers: { cookie: cookieOf(v) } }), env);
    assert.equal(me.email, "new@example.com");
    const stored = raw.prepare("SELECT id FROM sessions").get().id;
    assert.notEqual(stored, decodeURIComponent(cookieOf(v).split("=")[1]), "only the hash of the token is stored");
    assert.equal((await doVerify(env, { email: "new@example.com", code })).status, 400, "single use");
    await reqCode(env, { email: "late@example.com" }); const c2 = codeFrom(f);
    raw.prepare("UPDATE login_codes SET expires_at = datetime('now','-1 minute') WHERE email = 'late@example.com'").run();
    const late = await doVerify(env, { email: "late@example.com", code: c2 });
    assert.equal(late.status, 400); assert.match((await late.json()).error, /expired/);
    await reqCode(env, { email: "New+x@Example.com" }); const c3 = codeFrom(f); // same person, different spelling
    await doVerify(env, { email: "new@example.com", code: c3 });
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM users WHERE email = 'new@example.com'").get().n, 1);
  } finally { f.restore(); }
});
test("verify: a bad or malformed code never creates a user or session; an expired session cookie is not a user", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test" }), f = sendOk();
  try {
    await reqCode(env, { email: "z@example.com" });
    for (const code of ["12345", "abcdef", "", null]) assert.equal((await doVerify(env, { email: "z@example.com", code })).status, 400);
    assert.equal((await doVerify(env, { email: "z@example.com", code: "000000" })).status, 400);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM users").get().n + raw.prepare("SELECT COUNT(*) AS n FROM sessions").get().n, 0);
    assert.equal((await doVerify(env, { email: "z@example.com", code: "000000" }, { headers: { origin: "https://evil.example" } })).status, 403);
    const code = codeFrom(f); const v = await doVerify(env, { email: "z@example.com", code }); const ck = cookieOf(v);
    raw.prepare("UPDATE sessions SET expires_at = datetime('now','-1 second')").run();
    assert.equal(await getUser(new Request(ORIGIN + "/", { headers: { cookie: ck } }), env), null);
  } finally { f.restore(); }
});
test("a suspended account cannot finish sign-in even with a valid code", async () => {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test" });
  raw.prepare("INSERT INTO users (id,email,name,status) VALUES ('u1','s@example.com','','suspended')").run();
  raw.prepare("INSERT INTO login_codes (email, code_hash, ip, expires_at) VALUES (?,?,?, datetime('now','+10 minutes'))").run("s@example.com", await sha256("s@example.com:424242"), "x");
  const v = await doVerify(env, { email: "s@example.com", code: "424242" });
  assert.equal(v.status, 403); assert.equal(v.headers.get("set-cookie"), null);
});

test("safeNext: same-site paths only", () => {
  for (const ok of ["/", "/profile", "/e/abc?x=1#y", "/contests/foo"]) assert.equal(safeNext(ok), ok);
  for (const bad of ["//evil.example", "/\\evil.example", "https://evil.example", "/\t/evil.example", "/ x", "javascript:alert(1)", "", null, undefined, 5, "evil", "/a\nb", "/\u0000"]) assert.equal(safeNext(bad), "/", JSON.stringify(bad));
  assert.equal(normEmail("A.B+c@googlemail.com"), "ab@gmail.com");
});

// ---- Google
const G_ENV = { GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "csecret" };
const gcb = (env, qs, cookie) => gCallback({ request: new Request(`${ORIGIN}/api/auth/google/callback?${qs}`, { headers: cookie ? { cookie } : {} }), env });
const googleStub = (profile, token = { access_token: "at" }) => stubFetch((url) => /oauth2\.googleapis\.com\/token/.test(url) ? new Response(JSON.stringify(token)) : new Response(JSON.stringify(profile)));
const oauthCookie = (state, next) => "scl_oauth=" + encodeURIComponent(`${state}|${next}`);

test("google start: not configured is 503; configured redirects with a fresh state and remembers a safe next page", async () => {
  const off = await gStart({ request: new Request(ORIGIN + "/api/auth/google/start"), env: {} }); assert.equal(off.status, 503);
  const r = await gStart({ request: new Request(ORIGIN + "/api/auth/google/start?next=/profile"), env: G_ENV });
  assert.equal(r.status, 302);
  const loc = new URL(r.headers.get("location")); assert.equal(loc.host, "accounts.google.com");
  assert.equal(loc.searchParams.get("client_id"), "cid"); assert.equal(loc.searchParams.get("redirect_uri"), ORIGIN + "/api/auth/google/callback");
  const state = loc.searchParams.get("state"); assert.ok(state.length > 20);
  assert.equal(decodeURIComponent(r.headers.get("set-cookie").split(";")[0].split("=")[1]), `${state}|/profile`);
  const r2 = await gStart({ request: new Request(ORIGIN + "/api/auth/google/start?next=//evil.example"), env: G_ENV });
  assert.match(decodeURIComponent(r2.headers.get("set-cookie").split(";")[0]), /\|\/$/, "an off-site next becomes /");
  assert.notEqual(new URL(r2.headers.get("location")).searchParams.get("state"), state);
});
test("google callback: state mismatch, missing state or cookie, error and missing code go back cancelled without calling Google", async () => {
  const { env, raw } = newEnv(G_ENV), f = stubFetch(() => { throw new Error("Google must not be called"); });
  try {
    for (const [qs, ck] of [["code=c&state=other", oauthCookie("abc", "/profile")], ["code=c&state=abc", null], ["code=c", oauthCookie("abc", "/p")], ["error=access_denied&state=abc&code=c", oauthCookie("abc", "/p")], ["state=abc", oauthCookie("abc", "/p")], ["code=c&state=", oauthCookie("", "/p")]]) {
      const r = await gcb(env, qs, ck); assert.equal(r.status, 302, qs);
      assert.match(r.headers.get("location"), /signin=cancelled$/, qs);
      assert.ok(r.headers.getSetCookie().some((c) => /^scl_oauth=;.*Max-Age=0/.test(c)), "the one-time state cookie is cleared");
      assert.ok(!r.headers.getSetCookie().some((c) => c.startsWith(COOKIE + "=")));
    }
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM sessions").get().n, 0);
    assert.equal(f.calls.length, 0);
  } finally { f.restore(); }
});
test("google callback: success creates the user and a session and returns to the remembered page; an off-site next falls back to /", async () => {
  const { env, raw } = newEnv(G_ENV), f = googleStub({ sub: "g1", email: "Gina.Lee@gmail.com", email_verified: true, name: "Gina", picture: "https://lh3.googleusercontent.com/a/x" });
  try {
    const r = await gcb(env, "code=c1&state=st1", oauthCookie("st1", "/profile"));
    assert.equal(r.status, 302); assert.equal(r.headers.get("location"), "/profile");
    assert.ok(r.headers.getSetCookie().some((c) => c.startsWith(COOKIE + "=") && /Max-Age=2592000/.test(c)));
    const u = raw.prepare("SELECT * FROM users").get(); assert.equal(u.email, "ginalee@gmail.com"); assert.equal(u.google_sub, "g1"); assert.match(u.picture, /googleusercontent/);
    assert.equal(f.calls[0].init.body.get("code"), "c1"); assert.equal(f.calls[0].init.body.get("redirect_uri"), ORIGIN + "/api/auth/google/callback");
    assert.equal(f.calls[1].init.headers.authorization, "Bearer at");
    const r2 = await gcb(env, "code=c2&state=st2", oauthCookie("st2", "//evil.example"));
    assert.equal(r2.headers.get("location"), "/");
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM users").get().n, 1, "same person, same account");
  } finally { f.restore(); }
});
test("google callback: unverified email, no token, no sub, a hostile picture URL, a thrown fetch, a suspended account", async () => {
  const { env, raw } = newEnv(G_ENV), loc = async () => (await gcb(env, "code=c&state=s", oauthCookie("s", "/x"))).headers.get("location");
  let f = googleStub({ sub: "g", email: "a@example.com", email_verified: false }); try { assert.equal(await loc(), "/x?signin=failed"); } finally { f.restore(); }
  f = googleStub({ sub: "g", email: "a@example.com", email_verified: "true" }); try { assert.equal(await loc(), "/x?signin=failed", "must be boolean true"); } finally { f.restore(); }
  f = googleStub({}, { error: "invalid_grant" }); try { assert.equal(await loc(), "/x?signin=failed"); } finally { f.restore(); }
  f = googleStub({ email: "a@example.com", email_verified: true }); try { assert.equal(await loc(), "/x?signin=failed"); } finally { f.restore(); }
  f = stubFetch(() => { throw new Error("down"); }); try { assert.equal(await loc(), "/x?signin=failed"); } finally { f.restore(); }
  assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM users").get().n, 0);
  f = googleStub({ sub: "g9", email: "pic@example.com", email_verified: true, picture: "https://evil.example/x.png" });
  try { await loc(); assert.ok(!raw.prepare("SELECT picture FROM users WHERE email = 'pic@example.com'").get().picture, "only googleusercontent pictures are stored"); } finally { f.restore(); }
  raw.prepare("INSERT INTO users (id,email,name,status) VALUES ('us','sus@example.com','','suspended')").run();
  f = googleStub({ sub: "g8", email: "sus@example.com", email_verified: true });
  try { assert.equal(await loc(), "/x?signin=suspended"); assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = 'us'").get().n, 0); } finally { f.restore(); }
});
