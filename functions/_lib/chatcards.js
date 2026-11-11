// AI assistant: which action cards may appear next to an answer. All of this is plain code (no model): the visitor's own last message has to ask for the thing,
// and every id and link comes from our database lookups, never from model text. See docs/ai-assistant-actions-design.md.
import { ACTIONS, cityNames } from "./chatactions.js";
import { SEASONS } from "../../public/seasons.js";
import { ownerCards, publishEventCard, signInCard, wantsOwnerAction } from "./chatown.js";

const HUMAN = /\b(human|real person|a person|someone|somebody|staff|team|owner|support|customer service|representative)\b[^.?!]{0,50}\b(talk|speak|contact|reach|email|message|help|call)\b|\b(talk|speak|contact|reach|email|message|call)\b[^.?!]{0,50}\b(human|real person|someone|somebody|staff|team|owner|support|customer service|representative)\b|\b(human|real person|customer service|representative)\b|\b(contact|reach|email|call|phone|message)\s+(you|us|the team|your team)\b|\b(your|a) (phone number|email address|contact)\b|\b(only|need|want|get|find)\b[^.?!]{0,15}\b(a |an )?(human|person|someone|somebody|actual person)\b|\bwho(m)? (can|do|should) i (message|contact|email|reach|ask|call|talk to|speak to)\b|\b(anyone|anybody|somebody|someone) (there|home|around|available)\b|\bcustomer (support|service)\b|\b(your|the) (staff|owner|team)\b|\bconnect me (with|to)\b|\bcomplain\b|\b(chat|talk|speak) with (a|an|the|someone|somebody)\b|\bpass (a|my) message\b|\b(talk|speak) to (a|an|the) (agent|rep|person|human)\b/i;
const REPORT = /\b(wrong|incorrect|outdated|out of date|error|mistake|inaccurate|no longer|closed|cancell?ed|has moved|broken)\b[^.?!]{0,60}\b(event|listing|home|house|display|address|date|time|hours|info|information)\b|\breport (?:a |an |this |that )?(?:problem|error|mistake|listing|event|home|house|issue)\b|\b(event|listing|home|house|display|address|date|time|hours|info|information|parade|venue|market)\b[^.?!]{0,40}\b(wrong|incorrect|outdated|out of date|inaccurate|not right|not correct|has changed|changed|moved|closed|gone|different)\b|\b(still|no longer)\b[^.?!]{0,30}\b(on|shows?|showing|listed)\b[^.?!]{0,20}\b(map|site|list)\b|\b(map|site|page|listing)\s+(says|shows|lists)\b[^.?!]{0,60}\bbut\b|\bmoved to\b|\b(fake|false|spam|scam|misleading)\b[^.?!]{0,20}\b(info|information|listing|event|post)\b|\b(info|information|listing)\b[^.?!]{0,25}\b(old|stale|not current|out of date)\b|\b(no longer exists?|does(n'?t| not) exist|broken link|link (is )?(broken|dead)|dead link)\b|\b(is|are) (off|wrong|incorrect)\b[^.?!]{0,20}\b(listed|shown|posted)\b|\b(listed|shown|posted)\b[^.?!]{0,30}\b(is|are) (off|wrong|incorrect)\b|\bstill (pinned|listed|showing)\b|\bnot what (the|their|its) (website|site|page)\b|\bflag (this|that|it)\b/i;
const WEEKLY = /\b(weekly (?:lights )?email|newsletter|sign me up|sign up for (?:the |your )?(?:weekly|email|emails|alerts?)|subscribe|email me|email alerts?|email (?:updates|list)|add me to|alerts? for|(?:get|receive|send me) (?:the |your )?(?:emails|updates|alerts)|keep me (?:posted|updated|informed)|mailing list|your emails|(?:hear|learn) about[^.?!]{0,40}\bby email|email me (?:every|each) week|every week|weekly (roundup|digest|summary|updates?)|sign up\b[^.?!]{0,20}\b(email|alerts?)\b|(?:send|get) me updates)\b/i;
const STOP = /\b(unsubscribe|stop\b[^.?!]{0,20}\bemails?|opt out|no longer want)\b/i;
const REMOVE = /\b(remove|delete|take (?:down|off)|get rid of|want .{0,20} off)\b[^.?!]{0,50}\b(my )?(home|house|display|listing|address|lights)\b/i;
const REMOVE2 = /\b(remove|delete|take|taken|get|off)\b[^.?!]{0,40}\b(my )?(home|house|display|listing|address|lights)\b[^.?!]{0,30}\b(off|from)\b[^.?!]{0,15}\b(the )?(map|site|website|app)\b|\b(my )?(home|house|display|listing|address)\b[^.?!]{0,30}\b(off|removed from|taken off)\b[^.?!]{0,15}\b(the )?(map|site|website)\b/i;
const REMOVE3 = /\bon (your|the) (map|site|website)\b[^.?!]{0,50}\b(want|need|please|would like)\b[^.?!]{0,20}\b(off|removed|gone|taken)\b|\b(no|not|without)\b[^.?!]{0,20}\b(permission|consent)\b[^.?!]{0,30}\b(home|house|address|display|listing|lights)\b|\b(permission|consent)\b[^.?!]{0,40}\bshow\b[^.?!]{0,20}\b(my )?(home|house|address)\b|\b(shouldn'?t|should not|doesn'?t|does not|don'?t|do not)\b[^.?!]{0,20}\b(be |want )?(listed|on the map|on your site|shown|public)\b|\bremove my address\b|\bmy (home|house|display)\b[^.?!]{0,80}\b(remove|take down|delete|take off) (it|that)\b/i;
const FAV = /\b(favorites?|favourites?|plan (?:a |my )?night|route|drive (?:through|by)|tonight|stops?)\b/i;
const ADD_EVENT = /\b(add|list|post|submit|put|publish|promote|register)\b[^.?!]{0,40}\b(event|parade|market|tree lighting|festival|show|haunt\w*)\b|\b(hosting|organi[sz]ing|running|planning)\b[^.?!]{0,20}\b(event|parade|market|tree lighting|festival|show|haunt\w*)\b|\b(get|have)\b[^.?!]{0,20}\b(event|parade|market|festival|show|haunt\w*)\b[^.?!]{0,15}\b(listed|on the map|added|posted)\b|\b(i|we)\s+(run|host|organi[sz]e|own)\b[^.?!]{0,30}\b(event|parade|market|festival|show|haunt\w*)\b[^.?!]{0,40}\b(map|listed|here|site)\b/i;
const ADD_TO_MAP = /\b(add|list|put|post|get|submit)\b[^.?!]{0,60}\b(on|to|onto) (the |your )?(map|site|website|here)\b|\b(get|have)\b[^.?!]{0,40}\b(listed|added|posted)\b|\blisted here\b/i;
const HOMEY = /\b(home|house|display|lights|yard|animated|decorations?)\b/i;
const ADD_HOME = /\b(add|put|show|list|post|submit|showcase|enter)\b[^.?!]{0,40}\b(my )?(home|house|display|lights|yard)\b[^.?!]{0,30}\b(on|to|in)\b[^.?!]{0,20}\bmap\b|\b(add|list|post|showcase|submit)\b[^.?!]{0,25}\b(my )?(home|house|display)\b|\b(show|share|showcase|display)\b( off)? my (christmas |holiday )?(lights|home|house|display|yard)\b|\b(decorated|decorating)\b[^.?!]{0,20}\b(my|our)\b[^.?!]{0,15}\b(home|house|yard)\b|\b(be|get) on (the|your) map\b[^.?!]{0,20}\b(home|house)?owner\b|\bon the map as a (home|house)owner\b/i;
const ADD_CONTEST = /\b(start|create|run|host|set up|setup|launch|organi[sz]e)\b[^.?!]{0,40}\b(a |my |our )?(best |decorating |decorated |lighting |holiday )?(home |house )?contest\b|\bcontest\b[^.?!]{0,40}\bhow (do|can) (i|we) (start|begin|set up|create|run)\b|\b(want|wants|would like|like|need)\b[^.?!]{0,15}\b(a|an|our|my)\b[^.?!]{0,15}\b(lighting |decorating |holiday |home )?(contest|competition)\b|\b(run|host|create|start|organi[sz]e)\b[^.?!]{0,30}\b(competition)\b/i;
const WHERE = /\b(where|how do i (?:get to|go to|open|find)|link to|take me to)\b[^.?!]{0,40}\b(add|contests?|profile|pricing|prices|help|tutorials?|promote|feature)\b/i;
const PAGES = [["add", "/add", "Add an event, home or contest"], ["contest", "/contests", "Contests"], ["profile", "/profile", "Your profile"], ["pric", "/pricing", "Pricing"], ["help", "/help", "Help Center"], ["tutorial", "/tutorials", "Tutorials"], ["promote", "/feature", "Feature your event"], ["feature", "/feature", "Feature your event"]];

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
  return { type: "form", nav: "/add-contest", label: "Start my contest", go: "Open the wizard", summary: "Tell me the basics. Tap Open the wizard and it opens with them filled in; Quick start keeps the rest simple. Running a contest needs a contest pass, and the wizard shows it before the contest goes live.",
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
  if (WEEKLY.test(q)) return { reply: "I can set that up for you: it is one short free email a week, and we send a link to confirm first. Would you like to go ahead? Tap the button below.", cards: [formCard("weekly_email")] };
  if (REPORT.test(q)) return { reply: "Thank you for flagging it. Would you like to send a report to the team? Tap the button below and tell us which listing and what is wrong.", cards: [formCard("report_problem")] };
  if (REMOVE.test(q) || REMOVE2.test(q)) return { reply: "I can pass that on, and you do not need an account. Would you like to send a removal request? Tap the button below and we will email you when it is done.", cards: [formCard("remove_home")] };
  if (!informational(q)) {
    if (ADD_CONTEST.test(q)) return { reply: "Great, I can start that with you. Would you like to begin? Tap the button below and I will open the contest wizard with the basics filled in.", cards: [contestStartCard()] };
    const toMap = ADD_TO_MAP.test(q), homey = HOMEY.test(q) && !/\bhaunted house\b/i.test(q);
    if (ADD_HOME.test(q) || (toMap && homey)) return { reply: "Wonderful, let's get your display on the map. Would you like to begin? Tap the button below and I will open the form with what you tell me filled in; you add night photos there.", cards: [homeStartCard()] };
    if (ADD_EVENT.test(q) || toMap) return { reply: "Happy to help you list your event. Would you like to begin? Tap the button below; you review everything before it goes on the map.", cards: [eventStartCard()] };
  }
  return null;
}
export const needsAccount = (q) => wantsOwnerAction(q) || (ADD_EVENT.test(String(q || "")) && !/\b(find|search|see|go to|attend)\b/i.test(String(q || "")));
export const wantsHuman = (q) => HUMAN.test(String(q || ""));
// open: the visitor asked for a person, so the box is open; an offer (no answer found, cost cap) is collapsed behind a button like every other form.
export const humanCard = (question = "", open = false) => ({ ...formCard("ask_human", { message: String(question).replace(/\s+/g, " ").trim().slice(0, 300) }), ...(open ? { open: true } : {}) });

// A question that only asks about something ("what happens if I take my home down", "is it free to add an event") gets the answer, not an action card; a request ("can you", "please", "I want") or "how do I" still does.
const INFO = /^\s*(what|what's|whats|is|are|does|why|when|which|who|how (does|much|many|long|often)|do (i|you|we|they|events?|people|homes?|contests?|judges?|votes?|the (site|map|app)))\b/i, ASKS = /\b(can you|could you|please|i want|i'd like|i would like|help me|i need to|i need a)\b/i;
export const informational = (q) => INFO.test(String(q || "")) && !ASKS.test(String(q || ""));

// settings.tiers says which tiers are on. `ctx` is what buildContext found (events and contests that matched the question).
export function cardsFor({ question, settings, ctx = {}, handoff = "", user = null, own = null }) {
  const q = String(question || ""), out = [], t = (settings && settings.tiers) || { 1: true, 2: true, 3: true };
  const removing = REMOVE.test(q) || REMOVE2.test(q) || REMOVE3.test(q);
  if (t[1]) {
    if ((handoff || HUMAN.test(q)) && !(handoff === "gap" && REPORT.test(q))) out.push(humanCard(q, !handoff)); // "this listing is outdated" with nothing in the knowledge base gets the report form, not a generic send-to-the-team
    if (REPORT.test(q) && !out.length && !(user && /\b(my|our)\b/i.test(q) && wantsOwnerAction(q))) out.push(formCard("report_problem", { where: (ctx.eventList && ctx.eventList.length === 1 && ctx.eventList[0].name) || "" }));
    const info = informational(q), from = out.length; // a question that only asks about something still gets the matching card, as a suggestion the visitor can open
    const toMap = ADD_TO_MAP.test(q), homey = HOMEY.test(q) && !/\b(haunted house)\b/i.test(q);
    if ((ADD_EVENT.test(q) || (toMap && !homey && !ADD_CONTEST.test(q))) && !/\b(find|search|see|go to|attend)\b/i.test(q)) { out.push(t[3] && user ? publishEventCard() : eventStartCard()); } // one option, not two: signed in, the add-it-now card (it links to the step-by-step form); signed out, the step-by-step form
    if ((ADD_HOME.test(q) || (toMap && homey)) && !removing && !/\b(find|search|visit|directions|haunted house)\b/i.test(q)) out.push(homeStartCard());
    if (ADD_CONTEST.test(q)) out.push(contestStartCard());
    if (WEEKLY.test(q) && !STOP.test(q)) out.push(formCard("weekly_email"));
    if (removing) out.push(formCard("remove_home"));
    if (info) for (const c of out.slice(from)) c.suggest = true;
  }
  // Tier 3: the signed-in visitor's own listings (docs/ai-assistant-actions-design.md). Signed out: one card that says to sign in first.
  if (t[3] && (!handoff || handoff === "gap") && wantsOwnerAction(q) && !(removing && !user) && !(informational(q) && !user)) { if (user) { const oc = ownerCards({ question: q, own: own || {} }); if (informational(q)) for (const c of oc) c.suggest = true; out.unshift(...oc); } else if (/\b(my|our|mine)\b/i.test(q)) out.unshift(signInCard()); }
  const ownerShown = out.some((c) => c.type === "call" || (c.type === "form" && c.call));
  if (t[2] && !handoff && !ownerShown) {
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
