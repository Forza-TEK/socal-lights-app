import { esc, header, page } from "../../_lib/shell.js";

// GET  /api/installers/confirm?t=<token> — shows a page with a "Yes, confirm" button. Nothing changes on GET, so email link scanners and previews can't confirm for the installer.
// POST /api/installers/confirm (form field t) — the installer confirms a homeowner's "installed by" claim (adds the check mark).
const html = (body, tag, tagText) => new Response(page({ title: "Installer confirmation | SoCal Lights", noindex: true, body: `${header()}<main><div class="note"><div class="tags"><span class="tag ${tag}">${tagText}</span></div>${body}<p><a class="btn go" href="/">Back to SoCal Lights</a></p></div></main>` }), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
const find = (env, t) => (t.length >= 16 ? env.DB.prepare("SELECT id, title FROM posts WHERE installer_token = ?").bind(t).first() : null);

export async function onRequestGet({ request, env }) {
  const t = (new URL(request.url).searchParams.get("t") || "").slice(0, 64), row = await find(env, t);
  if (!row) return html(`<h1>This link didn't work</h1><p class="sub">That link has already been used or isn't valid.</p>`, "paid", "Link not valid");
  return html(`<h1>Confirm this home?</h1><p class="sub">A homeowner says <b>${esc(row.title)}</b> was installed by your company. Confirming adds a check mark to their listing.</p><form method="post" action="/api/installers/confirm"><input type="hidden" name="t" value="${esc(t)}"><button class="btn go" type="submit">Yes, confirm</button></form>`, "paid", "Needs your OK");
}

export async function onRequestPost({ request, env }) {
  const f = await request.formData().catch(() => null), t = String((f && f.get("t")) || "").slice(0, 64), row = await find(env, t);
  if (row) await env.DB.prepare("UPDATE posts SET installer_confirmed = 1, installer_token = '' WHERE id = ?").bind(row.id).run();
  return row ? html(`<h1>You're confirmed</h1><p class="sub">Thanks. "${esc(row.title)}" now shows a check mark as confirmed by you.</p>`, "conf", "Confirmed") : html(`<h1>This link didn't work</h1><p class="sub">That link has already been used or isn't valid.</p>`, "paid", "Link not valid");
}
