// The "needs a look" checks on events, written once so the Admin Events filter and the Data health card on the dashboard count the same thing.
// Pure functions of an event as the admin events list returns it (rowToEvent: st "c"/"e", s and e dates, img, imgs, u link, lc = last updated date) and today's Pacific date.
// Used by public/admin/admin.js (filters) and functions/_lib/eventhealth.js (counts), so the two can never disagree.
const day = (ymd, n) => new Date(Date.parse(ymd + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10);
export const STALE_DAYS = 14;

export const HEALTH = [
  // key, label shown on the card and in the filter, explanation, test
  ["nophoto", "No photo", "Upcoming events with no photo at all.", (e, today) => e.e >= today && !e.img && !(e.imgs && e.imgs.length)],
  ["passed", "Expected, date passed", "Events still marked expected whose end date is already past (a guess that was never confirmed).", (e, today) => e.st !== "c" && e.e < today],
  ["nolink", "No link", "Upcoming events with no website for people to check the details.", (e, today) => e.e >= today && !e.u],
  ["stale", `Expected, not updated in ${STALE_DAYS}+ days`, `Upcoming events still marked expected that nobody has edited or confirmed for ${STALE_DAYS} days or more.`, (e, today) => e.st !== "c" && e.e >= today && !!e.lc && e.lc <= day(today, -STALE_DAYS)],
];
export const healthTest = (key) => (HEALTH.find((h) => h[0] === key) || [])[3];
