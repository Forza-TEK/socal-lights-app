// Organizer-collected sponsors (owner decision 2026-11-07): the site is not a party to sponsor money. Records, the show-on-page rule, logo and receipt limits, PRIVATE receipt access,
// the Admin view and hide, deletion and retention cleanup, clone, and the copy. In-memory D1 and an in-memory R2; nothing leaves the test.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as createContest } from "../functions/api/contests/index.js";
import { onRequestGet as contestGet, onRequestPatch as patchContest } from "../functions/api/contests/[slug].js";
import { onRequestGet as spGet, onRequestPost as spPost, onRequestDelete as spDelete } from "../functions/api/contests/[slug]/sponsors.js";
import { onRequestGet as adminGet, onRequestPost as adminPost } from "../functions/api/admin/sponsors.js";
import { deleteAccount } from "../functions/_lib/account.js";
import { deleteContest } from "../functions/_lib/contests.js";
import { pruneRetention, pruneSponsorRecords } from "../functions/_lib/retention.js";
import { isPublic, PUBLIC_WHERE } from "../functions/_lib/sponsors.js";
import { newEnv, addUser, ptToday } from "./_pay.mjs";

const O = "https://socallights.app";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]), PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 1, 2]), WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const file = (bytes, name, type) => new File([bytes], name, { type });
function r2() {
  const m = new Map();
  return { m, put: async (k, b, o) => { m.set(k, { b: new Uint8Array(b instanceof ArrayBuffer ? b : b), type: (o && o.httpMetadata && o.httpMetadata.contentType) || "" }); }, get: async (k) => { const x = m.get(k); return x ? { body: x.b, httpEtag: "e", writeHttpMetadata: (h) => h.set("content-type", x.type) } : null; }, delete: async (k) => { for (const x of [].concat(k)) m.delete(x); } };
}
async function setup() {
  const { env, raw } = newEnv(); env.PHOTOS = r2();
  const org = await addUser(raw, "u1", "organizer@gmail.com"), other = await addUser(raw, "u2", "neighbor@gmail.com"), co = await addUser(raw, "u3", "co@gmail.com");
  const j = await (await createContest({ request: new Request(O + "/api/contests", { method: "POST", headers: { "content-type": "application/json", cookie: org.cookie }, body: JSON.stringify({ name: "Maple Street Showdown", org: "Maple Street Neighbors", city: "Pasadena", descr: "Neighbors decorate, everyone votes for a favorite.", site: "", closes: ptToday(10), vs: ptToday(11), ve: ptToday(25), cats: ["Best Overall"] }) }), env })).json();
  const c = raw.prepare("SELECT * FROM contests WHERE slug = ?").get(j.slug);
  raw.prepare("INSERT INTO contest_staff (contest_id, email) VALUES (?,?)").run(c.id, "co@gmail.com");
  return { env, raw, org, other, co, c, slug: j.slug };
}
const fd = (o) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null) f.append(k, v); return f; };
const PAID = (o = {}) => ({ name: "Bright Nights Lighting", contact_name: "Pat Lee", tier: "gold", url: "brightnights.example", phone: "626-555-0100", email: "pat@brightnights.example", amount: "500", basis: "paid", collected: "1", paid_date: "2026-11-05", paid_method: "Check", permission: "1", show: "1", ...o });
const post = async (s, cookie, o, extra = {}) => { const form = fd(o); for (const [k, v] of Object.entries(extra)) form.append(k, v); const r = await spPost({ params: { slug: s.slug }, request: new Request(O + `/api/contests/${s.slug}/sponsors`, { method: "POST", headers: { ...(cookie ? { cookie } : {}) }, body: form }), env: s.env, waitUntil: () => {} }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
const get = async (s, cookie, qs) => { const r = await spGet({ params: { slug: s.slug }, request: new Request(O + `/api/contests/${s.slug}/sponsors?${qs}`, { headers: cookie ? { cookie } : {} }), env: s.env }); return r; };
const page = async (s, cookie) => (await contestGet({ params: { slug: s.slug }, request: new Request(O + `/api/contests/${s.slug}`, { headers: cookie ? { cookie } : {} }), env: s.env })).json();

test("create a paid sponsor: contact, website normalized, amount in cents, logo and a private receipt stored under non-public keys", async () => {
  const s = await setup();
  const r = await post(s, s.org.cookie, PAID(), { logo: file(PNG, "logo.png", "image/png"), receipt: file(PDF, "invoice.pdf", "application/pdf") });
  assert.equal(r.status, 200);
  const row = s.raw.prepare("SELECT * FROM contest_sponsors WHERE id = ?").get(r.body.id);
  assert.deepEqual([row.name, row.contact_name, row.url, row.phone, row.email, row.amount_cents, row.basis, row.paid_date, row.paid_method, row.tier, row.show_public, row.permission], ["Bright Nights Lighting", "Pat Lee", "https://brightnights.example/", "626-555-0100", "pat@brightnights.example", 50000, "paid", "2026-11-05", "Check", "gold", 1, 1]);
  assert.match(row.logo, /^sponsor\/[^/]+\/[0-9a-f]+\.png$/); assert.match(row.receipt, /^sponsor-receipt\/[^/]+\/[0-9a-f]+\.pdf$/); assert.equal(row.receipt_name, "invoice.pdf");
  assert.ok(s.env.PHOTOS.m.has(row.logo) && s.env.PHOTOS.m.has(row.receipt));
  // update: change the method and keep the files
  const u = await post(s, s.org.cookie, PAID({ id: r.body.id, paid_method: "Bank transfer", amount: "" }));
  assert.equal(u.status, 200); const after = s.raw.prepare("SELECT * FROM contest_sponsors WHERE id = ?").get(r.body.id);
  assert.deepEqual([after.paid_method, after.amount_cents, after.receipt, after.logo], ["Bank transfer", null, row.receipt, row.logo]);
  assert.equal((await post(s, s.org.cookie, PAID({ id: "nope" }))).status, 404);
  // replacing the receipt deletes the old file; removing it deletes it too
  const rep = await post(s, s.org.cookie, PAID({ id: r.body.id }), { receipt: file(PNG, "scan.png", "image/png") });
  assert.equal(rep.status, 200); assert.ok(!s.env.PHOTOS.m.has(row.receipt), "the old receipt is gone"); const nr = s.raw.prepare("SELECT receipt FROM contest_sponsors WHERE id = ?").get(r.body.id).receipt; assert.match(nr, /\.png$/);
  await post(s, s.org.cookie, PAID({ id: r.body.id }), { remove_receipt: "1" }); assert.equal(s.raw.prepare("SELECT receipt FROM contest_sponsors WHERE id = ?").get(r.body.id).receipt, ""); assert.ok(!s.env.PHOTOS.m.has(nr));
});

test("validation: payment confirmation, date and method; in-kind note; show needs a confirmed basis and permission; amount and email formats; sign-in and ownership", async () => {
  const s = await setup(), bad = async (o, re) => { const r = await post(s, s.org.cookie, o); assert.equal(r.status, 400, JSON.stringify(o)); assert.match(r.body.error, re); };
  await bad(PAID({ collected: undefined }), /Payment collected by me/); await bad(PAID({ paid_date: "" }), /date you received/); await bad(PAID({ paid_method: "" }), /how it was paid|Say how/i);
  await bad(PAID({ basis: "in_kind", in_kind_note: "" }), /donated in kind/i); await bad(PAID({ basis: "" }), /confirm that you collected/);
  await bad(PAID({ permission: undefined }), /permission/); await bad(PAID({ amount: "lots" }), /amount/); await bad(PAID({ email: "nope" }), /email/); await bad(PAID({ name: "" }), /company name/); await bad(PAID({ url: "not a site" }), /website/);
  assert.equal((await post(s, null, PAID())).status, 401); assert.equal((await post(s, s.other.cookie, PAID())).status, 404, "someone who is not on the team");
  assert.equal((await post(s, s.org.cookie, PAID({ basis: "", collected: undefined, show: undefined }))).status, 200, "an unconfirmed draft can be saved");
  assert.equal((await post(s, s.org.cookie, PAID({ basis: "in_kind", collected: undefined, in_kind_note: "20 yard signs", show: undefined, name: "Print Shop" }))).status, 200);
  assert.equal(s.raw.prepare("SELECT paid_method FROM contest_sponsors WHERE name = 'Print Shop'").get().paid_method, "", "payment details are dropped for an in-kind gift");
  assert.equal((await post(s, s.co.cookie, PAID({ name: "Added by co-organizer" }))).status, 200, "co-organizers manage sponsors too");
});

test("logo and receipt limits: logo under 600 KB and JPG/PNG/WebP; receipt under 5 MB and PDF/JPG/PNG; a refused upload leaves nothing in R2 or the database", async () => {
  const s = await setup(), n0 = () => s.raw.prepare("SELECT COUNT(*) AS n FROM contest_sponsors").get().n;
  const big = new Uint8Array(601 * 1024); big.set(PNG);
  let r = await post(s, s.org.cookie, PAID(), { logo: file(big, "big.png", "image/png") }); assert.equal(r.status, 400); assert.match(r.body.error, /under 600 KB/);
  r = await post(s, s.org.cookie, PAID(), { logo: file(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]), "x.gif", "image/gif") }); assert.equal(r.status, 400); assert.match(r.body.error, /JPG, PNG or WebP/);
  assert.equal((await post(s, s.org.cookie, PAID(), { logo: file(WEBP, "l.webp", "image/webp") })).status, 200, "a WebP logo is fine");
  const huge = new Uint8Array(5 * 1024 * 1024 + 1); huge.set(PDF);
  r = await post(s, s.org.cookie, PAID({ name: "Second Sponsor" }), { receipt: file(huge, "big.pdf", "application/pdf") }); assert.equal(r.status, 400); assert.match(r.body.error, /under 5 MB/);
  r = await post(s, s.org.cookie, PAID({ name: "Second Sponsor" }), { receipt: file(WEBP, "r.webp", "image/webp") }); assert.equal(r.status, 400); assert.match(r.body.error, /PDF, JPG or PNG/);
  r = await post(s, s.org.cookie, PAID({ name: "Second Sponsor" }), { logo: file(PNG, "ok.png", "image/png"), receipt: file(huge, "big.pdf", "application/pdf") }); assert.equal(r.status, 400);
  assert.equal(n0(), 1); assert.equal([...s.env.PHOTOS.m.keys()].filter((k) => !k.includes("l.webp") && /sponsor/.test(k)).length, 1, "only the first sponsor's logo exists: the refused ones stored nothing");
  for (let i = 0; i < 11; i++) assert.equal((await post(s, s.org.cookie, PAID({ name: "Sponsor number " + i }))).status, 200);
  assert.equal((await post(s, s.org.cookie, PAID({ name: "One too many" }))).status, 400, "at most 12 sponsors");
});

test("show-on-page rule: only shown when show + (paid or in kind with a note) + permission + not hidden; the public sees logo, name and website only", async () => {
  const s = await setup();
  const shown = await post(s, s.org.cookie, PAID(), { logo: file(PNG, "l.png", "image/png"), receipt: file(PDF, "r.pdf", "application/pdf") });
  const kind = await post(s, s.org.cookie, PAID({ name: "Print Shop", basis: "in_kind", collected: undefined, in_kind_note: "Printing" }));
  const draft = await post(s, s.org.cookie, PAID({ name: "Draft Sponsor", basis: "", collected: undefined, show: undefined }));
  const off = await post(s, s.org.cookie, PAID({ name: "Kept Off Page", show: undefined }));
  const noperm = s.raw.prepare("INSERT INTO contest_sponsors (id, contest_id, name, basis, show_public, permission, paid_date, paid_method) VALUES ('np', ?, 'No Permission', 'paid', 1, 0, '2026-11-05', 'Cash')").run(s.c.id);
  const pub = await page(s); assert.deepEqual(pub.sponsors.map((x) => x.name).sort(), ["Bright Nights Lighting", "Print Shop"]);
  const one = pub.sponsors.find((x) => x.name === "Bright Nights Lighting"); assert.deepEqual(Object.keys(one).sort(), ["id", "logo", "name", "tier", "url"]);
  const text = JSON.stringify(pub); for (const secret of ["pat@brightnights", "626-555", "Pat Lee", "50000", "sponsor-receipt", "Check", "organizer@gmail.com".toUpperCase()]) assert.ok(!text.includes(secret), "the public page JSON must not carry " + secret);
  const mine = await page(s, s.org.cookie); assert.equal(mine.sponsors.length, 5); const m1 = mine.sponsors.find((x) => x.name === "Bright Nights Lighting"); assert.deepEqual([m1.email, m1.amount_cents, m1.receipt, m1.shown], ["pat@brightnights.example", 50000, true, true]); assert.ok(!JSON.stringify(mine).includes("sponsor-receipt/"), "even the organizer's list holds no storage key");
  // SQL and JS agree
  const ids = s.raw.prepare(`SELECT name FROM contest_sponsors WHERE contest_id = ? AND ${PUBLIC_WHERE}`).all(s.c.id).map((x) => x.name).sort(); assert.deepEqual(ids, ["Bright Nights Lighting", "Print Shop"]);
  assert.equal(isPublic({ show_public: 1, hidden_by_admin: 0, permission: 1, basis: "in_kind", in_kind_note: "" }), false); assert.equal(isPublic({ show_public: 1, hidden_by_admin: 0, permission: 1, basis: "legacy" }), true);
  assert.ok(draft.status === 200 && off.status === 200 && kind.status === 200 && shown.status === 200 && noperm.changes === 1);
  // logo: public only for a shown sponsor; the kept-off sponsor's logo is staff only
  const lg = await get(s, null, "id=" + shown.body.id); assert.equal(lg.status, 200); assert.match(lg.headers.get("cache-control"), /public/);
  await post(s, s.org.cookie, PAID({ id: off.body.id, show: undefined }), { logo: file(PNG, "l.png", "image/png") });
  assert.equal((await get(s, null, "id=" + off.body.id)).status, 404, "a sponsor that is not shown has no public logo"); assert.equal((await get(s, s.org.cookie, "id=" + off.body.id)).status, 200);
  // Admin hides: it disappears from the public page at once
  const h = await adminPost({ request: new Request(O + "/api/admin/sponsors", { method: "POST", body: JSON.stringify({ action: "hide", id: shown.body.id }) }), env: s.env }); assert.equal(h.status, 200);
  assert.deepEqual((await page(s)).sponsors.map((x) => x.name), ["Print Shop"]); assert.equal((await get(s, null, "id=" + shown.body.id)).status, 404);
  assert.equal((await page(s, s.org.cookie)).sponsors.find((x) => x.name === "Bright Nights Lighting").hidden_by_admin, true, "the organizer is told");
  await adminPost({ request: new Request(O + "/api/admin/sponsors", { method: "POST", body: JSON.stringify({ action: "show", id: shown.body.id }) }), env: s.env }); assert.equal((await page(s)).sponsors.length, 2);
  assert.equal((await adminPost({ request: new Request(O + "/api/admin/sponsors", { method: "POST", body: JSON.stringify({ action: "x" }) }), env: s.env })).status, 400);
});

test("private receipt: organizer and co-organizer 200, another signed-in account 403, signed out 404, never cached; Admin reads it through the admin route; no listing carries the key", async () => {
  const s = await setup(); const r = await post(s, s.org.cookie, PAID(), { receipt: file(PDF, "invoice.pdf", "application/pdf") });
  const q = `id=${r.body.id}&receipt=1`;
  const a = await get(s, s.org.cookie, q); assert.equal(a.status, 200); assert.match(a.headers.get("cache-control"), /private, no-store/); assert.equal(a.headers.get("x-content-type-options"), "nosniff"); assert.equal(a.headers.get("content-type"), "application/pdf");
  assert.equal((await get(s, s.co.cookie, q)).status, 200, "a co-organizer");
  assert.equal((await get(s, s.other.cookie, q)).status, 403, "another signed-in account"); assert.equal((await get(s, null, q)).status, 404, "the public");
  assert.equal((await get(s, s.org.cookie, `id=nope&receipt=1`)).status, 404);
  const none = await post(s, s.org.cookie, PAID({ name: "No Receipt" })); assert.equal((await get(s, s.org.cookie, `id=${none.body.id}&receipt=1`)).status, 404, "nothing uploaded");
  const list = await get(s, s.org.cookie, "list=1"); const lj = await list.json(); assert.ok(lj.sponsors.find((x) => x.id === r.body.id).receipt === true); assert.ok(!JSON.stringify(lj).includes("sponsor-receipt/"));
  assert.equal((await get(s, s.other.cookie, "list=1")).status, 404); assert.equal((await get(s, null, "list=1")).status, 401);
  // the photo route never serves it, and the sitemap code does not list sponsors
  const photo = await import("../functions/api/photo/[[path]].js"); const key = s.raw.prepare("SELECT receipt FROM contest_sponsors WHERE id = ?").get(r.body.id).receipt;
  assert.equal((await photo.onRequestGet({ params: { path: key.split("/") }, env: s.env })).status, 404, "/api/photo serves only approved home photos");
  assert.ok(!/contest_sponsors|sponsor-receipt/.test(readFileSync("functions/sitemap.xml.js", "utf8") + readFileSync("functions/_lib/cityindex.js", "utf8")), "no sitemap or index code reads sponsors");
  // Admin: every record and the receipt
  const ad = await adminGet({ request: new Request(O + "/api/admin/sponsors?contest=" + s.c.id), env: s.env }); const aj = await ad.json();
  assert.equal(ad.status, 200); assert.equal(aj.sponsors.length, 2); assert.equal(aj.sponsors[0].email, "pat@brightnights.example"); assert.ok(!JSON.stringify(aj).includes("sponsor-receipt/"));
  const ar = await adminGet({ request: new Request(O + "/api/admin/sponsors?receipt=" + r.body.id), env: s.env }); assert.equal(ar.status, 200); assert.match(ar.headers.get("cache-control"), /no-store/);
  assert.equal((await adminGet({ request: new Request(O + "/api/admin/sponsors?contest=nope"), env: s.env })).status, 404);
});

test("removing a sponsor, deleting the contest and deleting the organizer's account delete the receipt files with the batched r2Delete and clear the contact details", async () => {
  const s = await setup(); const calls = []; const del = s.env.PHOTOS.delete; s.env.PHOTOS.delete = async (k) => { calls.push([].concat(k)); return del(k); };
  const a = await post(s, s.org.cookie, PAID(), { logo: file(PNG, "l.png", "image/png"), receipt: file(PDF, "r.pdf", "application/pdf") }), b = await post(s, s.org.cookie, PAID({ name: "Second" }), { receipt: file(PDF, "r.pdf", "application/pdf") });
  const keys = (id) => s.raw.prepare("SELECT logo, receipt FROM contest_sponsors WHERE id = ?").get(id);
  const ka = keys(a.body.id), kb = keys(b.body.id);
  assert.equal((await spDelete({ params: { slug: s.slug }, request: new Request(O + `/api/contests/${s.slug}/sponsors?id=${a.body.id}`, { method: "DELETE", headers: { cookie: s.org.cookie } }), env: s.env, waitUntil: () => {} })).status, 200);
  assert.ok(!s.env.PHOTOS.m.has(ka.logo) && !s.env.PHOTOS.m.has(ka.receipt)); assert.deepEqual(calls[calls.length - 1].sort(), [ka.logo, ka.receipt].sort(), "one delete call for both files");
  // account deletion of an organizer of an UNannounced contest: sponsor rows and files go
  calls.length = 0; await deleteAccount(s.env, "u1", "organizer@gmail.com");
  assert.ok(!s.env.PHOTOS.m.has(kb.receipt)); assert.equal(s.raw.prepare("SELECT COUNT(*) AS n FROM contest_sponsors").get().n, 0); assert.ok(calls.some((c) => c.includes(kb.receipt)), "through r2Delete");
  // an ANNOUNCED contest keeps the public name and logo, loses contact details and receipt
  const t = await setup(); t.raw.prepare("UPDATE contests SET announced = 1 WHERE id = ?").run(t.c.id);
  const x = await post(t, t.org.cookie, PAID(), { logo: file(PNG, "l.png", "image/png"), receipt: file(PDF, "r.pdf", "application/pdf") }); const kx = keys.call(null, x.body.id) || null; void kx;
  const before = t.raw.prepare("SELECT logo, receipt FROM contest_sponsors WHERE id = ?").get(x.body.id);
  await deleteAccount(t.env, "u1", "organizer@gmail.com");
  const row = t.raw.prepare("SELECT * FROM contest_sponsors WHERE id = ?").get(x.body.id);
  assert.deepEqual([row.name, row.url, row.logo], ["Bright Nights Lighting", "https://brightnights.example/", before.logo]); assert.deepEqual([row.contact_name, row.phone, row.email, row.amount_cents, row.paid_date, row.paid_method, row.receipt, row.receipt_name], ["", "", "", null, "", "", "", ""]);
  assert.ok(!t.env.PHOTOS.m.has(before.receipt) && t.env.PHOTOS.m.has(before.logo));
  // contest delete (Admin)
  const d = await setup(); const y = await post(d, d.org.cookie, PAID(), { receipt: file(PDF, "r.pdf", "application/pdf") }); const ky = d.raw.prepare("SELECT receipt FROM contest_sponsors WHERE id = ?").get(y.body.id).receipt;
  await deleteContest(d.env, d.c); assert.ok(!d.env.PHOTOS.m.has(ky));
});

test("retention: 24 months after a contest's voting ends the receipts are deleted from R2 and the contact details, amount and payment notes are blanked; newer contests are untouched", async () => {
  const s = await setup(); const r = await post(s, s.org.cookie, PAID(), { logo: file(PNG, "l.png", "image/png"), receipt: file(PDF, "r.pdf", "application/pdf") });
  const key = s.raw.prepare("SELECT receipt, logo FROM contest_sponsors WHERE id = ?").get(r.body.id);
  await pruneSponsorRecords(s.env); assert.ok(s.env.PHOTOS.m.has(key.receipt), "a current contest keeps its records");
  s.raw.prepare("UPDATE contests SET vote_end = date('now','-23 months') WHERE id = ?").run(s.c.id); await pruneRetention(s.env); assert.ok(s.env.PHOTOS.m.has(key.receipt), "23 months: still kept");
  s.raw.prepare("UPDATE contests SET vote_end = date('now','-25 months') WHERE id = ?").run(s.c.id); await pruneRetention(s.env);
  const row = s.raw.prepare("SELECT * FROM contest_sponsors WHERE id = ?").get(r.body.id);
  assert.ok(!s.env.PHOTOS.m.has(key.receipt)); assert.deepEqual([row.contact_name, row.phone, row.email, row.amount_cents, row.paid_method, row.receipt], ["", "", "", null, "", ""]);
  assert.deepEqual([row.name, row.url, row.logo], ["Bright Nights Lighting", "https://brightnights.example/", key.logo], "the public name, link and logo stay");
  const src = readFileSync("functions/_lib/retention.js", "utf8"); assert.ok(/r2Delete/.test(src) && /-24 months/.test(src));
});

test("run it again: sponsors are copied as unconfirmed drafts (no payment, receipt or permission carried over, nothing shown)", async () => {
  const s = await setup(); s.raw.prepare("INSERT INTO contest_comps (id, org_key, allowed, valid_until) VALUES ('c', 'u:organizer@gmail.com', -1, '2099-12-31')").run();
  await post(s, s.org.cookie, PAID(), { logo: file(PNG, "l.png", "image/png"), receipt: file(PDF, "r.pdf", "application/pdf") });
  const c = await patchContest({ params: { slug: s.slug }, request: new Request(O + "/x", { method: "PATCH", headers: { "content-type": "application/json", cookie: s.org.cookie }, body: JSON.stringify({ action: "clone" }) }), env: s.env }); const cj = await c.json(); assert.equal(c.status, 200);
  const copy = s.raw.prepare("SELECT s.* FROM contest_sponsors s JOIN contests c ON c.id = s.contest_id WHERE c.slug = ?").get(cj.slug);
  assert.deepEqual([copy.name, copy.contact_name, copy.basis, copy.show_public, copy.permission, copy.receipt, copy.paid_method, copy.amount_cents], ["Bright Nights Lighting", "Pat Lee", "", 0, 0, "", "", null]); assert.ok(copy.logo && copy.logo.includes(cj.slug.length ? "" : ""));
  assert.equal((await page({ ...s, slug: cj.slug })).sponsors.length, 0, "nothing shows until it is confirmed again");
});

test("copy: the contest page and organizer say sponsors do not influence results and money goes to the organizer; Terms, Privacy and the organizer UI state the responsibility", () => {
  const contest = readFileSync("public/contest.html", "utf8"), org = readFileSync("public/organizer.html", "utf8");
  assert.ok(contest.includes("Sponsors support this contest; they do not influence who wins. Sponsorship payments go to the organizer.") && contest.includes(">Sponsor</span>"));
  for (const must of ["Payment collected by me (the organizer)", "SoCal Lights does not process, hold or guarantee it", "You must have the sponsor", "permission", "Receipt or paid invoice", "Stored privately", "Show on the contest page", "Donated in kind"]) assert.ok(org.includes(must), "organizer UI: " + must);
  const terms = readFileSync("public/terms.html", "utf8").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  for (const must of ["Sponsors collected by the organizer", "Sponsorship payments go to the organizer, not to SoCal Lights", "responsible for collecting, receipting and reporting sponsorship money", "does not process, hold or guarantee it", "must have the sponsor's permission", "Sponsors do not influence results"]) assert.ok(terms.includes(must), "Terms: " + must);
  const priv = readFileSync("public/privacy.html", "utf8").replace(/<[^>]+>/g, " ");
  for (const must of ["Sponsors recorded by organizers", "24 months after the contest's voting ends", "never in a public list", "Sponsorship money goes to the organizer, not to us"]) assert.ok(priv.includes(must), "Privacy: " + must);
  assert.ok(!/Everything (in|above)/i.test(org + contest));
});
