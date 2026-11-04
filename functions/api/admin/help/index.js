// GET /api/admin/help — every article (drafts too) with its helpful votes, plus what people searched for and did not find.
// POST /api/admin/help — create or update an article (the slug names it). Changes are logged by the middleware.
import { json, err, clean } from "../../../_lib/util.js";
import { CATEGORIES, KINDS } from "../../../_lib/help.js";

export async function onRequestGet({ env }) {
  const q = (sql) => env.DB.prepare(sql).all().then((r) => r.results).catch(() => []);
  const [articles, votes, none, top, notes, total] = await Promise.all([
    q("SELECT slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by, updated_at FROM help_articles ORDER BY category, sort, title"),
    q("SELECT slug, SUM(helpful) AS yes, SUM(1 - helpful) AS no FROM help_votes GROUP BY slug"),
    q("SELECT q, COUNT(*) AS n, MAX(created_at) AS last FROM help_searches WHERE results = 0 AND created_at > datetime('now','-30 day') GROUP BY q ORDER BY n DESC, last DESC LIMIT 25"),
    q("SELECT q, COUNT(*) AS n, MIN(results) AS results FROM help_searches WHERE created_at > datetime('now','-30 day') GROUP BY q ORDER BY n DESC LIMIT 15"),
    q("SELECT slug, note, created_at FROM help_votes WHERE helpful = 0 AND note <> '' ORDER BY id DESC LIMIT 20"),
    q("SELECT COUNT(*) AS n FROM help_searches WHERE created_at > datetime('now','-30 day')"),
  ]);
  const by = new Map(votes.map((v) => [v.slug, v]));
  return json({ categories: CATEGORIES.map(({ key, title }) => ({ key, title })), kinds: KINDS,
    articles: articles.map((a) => ({ ...a, yes: (by.get(a.slug) || {}).yes || 0, no: (by.get(a.slug) || {}).no || 0 })),
    noResult: none, topSearches: top, notes, searches30: (total[0] || {}).n || 0 });
}

export async function onRequestPost({ request, env, data }) {
  const b = await request.json().catch(() => null);
  if (!b) return err(400, "That couldn't be read.");
  const slug = clean(b.slug, 70).toLowerCase(), title = clean(b.title, 140), summary = clean(b.summary, 300);
  const body = String(b.body ?? "").replace(/\r/g, "").slice(0, 8000), keywords = clean(b.keywords, 300), video = clean(b.video, 40).toLowerCase();
  const category = clean(b.category, 20), kind = clean(b.kind, 10), status = b.status === "draft" ? "draft" : "published";
  const sort = Math.max(0, Math.min(999, parseInt(b.sort, 10) || 100));
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 2) return err(400, "The page address can use lowercase letters, numbers and hyphens, for example i-did-not-get-the-email.");
  if (!title) return err(400, "Give the article a title.");
  if (!summary) return err(400, "Write the one-sentence answer. It shows first and in search results.");
  if (!body.trim()) return err(400, "The article needs some text.");
  if (!CATEGORIES.some((c) => c.key === category)) return err(400, "Choose a category.");
  if (!KINDS[kind]) return err(400, "Choose a type.");
  if (video && !/^[a-z0-9-]+$/.test(video)) return err(400, "The video is a file name such as find-email (letters, numbers and hyphens).");
  const who = (data && data.admin && data.admin.email) || "";
  await env.DB.prepare(`INSERT INTO help_articles (slug, title, category, kind, summary, body, keywords, video, sort, status, updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(slug) DO UPDATE SET title=excluded.title, category=excluded.category, kind=excluded.kind, summary=excluded.summary, body=excluded.body, keywords=excluded.keywords, video=excluded.video, sort=excluded.sort, status=excluded.status, updated_by=excluded.updated_by, updated_at=datetime('now')`)
    .bind(slug, title, category, kind, summary, body, keywords, video, sort, status, who).run();
  return json({ ok: true, slug });
}
