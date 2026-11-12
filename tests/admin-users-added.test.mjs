// Admin > Users: homes an organizer added to their own contest (posts.added_by) count for that organizer, in the list, the CSV and the detail.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as usersGet } from "../functions/api/admin/users/index.js";
import { onRequestGet as userGet } from "../functions/api/admin/users/[id].js";
import { newEnv } from "./_pay.mjs";

test("organizer-added entries are counted for the organizer, not shown as 0", async () => {
  const { env, raw } = newEnv();
  raw.prepare("INSERT INTO users (id,email,name) VALUES ('org1','cparade@example.gov','')").run();
  const pins = raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,street,zip,contest_id,user_id,added_by,entry_no,approved_at) VALUES (?,'approved',?,?,'Covina',34.1,-117.9,'d','[]','',?,?,?,'91723','c1',NULL,'org1',?,datetime('now'))");
  [1, 2, 3].forEach((i) => pins.run("pa" + i, "Biz " + i, "Home " + i, "christmas", `${i} Oak St`, `${i} Oak St`, i));
  const res = await usersGet({ request: new Request("https://socallights.app/api/admin/users"), env });
  const body = await res.json(), u = (body.users || body).find((x) => x.id === "org1");
  assert.equal(u.added, 3); assert.equal(u.homes, 0); assert.equal(u.entries, 0);
  const csv = await (await usersGet({ request: new Request("https://socallights.app/api/admin/users?format=csv"), env })).text();
  assert.match(csv.split("\n")[0], /added_as_organizer/); assert.match(csv, /cparade@example\.gov[^\n]*,3,/);
  const d = await (await userGet({ params: { id: "org1" }, env })).json();
  assert.equal(d.posts.length, 3); assert.ok(d.posts.every((p) => p.added === 1));
});

test("the Contests tab shows a plain total (live and unpublished) next to the attention count", async () => {
  const { onRequestGet: countsGet } = await import("../functions/api/admin/counts.js");
  const { env, raw } = newEnv();
  const cols = raw.prepare("PRAGMA table_info(contests)").all().filter((c) => c.notnull && c.dflt_value == null && !c.pk).map((c) => c.name);
  const mk = (id, status) => { const names = ["id", "slug", "owner_id", "name", "status", ...cols.filter((c) => !["id", "slug", "owner_id", "name", "status"].includes(c))]; raw.prepare(`INSERT INTO contests (${names.join(",")}) VALUES (${names.map(() => "?").join(",")})`).run(...names.map((n) => (n === "id" ? id : n === "slug" ? id : n === "status" ? status : n === "name" ? "N " + id : "x"))); };
  mk("c1", "live"); mk("c2", "unpublished"); mk("c3", "declined");
  const j = await (await countsGet({ env })).json();
  assert.equal(j.contestsAll, 2); assert.equal(j.contests, 0);
});
