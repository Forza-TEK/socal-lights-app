// Matching a house or installer post to the sweep-made event at the same street address, so the person's own record replaces it.
// An exact match (same number, street and city or ZIP) hides the event; the same street with a different number is only flagged.
const SUF = { street: "st", st: "st", avenue: "ave", ave: "ave", av: "ave", drive: "dr", dr: "dr", road: "rd", rd: "rd", lane: "ln", ln: "ln", court: "ct", ct: "ct", circle: "cir", cir: "cir", place: "pl", pl: "pl", boulevard: "blvd", blvd: "blvd", terrace: "ter", ter: "ter", parkway: "pkwy", pkwy: "pkwy", highway: "hwy", hwy: "hwy", trail: "trl", trl: "trl", way: "way", loop: "loop", square: "sq", sq: "sq", path: "path", row: "row", walk: "walk" };
const DIR = { north: "n", south: "s", east: "e", west: "w", n: "n", s: "s", e: "e", w: "w" };

// "27 Via Alicia Unit 4, Irvine, CA 92618" -> { num: "27", name: "via alicia", suf: "" }; null for an intersection or no number
export function streetParts(s) {
  let t = String(s || "").toLowerCase().split(",")[0];
  t = t.replace(/#\s*[\w-]+/g, " ").replace(/\b(apt|apartment|unit|ste|suite|bldg|building|space|spc)\b\.?\s*[\w-]*/g, " ").replace(/[.’']/g, "").replace(/[^a-z0-9 &/-]/g, " ");
  if (/[&/]|\b(and|at)\b/.test(t)) return null;
  const w = t.split(/\s+/).filter(Boolean), m = w[0] && w[0].match(/^(\d+)/);
  if (!m || w.length < 2) return null;
  let rest = w.slice(1).map((x) => DIR[x] || x), suf = "";
  const last = rest[rest.length - 1];
  if (rest.length > 1 && SUF[last]) { suf = SUF[last]; rest = rest.slice(0, -1); }
  return { num: m[1], name: rest.join(" "), suf };
}
const cityKey = (c) => String(c || "").toLowerCase().replace(/\bsaint\b/g, "st").replace(/\bmt\b/g, "mount").replace(/[^a-z]/g, "");
const zipOf = (s) => (String(s || "").match(/\b(9\d{4})\b/) || [])[1] || "";
const sufOk = (a, b) => !a.suf || !b.suf || a.suf === b.suf;

// post: { street, address, city, zip } event: { address, city }  ->  "exact" | "near" | ""
export function compare(post, ev) {
  const a = streetParts(post.street || post.address), b = streetParts(ev.address);
  if (!a || !b || a.name !== b.name || !sufOk(a, b)) return "";
  const sameCity = cityKey(post.city) && cityKey(post.city) === cityKey(ev.city);
  const pz = String(post.zip || "").slice(0, 5) || zipOf(post.address), ez = zipOf(ev.address);
  const samePlace = sameCity || (pz && ez && pz === ez);
  if (!samePlace) return "";
  return a.num === b.num ? "exact" : "near";
}

// All pairs between these posts and events: { exact: [{post, event}], near: [...] }. Indexed by street name so it stays cheap.
export function pairs(posts, events) {
  const byName = new Map();
  for (const e of events) { const p = streetParts(e.address); if (p) { const k = p.name; (byName.get(k) || byName.set(k, []).get(k)).push(e); } }
  const out = { exact: [], near: [] };
  for (const post of posts) {
    const p = streetParts(post.street || post.address); if (!p) continue;
    for (const event of byName.get(p.name) || []) { const r = compare(post, event); if (r) out[r].push({ post, event }); }
  }
  return out;
}

// Approved, non-contest posts (the ones that replace sweep records)
export async function approvedPosts(env) {
  try { return (await env.DB.prepare("SELECT id, title, biz, poster_type, street, address, city, zip FROM posts WHERE status = 'approved' AND contest_id IS NULL").all()).results; } catch { return []; }
}
