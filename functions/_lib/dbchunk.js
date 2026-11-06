// D1 allows 100 bound parameters per query. A list of ids in "IN (...)" must be read in slices.
// selectIn(env, "SELECT ... WHERE id IN ({IN}) AND x = ?", ids, [x]) runs the query once per slice of IN_MAX ids and joins the rows (order across slices is not kept: sort afterwards if it matters).
// Each slice is one query, so keep id lists small enough for the request's 50 outgoing calls (90 ids per call: 100 ids need 2).
import { logOp } from "./oplog.js";

export const IN_MAX = 90;
export async function selectIn(env, sql, ids, extra = []) {
  const list = [...new Set(ids)], out = [];
  for (let i = 0; i < list.length; i += IN_MAX) {
    const part = list.slice(i, i + IN_MAX);
    out.push(...(await env.DB.prepare(sql.replace("{IN}", part.map(() => "?").join(","))).bind(...part, ...extra).all()).results);
  }
  return out;
}

// R2 delete() takes an array of up to 1000 keys and counts as ONE outgoing call; one call per key would hit the free plan's 50 per request after 50 photos.
// A failure is logged to ops_log (kind "r2") and never thrown: the caller carries on, and the leftover files are only wasted space.
export const photoKeys = (rows, col = "photos") => rows.flatMap((r) => { try { const v = JSON.parse(r[col] || "[]"); return Array.isArray(v) ? v : [v]; } catch { return typeof r[col] === "string" && r[col] ? [r[col]] : []; } }).filter((k) => typeof k === "string" && k);
export async function r2Delete(env, keys, what = "photos") {
  const list = [...new Set(keys.filter(Boolean))];
  for (let i = 0; i < list.length; i += 1000) {
    try { await env.PHOTOS.delete(list.slice(i, i + 1000)); }
    catch (e) { await logOp(env, "r2", `${what}: could not delete ${Math.min(1000, list.length - i)} files: ` + (e && e.message)); }
  }
}
