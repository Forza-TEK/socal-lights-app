// GET /api/archive — finished contests (winners announced), each as it was frozen when the winners were announced:
// the winners and every contestant with their results (votes, judges' picks or scores, awards won).
// Grouped on the page by "Season | Year" (for example "Christmas | 2026").
import { json } from "../_lib/util.js";
import { founderKeys, isFounder } from "../_lib/founder.js";
import { ARCHIVE_COLS, ARCHIVE_WHERE, shapeContest, usable } from "../_lib/archive.js";

export async function onRequestGet({ env }) {
  let rows = [];
  try { rows = (await env.DB.prepare(`SELECT ${ARCHIVE_COLS} FROM contests WHERE ${ARCHIVE_WHERE} ORDER BY entries_close DESC LIMIT 300`).all()).results; } catch {}
  let fk = new Set(); try { fk = await founderKeys(env); } catch {}
  return json(usable(rows).map((r) => ({ ...shapeContest(r), founder: isFounder(fk, r.org_key) })), { headers: { "cache-control": "public, max-age=300" } });
}
