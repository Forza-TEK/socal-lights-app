import { esc, header, page } from "../../_lib/shell.js";

// GET /api/installers/confirm?t=<token> — the installer confirms a homeowner's "installed by" claim (adds the check mark).
export async function onRequestGet({ request, env }) {
  const t = (new URL(request.url).searchParams.get("t") || "").slice(0, 64);
  const row = t.length >= 16 ? await env.DB.prepare("SELECT id, title FROM posts WHERE installer_token = ?").bind(t).first() : null;
  if (row) await env.DB.prepare("UPDATE posts SET installer_confirmed = 1, installer_token = '' WHERE id = ?").bind(row.id).run();
  const msg = row ? `Thanks. "${esc(row.title)}" now shows a check mark as confirmed by you.` : "That link has already been used or isn't valid.";
  return new Response(page({ title: "Installer confirmation | SoCal Lights", noindex: true, body: `${header()}<main><div class="note"><div class="tags"><span class="tag ${row ? "conf" : "paid"}">${row ? "Confirmed" : "Link not valid"}</span></div><h1>${row ? "You're confirmed" : "This link didn't work"}</h1><p class="sub">${msg}</p><p><a class="btn go" href="/">Back to SoCal Lights</a></p></div></main>` }), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
