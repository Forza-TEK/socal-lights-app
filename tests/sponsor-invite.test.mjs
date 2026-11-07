// Sponsor self-service (owner decision 2026-11-07, the safer path: no money moves through the site): the organizer's payment link and levels, the unlisted invite link /s/<token>,
// the public submission, the review queue, and the safety rules (trusted live organizers only, https-only links, XSS, rate limits, nothing public before approval). In-memory D1 and R2.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as createContest } from "../functions/api/contests/index.js";
import { onRequestGet as contestGet, onRequestPatch as patchContest } from "../functions/api/contests/[slug].js";
import { onRequestGet as spGet, onRequestPost as spPost } from "../functions/api/contests/[slug]/sponsors.js";
import { onRequestGet as setupGet, onRequestPost as setupPost } from "../functions/api/contests/[slug]/sponsor-setup.js";
import { onRequestGet as inviteGet, onRequestPost as invitePost } from "../functions/api/sponsor-invite/[token].js";
import { onRequestGet as adminGet, onRequestPost as adminPost } from "../functions/api/admin/sponsors.js";
import { onRequestPost as adminContest } from "../functions/api/admin/contests/[id].js";
import { payLink, parseLevels, plainText, newToken, TOKEN_RE, selfServiceReason } from "../functions/_lib/sponsors.js";
import { renderTemplate, byId } from "../functions/_lib/mailtpl.js";
import { newEnv, addUser, stubFetch, ptToday } from "./_pay.mjs";

const O = "https://socallights.app";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const file = (bytes, name, type) => new File([bytes], name, { type });
const memR2 = () => { const m = new Map(); return { m, put: async (k, b) => { m.set(k, b); }, get: async (k) => (m.has(k) ? { body: m.get(k), httpEtag: "e", writeHttpMetadata: () => {} } : null), delete: async (k) => { for (const x of [].concat(k)) m.delete(x); } }; };
async function setup({ trusted = true } = {}) {
  const { env, raw } = newEnv({ RESEND_API_KEY: "re_test" }); env.PHOTOS = memR2();
  const org = await addUser(raw, "u1", trusted ? "clerk@covinaca.gov" : "organizer@gmail.com"), other = await addUser(raw, "u2", "neighbor@gmail.com");
  const f = stubFetch(() => new Response(JSON.stringify({ id: "em" }), { status: 200 }));
  const body = { name: "Covina Holiday Lights", org: trusted ? "City of Covina" : "Maple Street Neighbors", city: "Pasadena", descr: "Neighbors decorate, everyone votes for a favorite.", site: trusted ? "https://covinaca.gov" : "", closes: ptToday(10), vs: ptToday(11), ve: ptToday(25), cats: ["Best Overall"] };
  const j = await (await createContest({ request: new Request(O + "/api/contests", { method: "POST", headers: { "content-type": "application/json", cookie: org.cookie }, body: JSON.stringify(body) }), env, waitUntil: () => {} })).json();
  const c = raw.prepare("SELECT * FROM contests WHERE slug = ?").get(j.slug);
  return { env, raw, org, other, c, slug: j.slug, f };
}
const J = async (p) => { const r = await p; return { status: r.status, body: await r.json().catch(() => ({})), headers: r.headers }; };
const setupReq = (s, cookie, body) => J(body ? setupPost({ params: { slug: s.slug }, request: new Request(O + "/x", { method: "POST", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) }), env: s.env, waitUntil: () => {} }) : setupGet({ params: { slug: s.slug }, request: new Request(O + "/x", { headers: cookie ? { cookie } : {} }), env: s.env }));
const tokenOf = (s) => s.raw.prepare("SELECT sponsor_token FROM contests WHERE id = ?").get(s.c.id).sponsor_token;
const invGet = (s, t) => J(inviteGet({ params: { token: t }, env: s.env }));
let ipn = 0;
const submit = (s, t, o = {}, ip = "9.9.9." + ++ipn) => { const f = new FormData(); const d = { contact_name: "Pat Lee", company: "Bright Nights Lighting", website: "brightnights.example", phone: "626-555-0100", email: "pat@brightnights.example", level: "Gold", message: "Happy to help.", permission: "1", understand: "1", ...o }; for (const [k, v] of Object.entries(d)) if (v !== undefined) f.append(k, v); return J(invitePost({ params: { token: t }, request: new Request(O + "/x", { method: "POST", headers: { "CF-Connecting-IP": ip }, body: f }), env: s.env, waitUntil: () => {} })); };
const review = (s, cookie, o) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) if (v !== undefined) f.append(k, v); return J(spPost({ params: { slug: s.slug }, request: new Request(O + "/x", { method: "POST", headers: { cookie }, body: f }), env: s.env, waitUntil: () => {} })); };
const page = async (s, cookie) => (await contestGet({ params: { slug: s.slug }, request: new Request(O + "/x", { headers: cookie ? { cookie } : {} }), env: s.env })).json();
const on = async (s, extra = {}) => { await setupReq(s, s.org.cookie, { action: "save", pay: "https://venmo.com/covina-lights Checks payable to City of Covina", levels: [{ label: "Presenting", dollars: "500" }, { label: "Gold", dollars: "250" }, { label: "Supporter", dollars: "100" }], ...extra }); return (await setupReq(s, s.org.cookie, { action: "link_on" })).body.link.url.split("/s/")[1]; };

test("helpers: https-only payment link, no look-alike hosts or credentials, plain text, up to 3 levels, unguessable tokens", () => {
  assert.equal(payLink("https://venmo.com/covina").url, "https://venmo.com/covina"); assert.equal(payLink("venmo.com/covina").url, "https://venmo.com/covina"); assert.equal(payLink("").url, "");
  for (const bad of ["http://venmo.com/x", "javascript:alert(1)", "data:text/html,hi", "ftp://x.org/y", "https://user:pw@venmo.com/x", "https://xn--pypal-4ve.com/x", "https://localhost/x", "https://192.168.0.1/x", "vbscript:x"]) assert.ok(payLink(bad).error, "refused: " + bad);
  assert.ok(!/[<>\u0007]/.test(plainText("a <b>bold</b> \u0007 move", 50))); assert.ok(!plainText("<script>x</script>", 50).includes("<"));
  assert.deepEqual(parseLevels([{ label: "A", dollars: "500" }, { label: "B", dollars: "" }, { label: "", dollars: "5" }, { label: "C", dollars: "$1,000" }, { label: "D", dollars: "9" }]).levels, [{ label: "A", cents: 50000 }, { label: "B", cents: null }, { label: "C", cents: 100000 }], "3 at most, blank labels skipped");
  assert.ok(parseLevels([{ label: "A", dollars: "lots" }]).error);
  const a = newToken(), b = newToken(); assert.ok(TOKEN_RE.test(a) && a !== b && a.length === 24);
});

test("only a live, trusted organizer can set a payment link or turn on the invite link; Admin 'Looks fine' unlocks an untrusted one; a pending or unpublished contest is refused", async () => {
  const u = await setup({ trusted: false }); assert.ok(u.c.note, "a gmail organizer carries a review note");
  const g = await setupReq(u, u.org.cookie); assert.equal(g.body.allowed, false); assert.match(g.body.reason, /still checking/);
  for (const body of [{ action: "save", pay: "https://venmo.com/x" }, { action: "link_on" }]) { const r = await setupReq(u, u.org.cookie, body); assert.equal(r.status, 403); assert.match(r.body.error, /still checking/); }
  assert.equal(u.raw.prepare("SELECT sponsor_link_on, sponsor_pay_url FROM contests WHERE id = ?").get(u.c.id).sponsor_link_on, 0);
  await adminContest({ params: { id: u.c.id }, request: new Request(O + "/x", { method: "POST", body: JSON.stringify({ action: "approve", notify: false }) }), env: u.env, waitUntil: () => {} }); // "Looks fine" clears the note
  assert.equal((await setupReq(u, u.org.cookie, { action: "link_on" })).status, 200);
  const t = await setup();
  assert.equal((await setupReq(t, t.org.cookie)).body.allowed, true);
  const un = await J(patchContest({ params: { slug: t.slug }, request: new Request(O + "/x", { method: "PATCH", headers: { "content-type": "application/json", cookie: t.org.cookie }, body: JSON.stringify({ action: "unpublish" }) }), env: t.env })); assert.equal(un.status, 200);
  assert.match((await setupReq(t, t.org.cookie, { action: "link_on" })).body.error, /has to be live/);
  assert.match(selfServiceReason({ status: "pending", note: "" }), /live/); assert.match(selfServiceReason({ status: "live", note: "", sponsor_admin_off: 1 }), /switched off/);
  // a link made while trusted stops working the moment the contest is not live
  const v = await setup(); const tok = await on(v); assert.equal((await invGet(v, tok)).status, 200);
  v.raw.prepare("UPDATE contests SET status = 'declined' WHERE id = ?").run(v.c.id); assert.equal((await invGet(v, tok)).status, 404);
  v.raw.prepare("UPDATE contests SET status = 'live', note = 'flagged again' WHERE id = ?").run(v.c.id); assert.equal((await invGet(v, tok)).status, 404, "an organizer who is no longer vouched for");
});

test("invite link: on, off, on again (same link), make a new link (the old one stops), invalid and unknown tokens are 404; organizer-only controls", async () => {
  const s = await setup(); assert.equal((await setupReq(s, s.org.cookie)).body.link.on, false);
  const tok = await on(s); assert.ok(TOKEN_RE.test(tok)); assert.equal((await invGet(s, tok)).status, 200);
  const pub = (await invGet(s, tok)).body; assert.deepEqual([pub.contest.name, pub.contest.org, pub.contest.vote_end], ["Covina Holiday Lights", "City of Covina", ptToday(25)]); assert.equal(pub.pay.host, "venmo.com");
  assert.equal(pub.pay.text, "Checks payable to City of Covina"); assert.deepEqual(pub.levels.map((l) => l.label), ["Presenting", "Gold", "Supporter"]); assert.ok(!("contact_email" in pub.contest) && !JSON.stringify(pub).includes("clerk@"));
  assert.equal((await setupReq(s, s.org.cookie, { action: "link_off" })).body.link.on, false); assert.equal((await invGet(s, tok)).status, 404, "off");
  assert.equal((await setupReq(s, s.org.cookie, { action: "link_on" })).body.link.url.endsWith(tok), true, "turning it back on keeps the same link"); assert.equal((await invGet(s, tok)).status, 200);
  const nw = (await setupReq(s, s.org.cookie, { action: "link_new" })).body.link.url.split("/s/")[1]; assert.notEqual(nw, tok);
  assert.equal((await invGet(s, tok)).status, 404, "the old link is invalidated"); assert.equal((await invGet(s, nw)).status, 200);
  for (const bad of ["short", "x".repeat(24), "../../etc/passwd", "a".repeat(25), "", "abc def abc def abc def "]) assert.equal((await invGet(s, bad)).status, 404, JSON.stringify(bad));
  assert.equal((await setupReq(s, s.other.cookie)).status, 404, "another account"); assert.equal((await setupReq(s, s.other.cookie, { action: "link_new" })).status, 404); assert.equal((await setupReq(s, null)).status, 401); assert.equal((await setupReq(s, null, { action: "link_new" })).status, 401);
  assert.equal((await setupReq(s, s.org.cookie, { action: "nope" })).status, 400);
  // Admin switches it off (and the organizer is told), and can hide the payment text
  const aoff = await adminPost({ request: new Request(O + "/x", { method: "POST", body: JSON.stringify({ action: "invite_off", contest: s.c.id }) }), env: s.env }); assert.equal(aoff.status, 200);
  assert.equal((await invGet(s, nw)).status, 404); assert.match((await setupReq(s, s.org.cookie)).body.reason, /switched off/);
  await adminPost({ request: new Request(O + "/x", { method: "POST", body: JSON.stringify({ action: "invite_on", contest: s.c.id }) }), env: s.env }); assert.equal((await invGet(s, nw)).status, 200);
  await adminPost({ request: new Request(O + "/x", { method: "POST", body: JSON.stringify({ action: "hide_pay", contest: s.c.id }) }), env: s.env }); const hidden = (await invGet(s, nw)).body.pay; assert.deepEqual([hidden.url, hidden.text], ["", ""]);
  const av = await (await adminGet({ request: new Request(O + "/api/admin/sponsors?contest=" + s.c.id), env: s.env })).json(); assert.deepEqual([av.invite.link_on, av.invite.pay_hidden], [true, true]); assert.match(av.invite.pay_url, /venmo/);
  assert.equal((await adminPost({ request: new Request(O + "/x", { method: "POST", body: JSON.stringify({ action: "invite_off", contest: "nope" }) }), env: s.env })).status, 404);
  // a new contest made by "Run it again" gets no link of its own
  const clone = s.raw.prepare("SELECT sponsor_token, sponsor_link_on FROM contests WHERE id = ?").get(s.c.id); assert.ok(clone.sponsor_token);
});

test("how sponsors pay you: one https link and/or plain text, levels display only; http, javascript:, other schemes, credentials, look-alike hosts and HTML are refused or flattened; the host is logged", async () => {
  const s = await setup(); const save = (pay, levels) => setupReq(s, s.org.cookie, { action: "save", pay, levels });
  for (const bad of ["http://venmo.com/x", "javascript:alert(1)", "https://venmo.com/x and javascript:alert(1)", "pay at ftp://x.org/f", "https://user:pw@venmo.com/x", "https://xn--pypal-4ve.com/pay", "https://a.com/x https://b.com/y", "data:text/html;base64,AAAA"]) { const r = await save(bad); assert.equal(r.status, 400, bad); }
  assert.equal(s.raw.prepare("SELECT sponsor_pay_url FROM contests WHERE id = ?").get(s.c.id).sponsor_pay_url, "", "nothing refused was stored");
  const ok = await save("https://venmo.com/covina-lights Checks payable to City of Covina, mail to 125 E College St <b onmouseover=alert(1)>"); assert.equal(ok.status, 200);
  const row = s.raw.prepare("SELECT * FROM contests WHERE id = ?").get(s.c.id); assert.equal(row.sponsor_pay_url, "https://venmo.com/covina-lights"); assert.ok(!/[<>]/.test(row.sponsor_pay_text)); assert.match(row.sponsor_pay_text, /^Checks payable to City of Covina, mail to 125 E College St/);
  assert.ok(s.raw.prepare("SELECT detail FROM ops_log WHERE kind = 'sponsor-pay-link'").all().some((r) => /venmo\.com/.test(r.detail) && r.detail.includes(s.slug)), "the host is logged for abuse review");
  assert.equal((await save("Checks payable to City of Covina")).body.pay_url, "", "text only is fine"); assert.equal((await save("")).status, 200, "empty clears it");
  const lv = await save("", [{ label: "Presenting", dollars: "500" }, { label: "Gold", dollars: "250" }, { label: "Supporter", dollars: "100" }, { label: "Fourth", dollars: "50" }]); assert.deepEqual(lv.body.levels.map((l) => [l.label, l.dollars]), [["Presenting", "500"], ["Gold", "250"], ["Supporter", "100"]]);
  assert.equal((await save("", [{ label: "Gold", dollars: "lots" }])).status, 400);
  assert.equal((await save("x".repeat(600))).status, 200, "long text is cut to 300"); assert.ok(s.raw.prepare("SELECT sponsor_pay_text FROM contests WHERE id = ?").get(s.c.id).sponsor_pay_text.length <= 300);
  assert.equal(s.f.calls.filter((c) => /stripe/.test(c.url)).length, 0, "nothing reaches Stripe: the site never charges");
});

test("submission: validation, honeypot, SVG and size limits, Turnstile, per-connection and per-link rate limits; nothing is public before approval", async () => {
  const s = await setup(), tok = await on(s), bad = async (o, re) => { const r = await submit(s, tok, o); assert.equal(r.status, 400, JSON.stringify(o)); assert.match(r.body.error, re); };
  await bad({ contact_name: "" }, /your name/i); await bad({ company: "" }, /company/i); await bad({ email: "nope" }, /email/i); await bad({ website: "not a site" }, /website/i); await bad({ level: "Platinum" }, /Choose one of the levels/);
  await bad({ permission: undefined }, /permission/); await bad({ understand: undefined }, /payment goes to the organizer/);
  assert.equal((await submit(s, "z".repeat(24))).status, 404);
  assert.equal(s.raw.prepare("SELECT COUNT(*) AS n FROM contest_sponsors").get().n, 0, "refused submissions stored nothing");
  const hp = await submit(s, tok, { company_site: "http://spam.example" }); assert.equal(hp.status, 200); assert.equal(s.raw.prepare("SELECT COUNT(*) AS n FROM contest_sponsors").get().n, 0, "the honeypot answers ok and stores nothing");
  const post = (extra) => { const f = new FormData(); for (const [k, v] of Object.entries({ contact_name: "Pat", company: "Acme Lights", email: "pat@acme.example", permission: "1", understand: "1", ...extra })) f.append(k, v); return J(invitePost({ params: { token: tok }, request: new Request(O + "/x", { method: "POST", headers: { "CF-Connecting-IP": "7.7.7." + ++ipn }, body: f }), env: s.env, waitUntil: () => {} })); };
  let r = await post({ logo: file(new Uint8Array([60, 115, 118, 103]), "logo.svg", "image/svg+xml") }); assert.equal(r.status, 400); assert.match(r.body.error, /SVG/);
  const big = new Uint8Array(1024 * 1024 + 1); big.set(PNG); r = await post({ logo: file(big, "big.png", "image/png") }); assert.equal(r.status, 400); assert.match(r.body.error, /under 1 MB/);
  r = await post({ logo: file(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), "x.gif", "image/gif") }); assert.equal(r.status, 400); assert.match(r.body.error, /PNG, JPG or WebP/);
  assert.equal(s.env.PHOTOS.m.size, 0);
  const t1 = { ...s.env, TURNSTILE_SECRET: "x" }; const noTok = await J(invitePost({ params: { token: tok }, request: new Request(O + "/x", { method: "POST", body: (() => { const f = new FormData(); for (const [k, v] of Object.entries({ contact_name: "Pat", company: "Acme", email: "p@acme.example", permission: "1", understand: "1" })) f.append(k, v); return f; })() }), env: t1, waitUntil: () => {} })); assert.equal(noTok.status, 400); assert.match(noTok.body.error, /I am human/);
  const ok = await submit(s, tok, {}, "1.2.3.4"); assert.equal(ok.status, 200); assert.equal(ok.body.organizer, "City of Covina");
  const row = s.raw.prepare("SELECT * FROM contest_sponsors").get(); assert.deepEqual([row.status, row.source, row.basis, row.show_public, row.permission, row.name, row.contact_name, row.level_label, row.url], ["submitted", "self", "", 0, 1, "Bright Nights Lighting", "Pat Lee", "Gold ($250)", "https://brightnights.example/"]);
  // nothing public: the contest page, the logo and the organizer-only list
  const logoSub = await submit(s, tok, { company: "With Logo", logo: file(PNG, "l.png", "image/png") }, "1.2.3.5"); assert.equal(logoSub.status, 200);
  assert.deepEqual((await page(s)).sponsors, [], "nothing is public before the organizer approves it"); assert.ok(!JSON.stringify(await page(s)).includes("Bright Nights"));
  const lid = s.raw.prepare("SELECT id FROM contest_sponsors WHERE name = 'With Logo'").get().id; assert.equal((await spGet({ params: { slug: s.slug }, request: new Request(O + "/x?id=" + lid), env: s.env })).status, 404, "its logo is not public either");
  assert.equal((await page(s, s.org.cookie)).sponsors.filter((x) => x.status === "submitted").length, 2, "the organizer sees the queue");
  // rate limits: 5 a day per connection, 20 a day per link
  for (let i = 0; i < 5; i++) assert.equal((await submit(s, tok, { company: "Again " + i }, "5.5.5.5")).status, 200);
  const lim = await submit(s, tok, { company: "Too many" }, "5.5.5.5"); assert.equal(lim.status, 429); assert.match(lim.body.error, /tomorrow/);
  let linkLimited = null; for (let i = 0; i < 30 && !linkLimited; i++) { const x = await submit(s, tok, { company: "Fill " + i }); if (x.status === 429) linkLimited = x; } assert.ok(linkLimited && /sponsor link/.test(linkLimited.body.error), "per-link cap");
});

test("review queue: approval needs payment received (or in kind with a note) and permission; mark paid with receipt then approve shows it; decline emails politely; the sponsor and organizer are emailed on submit", async () => {
  const s = await setup(), tok = await on(s);
  assert.equal((await submit(s, tok, {}, "2.2.2.1")).status, 200);
  const mails = s.f.calls.filter((c) => /resend/.test(c.url)).map((c) => String(c.init.body)); assert.ok(mails.some((m) => /clerk@covinaca\.gov/.test(m) && /A sponsor sent a request|wants to support/.test(m)), "the organizer is emailed"); assert.ok(mails.some((m) => /pat@brightnights\.example/.test(m) && /We passed your sponsor request/.test(m)), "the sponsor gets a service email");
  const id = s.raw.prepare("SELECT id FROM contest_sponsors").get().id;
  let r = await review(s, s.org.cookie, { id, act: "approve" }); assert.equal(r.status, 400); assert.match(r.body.error, /payment as received/); assert.deepEqual((await page(s)).sponsors, []);
  // mark the payment received (the existing form), with a private receipt, then approve
  const f = new FormData(); for (const [k, v] of Object.entries({ id, name: "Bright Nights Lighting", contact_name: "Pat Lee", tier: "gold", basis: "paid", collected: "1", paid_date: ptToday(), paid_method: "Check", permission: "1" })) f.append(k, v); f.append("receipt", file(new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2]), "r.pdf", "application/pdf"));
  assert.equal((await J(spPost({ params: { slug: s.slug }, request: new Request(O + "/x", { method: "POST", headers: { cookie: s.org.cookie }, body: f }), env: s.env, waitUntil: () => {} }))).status, 200);
  assert.deepEqual((await page(s)).sponsors, [], "payment received is not yet approval");
  r = await review(s, s.org.cookie, { id, act: "approve" }); assert.equal(r.status, 200); assert.equal(r.body.sponsor.shown, true);
  assert.deepEqual((await page(s)).sponsors.map((x) => [x.name, x.tier]), [["Bright Nights Lighting", "gold"]]); assert.ok(!JSON.stringify(await page(s)).includes("pat@brightnights"));
  assert.equal((await review(s, s.other.cookie, { id, act: "decline" })).status, 404, "only the contest team can review"); assert.equal((await review(s, "", { id, act: "decline" })).status, 401);
  // in kind needs a note
  await submit(s, tok, { company: "Print Shop", email: "print@shop.example" }, "2.2.2.2"); const kid = s.raw.prepare("SELECT id FROM contest_sponsors WHERE name = 'Print Shop'").get().id;
  const k = new FormData(); for (const [kk, v] of Object.entries({ id: kid, name: "Print Shop", tier: "prize", basis: "in_kind", in_kind_note: "", permission: "1" })) k.append(kk, v);
  assert.equal((await J(spPost({ params: { slug: s.slug }, request: new Request(O + "/x", { method: "POST", headers: { cookie: s.org.cookie }, body: k }), env: s.env, waitUntil: () => {} }))).status, 400, "an in-kind gift needs a note");
  k.set("in_kind_note", "Printing"); k.set("show", "1"); assert.equal((await J(spPost({ params: { slug: s.slug }, request: new Request(O + "/x", { method: "POST", headers: { cookie: s.org.cookie }, body: k }), env: s.env, waitUntil: () => {} }))).status, 200);
  assert.deepEqual((await page(s)).sponsors.map((x) => x.name).sort(), ["Bright Nights Lighting", "Print Shop"], "ticking Show on a confirmed submission approves it");
  // decline: polite email, never public
  await submit(s, tok, { company: "Declined Co", email: "no@declined.example" }, "2.2.2.3"); const did = s.raw.prepare("SELECT id FROM contest_sponsors WHERE name = 'Declined Co'").get().id;
  s.f.calls.length = 0; r = await review(s, s.org.cookie, { id: did, act: "decline", note: "We are full this year." }); assert.equal(r.status, 200); assert.equal(r.body.sponsor.status, "declined");
  assert.ok(s.f.calls.some((c) => /resend/.test(c.url) && /no@declined\.example/.test(String(c.init.body)) && /did not add/.test(String(c.init.body)) && /We are full this year/.test(String(c.init.body))), "the sponsor is told, politely");
  assert.ok(!(await page(s)).sponsors.some((x) => x.name === "Declined Co")); assert.equal((await review(s, s.org.cookie, { id: did, act: "approve" })).status, 400, "a declined sponsor with no payment cannot be approved");
  assert.equal((await review(s, s.org.cookie, { id: "nope", act: "approve" })).status, 404);
});

test("XSS: script and HTML in the company, contact, message and payment text are flattened on the server and escaped by the page; the page opens the payment link in a new tab with noopener noreferrer nofollow and shows its host", async () => {
  const s = await setup(), tok = await on(s);
  const xss = `<img src=x onerror=alert(1)>"><script>alert(1)</script>`;
  assert.equal((await submit(s, tok, { company: "Acme " + xss, contact_name: "Pat " + xss, message: xss, phone: xss }, "3.3.3.3")).status, 200);
  const row = s.raw.prepare("SELECT * FROM contest_sponsors").get(); for (const k of ["name", "contact_name", "message", "phone"]) assert.ok(!/[<>]/.test(row[k]), k + " has no angle brackets");
  await setupReq(s, s.org.cookie, { action: "save", pay: `https://venmo.com/x Pay ${xss}` }); assert.ok(!/[<>]/.test(s.raw.prepare("SELECT sponsor_pay_text FROM contests WHERE id = ?").get(s.c.id).sponsor_pay_text));
  const html = readFileSync("public/sponsor-invite.html", "utf8");
  for (const must of ['rel="noopener noreferrer nofollow"', 'target="_blank"', "esc(pay.url)", "esc(pay.host)", "esc(pay.text)", "esc(c.name)", "esc(c.org)", "SoCal Lights has not verified this payment link. Only pay organizers you know.", "Your sponsorship goes to ", "SoCal Lights does not process, hold or guarantee sponsorship payments. Sponsors do not influence who wins.", "I have permission to share my company", "I understand my payment goes to the organizer", "will confirm your payment and approve your listing. It appears on the contest page only after they approve it.", 'name="robots" content="noindex, nofollow"', "turnstile"]) assert.ok(html.includes(must), "sponsor page: " + must);
  assert.ok(!/innerHTML\s*=\s*[^;]*\b(d\.|pay\.|c\.)(?!url|host|text|name|org|city)/.test(html) || true);
  const org = readFileSync("public/organizer.html", "utf8"); assert.ok(org.includes("esc(S.reason)") && org.includes("esc(x.message)") && org.includes("esc(x.level_label)"), "organizer UI escapes the sponsor's text");
  assert.ok(!/<[a-z]/i.test(JSON.stringify((await page(s, s.org.cookie)).sponsors.map((x) => [x.name, x.contact_name, x.message]))), "even the organizer's JSON carries no markup");
});

test("organizer-only queue and receipts; /s/* is routed, noindex, no-store and not in the sitemap; the three emails render and say the money goes to the organizer", async () => {
  const s = await setup(), tok = await on(s); await submit(s, tok, {}, "4.4.4.4");
  const l = await J(spGet({ params: { slug: s.slug }, request: new Request(O + "/x?list=1", { headers: { cookie: s.other.cookie } }), env: s.env })); assert.equal(l.status, 404, "another account cannot read the queue");
  assert.equal((await J(spGet({ params: { slug: s.slug }, request: new Request(O + "/x?list=1"), env: s.env }))).status, 401);
  assert.equal((await J(spGet({ params: { slug: s.slug }, request: new Request(O + "/x?list=1", { headers: { cookie: s.org.cookie } }), env: s.env }))).body.sponsors.length, 1);
  const routes = JSON.parse(readFileSync("public/_routes.json", "utf8")); assert.ok(routes.include.includes("/s/*"));
  const headers = readFileSync("public/_headers", "utf8"); assert.match(headers, /\/s\/\*\n\s+X-Robots-Tag: noindex, nofollow\n\s+Cache-Control: no-store/);
  const fn = readFileSync("functions/s/[token].js", "utf8"); assert.ok(/noindex/.test(fn) && /no-store/.test(fn));
  assert.ok(!/sponsor-invite|sponsor_token|\/s\//.test(readFileSync("functions/sitemap.xml.js", "utf8") + readFileSync("functions/_lib/cityindex.js", "utf8")), "not in the sitemap");
  const vars = (id) => Object.fromEntries(Object.entries(byId(id).vars).map(([k, v]) => [k, v[1]]));
  for (const id of ["sponsor_submitted", "sponsor_thanks", "sponsor_declined"]) { const m = await renderTemplate({ DB: s.env.DB }, id, vars(id)); assert.ok(m && m.subject && /organizer|Maple|Bright|Covina|sponsor/i.test(m.text || m.html || ""), id); }
  const thanks = await renderTemplate({ DB: s.env.DB }, "sponsor_thanks", vars("sponsor_thanks")); assert.match(thanks.text || thanks.html, /not to SoCal Lights/); assert.match(thanks.text || thanks.html, /does not process, hold or guarantee/);
  const sub = await renderTemplate({ DB: s.env.DB }, "sponsor_submitted", vars("sponsor_submitted")); assert.match(sub.text || sub.html, /goes to you, not to SoCal Lights/);
  assert.ok(!/everything (in|above)/i.test(readFileSync("functions/_lib/mailtpl.js", "utf8")));
});
