// Dates, time zone wording and tie labels shared by the contest pages, the server pages and the emails.
// Plain JS with no imports, so both the browser and the Cloudflare functions can load it. Every time a person sees is Pacific.
// If you change this file, also bump the ?v= of the pages that import it (public/rules.js imports it without one).
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// One sentence about time, used under every deadline: the dates a contest shows are whole Pacific days.
export const PT_NOTE = "All times are Pacific. The last day of entries and of voting runs through 11:59 pm.";
export const PT_SHORT = "all times Pacific; the last day runs through 11:59 pm";

// "2026-12-10" -> "Dec 10, 2026"; withYear false -> "Dec 10". Anything that is not a date is returned as it came.
export function fmtDate(s, withYear = true) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ""));
  if (!m) return String(s || "");
  return `${MON[+m[2] - 1]} ${+m[3]}${withYear ? ", " + m[1] : ""}`;
}

// Today's calendar date in Pacific time (YYYY-MM-DD), daylight saving included. Never use toISOString() for this: it is the UTC date,
// which is already tomorrow from 4 pm (winter) or 5 pm (summer) Pacific.
const PT = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" });
export const ptToday = (ms = Date.now()) => PT.format(new Date(ms));

// The status chips of a contest, from the state the server computed in Pacific time (entriesState and votingState from /api/contests).
// tone: ok (green) = open now, idle (grey) = not yet or finished, bad (red) = something to act on.
export function statusChips(c) {
  const out = [];
  const e = c.entriesState, v = c.votingState;
  if (e === "open") out.push({ tone: "ok", text: `Entries open until ${fmtDate(c.entriesClose ?? c.entries_close, false)}` });
  else if (e === "paused") out.push({ tone: "bad", text: "Entries paused by the organizer" });
  else if (e === "ended") out.push({ tone: "idle", text: `Entries closed ${fmtDate(c.entriesClose ?? c.entries_close, false)}` });
  else if (e === "over") out.push({ tone: "idle", text: "Entries closed" });
  const vs = c.voteStart ?? c.vote_start, ve = c.voteEnd ?? c.vote_end;
  if (v === "open") out.push({ tone: "ok", text: `Voting open until ${fmtDate(ve, false)}` });
  else if (v === "before") out.push({ tone: "idle", text: `Voting opens ${fmtDate(vs, false)}` });
  else if (v === "paused") out.push({ tone: "bad", text: "Voting paused by the organizer" });
  else if (v === "over") out.push({ tone: "idle", text: "Voting ended" });
  return out;
}

// Ties. An award with more than one winner is a tie. "Tied (3 homes, 2 votes each)" for a public vote or judge picks;
// "Tied (3 homes, judges' average 9.0)" for scored judging. byId maps a home id to a record with votes / jv per category.
export function tieText(a, byId, method = "pick") {
  const ids = (a && a.ids) || [];
  if (ids.length < 2) return "";
  const first = byId[ids[0]] || {}, k = a.category;
  let each = "";
  if (a.kind === "judge") {
    const jv = first.jv && first.jv[k];
    if (jv && typeof jv === "object" && method === "score") each = `, judges' average ${Number(jv.avg).toFixed(1)}`;
    else if (typeof jv === "number") each = `, ${jv} judge pick${jv === 1 ? "" : "s"} each`;
  } else if (first.votes && typeof first.votes[k] === "number") { const n = first.votes[k]; each = `, ${n} vote${n === 1 ? "" : "s"} each`; }
  return `Tied (${ids.length} homes${each})`;
}

// What to tell someone who cannot enter. Says when and why: the entry date passed (and when voting starts), or the organizer paused it.
export function entriesClosedText(c) {
  const close = c.entriesClose ?? c.entries_close, vs = c.voteStart ?? c.vote_start;
  if (c.entriesState === "paused") return "The organizer has paused new entries for now.";
  if (c.entriesState === "over") return "This contest has announced its winners, so entries are closed.";
  const v = c.votingState === "before" ? ` Voting opens ${fmtDate(vs)}.` : c.votingState === "open" ? " Voting is open now." : c.votingState === "paused" ? "" : " Voting has ended.";
  return `Entries closed on ${fmtDate(close)}.${v}`;
}
