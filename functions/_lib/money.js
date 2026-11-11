// One way to write an amount in an email: always dollars and cents ("$149.00", "$50.00"). Cents in, text out; null or a missing amount gives "".
export const money = (cents) => (cents == null || cents === "" || !Number.isFinite(Number(cents)) ? "" : "$" + (Number(cents) / 100).toFixed(2));
// "Nov 11, 2026" from a Pacific date (YYYY-MM-DD).
export const niceYmd = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) ? new Date(s + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "");
// "Nov 11, 2026" from a database timestamp ("YYYY-MM-DD HH:MM:SS", UTC), shown as its Pacific date.
export const niceStamp = (s) => { const t = Date.parse(String(s || "").replace(" ", "T") + (/[zZ]|[+-]\d\d:?\d\d$/.test(String(s || "")) ? "" : "Z")); return Number.isFinite(t) ? new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Los_Angeles" }) : ""; };
// The order reference shown on receipts: "SL-" and the last 8 characters of the Stripe session id, upper case.
export const orderRef = (sessionId) => (sessionId ? "SL-" + String(sessionId).slice(-8).toUpperCase() : "");
