// AI assistant: which action cards may appear next to an answer. All of this is plain code (no model): the visitor's own last message has to ask for the thing,
// and every id and link comes from our database lookups, never from model text. See docs/ai-assistant-actions-design.md.
import { ACTIONS, cityNames } from "./chatactions.js";
import { SEASONS } from "../../public/seasons.js";
import { ownerCards, publishEventCard, signInCard, wantsOwnerAction } from "./chatown.js";

const HUMAN = /\b(human|real person|a person|someone|somebody|staff|team|owner|support|customer service|representative)\b[^.?!]{0,50}\b(talk|speak|contact|reach|email|message|help|call)\b|\b(talk|speak|contact|reach|email|message|call)\b[^.?!]{0,50}\b(human|real person|someone|somebody|staff|team|owner|support|customer service|representative)\b|\b(human|real person|customer service|representative)\b/i;
const REPORT = /\b(wrong|incorrect|outdated|out of date|error|mistake|inaccurate|no longer|closed|cancell?ed|has moved|broken)\b[^.?!]{0,60}\b(event|listing|home|house|display|address|date|time|hours|info|information)\b|\breport (?:a |an |this |that )?(?:problem|error|mistake|listing|event|home|house|issue)\b/i;
const WEEKLY = /\b(weekly (?:lights )?email|newsletter|sign me up|sign up for (?:the |your )?(?:weekly|email|emails|alerts?)|subscribe|email me|email alerts?)\b/i;
const STOP = /\b(unsubscribe|stop (?:the |these |getting )?emails?|opt out|no longer want)\b/i;
const REMOVE = /\b(remove|delete|take (?:down|off)|get rid of|want .{0,20} off)\b[^.?!]{0,50}\b(my )?(home|house|display|listing|address|lights)\b/i;
const FAV = /\b(favorites?|favourites?|plan (?:a |my )?night|route|drive (?:through|by)|tonight|stops?)\b/i;
const ADD_EVENT = /\b(add|list|post|submit|put|publish|promote|register)\b[^.?!]{0,40}\b(event|parade|market|tree lighting|festival|show|haunt)\b/i;
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
    if (WEEKLY.test(q) && !STOP.test(q)) out.push(formCard("weekly_email"));
    if (REMOVE.test(q)) out.push(formCard("remove_home"));
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
