// AI assistant, Phase 2: cards about the signed-in visitor's OWN listings (docs/ai-assistant-actions-design.md, Tier 3).
// Same rules as Phase 1: the model never runs anything. Our code reads who is signed in, looks up that person's own homes, events and contest entries,
// and builds cards from the visitor's own words. A card carries the one call the widget will make with the visitor's own session after they confirm;
// the site's own endpoints (/api/me/homes, /api/me/events, /api/contests/<slug>/mine, /api/submit-event) check ownership again. Nothing is stored here.
import { SEASONS } from "../../public/seasons.js";
import { cityNames } from "./chatactions.js";

// The only calls a card may carry. The widget checks the same pattern, so a card can never point anywhere else.
export const CALL_OK = /^\/api\/(me\/(homes|events)\/[A-Za-z0-9_-]{1,64}|submit-event|contests\/[A-Za-z0-9_-]{1,64}\/mine\?id=[A-Za-z0-9_-]{1,64}|drafts)$/;

const words = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3);
const STOP = new Set("the and for you your about from with this that have has what how can please would like want need make take put show home house event events listing display entry lights season".split(" "));

// The visitor's own things, a few of each, newest first. Never throws: a problem reads as "nothing found".
export async function ownListings(env, user) {
  if (!user || !user.id) return { homes: [], events: [], entries: [] };
  const q = async (sql, ...b) => { try { return (await env.DB.prepare(sql).bind(...b).all()).results; } catch { return []; } };
  const [homes, events, entries] = await Promise.all([
    q("SELECT id, COALESCE(NULLIF(title,''), biz) AS name, city, status, descr FROM posts WHERE contest_id IS NULL AND (user_id = ?1 OR lower(contact_email) = lower(?2)) AND status IN ('approved','paused') ORDER BY created_at DESC LIMIT 6", user.id, user.email),
    q("SELECT s.id, s.name, s.city, s.start_date, s.end_date, s.status, s.event_id, s.blurb, s.hours, e.notice FROM event_submissions s LEFT JOIN events e ON e.id = s.event_id WHERE lower(s.contact_email) = lower(?) AND s.status IN ('published','pending') ORDER BY s.created_at DESC LIMIT 6", user.email),
    q("SELECT p.id, COALESCE(NULLIF(p.title,''), p.biz) AS name, c.slug, c.name AS contest, c.announced FROM posts p JOIN contests c ON c.id = p.contest_id WHERE p.user_id = ? AND p.status IN ('approved','pending') ORDER BY p.created_at DESC LIMIT 6", user.id),
  ]);
  return { homes, events, entries: entries.filter((e) => !e.announced) };
}
const ID_OK = /^[A-Za-z0-9_-]{1,64}$/; // real ids are plain; anything else is never turned into a card
const pick = (list, question) => {
  list = list.filter((x) => ID_OK.test(String(x.id)) && (x.slug === undefined || ID_OK.test(String(x.slug))));
  const qw = new Set(words(question).filter((w) => !STOP.has(w)));
  const scored = list.map((x) => ({ x, s: words(x.name).filter((w) => qw.has(w)).length })).sort((a, b) => b.s - a.s);
  const hit = scored.filter((s) => s.s > 0).map((s) => s.x);
  return (hit.length ? hit : list).slice(0, 3);
};

const PAUSE = /\bunlist\b|\b(disable|deactivate|stop showing)\b[^.?!]{0,30}\b(my )?(home|house|display|listing|lights)\b|\b(take|taking|put)\b[^.?!]{0,30}\b(down|off)\b|\bpause\b|\b(hide|remove)\b[^.?!]{0,30}\b(for the season|temporar\w+|until next year)\b|\bturn(ed)? off\b/i;
const RESUME = /\bre-?enable\b|\bback online\b|\b(lights?|display|home|house) (is|are) (on|live) again\b|\b(put|bring|turn|show)\b[^.?!]{0,30}\b(back|again|on again)\b|\bresume\b|\bre-?list\b|\bmake (it|my \w+|the \w+) live again\b/i;
const NOTICE = /\b(cancell?ed|called off|postponed|rescheduled|delayed)\b|\b(had to|have to|need to|want to|going to|must|will|gonna)\s+(cancel|postpone|reschedule|delay)\b|\bcancel (my|the|our)\b[^.?!]{0,15}\b(event|parade|market|lighting|festival|show)\b/i;
const CLEAR = /\b(no longer|not) (cancell?ed|postponed)\b|\bclear (the )?(notice|tag)\b|\bis back on\b/i;
const AGAIN = /\b(set up|schedule|create)\b[^.?!]{0,30}\bnext year\b|\brepeat\b[^.?!]{0,20}\bnext year\b|\b(run|do|repeat|copy|renew|duplicate|clone)\b[^.?!]{0,25}\b(again|next year|20\d\d)\b|\bsame event next year\b|\b(duplicate|clone|copy)\b[^.?!]{0,15}\b(my )?event\b/i;
const WITHDRAW = /\bwithdraw\b|\b(pull|take|remove|get)\b[^.?!]{0,20}\b(my )?(home|house|entry)\b[^.?!]{0,15}\b(from|out of)\b[^.?!]{0,10}\bcontest\b|\b(out of|leave|quit|exit|drop out of)\b[^.?!]{0,15}\b(the |this |a )?contest\b|\b(remove|delete|cancel)\b[^.?!]{0,15}\b(my )?entry\b|\b(pull|take|get)\b[^.?!]{0,25}\b(entry|my home)\b[^.?!]{0,20}\bout\b/i;
const EDIT = /\b(edit|change|update|fix|correct|rewrite)\b[^.?!]{0,40}\b(description|blurb|text|hours|details|info|wording)\b|\b(change|update|edit|rewrite)\b[^.?!]{0,30}\b(what|how)\b[^.?!]{0,25}\b(says|reads|shows)\b/i;
const OWN_INTENT = [PAUSE, RESUME, NOTICE, CLEAR, AGAIN, WITHDRAW, EDIT];
export const wantsOwnerAction = (q) => OWN_INTENT.some((r) => r.test(String(q || "")));

const confirmCard = (label, summary, call, done) => ({ type: "call", label, summary, call, done, confirm: "two" });
export const signInCard = () => ({ type: "links", label: "Sign in first", links: [{ label: "Sign in (Google or an emailed code)", sub: "then ask me again", href: "/profile" }] });

// One text box prefilled with what is there now, saved with the site's own edit call.
const editCard = (label, summary, call, field, value, max) => ({ type: "form", label, summary, done: "Saved. It is updated on the map.", call, fields: [{ name: field, label: "New text", type: "textarea", required: true, max, value: String(value || "").slice(0, max) }], go: "Save" });

// The "add my event" card: the full form on one card, published with one tap (the site's own validation and review rules apply). Everything the add-event form asks for.
export function publishEventCard() {
  const types = [...new Map(Object.values(SEASONS).flatMap((s) => Object.entries(s.types)).map(([k, l]) => [k, l]))];
  return { type: "form", label: "Add my event", summary: "Fill in every box and tap Add my event. It goes on the map the same way as from the Add page, with the same checks. Want to review it step by step instead? Use Start this event.", done: "Your event was submitted. Open Your profile, Events, to see it.", call: { method: "POST", url: "/api/submit-event", body: {} }, go: "Add my event", alt: { label: "Prefer to go step by step? Open the add-event form", href: "/add-event" },
    fields: [
      { name: "name", label: "Event name", type: "text", required: true, max: 120 },
      { name: "season", label: "Season", type: "select", required: true, options: Object.entries(SEASONS).map(([k, v]) => [k, v.label]), value: "christmas" },
      { name: "type", label: "Kind of event (it must fit the season)", type: "select", required: true, options: types },
      { name: "start", label: "First day", type: "date", required: true }, { name: "end", label: "Last day", type: "date", required: true },
      { name: "free", label: "Free to attend?", type: "select", required: true, options: [["true", "Free"], ["false", "Paid"]], value: "true" },
      { name: "hours", label: "Hours (optional)", type: "text", required: false, max: 120 },
      { name: "venue", label: "Place name", type: "text", required: true, max: 120 },
      { name: "address", label: "Street address", type: "text", required: true, max: 160 },
      { name: "city", label: "City", type: "text", required: true, max: 60, list: "cities", options: cityNames().map((c) => [c, c]) },
      { name: "blurb", label: "What will families see and do? (at least 20 characters)", type: "textarea", required: true, max: 200 },
    ] };
}

// Cards for a signed-in visitor's own listings. `own` comes from ownListings. Returns at most 3.
export function ownerCards({ question, own }) {
  const q = String(question || ""), out = [];
  const homes = own.homes || [], events = own.events || [], entries = own.entries || [];
  if (PAUSE.test(q) && !RESUME.test(q)) for (const h of pick(homes.filter((x) => x.status === "approved"), q).slice(0, 2)) out.push(confirmCard(`Take down “${h.name}” for the season`, "It leaves the map until you put it back from your profile or here. Nothing is deleted.", { method: "POST", url: `/api/me/homes/${encodeURIComponent(h.id)}`, body: { action: "pause" } }, "Done. It is taken down for the season. You can put it back any time."));
  if (RESUME.test(q)) for (const h of pick(homes.filter((x) => x.status === "paused"), q).slice(0, 2)) out.push(confirmCard(`Put “${h.name}” back on the map`, "It goes live again right away.", { method: "POST", url: `/api/me/homes/${encodeURIComponent(h.id)}`, body: { action: "resume" } }, "Done. It is back on the map."));
  const live = events.filter((e) => e.status === "published" && e.event_id);
  if (NOTICE.test(q) || CLEAR.test(q)) {
    const kind = CLEAR.test(q) ? "" : /postponed|rescheduled|delayed/i.test(q) ? "postponed" : "cancelled";
    for (const e of pick(live, q).slice(0, 2)) out.push(confirmCard(kind ? `Mark “${e.name}” as ${kind}` : `Clear the notice on “${e.name}”`, kind ? `A ${kind} tag shows on the event so visitors do not drive out for nothing. You can clear it later.` : "Removes the cancelled or postponed tag.", { method: "POST", url: `/api/me/events/${encodeURIComponent(e.id)}`, body: { action: "notice", notice: kind } }, kind ? `Done. It now shows as ${kind}.` : "Done. The tag is cleared."));
  }
  if (AGAIN.test(q)) for (const e of pick(events, q).slice(0, 2)) out.push(confirmCard(`Run “${e.name}” again next year`, "Creates a copy with every date moved forward a year, marked Expected. You can edit it from your profile.", { method: "POST", url: `/api/me/events/${encodeURIComponent(e.id)}`, body: { action: "copy" } }, "Done. Next year's copy is on the map as Expected."));
  if (WITHDRAW.test(q)) for (const e of pick(entries, q).slice(0, 2)) out.push(confirmCard(`Withdraw “${e.name}” from ${e.contest}`, "Your home leaves the contest and the map. This cannot be undone here.", { method: "DELETE", url: `/api/contests/${encodeURIComponent(e.slug)}/mine?id=${encodeURIComponent(e.id)}` }, "Done. Your home is withdrawn."));
  if (EDIT.test(q)) {
    const wantHome = /\b(home|house|display|lights)\b/i.test(q), wantEvent = /\b(event|hours|parade|market)\b/i.test(q);
    if (wantEvent || !wantHome) for (const e of pick(events, q).slice(0, 1)) out.push(editCard(`Edit the description of “${e.name}”`, "Shows on the event page and list.", { method: "POST", url: `/api/me/events/${encodeURIComponent(e.id)}`, body: { action: "edit" } }, "blurb", e.blurb, 200));
    if (wantHome || !wantEvent) for (const h of pick(homes, q).slice(0, 1)) out.push(editCard(`Edit the description of “${h.name}”`, "Shows on your home's card and page.", { method: "POST", url: `/api/me/homes/${encodeURIComponent(h.id)}`, body: { action: "edit" } }, "desc", h.descr, 600));
  }
  return out.slice(0, 3);
}
