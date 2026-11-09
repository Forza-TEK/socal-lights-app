// AI assistant: which action cards may appear next to an answer. All of this is plain code (no model): the visitor's own last message has to ask for the thing,
// and every id and link comes from our database lookups, never from model text. See docs/ai-assistant-actions-design.md.
import { ACTIONS, cityNames } from "./chatactions.js";
import { SEASONS } from "../../public/seasons.js";
import { ownerCards, publishEventCard, signInCard, wantsOwnerAction } from "./chatown.js";

const HUMAN = /\b(human|real person|a person|someone|somebody|staff|team|owner|support|customer service|representative)\b[^.?!]{0,50}\b(talk|speak|contact|reach|email|message|help|call)\b|\b(talk|speak|contact|reach|email|message|call)\b[^.?!]{0,50}\b(human|real person|someone|somebody|staff|team|owner|support|customer service|representative)\b|\b(human|real person|customer service|representative)\b|\b(contact|reach|email|call|phone|message)\s+(you|us|the team|your team)\b|\b(your|a) (phone number|email address|contact)\b/i;
const REPORT = /\b(wrong|incorrect|outdated|out of date|error|mistake|inaccurate|no longer|closed|cancell?ed|has moved|broken)\b[^.?!]{0,60}\b(event|listing|home|house|display|address|date|time|hours|info|information)\b|\breport (?:a |an |this |that )?(?:problem|error|mistake|listing|event|home|house|issue)\b|\b(event|listing|home|house|display|address|date|time|hours|info|information)\b[^.?!]{0,40}\b(wrong|incorrect|outdated|out of date|inaccurate|not right|not correct|has changed)\b/i;
const WEEKLY = /\b(weekly (?:lights )?email|newsletter|sign me up|sign up for (?:the |your )?(?:weekly|email|emails|alerts?)|subscribe|email me|email alerts?)\b/i;
const STOP = /\b(unsubscribe|stop (?:the |these |getting )?emails?|opt out|no longer want)\b/i;
const REMOVE = /\b(remove|delete|take (?:down|off)|get rid of|want .{0,20} off)\b[^.?!]{0,50}\b(my )?(home|house|display|listing|address|lights)\b/i;
const REMOVE2 = /\b(remove|delete|take|taken|get|off)\b[^.?!]{0,40}\b(my )?(home|house|display|listing|address|lights)\b[^.?!]{0,30}\b(off|from)\b[^.?!]{0,15}\b(the )?(map|site|website|app)\b|\b(my )?(home|house|display|listing|address)\b[^.?!]{0,30}\b(off|removed from|taken off)\b[^.?!]{0,15}\b(the )?(map|site|website)\b/i;
const FAV = /\b(favorites?|favourites?|plan (?:a |my )?night|route|drive (?:through|by)|tonight|stops?)\b/i;
const ADD_EVENT = /\b(add|list|post|submit|put|publish|promote|register)\b[^.?!]{0,40}\b(event|parade|market|tree lighting|festival|show|haunt)\b/i;
const ADD_HOME = /\b(add|put|show|list|post|submit|showcase|enter)\b[^.?!]{0,40}\b(my )?(home|house|display|lights|yard)\b[^.?!]{0,30}\b(on|to|in)\b[^.?!]{0,20}\bmap\b|\b(add|list|post|showcase|submit)\b[^.?!]{0,25}\b(my )?(home|house|display)\b|\b(show|share|showcase|display)\b( off)? my (christmas |holiday )?(lights|home|house|display|yard)\b/i;
const ADD_CONTEST = /\b(start|create|run|host|set up|setup|launch)\b[^.?!]{0,30}\b(a |my |our )?(decorating |lighting )?contest\b/i;
const WHERE = /\b(where|how do i (?:get to|go to|open|find)|link to|take me to)\b[^.?!]{0,40}\b(add|contests?|profile|pricing|prices|help|tutorials?|promote|feature)\b/i;
const PAGES = [["add", "/add", "Add an event, home or contest"], ["contest", "/contests", "Contests"], ["profile", "/profile", "Your profile"], ["pric", "/pricing", "Pricing"], ["help", "/help", "Help Center"], ["tutorial", "/tutorials", "Tutorials"], ["promote", "/feature", "Promote your event"], ["feature", "/feature", "Promote your event"]];

const formCard = (id, extra = {}) => {
  const a = ACTIONS[id];
  return { type: "form", action: id, label: a.label, summary: a.summary, done: a.done, fields: a.fields.map((f) => ({ ...f, ...(extra[f.name] != null ? { value: extra[f.name] } : {}), ...(f.list ? { options: cityNames().map((c) => [c, c]) } : {}) })) };
};
// "Start this event": the visitor fills in what they know and is taken straight to the add-event form with it filled in (no server call; the form checks everything again).
export function eventStartCard() {
  return { type: "form", nav: "/add-event", navFrom: "chat", label: "Start this event", summary: "Tell me what you know. Tap Open the form and it opens with these filled in, at the first step that still needs something. You review everything before it goes on the map.",
    fields: [
      { name: "name", label: "Event name", type: "text", required: true, max: 120 },
      { name: "season", label: "Season", type: "select", required: true, options: Object.entries(SEASONS).map(([k, v]) => [k, v.label]), value: "christmas" },
      { name: "start", label: "First day", type: "date", required: false },
      { name: "end", label: "Last day (same day for a one-day event)", type: "date", required: false },
      { name: "city", label: "City", type: "text", required: false, max: 60, list: "cities", options: cityNames().map((c) => [c, c]) },
      { name: "free", label: "Free to attend?", type: "select", required: false, options: [["yes", "Free"], ["no", "Paid"]], value: "yes" },
    ], go: "Open the form" };
}
// "Start this home" and "Start this contest": the same hand-off as events, to the home form and the contest wizard (photos and the rest are finished there).
export function homeStartCard() {
  return { type: "form", nav: "/add-house", label: "Start my home", go: "Open the form", summary: "Tell me what you know. Tap Open the form and it opens with these filled in. You add night photos and check everything there before it goes on the map.",
    fields: [
      { name: "kind", label: "Who is posting?", type: "select", required: true, options: [["homeowner", "A homeowner"], ["installer", "A professional installer"]], value: "homeowner" },
      { name: "biz", label: "Name to show (for example the Garcia family)", type: "text", required: true, max: 80 },
      { name: "title", label: "Name of the display", type: "text", required: false, max: 90 },
      { name: "season", label: "Season", type: "select", required: false, options: Object.entries(SEASONS).map(([k, v]) => [k, v.label]), value: "christmas" },
      { name: "city", label: "City", type: "text", required: false, max: 60, list: "cities", options: cityNames().map((c) => [c, c]) },
      { name: "street", label: "Street address", type: "text", required: false, max: 120 },
      { name: "zip", label: "ZIP code", type: "text", required: false, max: 5 },
    ] };
}
export function contestStartCard() {
  return { type: "form", nav: "/add-contest", label: "Start my contest", go: "Open the wizard", summary: "Tell me the basics. Tap Open the wizard and it opens with them filled in; Quick start keeps the rest simple. Your organization's first contest in 12 months is free.",
    fields: [
      { name: "name", label: "Contest name", type: "text", required: true, max: 90 },
      { name: "org", label: "Who is running it? (your group)", type: "text", required: true, max: 80 },
      { name: "city", label: "City", type: "text", required: false, max: 60, list: "cities", options: cityNames().map((c) => [c, c]) },
    ] };
}
// Phrases that ask for a Tier 1 card but read as off topic to the scope filter ("subscribe me", "this listing is outdated"). Returns { reply, cards } or null.
export function quickIntent(question, settings) {
  const q = String(question || ""), t = (settings && settings.tiers) || {};
  if (!t[1] || STOP.test(q)) return null;
  if (WEEKLY.test(q)) return { reply: "Happy to set that up. Fill in the box below and tap Sign me up: it is one short free email a week, and we send a link to confirm first.", cards: [formCard("weekly_email")] };
  if (REPORT.test(q)) return { reply: "Thank you for flagging it. Tell us which listing and what is wrong below, and the team will look at it.", cards: [formCard("report_problem")] };
  if (REMOVE.test(q) || REMOVE2.test(q)) return { reply: "I can pass that on. Fill in the box below and tap Send removal request, and we will email you when it is done. You do not need an account.", cards: [formCard("remove_home")] };
  return null;
}
export const needsAccount = (q) => wantsOwnerAction(q) || (ADD_EVENT.test(String(q || "")) && !/\b(find|search|see|go to|attend)\b/i.test(String(q || "")));
export const wantsHuman = (q) => HUMAN.test(String(q || ""));
export const humanCard = (question = "") => formCard("ask_human", { message: String(question).replace(/\s+/g, " ").trim().slice(0, 300) });

// settings.tiers says which tiers are on. `ctx` is what buildContext found (events and contests that matched the question).
export function cardsFor({ question, settings, ctx = {}, handoff = "", user = null, own = null }) {
  const q = String(question || ""), out = [], t = (settings && settings.tiers) || { 1: true, 2: true, 3: true };
  if (t[1]) {
    if (handoff || HUMAN.test(q)) out.push(humanCard(q));
    if (REPORT.test(q) && !out.length) out.push(formCard("report_problem", { where: (ctx.eventList && ctx.eventList.length === 1 && ctx.eventList[0].name) || "" }));
    if (ADD_EVENT.test(q) && !/\b(find|search|see|go to|attend)\b/i.test(q)) { if (t[3] && user) out.push(publishEventCard()); out.push(eventStartCard()); }
    if (ADD_HOME.test(q) && !/\b(find|search|see|visit|drive|directions)\b/i.test(q)) out.push(homeStartCard());
    if (ADD_CONTEST.test(q)) out.push(contestStartCard());
    if (WEEKLY.test(q) && !STOP.test(q)) out.push(formCard("weekly_email"));
    if (REMOVE.test(q) || REMOVE2.test(q)) out.push(formCard("remove_home"));
  }
  // Tier 3: the signed-in visitor's own listings (docs/ai-assistant-actions-design.md). Signed out: one card that says to sign in first.
  if (t[3] && (!handoff || handoff === "gap") && wantsOwnerAction(q)) { if (user) out.unshift(...ownerCards({ question: q, own: own || {} })); else out.unshift(signInCard()); }
  if (t[2] && !handoff) {
    const ev = (ctx.eventList || []).slice(0, 3);
    if (ev.length) out.push({ type: "links", label: "Open on the map", links: ev.map((e) => ({ label: e.name, sub: [e.city, e.free ? "Free" : ""].filter(Boolean).join(" · "), href: "/e/" + encodeURIComponent(e.id) })) });
    // "Plan these": opens the site's own shared-plan view (/#night-<ids>), where one tap adds them to Favorites. Nothing is written by the chat itself.
    if (ev.length && FAV.test(q)) out.push({ type: "links", label: "Plan these as a night", links: [{ label: "Open these " + ev.length + " in a plan, then tap Route these", sub: "", href: "/#night-" + ev.map((e) => encodeURIComponent(e.id)).join(",") }] });
    const cs = (ctx.contestList || []).slice(0, 2);
    if (cs.length) out.push({ type: "links", label: "Contest pages", links: cs.map((c) => ({ label: c.name, sub: c.city || "", href: "/c/" + encodeURIComponent(c.slug) })) });
    if (WHERE.test(q)) { const low = q.toLowerCase(), hit = PAGES.find(([k]) => low.includes(k)); if (hit) out.push({ type: "links", label: "Go to", links: [{ label: hit[2], sub: "", href: hit[1] }] }); }
  }
  return out.slice(0, 3);
}
