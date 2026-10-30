// GET /api/contests/<slug>/export — organizer only: the results as a spreadsheet (CSV). After announcing it reads the locked snapshot.
import { err } from "../../../_lib/util.js";
import { getUser } from "../../../_lib/auth.js";
import { ownerOf, computeResults, awardList, hasPublic, hasJudges } from "../../../_lib/contests.js";

// Spreadsheet programs run cells that start with = + - @ as formulas, so those are defused.
const cell = (v) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };

export async function onRequestGet({ params, request, env }) {
  const { c, res } = await ownerOf(request, env, params.slug, getUser);
  if (res) return res;
  const frozen = c.announced && c.results ? JSON.parse(c.results) : null;
  let categories, entries, awards;
  if (frozen) ({ categories, entries, awards } = frozen);
  else {
    const r = await computeResults(env, c);
    categories = r.categories; awards = awardList(c, r);
    entries = r.posts.map((p) => ({ id: p.id, name: p.title || p.biz, address: p.address, no: p.entry_no, dq: !!p.dq,
      votes: Object.fromEntries(categories.map((k) => [k, (r.counts[p.id] || {})[k] || 0])),
      jv: Object.fromEntries(categories.map((k) => [k, c.judge_method === "score" ? ((r.jscore[p.id] || {})[k] ? Math.round(r.jscore[p.id][k].avg * 100) / 100 : "") : (r.jpick[p.id] || {})[k] || 0])) }));
  }
  const jcell = (e, k) => { const v = e.jv && e.jv[k]; return v && typeof v === "object" ? v.avg : v ?? ""; };
  const rows = [["Contest", "Status", "Category", "Entry no.", "Entry", "Address", "People's votes", "Judges' " + (c.judge_method === "score" ? "average score" : "picks"), "Awards won", "Prize", "Flagged"]];
  for (const k of categories) for (const e of entries) {
    const won = (awards || []).filter((a) => a.category === k && a.ids.includes(e.id));
    rows.push([c.name, c.announced ? "Final (locked " + (frozen ? frozen.at : "") + ")" : "Live (not final)", k, e.no, e.name, e.address, hasPublic(c) ? e.votes?.[k] ?? 0 : "", hasJudges(c) ? jcell(e, k) : "", won.map((a) => a.label).join("; "), won.map((a) => a.prize).filter(Boolean).join("; "), e.dq ? "Yes" : ""]);
  }
  return new Response(rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n", { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${c.slug}-results.csv"`, "cache-control": "no-store" } });
}
