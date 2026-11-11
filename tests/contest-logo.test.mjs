// A contest's logo: organizer uploads (JPG/PNG/WebP under 600 KB), the public page and homes cards get its URL; without one the pages draw an icon from the contest name.
import test from "node:test";
import assert from "node:assert/strict";
import { contestMark, contestIconSvg, contestIconUri, contestImage } from "../public/contesticon.js";
import { onRequestGet as logoGet, onRequestPost as logoPost, onRequestDelete as logoDelete } from "../functions/api/contests/[slug]/logo.js";
import { onRequestGet as contestGet } from "../functions/api/contests/[slug].js";
import { contestHomes } from "../functions/_lib/contesthomes.js";
import { newEnv, addUser, ptToday } from "./_pay.mjs";

const origin = "https://socallights.app", SLUG = "light-up";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const memR2 = () => { const m = new Map(); return { m, put: async (k, v, o) => m.set(k, { body: v, httpMetadata: o && o.httpMetadata }), get: async (k) => m.get(k) || null, delete: async (k) => { for (const x of [].concat(k)) m.delete(x); } }; };

test("the drawn icon: the first letters of the name, stable per name, different between names", () => {
  assert.equal(contestMark("Light Up The Town! Holiday Home Lighting Contest 2026").text, "LU");
  assert.equal(contestMark("The Eastvale Parade").text, "EP");
  assert.equal(contestMark("Covina").text, "CO");
  assert.equal(contestMark("2026").text, "?");
  assert.deepEqual(contestMark("Same name"), contestMark("Same name"));
  assert.notEqual(contestMark("Light Up the Town").hue, contestMark("Halloween Trail").hue);
  assert.match(contestIconSvg("A & B <c>"), /^<svg /); assert.doesNotMatch(contestIconSvg("A & B <c>"), /<c>/);
  assert.match(contestIconUri("x"), /^data:image\/svg\+xml;utf8,/);
  assert.equal(contestImage("x", "/api/contests/a/logo?v=1"), "/api/contests/a/logo?v=1", "an uploaded logo wins");
  assert.match(contestImage("x", ""), /^data:image\/svg/);
});

async function setup() {
  const { env, raw } = newEnv(); env.PHOTOS = memR2();
  const owner = await addUser(raw, "uO", "owner@city.gov"), other = await addUser(raw, "uX", "other@x.com");
  raw.prepare("INSERT INTO contests (id,slug,owner_id,name,org,city,county,season,status,entries_close,vote_start,vote_end,categories,mode,judge_method,contact_email,descr,approval,one_win,event_id) VALUES ('c1',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(SLUG, "uO", "Light Up the Town", "City of Covina", "Covina", "Los Angeles", "christmas", "live", ptToday(5), ptToday(8), ptToday(20), '["Best"]', "public", "pick", "owner@city.gov", "d", "auto", 0, "c-light-up");
  const up = (user, body, method = "POST") => (method === "DELETE" ? logoDelete : logoPost)({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}/logo`, { method, headers: { cookie: user.cookie, origin }, body }), env, waitUntil() {} });
  const form = (bytes, size) => { const fd = new FormData(); fd.append("logo", new Blob([bytes]), "logo.png"); return fd; };
  return { env, raw, owner, other, up, form };
}

test("upload: only the organizer team; JPG/PNG/WebP only; stored in R2; the public page and the homes data carry its URL", async () => {
  const t = await setup();
  assert.equal((await t.up(t.other, t.form(PNG))).status, 404, "someone else");
  assert.equal((await t.up(t.owner, t.form(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])))).status, 400, "not an image");
  const big = new Uint8Array(700 * 1024); big.set(PNG); assert.equal((await t.up(t.owner, t.form(big))).status, 400, "over 600 KB");
  const ok = await t.up(t.owner, t.form(PNG)); const j = await ok.json();
  assert.equal(ok.status, 200); assert.match(j.logo, /^\/api\/contests\/light-up\/logo\?v=\d+$/);
  assert.equal(t.env.PHOTOS.m.size, 1);
  const pub = await (await contestGet({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}`), env: t.env })).json();
  assert.equal(pub.contest.logo, j.logo);
  const ch = await contestHomes(t.env, "c-light-up"); assert.deepEqual([ch.name, ch.logo], ["Light Up the Town", j.logo]);
  const img = await logoGet({ params: { slug: SLUG }, request: new Request(`${origin}${j.logo}`), env: t.env });
  assert.equal(img.status, 200); assert.equal(img.headers.get("content-type"), "image/png"); assert.match(img.headers.get("cache-control"), /public/);
  // a second upload replaces the first file
  await new Promise((r) => setTimeout(r, 5)); await t.up(t.owner, t.form(PNG)); assert.equal(t.env.PHOTOS.m.size, 1, "the old file is deleted");
  // remove
  assert.equal((await t.up(t.other, undefined, "DELETE")).status, 404);
  assert.equal((await t.up(t.owner, undefined, "DELETE")).status, 200); assert.equal(t.env.PHOTOS.m.size, 0);
  const none = await (await contestGet({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}`), env: t.env })).json(); assert.equal(none.contest.logo, "");
  assert.equal((await logoGet({ params: { slug: SLUG }, request: new Request(`${origin}/api/contests/${SLUG}/logo`), env: t.env })).status, 404);
});
