// Run with: node --test tests/   (Batch B: privacy and compliance)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { makeDB } from "./_d1.mjs";
import { deleteAccount } from "../functions/_lib/account.js";
import { ipPruneStatements, pruneIps } from "../functions/_lib/retention.js";
import { renderTemplate, sendTemplate, TEMPLATES, isMarketing } from "../functions/_lib/mailtpl.js";
import { onRequestPost as unsubPost, onRequestGet as unsubGet } from "../functions/api/unsub.js";
import { onRequestGet as alertUnsubGet, onRequestPost as alertUnsubPost } from "../functions/api/alerts/unsubscribe.js";
import { onRequestPost as reportPost } from "../functions/api/report.js";

const ADDRESS = "123 Example Way, Suite 9, Anytown, CA 90000";
const PHOTOS = { delete: async () => {} };
const plain = (o) => JSON.parse(JSON.stringify(o));
const q = (raw, sql, ...a) => plain(raw.prepare(sql).all(...a));
const n = (raw, sql, ...a) => q(raw, sql, ...a).length;

// ---------------------------------------------------------------- (a) + (b) account deletion
function seed() {
  const { DB, raw } = makeDB();
  const run = (sql, ...a) => raw.prepare(sql).run(...a);
  for (const [id, email, name] of [["uA", "a@x.com", "Alice"], ["uB", "b@x.com", "Bob"], ["uC", "c@x.com", "Cy"]]) run("INSERT INTO users (id,email,name) VALUES (?,?,?)", id, email, name);
  const contest = (id, owner, announced, results = "") => run("INSERT INTO contests (id,slug,owner_id,name,org,city,entries_close,vote_start,vote_end,announced,results,contact_email,installer_email,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'live')", id, id, owner, id, "Org " + id, "Pasadena", "2026-12-01", "2026-12-02", "2026-12-20", announced, results, owner === "uA" ? "a@x.com" : "c@x.com", owner === "uA" ? "ia@x.com" : "");
  const snap = JSON.stringify({ entries: [{ id: "pA", name: "Alice home", biz: "", address: "1 Main", city: "Pasadena", lat: 1, lng: 2, photos: ["k"], votes: 3 }, { id: "pB", name: "Bob home", address: "2 Main", city: "Pasadena", lat: 1, lng: 2, photos: [], votes: 5 }] });
  contest("cA", "uA", 0); contest("cAn", "uA", 1, snap); contest("cC", "uC", 0); contest("cCan", "uC", 1, snap);
  const post = (id, user, contestId, email) => run("INSERT INTO posts (id,biz,title,city,lat,lng,descr,user_id,contest_id,contact_email,status,photos) VALUES (?,?,?,?,?,?,?,?,?,?,'approved','[]')", id, "b", id, "Pasadena", 1, 2, "d", user, contestId, email);
  post("pA", "uA", "cCan", "a@x.com"); post("pB", "uB", "cCan", "b@x.com"); post("pHomeA", "uA", null, "a@x.com"); post("pHomeB", "uB", null, "b@x.com");
  // judges: A as judge in an open contest and an announced one; A's own contests' judges; someone else's judge
  const judge = (id, c, email, user) => { run("INSERT INTO judges (id,contest_id,email,token,user_id) VALUES (?,?,?,?,?)", id, c, email, "tok-" + id, user); run("INSERT INTO judge_picks (contest_id,judge_id,category,post_id) VALUES (?,?,?,?)", c, id, "Best", "pB"); run("INSERT INTO judge_scores (contest_id,judge_id,post_id,category,score) VALUES (?,?,?,?,?)", c, id, "pB", "Best", 5); run("INSERT INTO judge_conflicts (contest_id,judge_id,post_id) VALUES (?,?,?)", c, id, "pA"); };
  judge("jOwnedOpen", "cA", "j1@x.com", null); judge("jOwnedAnn1", "cAn", "j2@x.com", null); judge("jOwnedAnn2", "cAn", "j3@x.com", null);
  judge("jAsJudgeOpen", "cC", "a@x.com", "uA"); judge("jAsJudgeAnn", "cCan", "A@X.com", null); judge("jOther", "cC", "o@x.com", null);
  // quote requests
  const cl = (id, c, user, name, email) => run("INSERT INTO contest_leads (id,contest_id,user_id,name,email,phone,note) VALUES (?,?,?,?,?,?,?)", id, c, user, name, email, "626-555-0100", "note " + name);
  cl("clOwnedByA", "cA", "uB", "Bob", "b@x.com"); cl("clFromA", "cC", "uA", "Alice", "a@x.com"); cl("clFromB", "cC", "uB", "Bob", "b@x.com");
  run("INSERT INTO installers (id,slug,name,email,owner_email) VALUES ('iA','ia','Alice Lights','a@x.com','a@x.com'), ('iC','ic','Cy Lights','c@x.com','c@x.com'), ('iD','id','Dee Lights','a@x.com','')");
  const il = (id, inst, user, name, email) => run("INSERT INTO installer_leads (id,installer_id,user_id,name,email,phone,note) VALUES (?,?,?,?,?,?,?)", id, inst, user, name, email, "626-555-0101", "n");
  il("ilToA", "iA", "uB", "Bob", "b@x.com"); il("ilToC_fromB", "iC", "uB", "Bob", "b@x.com"); il("ilToC_fromA", "iC", "uA", "Alice", "a@x.com");
  // edit logs, claims, signups, staff, reports, orders, prefs
  const lc = (id, post, email, name) => run("INSERT INTO listing_changes (id,post_id,by_email,by_name,by_role,field) VALUES (?,?,?,?,'owner','title')", id, post, email, name);
  lc("lcA_onB", "pHomeB", "a@x.com", "Alice"); lc("lcA_onA", "pHomeA", "a@x.com", "Alice"); lc("lcB", "pHomeB", "b@x.com", "Bob");
  run("INSERT INTO event_claims (id,event_id,user_id,email) VALUES ('ecA','e1','uA','a@x.com'), ('ecB','e1','uB','b@x.com')");
  run("INSERT INTO alert_subs (id,email,city,lat,lng,token) VALUES ('sA','A@x.com','Pasadena',1,2,'ta'), ('sB','b@x.com','Pasadena',1,2,'tb')");
  run("INSERT INTO contest_staff (contest_id,email) VALUES ('cC','a@x.com'), ('cC','b@x.com'), ('cA','y@x.com')");
  run("INSERT INTO reports (id,ref,name,message,contact) VALUES ('rA','r','n','m','a@x.com'), ('rB','r','n','m','b@x.com')");
  run("INSERT INTO feature_orders (session_id,event_id,plan,amount,email,user_id) VALUES ('sessA','e1','pin',500,'a@x.com','uA'), ('sessB','e1','pin',500,'b@x.com','uB')");
  run("INSERT INTO email_prefs (email,token,optout) VALUES ('a@x.com','" + "a".repeat(36) + "',1)");
  run("INSERT INTO contest_changes (id,contest_id,by_email,by_name,field) VALUES ('ccA','cC','a@x.com','Alice','name'), ('ccB','cC','b@x.com','Bob','name')");
  return { DB, raw, env: { DB, PHOTOS } };
}

test("deleting an account clears every table in the deletion matrix and leaves other people's rows alone", async () => {
  const { raw, env } = seed();
  const before = {
    judges: n(raw, "SELECT 1 FROM judges"), picks: n(raw, "SELECT 1 FROM judge_picks"), scores: n(raw, "SELECT 1 FROM judge_scores"),
    leads: n(raw, "SELECT 1 FROM contest_leads"), il: n(raw, "SELECT 1 FROM installer_leads"),
  };
  assert.equal(before.judges, 6);
  assert.equal(n(raw, "SELECT 1 FROM users WHERE email = 'a@x.com'"), 1);
  await deleteAccount(env, "uA", "a@x.com");

  // account and everything that was already handled
  assert.equal(n(raw, "SELECT 1 FROM users WHERE id = 'uA'"), 0);
  assert.equal(n(raw, "SELECT 1 FROM posts WHERE user_id = 'uA'"), 0);
  assert.equal(n(raw, "SELECT 1 FROM posts WHERE id = 'pHomeB' AND contact_email = 'b@x.com'"), 1);

  // judges: ballots of the person and of judges of contests they ran are gone; announced contests keep scores but no identity
  assert.equal(n(raw, "SELECT 1 FROM judges WHERE id IN ('jOwnedOpen','jAsJudgeOpen')"), 0);
  assert.equal(n(raw, "SELECT 1 FROM judge_picks WHERE judge_id IN ('jOwnedOpen','jAsJudgeOpen')") + n(raw, "SELECT 1 FROM judge_scores WHERE judge_id IN ('jOwnedOpen','jAsJudgeOpen')") + n(raw, "SELECT 1 FROM judge_conflicts WHERE judge_id IN ('jOwnedOpen','jAsJudgeOpen')"), 0);
  for (const id of ["jOwnedAnn1", "jOwnedAnn2", "jAsJudgeAnn"]) {
    const j = raw.prepare("SELECT * FROM judges WHERE id = ?").get(id);
    assert.ok(j, id + " row kept as placeholder");
    assert.equal(j.token, ""); assert.equal(j.user_id, null); assert.match(j.email, /^removed-/);
    assert.equal(n(raw, "SELECT 1 FROM judge_scores WHERE judge_id = ?", id), 1, "frozen scores stay");
  }
  assert.deepEqual(plain(raw.prepare("SELECT email, token FROM judges WHERE id = 'jOther'").get()), { email: "o@x.com", token: "tok-jOther" });
  assert.equal(n(raw, "SELECT 1 FROM judge_scores WHERE judge_id = 'jOther'"), 1);

  // quote requests
  assert.equal(n(raw, "SELECT 1 FROM contest_leads WHERE id = 'clOwnedByA'"), 0, "organizer's copy goes with the organizer");
  const fromA = raw.prepare("SELECT * FROM contest_leads WHERE id = 'clFromA'").get();
  assert.deepEqual([fromA.name, fromA.email, fromA.phone, fromA.note, fromA.user_id], ["", "", "", "", ""], "requester's details blanked, row kept");
  assert.equal(raw.prepare("SELECT name, email, phone FROM contest_leads WHERE id = 'clFromB'").get().email, "b@x.com", "other requester untouched");
  assert.equal(n(raw, "SELECT 1 FROM installer_leads WHERE id = 'ilToA'"), 0, "leads received by the deleted person's installer profile go with it");
  assert.equal(raw.prepare("SELECT email, name FROM installer_leads WHERE id = 'ilToC_fromB'").get().email, "b@x.com", "a lead received by another installer survives");
  assert.equal(raw.prepare("SELECT email, name, phone FROM installer_leads WHERE id = 'ilToC_fromA'").get().email, "");
  assert.equal(n(raw, "SELECT 1 FROM installer_leads WHERE id = 'ilToC_fromA'"), 1);
  // installers
  assert.deepEqual(plain(raw.prepare("SELECT owner_email, email FROM installers WHERE id = 'iA'").get()), { owner_email: "", email: "" });
  assert.deepEqual(plain(raw.prepare("SELECT owner_email, email FROM installers WHERE id = 'iD'").get()), { owner_email: "", email: "" });
  assert.deepEqual(plain(raw.prepare("SELECT owner_email, email FROM installers WHERE id = 'iC'").get()), { owner_email: "c@x.com", email: "c@x.com" });
  // edit logs
  assert.equal(n(raw, "SELECT 1 FROM listing_changes WHERE id = 'lcA_onA'"), 0, "log of a deleted home goes with it");
  assert.deepEqual(plain(raw.prepare("SELECT by_email, by_name FROM listing_changes WHERE id = 'lcA_onB'").get()), { by_email: "", by_name: "" });
  assert.equal(raw.prepare("SELECT by_email FROM listing_changes WHERE id = 'lcB'").get().by_email, "b@x.com");
  assert.equal(raw.prepare("SELECT by_email FROM contest_changes WHERE id = 'ccA'").get().by_email, "");
  assert.equal(raw.prepare("SELECT by_email FROM contest_changes WHERE id = 'ccB'").get().by_email, "b@x.com");
  // claims, signups, staff, reports
  assert.deepEqual(q(raw, "SELECT id FROM event_claims").map((r) => r.id), ["ecB"]);
  assert.deepEqual(q(raw, "SELECT id FROM alert_subs").map((r) => r.id), ["sB"], "case-insensitive email match");
  assert.deepEqual(q(raw, "SELECT contest_id, email FROM contest_staff ORDER BY email"), [{ contest_id: "cC", email: "b@x.com" }]);
  assert.equal(raw.prepare("SELECT contact FROM reports WHERE id = 'rA'").get().contact, "");
  assert.equal(raw.prepare("SELECT contact FROM reports WHERE id = 'rB'").get().contact, "b@x.com");
  // kept on purpose
  assert.deepEqual(plain(raw.prepare("SELECT user_id, email, amount FROM feature_orders WHERE session_id = 'sessA'").get()), { user_id: null, email: "a@x.com", amount: 500 });
  assert.equal(raw.prepare("SELECT user_id FROM feature_orders WHERE session_id = 'sessB'").get().user_id, "uB");
  assert.equal(n(raw, "SELECT 1 FROM email_prefs WHERE email = 'a@x.com' AND optout = 1"), 1);
  // other people untouched overall
  assert.equal(n(raw, "SELECT 1 FROM users WHERE id IN ('uB','uC')"), 2);
});

test("deleting an unrelated account leaves leads, judges and installers alone", async () => {
  const { raw, env } = seed();
  raw.prepare("INSERT INTO users (id,email,name) VALUES ('uZ','z@x.com','Zed')").run();
  const snapshot = () => JSON.stringify(["contest_leads", "installer_leads", "judges", "judge_scores", "installers", "listing_changes", "alert_subs", "contest_staff", "reports", "event_claims", "feature_orders"].map((t) => q(raw, `SELECT * FROM ${t} ORDER BY 1,2`)));
  const before = snapshot();
  await deleteAccount(env, "uZ", "z@x.com");
  assert.equal(snapshot(), before);
});

test("the frozen-results scrub still removes the entrant's home from announced contests", async () => {
  const { raw, env } = seed();
  await deleteAccount(env, "uA", "a@x.com");
  for (const id of ["cAn", "cCan"]) {
    const snap = JSON.parse(raw.prepare("SELECT results FROM contests WHERE id = ?").get(id).results);
    const a = snap.entries.find((e) => e.id === "pA"), b = snap.entries.find((e) => e.id === "pB");
    if (id === "cCan") {
      assert.deepEqual([a.name, a.address, a.city, a.lat, a.lng, a.photos, a.removed], ["", "", "", null, null, [], true]);
      assert.equal(a.votes, 3, "tally stays");
      assert.equal(b.name, "Bob home", "other entrants are untouched");
    }
  }
  // announced contest the person owned: stays live and owner-less
  assert.deepEqual(plain(raw.prepare("SELECT status, owner_id, contact_email, installer_email FROM contests WHERE id = 'cAn'").get()), { status: "live", owner_id: "", contact_email: "", installer_email: "" });
  assert.equal(raw.prepare("SELECT status FROM contests WHERE id = 'cA'").get().status, "closed");
});

// ---------------------------------------------------------------- (c) IP retention
test("IP rows older than 48 hours are pruned, newer ones kept (helper and on-insert path)", async () => {
  const { DB, raw } = makeDB();
  const ins = (ip, when) => raw.prepare("INSERT INTO submit_log (ip, created_at) VALUES (?, datetime('now', ?))").run(ip, when);
  ins("old-1", "-49 hours"); ins("old-2", "-10 days"); ins("fresh-1", "-47 hours"); ins("fresh-2", "-1 minutes");
  raw.prepare("INSERT INTO login_codes (email,code_hash,ip,expires_at,created_at) VALUES ('x@x.com','h','old-ip',datetime('now'),datetime('now','-50 hours')), ('x@x.com','h','new-ip',datetime('now'),datetime('now','-1 hours'))").run();
  raw.prepare("INSERT INTO help_votes (slug,helpful,who,created_at) VALUES ('s',1,'oldwho',datetime('now','-49 hours')), ('s',1,'newwho',datetime('now','-1 hours'))").run();
  await pruneIps({ DB });
  assert.deepEqual(q(raw, "SELECT ip FROM submit_log ORDER BY ip").map((r) => r.ip), ["fresh-1", "fresh-2"]);
  assert.deepEqual(q(raw, "SELECT ip FROM login_codes").map((r) => r.ip), ["new-ip"]);
  assert.deepEqual(q(raw, "SELECT who FROM help_votes ORDER BY id").map((r) => r.who), ["", "newwho"], "fingerprint cleared, vote count kept");

  // the report endpoint (which used to insert without pruning) now prunes on every insert
  ins("old-3", "-72 hours");
  const req = new Request("https://socallights.app/api/report", { method: "POST", headers: { "CF-Connecting-IP": "9.9.9.9" }, body: JSON.stringify({ ref: "x", message: "something is wrong" }) });
  const r = await reportPost({ request: req, env: { DB } });
  assert.equal(r.status, 200);
  const ips = q(raw, "SELECT ip FROM submit_log").map((x) => x.ip).sort();
  assert.deepEqual(ips, ["9.9.9.9", "fresh-1", "fresh-2"]);
  assert.equal(ipPruneStatements({ DB }).length, 3);
});

// ---------------------------------------------------------------- (d) email footer, headers, postal address
const stubEnv = () => { const { DB, raw } = makeDB(); return { DB, raw, env: { DB, RESEND_API_KEY: "re_test" } }; };
const MARKETING = ["alerts_weekly", "contest_remind_open", "contest_remind_close", "contest_invite", "judge_invite", "coorg_invite", "judge_nudge", "results_entrant"];
const TRANSACTIONAL = ["usage_alert", "signin_code", "alerts_confirm", "contest_quote", "installer_quote", "contest_quote_sent", "admin_digest", "installer_claim"];
const sampleVars = (id) => { const t = TEMPLATES.find((x) => x.id === id), v = {}; for (const [k, d] of Object.entries(t.vars || {})) v[k] = d[1]; return v; };

test("marketing emails carry the postal address from MAIL_POSTAL_ADDRESS and an unsubscribe link; without the secret there is no address line and no crash", async () => {
  const { env } = stubEnv();
  for (const id of MARKETING) {
    assert.ok(isMarketing(TEMPLATES.find((t) => t.id === id)), id);
    const withAddr = await renderTemplate({ ...env, MAIL_POSTAL_ADDRESS: ADDRESS }, id, { ...sampleVars(id), unsub_url: "https://socallights.app/api/alerts/unsubscribe?t=abc" }, null, "https://socallights.app/unsubscribe?t=tok");
    assert.ok(withAddr.html.includes(ADDRESS) && withAddr.text.includes(ADDRESS), id + " has the address");
    assert.match(withAddr.html + withAddr.text, /unsubscribe/i, id);
    assert.ok(/unsubscribe\?t=tok|alerts\/unsubscribe\?t=abc/.test(withAddr.html), id + " has a token link");
    const without = await renderTemplate(env, id, { ...sampleVars(id), unsub_url: "https://socallights.app/api/alerts/unsubscribe?t=abc" }, null, "https://socallights.app/unsubscribe?t=tok");
    assert.ok(!without.html.includes("Example Way") && !without.text.includes("Example Way"));
    assert.match(without.html, /unsubscribe/i);
    const blank = await renderTemplate({ ...env, MAIL_POSTAL_ADDRESS: "   " }, id, sampleVars(id));
    assert.ok(blank.html.length > 100);
  }
  for (const id of TRANSACTIONAL) {
    const m = await renderTemplate({ ...env, MAIL_POSTAL_ADDRESS: ADDRESS }, id, sampleVars(id));
    assert.ok(!m.html.includes(ADDRESS) && !m.text.includes(ADDRESS), id + " has no address");
  }
});

test("the send helper puts List-Unsubscribe headers in the Resend request for marketing mail only", async () => {
  const { env, raw } = stubEnv();
  env.MAIL_POSTAL_ADDRESS = ADDRESS;
  const bodies = [], realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { bodies.push({ url, body: JSON.parse(init.body) }); return { ok: true }; };
  try {
    assert.ok(await sendTemplate(env, "contest_invite", "neighbor@x.com", sampleVars("contest_invite")));
    const tok = raw.prepare("SELECT token FROM email_prefs WHERE email = 'neighbor@x.com'").get().token;
    const h = bodies[0].body.headers;
    assert.equal(bodies[0].url, "https://api.resend.com/emails");
    assert.equal(h["List-Unsubscribe"], `<https://socallights.app/api/unsub?t=${tok}>, <mailto:info@socallights.app?subject=unsubscribe>`);
    assert.equal(h["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
    assert.ok(bodies[0].body.html.includes(ADDRESS) && bodies[0].body.html.includes("/unsubscribe?t=" + tok));

    assert.ok(await sendTemplate(env, "alerts_weekly", "sub@x.com", { ...sampleVars("alerts_weekly"), unsub_url: "https://socallights.app/api/alerts/unsubscribe?t=alerttok" }));
    assert.equal(bodies[1].body.headers["List-Unsubscribe"], "<https://socallights.app/api/alerts/unsubscribe?t=alerttok>, <mailto:info@socallights.app?subject=unsubscribe>");
    assert.equal(bodies[1].body.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");

    for (const id of ["judge_invite", "coorg_invite"]) { assert.ok(await sendTemplate(env, id, "j@x.com", sampleVars(id))); assert.ok(bodies.at(-1).body.headers["List-Unsubscribe-Post"], id); }

    for (const id of ["signin_code", "alerts_confirm", "contest_quote", "installer_quote"]) {
      assert.ok(await sendTemplate(env, id, "t@x.com", sampleVars(id)));
      const b = bodies.at(-1).body;
      assert.equal(b.headers, undefined, id); assert.ok(!b.html.includes(ADDRESS), id);
    }
  } finally { globalThis.fetch = realFetch; }
});

// ---------------------------------------------------------------- (e) unsubscribe really stops the emails
test("unsubscribe endpoints stop the emails (page POST, mail-app one-click POST, weekly alert link)", async () => {
  const { env, raw } = stubEnv();
  const realFetch = globalThis.fetch; let sent = 0;
  globalThis.fetch = async () => { sent++; return { ok: true }; };
  try {
    assert.ok(await sendTemplate(env, "contest_remind_open", "p@x.com", sampleVars("contest_remind_open")));
    const tok = raw.prepare("SELECT token FROM email_prefs WHERE email = 'p@x.com'").get().token;
    // the unsubscribe page's own call
    let r = await unsubGet({ request: new Request("https://socallights.app/api/unsub?t=" + tok), env });
    assert.equal((await r.json()).optout, false);
    r = await unsubPost({ request: new Request("https://socallights.app/api/unsub", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ t: tok, optout: true }) }), env });
    assert.equal(r.status, 200);
    assert.equal(sent, 1);
    assert.equal(await sendTemplate(env, "contest_remind_open", "p@x.com", sampleVars("contest_remind_open")), false);
    assert.equal(await sendTemplate(env, "judge_invite", "p@x.com", sampleVars("judge_invite")), false);
    assert.equal(sent, 1, "nothing more was sent");
    // mail app one-click: form body, token in the query string
    raw.prepare("UPDATE email_prefs SET optout = 0 WHERE email = 'p@x.com'").run();
    r = await unsubPost({ request: new Request("https://socallights.app/api/unsub?t=" + tok, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "List-Unsubscribe=One-Click" }), env });
    assert.equal(r.status, 200);
    assert.equal(raw.prepare("SELECT optout FROM email_prefs WHERE email = 'p@x.com'").get().optout, 1);
    // a bad token does nothing
    r = await unsubPost({ request: new Request("https://socallights.app/api/unsub?t=nope", { method: "POST", body: "List-Unsubscribe=One-Click" }), env });
    assert.equal(r.status, 404);
    // weekly alert subscriber: link (GET) and one-click (POST) both delete the row
    raw.prepare("INSERT INTO alert_subs (id,email,city,lat,lng,token,confirmed) VALUES ('s1','w1@x.com','Pasadena',1,2,'tok-w1',1), ('s2','w2@x.com','Pasadena',1,2,'tok-w2',1), ('s3','w3@x.com','Pasadena',1,2,'tok-w3',1)").run();
    await alertUnsubGet({ request: new Request("https://socallights.app/api/alerts/unsubscribe?t=tok-w1"), env });
    r = await alertUnsubPost({ request: new Request("https://socallights.app/api/alerts/unsubscribe?t=tok-w2", { method: "POST", body: "List-Unsubscribe=One-Click" }), env });
    assert.equal(r.status, 200);
    assert.deepEqual(q(raw, "SELECT id FROM alert_subs").map((x) => x.id), ["s3"]);
  } finally { globalThis.fetch = realFetch; }
});

// ---------------------------------------------------------------- (f) the policy names every outside host the code uses
const root = new URL("..", import.meta.url).pathname;
const walk = (d, out = []) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p, out); else if (/\.(js|html|css)$/.test(f)) out.push(p); } return out; };
const policy = readFileSync(join(root, "public/privacy.html"), "utf8").replace(/<[^>]+>/g, " ").toLowerCase();

// host in code -> word(s) that must appear in the policy's text
const NAMED = {
  "fonts.googleapis.com": "google fonts", "fonts.gstatic.com": "google fonts", "tiles.openfreemap.org": "openfreemap",
  "challenges.cloudflare.com": "turnstile", "accounts.google.com": "sign in with google|continue with google|sign-in, if you choose", "oauth2.googleapis.com": "google", "openidconnect.googleapis.com": "google",
  "api.geoapify.com": "geoapify", "geocoding.geo.census.gov": "census", "nominatim.openstreetmap.org": "nominatim", "api.resend.com": "resend", "api.stripe.com": "stripe",
  "www.amazon.com": "amazon", "www.youtube-nocookie.com": "youtube", "player.vimeo.com": "vimeo", "cash.app": "cash app", "gateway.ai.cloudflare.com": "workers ai", "api.anthropic.com": "anthropic",
  "cloudflare-dns.com": "cloudflare's public dns", // outreach deliverability check: receives only a domain name (the part after the @), never an address or a visitor's data; named in the policy anyway
  "www.google.com": "google maps", "maps.apple.com": "apple maps", "waze.com": "waze", "calendar.google.com": "google calendar",
};
// hosts that appear in the code but are not a data recipient: standards/namespace URLs, comments, credits, examples
const NOT_RECIPIENTS = new Set(["socallights.app", "socal-lights.pages.dev", "schema.org", "www.w3.org", "www.sitemaps.org", "www.opensource.org", "www.denso-wave.com", "www.d-project.com", "example.com", "stackoverflow.com", "www.flickr.com", "ticketmaster.evyy.net",
  "maplibre.org", "github.com" /* licence and documentation links inside the self-hosted map library (public/vendor), no data sent */, "developers.cloudflare.com", "resend.com" /* documentation links for the owner (Admin > Usage "source"), no data sent */,
  "api.cloudflare.com" /* the admin-only usage read (Cloudflare analytics, our own account's counts): no visitor data goes there */,
  "dashboard.stripe.com" /* an admin-only link to the owner's own Stripe dashboard; no visitor data goes there */]);

test("every outside host named in the policy is used by the code, and every outside host the code uses is in the policy", () => {
  const code = walk(join(root, "public")).concat(walk(join(root, "functions"))).filter((f) => !f.endsWith("privacy.html"));
  const used = new Set();
  for (const f of code) for (const m of readFileSync(f, "utf8").matchAll(/https?:\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+)/gi)) used.add(m[1].toLowerCase());
  const missing = [...used].filter((h) => !NOT_RECIPIENTS.has(h) && !NAMED[h]);
  assert.deepEqual(missing, [], "hosts the code uses that this test does not map to the policy: " + missing.join(", "));
  for (const [host, words] of Object.entries(NAMED)) {
    assert.ok(used.has(host), `the policy names ${host} but no code uses it`);
    assert.ok(words.split("|").some((w) => policy.includes(w)), `policy does not mention "${words}" (${host})`);
  }
});

test("the policy no longer makes the false claims and has the required sections", () => {
  const raw = readFileSync(join(root, "public/privacy.html"), "utf8");
  for (const bad of ["We do not show ads", "share it with advertisers", "not sent to our servers or stored", "within a day or two"]) assert.ok(!raw.includes(bad), bad);
  for (const must of ["Who receives your data", "Do Not Track", "How long we keep information", "I saw it lit tonight", "Updated November 11, 2026", "Sponsors recorded by organizers", "24 months after the contest's voting ends", "Homes listed by our team or by contest organizers", "Remove my home", "street address, a name if the public source gave one", "We keep a record of that confirmation"]) assert.ok(raw.includes(must), must);
  assert.ok(!/\d{1,5} [A-Z][a-z]+ (St|Street|Ave|Way|Blvd|Road|Rd)\b.*CA \d{5}/.test(readFileSync(join(root, "functions/_lib/mailtpl.js"), "utf8")), "no street address in the repo's mail template");
});

// ---------------------------------------------------------------- (g) quote-lead consent text matches what the server does
test("the quote checkbox names the recipients and data on the contest page and the installer page, and the server matches", () => {
  const contest = readFileSync(join(root, "public/contest.html"), "utf8");
  const inst = readFileSync(join(root, "functions/installer/[slug].js"), "utf8");
  const cq = readFileSync(join(root, "functions/api/contests/[slug]/quote.js"), "utf8");
  const iq = readFileSync(join(root, "functions/api/installers/[slug]/quote.js"), "utf8");
  assert.ok(contest.includes("and to the organizer of this contest"), "contest checkbox names the organizer");
  assert.ok(contest.includes("name, email address, phone number (if I entered one) and my note"));
  assert.ok(contest.includes("This is optional"));
  assert.ok(!contest.includes("shared only with them"));
  assert.ok(/id="q-ok" type="checkbox"(?! checked)/.test(contest), "unticked by default");
  assert.ok(inst.includes("name, email address, phone number (if I entered one) and my note") && inst.includes("This is optional"));
  assert.ok(/id="qc" type="checkbox"(?! checked)/.test(inst), "unticked by default");
  // server: consent must be exactly true; contest request stores a copy for the organizer and emails installer + organizer; installer request goes to the installer only
  for (const s of [cq, iq]) assert.ok(s.includes("b.consent !== true"));
  assert.match(cq, /INSERT INTO contest_leads[\s\S]*name, user\.email, phone, note/);
  assert.match(cq, /sendTemplate\(env, "contest_quote", c\.installer_email[\s\S]*email: user\.email, phone, note/);
  assert.match(cq, /sendTemplate\(env, "contest_quote_sent", c\.contact_email/);
  assert.match(iq, /INSERT INTO installer_leads[\s\S]*name, user\.email, phone, note/);
  assert.ok(!iq.includes("contact_email") && !iq.includes("contest_quote_sent"), "installer-page requests do not go to a contest organizer");
});

// ---------------------------------------------------------------- (h) outreach hashes and the monthly update (behavior is in outreach.test.mjs)
test("the policy describes the outreach do-not-contact list (hash only) and the separate monthly-update opt-in, and retention names both", () => {
  const t = policy.replace(/\s+/g, " ");
  for (const must of ["public sources", "one-way hash", "do-not-contact list", "monthly update", "never ticked for you", "sponsored or affiliate", "monthly update opt-in:", "hashed outreach counts are deleted after 24 months"]) assert.ok(t.includes(must), must);
});
test("deleting an account removes the newsletter opt-in and leaves only a hash on the suppression list", async () => {
  const { DB, raw } = makeDB();
  raw.prepare("INSERT INTO users (id,email,name) VALUES ('uN','nl@x.com','N')").run();
  raw.prepare("INSERT INTO newsletter_optins (user_id,email,role,opted_in_at,token) VALUES ('uN','nl@x.com','host',datetime('now'),'" + "a".repeat(36) + "')").run();
  await deleteAccount({ DB, PHOTOS }, "uN", "nl@x.com");
  assert.equal(n(raw, "SELECT 1 FROM newsletter_optins"), 0);
  const s = q(raw, "SELECT * FROM outreach_suppressions");
  assert.equal(s.length, 1); assert.match(s[0].email_hash, /^[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(s).includes("nl@x.com"));
});
