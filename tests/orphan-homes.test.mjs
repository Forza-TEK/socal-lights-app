// F-12: homes with no owner account are listed for Admin, and one can be linked to the account that matches its contact email (through the ownership transfer).
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as list, onRequestPost as link } from "../functions/api/admin/orphan-homes.js";
import { newEnv, addUser } from "./_pay.mjs";

const ORIGIN = "https://socallights.app";
const home = (raw, id, o = {}) => raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,user_id,contest_id,added_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
  .run(id, o.status || "approved", "b", o.title || "Home " + id, "Covina", 34.09, -117.89, "d", "[]", o.email ?? "", "christmas", "1 Main St", o.user_id ?? null, o.contest_id ?? null, o.added_by ?? null);
const get = async (env) => (await (await list({ env })).json()).homes;
const post = async (env, body) => { const r = await link({ request: new Request(ORIGIN + "/api/admin/orphan-homes", { method: "POST", body: JSON.stringify(body) }), env, data: { admin: { email: "admin@example.com" } } }); return { status: r.status, body: await r.json() }; };

test("F-12: the list shows homes with a null or empty user_id, says whether an account exists for the contact email, and skips owned and declined homes", async () => {
  const { env, raw } = newEnv(); await addUser(raw, "u1", "jane@example.com");
  home(raw, "a", { email: "jane@example.com", user_id: null });         // account exists
  home(raw, "b", { email: "nobody@example.com", user_id: "" });          // no account yet
  home(raw, "c", { email: "", user_id: null });                          // no email at all (organizer added)
  home(raw, "d", { email: "jane@example.com", user_id: "u1" });         // owned
  home(raw, "e", { email: "x@example.com", user_id: null, status: "declined" });
  const homes = await get(env);
  assert.deepEqual(homes.map((h) => h.id).sort(), ["a", "b", "c"]);
  const by = Object.fromEntries(homes.map((h) => [h.id, h.account]));
  assert.deepEqual(by, { a: "yes", b: "no", c: "none" });
});

test("F-12: linking attaches the home to the account that matches its contact email and writes the Admin log line", async () => {
  const { env, raw } = newEnv(); await addUser(raw, "u1", "janedoe@gmail.com");
  home(raw, "a", { email: "Jane.Doe@gmail.com", user_id: null });
  const r = await post(env, { id: "a" });
  assert.equal(r.status, 200); assert.equal(r.body.ok, true);
  assert.equal(raw.prepare("SELECT user_id FROM posts WHERE id = 'a'").get().user_id, "u1");
  assert.deepEqual((await get(env)).map((h) => h.id), []);
  assert.ok(raw.prepare("SELECT 1 FROM admin_log WHERE action = 'transfer'").get(), "logged by the transfer endpoint");
});

test("F-12: linking refuses a home that has an owner, has no email, or whose email has no account yet; and an unknown id", async () => {
  const { env, raw } = newEnv(); await addUser(raw, "u1", "jane@example.com");
  home(raw, "owned", { email: "jane@example.com", user_id: "u1" });
  home(raw, "noemail", { email: "", user_id: "" });
  home(raw, "noacct", { email: "ghost@example.com", user_id: "" });
  assert.equal((await post(env, { id: "owned" })).status, 409);
  const ne = await post(env, { id: "noemail" }); assert.equal(ne.status, 409); assert.match(ne.body.error, /no contact email/);
  const na = await post(env, { id: "noacct" }); assert.equal(na.status, 404); assert.match(na.body.error, /no account with that email/);
  assert.equal((await post(env, { id: "nope" })).status, 404);
  assert.equal((await post(env, {})).status, 400);
  assert.equal(raw.prepare("SELECT user_id FROM posts WHERE id = 'noacct'").get().user_id, "");
});
