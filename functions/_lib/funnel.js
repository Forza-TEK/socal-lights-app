// Funnel counters: one number per step per day in site_hits (no IP, cookie, account or text is stored). Same table and privacy as the page counters.
// Steps counted by the server (a real completion, cannot be run up by a script that skips the form) go through bump().
// Steps that only the browser can see (a card opened, a sign-in sheet shown, a new tab session) arrive through /api/visit and are listed in CLIENT_KEYS.
import { ptToday, ptDate, shiftDay } from "./time.js";
export const DAILY_CAP = 20000;
export const dayKey = () => ptToday();

export const STEPS = [
  ["fn:visit", "New visits (first page of a browser tab session)"],
  ["fn:event-open", "Opened an event card"],
  ["fn:signin-open", "Sign-in sheet shown"],
  ["fn:signin-done", "Signed in"],
  ["fn:add-event-done", "Event submitted"],
  ["fn:add-house-done", "House or installer display submitted"],
  ["fn:contest-entry-done", "Contest entry submitted"],
  ["fn:event-feature-choose", "Event plan: Choose clicked on Pricing"],
  ["fn:event-feature-pick", "Event plan: an event picked on the Feature page"],
  ["fn:event-feature-checkout", "Event plan: payment page opened"],
  ["fn:event-feature-paid", "Event plan: paid (counted by the server)"],
  ["fn:subscribe", "Weekly email sign-up submitted"],
  ["fn:subscribe-landing", "Weekly email sign-up from a city or event page (also counted above)"],
  ["fn:subscribe-confirm", "Weekly email confirmed"],
  ["fn:pricing-choose", "Installer pricing: tapped Choose (Banner, Top of the list or both)"],
  ["fn:sponsor-invite-submitted", "Contest sponsor invite: a sponsor sent the form"],
  ["fn:sponsor-shown", "Sponsor page shown"],
  ["fn:sponsor-picked", "Sponsor page: chose an installer profile"],
  ["fn:sponsor-checkout", "Sponsor placement: payment page opened"],
  ["fn:sponsor-paid", "Sponsor placement: paid"],
  ["fn:pass-picker-shown", "Contest pass: picker shown (a contest would go over the free one)"],
  ["fn:pass-choose", "Contest pass: Choose tapped (picker, Pricing or the pass page)"],
  ["fn:pass-paid", "Contest pass: paid (counted by the server)"],
  ["fn:autorenew-opt-in", "Automatic renewal: turned on"],
  ["fn:autorenew-charged", "Automatic renewal: charged"],
  ["fn:autorenew-failed", "Automatic renewal: charge failed"],
  ["fn:autorenew-cancelled", "Automatic renewal: cancelled"],
];
export const CLIENT_KEYS = ["fn:visit", "fn:event-open", "fn:signin-open", "fn:event-feature-choose", "fn:event-feature-pick", "fn:pricing-choose", "fn:sponsor-shown", "fn:sponsor-picked", "fn:pass-picker-shown", "fn:pass-choose"];

export async function bump(env, key, day = dayKey()) {
  try { await env.DB.prepare("INSERT INTO site_hits (day, page, n) VALUES (?, ?, 1) ON CONFLICT(day, page) DO UPDATE SET n = n + 1 WHERE n < ?").bind(day, key, DAILY_CAP).run(); } catch {}
}

// { key: { today, week } } for the funnel keys, today and the last 7 days (today included)
export async function funnelCounts(env, now = Date.now()) {
  const today = ptDate(now), from = shiftDay(today, -6);
  let rows = [];
  try { rows = (await env.DB.prepare("SELECT page, SUM(CASE WHEN day = ? THEN n ELSE 0 END) AS today, SUM(n) AS week FROM site_hits WHERE day >= ? AND page LIKE 'fn:%' GROUP BY page").bind(today, from).all()).results; } catch {}
  const m = Object.fromEntries(rows.map((r) => [r.page, { today: r.today || 0, week: r.week || 0 }]));
  return Object.fromEntries(STEPS.map(([k]) => [k, m[k] || { today: 0, week: 0 }]));
}
