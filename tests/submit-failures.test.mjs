// F-05 (follow-up writes after a home submit are visible, a failed insert cleans up R2) and F-06 (photo size caps read from the header bytes).
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as submitHome } from "../functions/api/submit.js";
import { imageSize, sizeProblem, MAX_TOTAL_BYTES } from "../functions/_lib/imgsniff.js";
import { newEnv, addUser, stubFetch } from "./_pay.mjs";

const ORIGIN = "https://socallights.app";
const r2 = () => { const store = new Map(); return { store, put: async (k, v, o) => { store.set(k, { body: v }); }, get: async (k) => store.get(k) || null, delete: async (k) => { for (const x of [].concat(k)) store.delete(x); } }; };
const world = () => stubFetch((url) => {
  url = String(url);
  if (/api\.resend\.com/.test(url)) return new Response("{}", { status: 200 });
  if (/census/.test(url)) return new Response(JSON.stringify({ result: { addressMatches: [{ coordinates: { x: -118.13, y: 34.15 }, matchedAddress: "X" }] } }));
  if (/nominatim/.test(url)) return new Response("[]");
  return new Response("", { status: 404 });
});
// a JPEG header with the given pixel size (SOF0), padded to `pad` bytes
const jpegOf = (w, h, pad = 0) => { const a = [0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, h >> 8, h & 255, w >> 8, w & 255, 1, 1, 0x11, 0]; while (a.length < 40) a.push(0); const u = new Uint8Array(Math.max(a.length, pad)); u.set(a); return u; };
const pngOf = (w, h) => { const u = new Uint8Array(33); u.set([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, w >>> 24, (w >> 16) & 255, (w >> 8) & 255, w & 255, h >>> 24, (h >> 16) & 255, (h >> 8) & 255, h & 255]); return u; };
const webpX = (w, h) => { const u = new Uint8Array(30); u.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58, 10, 0, 0, 0, 0, 0, 0, 0, (w - 1) & 255, ((w - 1) >> 8) & 255, ((w - 1) >> 16) & 255, (h - 1) & 255, ((h - 1) >> 8) & 255, ((h - 1) >> 16) & 255]); return u; };
const file = (u, n = "a.jpg") => new File([u], n, { type: "image/jpeg" });
let SEQ = 0;
const form = (o = {}, photos = []) => { const f = new FormData(); for (const [k, v] of Object.entries({ biz: "Lee Family", title: "Maple Street Lights", city: "Pasadena", desc: "Ten thousand lights synced to music every night.", street: `${300 + ++SEQ} Maple St`, zip: "91101", permission: "1", ...o })) f.append(k, v); for (const p of photos) f.append("photos", p); return f; };
const post = (env, f, cookie) => submitHome({ request: new Request(ORIGIN + "/api/submit", { method: "POST", headers: { "CF-Connecting-IP": "203.0.113.7", cookie }, body: f }), env });
const wrap = (DB, hooks) => new Proxy(DB, { get(t, k) { if (k === "batch" && hooks.batch) return hooks.batch; if (k === "prepare" && hooks.prepare) return (sql) => { hooks.prepare(sql); return t.prepare(sql); }; const v = t[k]; return typeof v === "function" ? v.bind(t) : v; } });
const mk = () => newEnv({ PHOTOS: r2(), RESEND_API_KEY: "re_test", DEV_AUTH: "" });

test("F-06: image size is read from the JPEG, PNG and WebP header bytes", () => {
  assert.deepEqual(imageSize(jpegOf(1600, 1200)), { w: 1600, h: 1200 });
  assert.deepEqual(imageSize(pngOf(4000, 3000)), { w: 4000, h: 3000 });
  assert.deepEqual(imageSize(webpX(1200, 900)), { w: 1200, h: 900 });
  assert.equal(imageSize(new Uint8Array([1, 2, 3])), null);
  assert.equal(sizeProblem(jpegOf(1600, 1200)), "");
  assert.match(sizeProblem(jpegOf(9000, 100)), /too many pixels/);
  assert.match(sizeProblem(jpegOf(7000, 7000)), /too many pixels/, "40 megapixels is the ceiling");
  assert.match(sizeProblem(pngOf(65000, 10)), /too many pixels/);
  assert.equal(sizeProblem(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0])), "", "an unreadable header is not refused (the bytes were already checked as a real image)");
});

test("F-06: a submission with a huge-dimension photo, or photos over the 24 MB total, is refused and nothing is stored", async () => {
  const { env, raw } = mk(), w = world(); const u = await addUser(raw, "u1", "owner@example.com");
  try {
    const big = await post(env, form({}, [file(jpegOf(12000, 9000))]), u.cookie);
    assert.equal(big.status, 400); assert.match((await big.json()).error, /pixels/);
    assert.equal(env.PHOTOS.store.size, 0);
    const heavy = Array.from({ length: 5 }, (_, i) => file(jpegOf(1600, 1200, 5 * 1024 * 1024), `h${i}.jpg`)); // 5 x 5 MB: each under 6 MB, 25 MB together
    assert.ok(heavy.reduce((t, f) => t + f.size, 0) > MAX_TOTAL_BYTES);
    const tot = await post(env, form({}, heavy), u.cookie);
    assert.equal(tot.status, 400); assert.match((await tot.json()).error, /24 MB/);
    assert.equal(env.PHOTOS.store.size, 0);
    const ok = await post(env, form({}, [file(jpegOf(1600, 1200)), file(pngOf(1600, 900), "b.png")]), u.cookie);
    assert.equal(ok.status, 200);
  } finally { w.restore(); }
});

test("F-05: if the database insert fails, the photos already written to R2 are removed, the error is logged and the answer is an error", async () => {
  const { env, raw } = mk(), w = world(); const u = await addUser(raw, "u1", "owner@example.com");
  const good = env.DB;
  env.DB = wrap(good, { batch: async () => { throw new Error("D1 down") } });
  try {
    const res = await post(env, form({}, [file(jpegOf(1600, 1200)), file(jpegOf(1000, 800), "b.jpg")]), u.cookie);
    assert.equal(res.status, 500); assert.match((await res.json()).error, /Nothing was posted/);
    assert.equal(env.PHOTOS.store.size, 0, "no orphan photos");
    assert.equal(raw.prepare("SELECT COUNT(*) n FROM posts").get().n, 0);
    const log = raw.prepare("SELECT kind, detail FROM ops_log WHERE kind = 'submit'").all();
    assert.equal(log.length, 1); assert.match(log[0].detail, /insert failed, 2 photo\(s\) removed/);
  } finally { w.restore(); }
});

test("F-05: the visiting details are stored with the post itself", async () => {
  const { env, raw } = mk(), w = world(); const u = await addUser(raw, "u1", "owner@example.com");
  try {
    const res = await post(env, form({ lights_on: "5 to 10 pm", visit: "walk", parking: "street", accessible: "1", radio: "88.1" }), u.cookie);
    assert.equal(res.status, 200);
    const p = raw.prepare("SELECT lights_on, visit, parking, accessible, radio FROM posts").get();
    assert.equal(p.lights_on, "5 to 10 pm"); assert.equal(p.visit, "walk"); assert.equal(p.parking, "street"); assert.equal(p.accessible, 1); assert.ok(p.radio);
  } finally { w.restore(); }
});

test("F-05: a failed installer link is logged, written into the post's note for Admin, and the home waits for review instead of going live half-saved", async () => {
  const { env, raw } = mk(), w = world(); const u = await addUser(raw, "u1", "owner@example.com");
  env.DB = wrap(env.DB, { prepare: (sql) => { if (/UPDATE posts SET installer_id/.test(sql)) throw new Error("write failed"); } });
  try {
    const res = await post(env, form({ installer_name: "Bright Nights Lighting" }), u.cookie);
    const j = await res.json();
    assert.equal(res.status, 200); assert.equal(j.ok, true); assert.equal(j.status, "pending");
    const p = raw.prepare("SELECT status, review_note FROM posts").get();
    assert.equal(p.status, "pending"); assert.match(p.review_note, /Not saved at submit time: installer link/);
    assert.ok(raw.prepare("SELECT 1 FROM ops_log WHERE kind = 'submit' AND detail LIKE '%installer link not saved%'").get());
  } finally { w.restore(); }
});
