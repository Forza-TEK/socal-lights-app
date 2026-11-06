// Winner badges. A home that won an award keeps a crown on its listings. Winners come from the frozen results of announced contests.
// Each person can switch their badges off entirely, or per place they show (list card, map pop-up, details page). Default: all on.
import { normEmail } from "./auth.js";
import { contestLabel } from "./archive.js";
import { selectIn } from "./dbchunk.js";
import { logOp } from "./oplog.js";

export { contestLabel };
export const SURFACES = ["list", "popup", "detail"];

// userId -> [{ id, a (category), k (award), s (Season | Year), c (contest name) }]
export async function winnerBadges(env) {
  const out = new Map();
  let cs = [];
  try { cs = (await env.DB.prepare("SELECT id,name,season,entries_close,results FROM contests WHERE announced = 1 AND status = 'live' AND results != '' ORDER BY entries_close DESC LIMIT 200").all()).results; } catch (e) { await logOp(env, "badges", "contest list failed: " + (e && e.message)); return out; }
  // One pass over all contests: collect every winning post id, read the owners in slices of 90 (D1: 100 bound parameters per query, 50 outgoing calls per request; the old code made one query per contest), then build the badges.
  const snaps = [];
  for (const c of cs) { try { const snap = JSON.parse(c.results); if ((snap.awards || []).some((a) => (a.ids || []).length)) snaps.push([c, snap]); } catch (e) { await logOp(env, "badges", `contest ${c.id}: results could not be read`); } }
  const owners = {};
  for (const r of await selectIn(env, "SELECT id, user_id FROM posts WHERE id IN ({IN})", snaps.flatMap(([, snap]) => snap.awards.flatMap((a) => a.ids || [])))) owners[r.id] = r.user_id;
  for (const [c, snap] of snaps) {
    for (const a of snap.awards || []) for (const id of a.ids || []) {
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
