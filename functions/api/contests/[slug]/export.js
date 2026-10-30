// GET /api/contests/<slug>/export — organizer only: the results as a spreadsheet (CSV). After announcing it reads the locked snapshot.
import { err } from "../../../_lib/util.js";
import { getUser } from "../../../_lib/auth.js";
import { ownerOf, computeResults } from "../../../_lib/contests.js";

// Spreadsheet programs run cells that start with = + - @ as formulas, so those are defused.
const cell = (v) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };

export async function onRequestGet({ params, request, env }) {
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const frozen = c.announced && c.results ? JSON.parse(c.results) : null;
  let categories, entries, winners;
  if (frozen) ({ categories, entries, winners } = frozen);
  else {
    const r = await computeResults(env, c);
    categories = r.categories; winners = r.winners;
    entries = r.posts.map((p) => ({ id: p.id, name: p.title || p.biz, address: p.address, no: p.entry_no, dq: !!p.dq, votes: Object.fromEntries(categories.map((k) => [k, (r.counts[p.id] || {})[k] || 0])) }));
  }
  const rows = [["Contest", "Status", "Category", "Entry no.", "Entry", "Address", "Votes", "Winner", "Flagged"]];
  for (const k of categories) for (const e of entries) rows.push([c.name, c.announced ? "Final (locked " + (frozen ? frozen.at : "") + ")" : "Live (not final)", k, e.no, e.name, e.address, e.votes[k] ?? 0, (winners[k] || []).includes(e.id) ? "Yes" : "", e.dq ? "Yes" : ""]);
  return new Response(rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n", { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${c.slug}-results.csv"`, "cache-control": "no-store" } });
}
