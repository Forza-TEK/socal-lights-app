// The one place that knows what "today" is on the server: the Pacific calendar date, with the real time zone rules (daylight saving included).
// Everything that is sold, shown or expired by date (Featured windows, contest windows, event cutoffs, daily counters, the digest) uses this, so the server, the pages and checkout agree.
// Uses Date.now() (not new Date()) so tests can freeze the clock.
const FMT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" });

// The Pacific calendar date (YYYY-MM-DD) of an instant (milliseconds since the epoch; default now).
export const ptDate = (ms = Date.now()) => FMT.format(new Date(ms));
export const ptToday = () => ptDate(Date.now());
// A calendar date plus n days (n may be negative), by the calendar, so a daylight saving change cannot skip or repeat a day.
export const shiftDay = (ymd, n) => new Date(Date.parse(ymd + "T12:00:00Z") + n * 86400_000).toISOString().slice(0, 10);
