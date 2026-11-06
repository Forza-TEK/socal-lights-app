// A small error log for things nobody would otherwise notice: a failed email, a Stripe webhook that threw.
// logOp never throws and never blocks the request. The admin digest (functions/api/admin-digest.js) reports what was logged since its last email.
// Keep `detail` technical and free of personal data (no email addresses, names or message text).
export async function logOp(env, kind, detail = "") {
  try {
    console.error("[ops]", kind, String(detail).slice(0, 200));
    await env.DB.prepare("INSERT INTO ops_log (kind, detail) VALUES (?, ?)").bind(String(kind).slice(0, 40), String(detail).replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]").slice(0, 300)).run();
  } catch {}
}

// Grouped summary since a timestamp ("YYYY-MM-DD HH:MM:SS", UTC): [{ kind, n, last, example }], newest group first.
export async function opsSince(env, since) {
  try {
    const rows = (await env.DB.prepare("SELECT kind, detail, created_at FROM ops_log WHERE created_at > ? ORDER BY id DESC LIMIT 500").bind(since).all()).results;
    const by = new Map();
    for (const r of rows) { const g = by.get(r.kind) || { kind: r.kind, n: 0, last: r.created_at, example: r.detail }; g.n++; by.set(r.kind, g); }
    return [...by.values()];
  } catch { return []; }
}

export async function pruneOps(env) { try { await env.DB.prepare("DELETE FROM ops_log WHERE created_at < datetime('now','-30 days')").run(); } catch {} }
