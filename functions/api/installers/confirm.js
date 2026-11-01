// GET /api/installers/confirm?t=<token> — the installer confirms a homeowner's "installed by" claim (adds the check mark).
export async function onRequestGet({ request, env }) {
  const t = (new URL(request.url).searchParams.get("t") || "").slice(0, 64);
  const row = t.length >= 16 ? await env.DB.prepare("SELECT id, title FROM posts WHERE installer_token = ?").bind(t).first() : null;
  if (row) await env.DB.prepare("UPDATE posts SET installer_confirmed = 1, installer_token = '' WHERE id = ?").bind(row.id).run();
  const msg = row ? `Thanks. "${row.title.replace(/[<>&"]/g, "")}" now shows a check mark as confirmed by you.` : "That link has already been used or isn't valid.";
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Installer confirmation · SoCal Lights</title><body style="font:16px/1.5 system-ui,sans-serif;max-width:480px;margin:12vh auto;padding:0 16px"><h1 style="font-weight:500">${row ? "Confirmed" : "Link not valid"}</h1><p>${msg}</p><p><a href="/">Back to SoCal Lights</a></p>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
