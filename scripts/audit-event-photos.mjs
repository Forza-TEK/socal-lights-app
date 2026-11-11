#!/usr/bin/env node
// Photo audit for the live map (audit 2026-11-11, DAT-01). Run it in the weekly upkeep and put the numbers in the report.
//
//   node scripts/audit-event-photos.mjs                    rules on the file names only (one anonymous read of /api/events)
//   node scripts/audit-event-photos.mjs --check-images     also load each photo (1 request per second per host) and flag small or tiny ones
//   node scripts/audit-event-photos.mjs --file events.json use a saved copy of the API
//   node scripts/audit-event-photos.mjs --sample 40        print a random sample of 40 events with a photo, to open and look at by hand (the miss rate goes in the report)
//
// Rules (owner, 2026-11-11): a CITY or government event (organizer, source or venue like "City of", "Parks and Recreation", a .gov domain) may keep its city
// logo or seal as the card photo. For every other event a logo, badge, banner, newsletter cover, screenshot or unrelated picture is rejected and the card shows
// the stock photo for its type, and so is a blurry or low-resolution picture (under 500 px wide). Names alone cannot tell a logo from a photo, so the sample
// matters: look at the pictures. To remove one, add a migration with `UPDATE events SET image=NULL, updated_at=datetime('now') WHERE id='…' AND image='<current url>';`
import { readFileSync } from "node:fs";
import { imageProblem, imageSize, isCityEvent } from "./event-rules.mjs";

const args = process.argv.slice(2), opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
let events;
if (opt("--file")) events = JSON.parse(readFileSync(opt("--file"), "utf8"));
else { const res = await fetch("https://socallights.app/api/events?full=1", { headers: { "user-agent": "socal-lights-photo-audit" } }); if (!res.ok) { console.error("API answered " + res.status); process.exit(1); } events = await res.json(); }
const toRow = (e) => ({ id: e.id, name: e.n, venue: e.v, blurb: e.b, url: e.u, image: e.img });
const withPhoto = events.filter((e) => e.img);
console.log(`${events.length} events, ${withPhoto.length} with a photo, ${events.length - withPhoto.length} without (they show the stock photo).`);

const problems = [];
for (const e of withPhoto) { const p = imageProblem(toRow(e)); if (p) problems.push({ id: e.id, city: isCityEvent(toRow(e)), ...p }); }
for (const level of ["error", "warn"]) { const l = problems.filter((p) => p.level === level); console.log(`\n${level === "error" ? "Reject (clear the photo)" : "Look at these"} by file name: ${l.length}`); for (const p of l) console.log(`  ${p.id}${p.city ? " [city/gov]" : ""}: ${p.why}`); }

if (args.includes("--check-images")) {
  const last = new Map(); const small = [];
  for (const e of withPhoto) {
    let u = e.img; if (u.startsWith("/")) u = "https://socallights.app" + u;
    const host = new URL(u).host, wait = (last.get(host) || 0) + 1000 - Date.now(); if (wait > 0) await new Promise((r) => setTimeout(r, wait)); last.set(host, Date.now());
    try {
      const res = await fetch(u, { headers: { range: "bytes=0-65535", "user-agent": "Mozilla/5.0 (compatible; socal-lights-photo-audit)" }, signal: AbortSignal.timeout(20000) });
      if (!res.ok && res.status !== 206) { small.push(`${e.id}: image answers HTTP ${res.status}`); continue; }
      const buf = new Uint8Array(await res.arrayBuffer()), size = imageSize(buf), total = Number((res.headers.get("content-range") || "").split("/")[1]) || buf.length;
      if (size && size.w < 500) small.push(`${e.id}: only ${size.w} x ${size.h} px (low resolution)`);
      else if (total < 8000) small.push(`${e.id}: only ${total} bytes (likely an icon or blank image)`);
    } catch (x) { small.push(`${e.id}: could not load (${String(x.cause?.code || x.name).slice(0, 30)})`); }
  }
  console.log(`\nSmall, tiny or unreachable photos: ${small.length}`); for (const s of small) console.log("  " + s);
}

if (opt("--sample")) {
  const n = Number(opt("--sample")) || 40, pool = withPhoto.slice();
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  console.log(`\nSample of ${n} to check by eye (open each url; count the logos, badges, banners, covers and unrelated pictures, and report the miss rate):`);
  for (const e of pool.slice(0, n)) console.log(`  ${e.id}  ${e.img}`);
}
