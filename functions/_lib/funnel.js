// Funnel counters: one number per step per day in site_hits (no IP, cookie, account or text is stored). Same table and privacy as the page counters.
// Steps counted by the server (a real completion, cannot be run up by a script that skips the form) go through bump().
// Steps that only the browser can see (a card opened, a sign-in sheet shown, a new tab session) arrive through /api/visit and are listed in CLIENT_KEYS.
export const DAILY_CAP = 20000;
export const dayKey = () => new Date(Date.now() - 8 * 3600_000).toISOString().slice(0, 10); // roughly Pacific time

export const STEPS = [
  ["fn:visit", "New visits (first page of a browser tab session)"],
  ["fn:event-open", "Opened an event card"],
  ["fn:signin-open", "Sign-in sheet shown"],
  ["fn:signin-done", "Signed in"],
  ["fn:add-event-done", "Event submitted"],
  ["fn:add-house-done", "House or installer display submitted"],
  ["fn:contest-entry-done", "Contest entry submitted"],
  ["fn:subscribe", "Weekly email sign-up submitted"],
  ["fn:subscribe-confirm", "Weekly email confirmed"],
];
export const CLIENT_KEYS = ["fn:visit", "fn:event-open", "fn:signin-open"];

export async function bump(env, key, day = dayKey()) {
  try { await env.DB.prepare("INSERT INTO site_hits (day, page, n) VALUES (?, ?, 1) ON CONFLICT(day, page) DO UPDATE SET n = n + 1 WHERE n < ?").bind(day, key, DAILY_CAP).run(); } catch {}
}

// { key: { today, week } } for the funnel keys, today and the last 7 days (today included)
export async function funnelCounts(env, now = Date.now()) {
  const fmt = (ms) => new Date(ms - 8 * 3600_000).toISOString().slice(0, 10), today = fmt(now), from = fmt(now - 6 * 86400000);
  let rows = [];
  try { rows = (await env.DB.prepare("SELECT page, SUM(CASE WHEN day = ? THEN n ELSE 0 END) AS today, SUM(n) AS week FROM site_hits WHERE day >= ? AND page LIKE 'fn:%' GROUP BY page").bind(today, from).all()).results; } catch {}
  const m = Object.fromEntries(rows.map((r) => [r.page, { today: r.today || 0, week: r.week || 0 }]));
  return Object.fromEntries(STEPS.map(([k]) => [k, m[k] || { today: 0, week: 0 }]));
}
