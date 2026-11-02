// Seeds a LOCAL D1 database with a made-up demo contest for recording tutorial videos. Never run against the live database.
// Usage: node scripts/tutorials/seed-demo.mjs <outDir>   (writes seed.sql and cookies.json, then run the wrangler commands it prints)
import { writeFileSync, mkdirSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
const out = process.argv[2] || "."; mkdirSync(out, { recursive: true });
const sha = (s) => createHash("sha256").update(s).digest("hex"), q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const exp = "2030-01-01 00:00:00";
const users = [
  ["u_org", "maria@demo.example", "Maria Lopez"], ["u_voter", "sam@demo.example", "Sam Rivera"], ["u_judge", "dana@demo.example", "Dana Brooks"],
  ["u_p1", "reyes@demo.example", "Reyes"], ["u_p2", "chen@demo.example", "Chen"], ["u_p3", "walker@demo.example", "Walker"],
  ["u_enter", "taylor@demo.example", "Taylor Kim"], ["u_inst", "quotes@brightnights.example.com", "Bright Nights Lighting"], ["u_mine", "jamie@demo.example", "Jamie Cole"],
  ["u_e1", "garcia@demo.example", "Garcia"], ["u_e2", "patel@demo.example", "Patel"], ["u_e3", "nguyen@demo.example", "Nguyen"],
  ["u_e4", "johnson@demo.example", "Johnson"], ["u_e5", "fischer@demo.example", "Fischer"], ["u_e6", "okafor@demo.example", "Okafor"],
  ...Array.from({ length: 8 }, (_, i) => ["u_v" + i, `neighbor${i}@demo.example`, "Neighbor " + (i + 1)]),
];
const homes = [
  ["p_garcia", "u_e1", "Garcia Family Lights", "412 Maple Street", "tree-1"], ["p_patel", "u_e2", "Patel Candy Cane Lane", "418 Maple Street", "xmaspark-1"],
  ["p_nguyen", "u_e3", "Nguyen North Pole", "425 Maple Street", "drive-1"], ["p_johnson", "u_e4", "Johnson Winter Wonderland", "431 Maple Street", "show-1"],
  ["p_fischer", "u_e5", "Fischer Forest of Lights", "440 Maple Street", "walk-1"], ["p_okafor", "u_e6", "Okafor Rainbow Roof", "447 Maple Street", "family-1"],
];
const mine = ["p_jamie", "u_mine", "Cole Family Christmas", "452 Maple Street", "tree-2"]; // Jamie already has an entry (for the edit and profile videos); Taylor has none (for the enter video)
const pending = [["p_pend1", "u_p1", "Reyes Santa's Workshop", "455 Maple Street", "tree-4"], ["p_pend2", "u_p2", "Chen Candy Castle", "461 Maple Street", "drive-2"], ["p_pend3", "u_p3", "Walker Winter Lane", "466 Maple Street", "walk-2"]]; // waiting for the organizer (approve video)
const cats = ["Best Traditional", "Most Creative", "Best Animated"];
const sql = [
  // re-runnable: clear the demo rows first (and any contest the recordings created for the organizer)
  "DELETE FROM votes WHERE contest_id IN (SELECT id FROM contests WHERE owner_id='u_org' OR id IN ('c_demo','c_past')); DELETE FROM judges WHERE contest_id IN (SELECT id FROM contests WHERE owner_id='u_org' OR id IN ('c_demo','c_past')); DELETE FROM judge_picks WHERE contest_id='c_demo'; DELETE FROM judge_scores WHERE contest_id='c_demo'; DELETE FROM judge_conflicts WHERE contest_id='c_demo';",
  "DELETE FROM installers WHERE id='i_bright'; DELETE FROM alert_subs WHERE token IN ('demo-confirm-token','demo-unsub-token');",
  "DELETE FROM events WHERE id IN (SELECT event_id FROM contests WHERE owner_id='u_org' OR id IN ('c_demo','c_past')); DELETE FROM events WHERE id='c-maple-street-holiday-lights-2026';",
  "DELETE FROM contest_hits WHERE contest_id IN (SELECT id FROM contests WHERE owner_id='u_org'); DELETE FROM contest_staff WHERE contest_id IN (SELECT id FROM contests WHERE owner_id='u_org'); DELETE FROM contest_sponsors WHERE contest_id IN (SELECT id FROM contests WHERE owner_id='u_org'); DELETE FROM contest_changes WHERE contest_id IN (SELECT id FROM contests WHERE owner_id='u_org');",
  "DELETE FROM posts WHERE contest_id IN (SELECT id FROM contests WHERE owner_id='u_org') OR contest_id IN ('c_demo','c_past') OR user_id GLOB 'u_*'; DELETE FROM events WHERE name = 'Oak Hill Neighborhood Tree Lighting'; DELETE FROM contests WHERE owner_id='u_org' OR id IN ('c_demo','c_past'); DELETE FROM drafts WHERE user_id GLOB 'u_*'; DELETE FROM sessions WHERE user_id GLOB 'u_*'; DELETE FROM users WHERE id GLOB 'u_*';",
], cookies = {};
for (const [id, email, name] of users) sql.push(`INSERT INTO users (id,email,name) VALUES (${q(id)},${q(email)},${q(name)});`);
for (const id of ["u_org", "u_voter", "u_judge", "u_enter", "u_mine", "u_inst"]) { const t = randomBytes(24).toString("base64url"); cookies[id] = t; sql.push(`INSERT INTO sessions (id,user_id,expires_at) VALUES (${q(sha(t))},${q(id)},${q(exp)});`); }
sql.push(`INSERT INTO contests (id,slug,owner_id,name,org,city,descr,contact_email,status,entries_close,vote_start,vote_end,categories,approval,show_counts,mode,judge_method,prize_mode,prize)
VALUES ('c_demo','maple-street-holiday-lights-2026','u_org','Maple Street Holiday Lights 2026','Maple Street Neighbors','Irvine','A friendly neighborhood contest. Demo data for a tutorial video.','maria@demo.example','live','2026-12-10','2026-10-28','2026-12-20',${q(JSON.stringify(cats))},'manual',0,'both','score','none','');`);
sql.push(`INSERT INTO events (id,name,county,city,type,start_date,end_date,status,free,price,hours,lat,lng,blurb,url,season,venue,address,updated_at) VALUES ('c-maple-street-holiday-lights-2026','Maple Street Holiday Lights 2026','Orange','Irvine','drive','2026-10-28','2026-12-20','confirmed',1,'Free','',33.6846,-117.8265,'Maple Street Neighbors home decorating contest. Demo data.','/c/maple-street-holiday-lights-2026','christmas','','',datetime('now'));`);
sql.push(`UPDATE contests SET event_id='c-maple-street-holiday-lights-2026' WHERE id='c_demo';`);
sql.push(`INSERT INTO judges (id,contest_id,email,token,user_id) VALUES ('j_dana','c_demo','dana@demo.example','demo-token','u_judge');`);
[...homes, mine, ...pending].forEach(([id, uid, name, addr, ph], i) => sql.push(`INSERT INTO posts (id,status,biz,title,city,county,lat,lng,descr,photos,season,address,poster_type,contest_id,user_id,entry_no,approved_at) VALUES (${q(id)},${q(id.startsWith("p_pend") ? "pending" : "approved")},${q(name)},${q(name)},'Irvine','Orange',33.7${i},-117.8${i},${q("Lights on every roofline, a lit walkway and music at 6 pm.")},${q(JSON.stringify([`p/${id.replace("_", "")}xx/1.jpg`]))},'christmas',${q(addr)},'homeowner','c_demo',${q(uid)},${i + 1},datetime('now'));`));
// last year's contest, announced, won by Jamie (gives the profile video a badge), and a saved draft
sql.push(`INSERT INTO contests (id,slug,owner_id,name,org,city,descr,contact_email,status,entries_close,vote_start,vote_end,categories,mode,announced,show_counts,results,voting_open,entries_open)
VALUES ('c_past','maple-street-holiday-lights-2025','u_org','Maple Street Holiday Lights 2025','Maple Street Neighbors','Irvine','Last year (demo data).','maria@demo.example','live','2025-12-10','2025-11-02','2025-12-20',${q(JSON.stringify(["Best Traditional"]))},'public',1,1,${q(JSON.stringify({ awards: [{ category: "Best Traditional", kind: "public", label: "People's Choice", ids: ["p_jamie25"] }] }))},0,0);`);
sql.push(`INSERT INTO posts (id,status,biz,title,city,county,lat,lng,descr,photos,season,address,poster_type,contest_id,user_id,entry_no,approved_at) VALUES ('p_jamie25','approved','Cole Family Christmas','Cole Family Christmas','Irvine','Orange',33.70,-117.80,'Last year.','[]','christmas','452 Maple Street','homeowner','c_past','u_mine',1,datetime('now'));`);
sql.push(`INSERT INTO drafts (id,user_id,kind,title,data,step) VALUES ('d_demo','u_mine','house','Our new light show',${q(JSON.stringify({ title: "Our new light show" }))},1);`);
// a made-up installer with two linked homes (Professionally installed filter, Installed by, installer profile)
sql.push(`INSERT INTO installers (id,slug,name,web,phone,area,blurb,email) VALUES ('i_bright','bright-nights-lighting','Bright Nights Lighting','brightnights.example.com','(949) 555-0142','Orange County','Custom holiday lighting design, installation and takedown. Demo data.','quotes@brightnights.example.com');`);
sql.push(`UPDATE posts SET installer_id='i_bright', installer_confirmed=1 WHERE id IN ('p_garcia','p_patel');`);
sql.push(`UPDATE posts SET installer_id='i_bright', installer_confirmed=0 WHERE id='p_jamie';`); // a home that names the company but is not confirmed yet
// weekly email sign-ups: one waiting for its confirm link, one confirmed (for the unsubscribe link)
sql.push(`INSERT INTO alert_subs (id,email,city,lat,lng,radius,token,confirmed) VALUES ('a_demo1','neighbor@example.com','Irvine',33.6846,-117.8265,10,'demo-confirm-token',0);`);
sql.push(`INSERT INTO alert_subs (id,email,city,lat,lng,radius,token,confirmed,confirmed_at) VALUES ('a_demo2','neighbor2@example.com','Irvine',33.6846,-117.8265,10,'demo-unsub-token',1,datetime('now'));`);
// a few neighbor votes so the contest looks alive
for (let v = 0; v < 8; v++) cats.forEach((c, ci) => sql.push(`INSERT INTO votes (id,contest_id,user_id,post_id,category) VALUES ('vt${v}_${ci}','c_demo','u_v${v}',${q(homes[(v + ci * 2) % 6][0])},${q(c)});`));
for (let v = 0; v < 8; v++) sql.push(`UPDATE votes SET created_at = datetime('now','-${v % 5} days') WHERE user_id = 'u_v${v}';`);
for (const [d, src, n] of [[0, "", 31], [1, "", 24], [2, "", 12], [0, "qr", 9], [1, "qr", 14], [2, "qr", 6], [0, "share", 5]]) sql.push(`INSERT INTO contest_hits (contest_id,day,src,n) VALUES ('c_demo',date('now','-${d} days'),${q(src)},${n});`);
// optional extra for the "Announce winners" video: the judge has finished scoring every home, so announcing needs no "tap again to announce anyway"
const judged = []; [...homes, mine].forEach(([id], i) => cats.forEach((c, ci) => judged.push(`INSERT INTO judge_scores (contest_id,judge_id,post_id,category,score) VALUES ('c_demo','j_dana',${q(id)},${q(c)},${5 + ((i * 3 + ci * 2) % 6)});`)));
writeFileSync(out + "/judged.sql", judged.join("\n") + "\n");
writeFileSync(out + "/seed.sql", sql.join("\n") + "\n"); writeFileSync(out + "/cookies.json", JSON.stringify(cookies));
writeFileSync(out + "/photos.json", JSON.stringify([...homes, mine, ...pending].map(([id, , , , ph]) => ({ key: `p/${id.replace("_", "")}xx/1.jpg`, file: `public/img/stock/${ph}.jpg` }))));
console.log("wrote", out);
