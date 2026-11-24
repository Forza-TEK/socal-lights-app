// What one person bought, for Admin > Users: every Featured order of theirs (events, homes, installer placements, contest passes, Event Partner plans), matched by the buyer's account id or the
// email they paid with, plus the free contest passes Admin granted to organizations whose contests they run. Read-only.
export async function purchasesOf(env, user) {
  const { results } = await env.DB.prepare(
    `SELECT o.session_id, o.event_id, o.plan, o.amount, o.currency, o.status, o.applied, o.applied_until, o.created_at, o.target, o.note,
            COALESCE(e.name, s.name, hp.title, ins.name) AS name, cp.cap AS pass_cap, cp.window_start, cp.window_end
     FROM feature_orders o
     LEFT JOIN events e ON e.id = o.event_id AND COALESCE(o.target, 'event') = 'event'
     LEFT JOIN event_submissions s ON o.event_id = 'sub:' || s.id
     LEFT JOIN posts hp ON o.target = 'home' AND hp.id = o.event_id
     LEFT JOIN installers ins ON o.target = 'installer' AND ins.id = o.event_id
     LEFT JOIN contest_passes cp ON o.target = 'contest_pass' AND cp.session_id = o.session_id
     WHERE o.user_id = ?1 OR lower(o.email) = lower(?2)
     ORDER BY o.created_at DESC LIMIT 100`).bind(user.id, user.email).all().catch(() => ({ results: [] }));
  const comps = (await env.DB.prepare(
    `SELECT cc.allowed, cc.valid_until, cc.note, cc.revoked, cc.created_at FROM contest_comps cc
     WHERE cc.org_key IN (SELECT org_key FROM contests WHERE owner_id = ?1 AND org_key IS NOT NULL AND org_key != '') ORDER BY cc.created_at DESC LIMIT 20`).bind(user.id).all().catch(() => ({ results: [] }))).results;
  const paid = results.filter((r) => r.status === "paid" || r.status === "held" || r.status === "dispute_won");
  return { rows: results, comps, paid_cents: paid.reduce((n, r) => n + (r.amount || 0), 0), count: results.length };
}
