// Winner badges. A home that won an award keeps a crown on its listings. Winners come from the frozen results of announced contests.
// Each person can switch their badges off entirely, or per place they show (list card, map pop-up, details page). Default: all on.
import { normEmail } from "./auth.js";
import { SEASONS } from "../../public/seasons.js";

const yearOf = (c) => { const y = +c.entries_close.slice(0, 4), m = +c.entries_close.slice(5, 7); return c.season === "newyear" && m >= 12 ? y + 1 : y; };
export const contestLabel = (c) => { const s = SEASONS[c.season] || {}; return `${s.short || s.label || c.season} | ${yearOf(c)}`; };
export const SURFACES = ["list", "popup", "detail"];

// userId -> [{ id, a (category), k (award), s (Season | Year), c (contest name) }]
export async function winnerBadges(env) {
  const out = new Map();
  let cs = [];
  try { cs = (await env.DB.prepare("SELECT id,name,season,entries_close,results FROM contests WHERE announced = 1 AND status = 'live' AND results != '' ORDER BY entries_close DESC LIMIT 200").all()).results; } catch { return out; }
  for (const c of cs) {
    const snap = JSON.parse(c.results), ids = [...new Set((snap.awards || []).flatMap((a) => a.ids))];
    if (!ids.length) continue;
    const owners = {};
    for (let i = 0; i < ids.length; i += 50) {
      const part = ids.slice(i, i + 50);
      for (const r of (await env.DB.prepare(`SELECT id, user_id FROM posts WHERE id IN (${part.map(() => "?").join(",")})`).bind(...part).all()).results) owners[r.id] = r.user_id;
    }
    for (const a of snap.awards || []) for (const id of a.ids) {
      const uid = owners[id]; if (!uid) continue;
      (out.get(uid) || out.set(uid, []).get(uid)).push({ id: `${c.id}|${a.category}|${a.kind}`, a: a.category, k: a.label, s: contestLabel(c), c: c.name });
    }
  }
  return out;
}

export const parsePrefs = (raw) => { try { const p = JSON.parse(raw || "{}"); return { master: p.master !== false, off: p.off && typeof p.off === "object" ? p.off : {} }; } catch { return { master: true, off: {} }; } };
// which places this person's badges show, as flags l/p/d, after their choices
export const shown = (b, prefs) => ({ ...b, l: prefs.master && !prefs.off[`${b.id}|list`], p: prefs.master && !prefs.off[`${b.id}|popup`], d: prefs.master && !prefs.off[`${b.id}|detail`] });
export const emailKey = (e) => { try { return normEmail(e || ""); } catch { return ""; } };
