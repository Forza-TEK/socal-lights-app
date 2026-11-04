// GET /api/archive — finished contests (winners announced), each as it was frozen when the winners were announced:
// the winners and every contestant with their results (votes, judges' picks or scores, awards won).
// Grouped on the page by "Season | Year" (for example "Christmas | 2026").
import { json } from "../_lib/util.js";
import { ARCHIVE_COLS, ARCHIVE_WHERE, shapeContest } from "../_lib/archive.js";

export async function onRequestGet({ env }) {
  let rows = [];
  try { rows = (await env.DB.prepare(`SELECT ${ARCHIVE_COLS} FROM contests WHERE ${ARCHIVE_WHERE} ORDER BY entries_close DESC LIMIT 300`).all()).results; } catch {}
  return json(rows.map(shapeContest), { headers: { "cache-control": "public, max-age=300" } });
}
