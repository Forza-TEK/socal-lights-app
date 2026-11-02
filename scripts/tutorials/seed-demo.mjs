// Seeds a LOCAL D1 database with a made-up demo contest for recording tutorial videos. Never run against the live database.
// Usage: node scripts/tutorials/seed-demo.mjs <outDir>   (writes seed.sql and cookies.json, then run the wrangler commands it prints)
import { writeFileSync, mkdirSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
const out = process.argv[2] || "."; mkdirSync(out, { recursive: true });
const sha = (s) => createHash("sha256").update(s).digest("hex"), q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const exp = "2030-01-01 00:00:00";
const users = [
  ["u_org", "maria@demo.example", "Maria Lopez"], ["u_voter", "sam@demo.example", "Sam Rivera"], ["u_judge", "dana@demo.example", "Dana Brooks"],
  ["u_e1", "garcia@demo.example", "Garcia"], ["u_e2", "patel@demo.example", "Patel"], ["u_e3", "nguyen@demo.example", "Nguyen"],
  ["u_e4", "johnson@demo.example", "Johnson"], ["u_e5", "fischer@demo.example", "Fischer"], ["u_e6", "okafor@demo.example", "Okafor"],
  ...Array.from({ length: 8 }, (_, i) => ["u_v" + i, `neighbor${i}@demo.example`, "Neighbor " + (i + 1)]),
];
const homes = [
  ["p_garcia", "u_e1", "Garcia Family Lights", "412 Maple Street", "tree-1"], ["p_patel", "u_e2", "Patel Candy Cane Lane", "418 Maple Street", "xmaspark-1"],
  ["p_nguyen", "u_e3", "Nguyen North Pole", "425 Maple Street", "drive-1"], ["p_johnson", "u_e4", "Johnson Winter Wonderland", "431 Maple Street", "show-1"],
  ["p_fischer", "u_e5", "Fischer Forest of Lights", "440 Maple Street", "walk-1"], ["p_okafor", "u_e6", "Okafor Rainbow Roof", "447 Maple Street", "family-1"],
];
const cats = ["Best Traditional", "Most Creative", "Best Animated"];
const sql = [], cookies = {};
for (const [id, email, name] of users) sql.push(`INSERT INTO users (id,email,name) VALUES (${q(id)},${q(email)},${q(name)});`);
for (const id of ["u_org", "u_voter", "u_judge"]) { const t = randomBytes(24).toString("base64url"); cookies[id] = t; sql.push(`INSERT INTO sessions (id,user_id,expires_at) VALUES (${q(sha(t))},${q(id)},${q(exp)});`); }
sql.push(`INSERT INTO contests (id,slug,owner_id,name,org,city,descr,contact_email,status,entries_close,vote_start,vote_end,categories,approval,show_counts,mode,judge_method,prize_mode,prize)
VALUES ('c_demo','maple-street-holiday-lights-2026','u_org','Maple Street Holiday Lights 2026','Maple Street Neighbors','Demo City','A friendly neighborhood contest. Demo data for a tutorial video.','maria@demo.example','live','2026-12-10','2026-11-02','2026-12-20',${q(JSON.stringify(cats))},'manual',0,'both','score','none','');`);
sql.push(`INSERT INTO judges (id,contest_id,email,token,user_id) VALUES ('j_dana','c_demo','dana@demo.example','demo-token','u_judge');`);
homes.forEach(([id, uid, name, addr, ph], i) => sql.push(`INSERT INTO posts (id,status,biz,title,city,county,lat,lng,descr,photos,season,address,poster_type,contest_id,user_id,entry_no,approved_at) VALUES (${q(id)},'approved',${q(name)},${q(name)},'Demo City','Orange',33.7${i},-117.8${i},${q("Lights on every roofline, a lit walkway and music at 6 pm.")},${q(JSON.stringify([`p/${id.replace("_", "")}xx/1.jpg`]))},'christmas',${q(addr)},'homeowner','c_demo',${q(uid)},${i + 1},datetime('now'));`));
// a few neighbor votes so the contest looks alive
for (let v = 0; v < 8; v++) cats.forEach((c, ci) => sql.push(`INSERT INTO votes (id,contest_id,user_id,post_id,category) VALUES ('vt${v}_${ci}','c_demo','u_v${v}',${q(homes[(v + ci * 2) % 6][0])},${q(c)});`));
writeFileSync(out + "/seed.sql", sql.join("\n") + "\n"); writeFileSync(out + "/cookies.json", JSON.stringify(cookies));
writeFileSync(out + "/photos.json", JSON.stringify(homes.map(([id, , , , ph]) => ({ key: `p/${id.replace("_", "")}xx/1.jpg`, file: `public/img/stock/${ph}.jpg` }))));
console.log("wrote", out);
