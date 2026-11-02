// /c/<slug> — the public page for one contest (the QR code points here). The page itself is public/contest.html.
// The page fills itself in with JavaScript, but link previews (Facebook, Nextdoor, texts) only read the HTML, so the title,
// description and a photo are written into the head here.
import { getContest } from "../_lib/contests.js";

export async function onRequestGet({ request, env, params }) {
  const origin = new URL(request.url).origin;
  const res = await env.ASSETS.fetch(new Request(new URL("/contest", request.url), request));
  let c = null, photo = "";
  try {
    c = await getContest(env, params.slug);
    if (c && c.status === "live") {
      const p = await env.DB.prepare("SELECT photos FROM posts WHERE contest_id = ? AND status = 'approved' ORDER BY entry_no LIMIT 6").bind(c.id).all();
      for (const r of p.results) { const k = JSON.parse(r.photos || "[]")[0]; if (k && k.startsWith("p/")) { photo = `${origin}/api/photo/${k}`; break; } }
    } else c = null;
  } catch {}
  if (!c) return res;
  const title = `${c.name} | SoCal Lights`;
  const desc = `${c.org} · ${c.city}. ${c.descr}`.slice(0, 200);
  const img = photo || `${origin}/img/share.png`, url = `${origin}/c/${c.slug}`;
  const meta = (k, v, attr = "property") => `<meta ${attr}="${k}" content="${String(v).replace(/[&<>"]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[x]))}">`;
  const tags = [meta("og:title", title), meta("og:description", desc), meta("og:image", img), meta("og:url", url), meta("og:type", "website"), meta("twitter:card", "summary_large_image", "name"), meta("description", desc, "name")].join("");
  return new HTMLRewriter()
    .on("title", { element(e) { e.setInnerContent(title); } })
    .on("head", { element(e) { e.append(tags, { html: true }); } })
    .transform(new Response(res.body, { status: res.status, headers: res.headers }));
}
