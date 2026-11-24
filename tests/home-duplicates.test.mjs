// Audit F-01 / F-04: a normal home is checked against homes already listed (same person: told; another person: held with a note), and an address the Census matches to two places is held for Admin.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as submitHome } from "../functions/api/submit.js";
import { onRequestGet as adminPosts } from "../functions/api/admin/posts/index.js";
import { newEnv, addUser, stubFetch } from "./_pay.mjs";

const ORIGIN = "https://socallights.app";
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
const r2 = () => { const store = new Map(); return { store, put: async (k, v) => { store.set(k, v); }, get: async (k) => store.get(k) || null, delete: async (k) => { for (const x of [].concat(k)) store.delete(x); } }; };
// The geocoder answers one match (or two far-apart matches for an ambiguous street).
const geo = ({ two = false } = {}) => stubFetch((url) => {
  url = String(url);
  if (/census/.test(url)) return new Response(JSON.stringify({ result: { addressMatches: [{ coordinates: { x: -118.144, y: 34.148 }, matchedAddress: "350 E HILLCREST DR, PASADENA, CA" }, ...(two ? [{ coordinates: { x: -118.16, y: 34.16 }, matchedAddress: "350 W HILLCREST DR, PASADENA, CA" }] : [])] } }));
  return new Response("[]");
});
const form = (o = {}) => { const f = new FormData(); const d = { biz: "Lee Family", title: "Maple Street Lights", city: "Pasadena", desc: "Ten thousand lights synced to music every night.", street: "123 Maple St", zip: "91101", permission: "1", ...o }; for (const [k, v] of Object.entries(d)) if (v !== undefined && v !== null) f.append(k, v); f.append("photos", new File([JPEG], "a.jpg", { type: "image/jpeg" })); return f; };
const send = async (env, f, cookie, ip) => { const r = await submitHome({ request: new Request(ORIGIN + "/api/submit", { method: "POST", headers: { "CF-Connecting-IP": ip, cookie }, body: f }), env }); return { http: r.status, ...(await r.json()) }; };
const world = async () => { const { env, raw } = newEnv({ PHOTOS: r2() }); return { env, raw, a: await addUser(raw, "uA", "a@example.com"), b: await addUser(raw, "uB", "b@example.com") }; };
const row = (raw, id) => ({ ...raw.prepare("SELECT * FROM posts WHERE id = ?").get(id) });

test("the same person adding the same home again is told it exists and nothing is saved or uploaded", async () => {
  const { env, raw, a } = await world(), w = geo();
  try {
    const first = await send(env, form(), a.cookie, "203.0.113.1"); assert.equal(first.status, "published");
    const files = env.PHOTOS.store.size;
    const again = await send(env, form({ street: "123 maple street" }), a.cookie, "203.0.113.1");
    assert.equal(again.http, 409); assert.match(again.error, /already added this home/);
    assert.equal(raw.prepare("SELECT COUNT(*) AS n FROM posts").get().n, 1); assert.equal(env.PHOTOS.store.size, files, "no photos were stored for the refused copy");
    assert.equal((await send(env, form({ street: "5 Oak Ave" }), a.cookie, "203.0.113.1")).status, "published", "a different home by the same person is fine");
  } finally { w.restore(); }
});

test("another person's home at the same address is not blocked but held for review with a note naming the other post; a different number, city, unit or a declined post is not a duplicate", async () => {
  const { env, raw, a, b } = await world(), w = geo();
  try {
    const first = await send(env, form(), a.cookie, "203.0.113.1"); assert.equal(first.status, "published");
    const second = await send(env, form({ street: "123 Maple Street Unit 4", biz: "Pro Lights Inc" }), b.cookie, "203.0.113.2");
    assert.equal(second.http, 200); assert.equal(second.status, "pending"); assert.equal(second.held, "duplicate");
    const r = row(raw, second.id); assert.equal(r.status, "pending"); assert.match(r.review_note, new RegExp("same address as another home already listed or waiting \\(" + first.id + ", approved\\)"));
    assert.match(r.review_note, /not the same house/);
    // Admin sees the note on the waiting list
    const list = await (await adminPosts({ request: new Request(ORIGIN + "/api/admin/posts?status=pending"), env })).json();
    assert.match(list.find((p) => p.id === second.id).reviewNote, /same address as another home/);
    // other numbers, other cities, declined posts
    assert.equal((await send(env, form({ street: "125 Maple St" }), b.cookie, "203.0.113.2")).status, "published");
    assert.equal((await send(env, form({ street: "123 Maple St", city: "Glendale", zip: "91201" }), b.cookie, "203.0.113.2")).status, "published");
    raw.prepare("UPDATE posts SET status = 'declined' WHERE id = ?").run(first.id); raw.prepare("UPDATE posts SET status = 'declined' WHERE id = ?").run(second.id);
    const third = await send(env, form({ street: "123 Maple St" }), b.cookie, "203.0.113.3"); assert.equal(third.status, "published", "declined posts do not count");
  } finally { w.restore(); }
});

test("a home that matches an existing contest entry's address is unaffected (contest entries keep their own rule)", async () => {
  const { env, raw, a } = await world(), w = geo();
  try {
    raw.prepare("INSERT INTO posts (id,biz,title,city,lat,lng,descr,street,zip,address,status,photos,contest_id) VALUES ('cx1','b','Entry','Pasadena',1,2,'d','123 Maple St','91101','123 Maple St, Pasadena, CA 91101','approved','[]','k1')").run();
    assert.equal((await send(env, form(), a.cookie, "203.0.113.1")).status, "published");
  } finally { w.restore(); }
});

test("F-04: an address the Census matches to two places is held for Admin with both candidates; a single match goes live", async () => {
  const { env, raw, a, b } = await world();
  let w = geo({ two: true });
  try {
    const r = await send(env, form({ street: "350 Hillcrest" }), a.cookie, "203.0.113.1");
    assert.equal(r.status, "pending"); assert.equal(r.held, "ambiguous");
    const p = row(raw, r.id); assert.equal(p.status, "pending"); assert.match(p.review_note, /matches more than one place \(350 E HILLCREST DR, PASADENA, CA or 350 W HILLCREST DR, PASADENA, CA\)/);
    const list = await (await adminPosts({ request: new Request(ORIGIN + "/api/admin/posts?status=pending"), env })).json();
    assert.match(list.find((x) => x.id === r.id).reviewNote, /350 W HILLCREST/);
  } finally { w.restore(); }
  w = geo();
  try { assert.equal((await send(env, form({ street: "352 Hillcrest" }), b.cookie, "203.0.113.2")).status, "published"); } finally { w.restore(); }
});

test("Admin shows the note; the note is not shown once the home is approved", () => {
  const js = readFileSync("public/admin/admin.js", "utf8");
  assert.equal((js.match(/Held for a look\./g) || []).length, 2, "record page and list row");
  assert.match(readFileSync("functions/api/admin/posts/index.js", "utf8"), /r\.review_note && r\.status === "pending"/);
});
