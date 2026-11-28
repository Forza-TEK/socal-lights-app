// A home that is in review, declined or taken down keeps its photos in the private pending/ folder. Only the person who posted it can open them (so the profile list can show
// a thumbnail); a stranger, a signed-out visitor and a different account get "not found", and nothing is cached by a shared cache.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as photoServe } from "../functions/api/photo/[[path]].js";
import { newEnv, addUser } from "./_pay.mjs";

test("pending/ photos open only for the person who posted the home", async () => {
  const { env, raw } = newEnv(); const store = new Map([["pending/pabcdefgh/1.jpg", new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3])]]);
  env.PHOTOS = { get: async (k) => (store.has(k) ? { body: store.get(k), httpEtag: "e", writeHttpMetadata: (h) => h.set("content-type", "image/jpeg") } : null) };
  const owner = await addUser(raw, "uA", "owner@x.com"), byMail = await addUser(raw, "uB", "mail@x.com"), stranger = await addUser(raw, "uC", "other@x.com");
  raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,street,zip,user_id) VALUES ('pabcdefgh','pending','H','H','Pasadena',34.1,-118.1,'d','[\"pending/pabcdefgh/1.jpg\"]',?, 'christmas','1 A St','1 A St','',?)").run("mail@x.com", "uA");
  const get = (user) => photoServe({ params: { path: ["pending", "pabcdefgh", "1.jpg"] }, request: new Request("https://socallights.app/api/photo/pending/pabcdefgh/1.jpg", { headers: user ? { cookie: user.cookie } : {} }), env });
  const mine = await get(owner); assert.equal(mine.status, 200); assert.equal(mine.headers.get("cache-control"), "private, no-store");
  assert.equal((await get(byMail)).status, 200, "the posting email counts too");
  assert.equal((await get(stranger)).status, 404); assert.equal((await get(null)).status, 404);
});
