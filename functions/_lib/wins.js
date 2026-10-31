// When a person's own record replaces a sweep-made record, a contest win stated on the sweep record carries over as a crown line
// on the person's listing. It is display-only: the person's own text is never changed.
const WIN = /\b(won|winner|winning|champion|first[- ]place|second[- ]place|third[- ]place|1st|2nd|3rd|honorable mention|award)\b/i;
const CONTEST = /\b(contest|competition)\b/i;

// "Won 1st Place Townhomes/Condos in the 2026 Ladera Ranch (LARCS) Halloween Home Decorating Contest; open for street viewing..." -> the part before the first ";"
export function winText(ev) {
  const blurb = String(ev.blurb || "").trim(), name = String(ev.name || "");
  let t = blurb.split(";")[0].trim();
  if (!(WIN.test(t) && CONTEST.test(t))) {
    // some records say it only in the title: "552 E Palmyra Ave - Dragon Manor (OTPA Halloween contest winner)"
    const m = name.match(/\(([^()]*(?:contest|competition)[^()]*(?:winner|champion|award|place)[^()]*)\)/i);
    if (!m) return "";
    t = m[1].trim().replace(/^./, (c) => c.toUpperCase());
  }
  t = t.replace(/[.\s]+$/, "");
  return t.length > 200 ? t.slice(0, 197) + "…" : t;
}
const safe = (u) => (/^https:\/\//i.test(u || "") ? u : "");

// Sweep records that a post replaces (exact address match, admin choice "their record"), with a win line each; for /api/posts
export async function winsFor(env, posts, pairsFn) {
  try {
    const events = (await env.DB.prepare("SELECT id, name, city, address, blurb, url FROM events WHERE address != '' AND keep_listed = 0 AND (lower(blurb) LIKE '%contest%' OR lower(name) LIKE '%contest%' OR lower(blurb) LIKE '%competition%')").all()).results;
    const out = new Map();
    for (const { post, event } of pairsFn(posts, events).exact) {
      const t = winText(event); if (!t) continue;
      const list = out.get(post.id) || out.set(post.id, []).get(post.id);
      if (list.length < 3 && !list.some((x) => x.t === t)) list.push({ l: 1, p: 1, d: 1, t, u: safe(event.url) });
    }
    return out;
  } catch { return new Map(); }
}
