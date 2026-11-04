// GET /api/help/search?q=words[&log=1] — matching articles. With log=1 the search is recorded (words and result count only) so the Admin can see what people could not find.
import { json } from "../../_lib/util.js";
import { loadArticles, searchArticles, brief } from "../../_lib/help.js";

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url), q = (u.searchParams.get("q") || "").trim().slice(0, 120);
  if (q.length < 2) return json({ results: [] }, { headers: { "cache-control": "no-store" } });
  const found = searchArticles(await loadArticles(env), q);
  if (u.searchParams.get("log") === "1") { try { await env.DB.prepare("INSERT INTO help_searches (q, results) VALUES (?, ?)").bind(q.toLowerCase(), found.length).run(); } catch {} }
  return json({ results: found.map(brief) }, { headers: { "cache-control": "no-store" } });
}
