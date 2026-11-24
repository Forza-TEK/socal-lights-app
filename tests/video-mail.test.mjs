// F-26: the person who uploaded a video clip is emailed when Admin approves or removes it. Best effort: a mail failure never blocks the action. Mail is stubbed.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestPost as adminEventVideo } from "../functions/api/admin/event-video.js";
import { onRequestPost as adminPost } from "../functions/api/admin/posts/[id].js";
import { newEnv, stubFetch } from "./_pay.mjs";

const ORIGIN = "https://socallights.app";
const bucket = () => ({ put: async () => {}, delete: async () => {}, get: async () => null });
const mk = () => newEnv({ RESEND_API_KEY: "re_test", PHOTOS: bucket() });
const mailer = (status = 200) => stubFetch(() => new Response("{}", { status }));
const sent = (net) => net.calls.filter((c) => c.url.includes("api.resend.com")).map((c) => JSON.parse(c.init.body));
const seedEvent = (raw, o = {}) => {
  raw.prepare("INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address,video_file,video_ok) VALUES ('clipev','Clip Event','Orange','Irvine','tree','2999-12-01','2999-12-30','published',1,'','',33.6,-117.8,'b','https://example.org/e','christmas','v','1 Main St',?,0)").run(o.file ?? "ev/clipev/1.mp4");
  raw.prepare("INSERT INTO event_submissions (id,status,name,county,city,season,type,start_date,end_date,contact_email,event_id) VALUES ('sub0001','published','Clip Event','Orange','Irvine','christmas','tree','2999-12-01','2999-12-30',?,'clipev')").run(o.email ?? "owner@example.com");
};
const evAct = async (env, body, jobs) => { const r = await adminEventVideo({ request: new Request(`${ORIGIN}/api/admin/event-video`, { method: "POST", body: JSON.stringify(body) }), env, waitUntil: (p) => jobs.push(p) }); await Promise.all(jobs); return r; };

test("event clip: approve emails the organizer once (a repeat tap sends nothing), remove emails again", async () => {
  const { env, raw } = mk(); seedEvent(raw); const net = mailer(), jobs = [];
  try {
    assert.equal((await evAct(env, { id: "clipev", action: "approve" }, jobs)).status, 200);
    let m = sent(net); assert.equal(m.length, 1); assert.equal(m[0].to[0], "owner@example.com"); assert.match(m[0].subject, /Your video is live: Clip Event/);
    await evAct(env, { id: "clipev", action: "approve" }, jobs); assert.equal(sent(net).length, 1, "already approved: no second mail");
    assert.equal((await evAct(env, { id: "clipev", action: "remove" }, jobs)).status, 200);
    m = sent(net); assert.equal(m.length, 2); assert.match(m[1].subject, /Your video was removed: Clip Event/);
    await evAct(env, { id: "clipev", action: "remove" }, jobs); assert.equal(sent(net).length, 2, "no clip left: nothing to announce");
  } finally { net.restore(); }
});

test("event clip: a failing mail service, an organizer with no email or a bounced address never blocks the action", async () => {
  const { env, raw } = mk(); seedEvent(raw); let net = mailer(500), jobs = [];
  try { assert.equal((await evAct(env, { id: "clipev", action: "approve" }, jobs)).status, 200); assert.equal(raw.prepare("SELECT video_ok FROM events WHERE id='clipev'").get().video_ok, 1); } finally { net.restore(); }
  const b = mk(); seedEvent(b.raw, { email: "" }); net = mailer(); jobs = [];
  try { assert.equal((await evAct(b.env, { id: "clipev", action: "approve" }, jobs)).status, 200); assert.equal(sent(net).length, 0); } finally { net.restore(); }
});

test("home clip: Admin approve and remove email the person who added the home", async () => {
  const { env, raw } = mk(), jobs = [];
  raw.prepare("INSERT INTO posts (id,status,biz,title,city,lat,lng,descr,photos,contact_email,season,address,approved_at,video_file,video_ok) VALUES ('h1','approved','b','Maple Street Lights','Irvine',33.6,-117.8,'d','[]','home@example.com','christmas','1 Main St',datetime('now'),'hv/h1/1.mp4',0)").run();
  const act = async (action) => { const r = await adminPost({ params: { id: "h1" }, request: new Request(`${ORIGIN}/api/admin/posts/h1`, { method: "POST", body: JSON.stringify({ action }) }), env, waitUntil: (p) => jobs.push(p) }); await Promise.all(jobs); return r; };
  const net = mailer();
  try {
    assert.equal((await act("video_approve")).status, 200); assert.equal((await act("video_approve")).status, 200);
    let m = sent(net); assert.equal(m.length, 1); assert.equal(m[0].to[0], "home@example.com"); assert.match(m[0].subject, /Your video is live: Maple Street Lights/);
    assert.equal((await act("video_remove")).status, 200); m = sent(net); assert.equal(m.length, 2); assert.match(m[1].subject, /Your video was removed/);
  } finally { net.restore(); }
});
