// AI assistant guard rails: what a visitor may type in, what the assistant may say back. No model is involved here, so every rule is testable (tests/chat.test.mjs).
// Scope (owner decisions 2026-11-08): help articles, prices, events and contests (how they work, entering, voting, passes, sponsors, timelines), grounded only in the Help Center, the Terms' contest section and live contest data.
// The assistant quotes rules, it does not interpret or promise. Disputes, disqualification, legal and prize questions, edge cases and anything not in those sources are deferred to the Terms and info@socallights.app; results are never predicted.

export const EMAIL = "info@socallights.app";
export const MESSAGES = {
  offtopic: `I can only help with SoCal Lights: finding events and homes, how the site works, and prices. For anything else, email ${EMAIL}.`,
  injection: "I can't help with that. I'm an automated AI assistant for SoCal Lights and I follow fixed rules. Ask me about events, homes, how the site works, or prices.",
  personal: `I can't look up or share personal information about people. To reach a home's or event's organizer, use the link on its page. For anything else, email ${EMAIL}.`,
  typedPersonal: `Please don't type personal information (email, phone or card numbers) here. I don't need it. If you need help with an account or an order, email ${EMAIL}.`,
  defer: `I'm not sure about that, and I don't want to guess. Disputes, disqualification, eligibility edge cases, prizes and legal questions are decided by each contest's organizer under our Terms (https://socallights.app/terms#contests). Please check the contest page and the Contest Help (https://socallights.app/help#enter), or email ${EMAIL}.`,
  results: `I can't predict winners or share results. Results appear on a contest's page once its organizer announces them. How voting works is in the Contest Help (https://socallights.app/help#vote); for anything else, email ${EMAIL}.`,
  payWin: "No. Payment never affects who wins or any contest result, and contests are free to enter and to vote in. Prices are on https://socallights.app/pricing and the details are in the Terms (https://socallights.app/terms#paid).",
  price: "I can't confirm that price. Current prices are on our pricing page: https://socallights.app/pricing.",
  date: `I don't have that date listed. Please check the event's page for the latest dates, or email ${EMAIL}.`,
  antifraud: `To keep voting fair, voting needs a verified sign-in, each account gets one vote per category, nobody can vote for their own home, and organizers can review votes and void any that look fake. Fake, automated or traded votes are not allowed, and votes are never sold. We don't share how fake votes are detected. If you think something is wrong in a contest, tell its organizer or email ${EMAIL}.`,
  gap: `I don't have that in the information I can use, and I don't want to guess. Please try the Help Center (https://socallights.app/help), or email ${EMAIL} and we'll help.`,
  error: `Sorry, I can't answer right now. Please try the Help Center (https://socallights.app/help) or email ${EMAIL}.`,
  capped: `The AI assistant has reached its limit for now. Please try the Help Center (https://socallights.app/help) or email ${EMAIL}.`,
};

// ---------- input ----------
export const MAX_MESSAGE_CHARS = 500, MAX_TURNS = 6;
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g; // control and bidi-override characters
export function cleanInput(s) {
  return String(s ?? "").replace(CTRL, "").replace(/<[^>]*>/g, " ").replace(/\b(?:https?:\/\/|ftp:\/\/|www\.)\S*/gi, "[link]").replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE_CHARS);
}
// body.messages -> [{role, content}] (last MAX_TURNS, ending with a user message) or null when the shape is wrong.
export function parseMessages(list) {
  if (!Array.isArray(list) || !list.length || list.length > 40) return null;
  const out = [];
  for (const m of list.slice(-MAX_TURNS)) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") return null;
    const content = m.role === "user" ? cleanInput(m.content) : String(m.content).replace(CTRL, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1500);
    if (!content) return null;
    out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== "user") out.shift();
  if (!out.length || out[out.length - 1].role !== "user") return null;
  return out;
}

const INJECTION = [
  /\b(ignore|disregard|forget|override|bypass|skip|drop)\b[^.!?]{0,50}\b(instructions?|prompts?|rules?|guidelines?|polic(?:y|ies)|system|previous|above|prior|earlier|restrictions?|guardrails?)\b/i,
  /\b(system|developer|hidden|initial|original|secret)\s+(prompt|message|instructions?)\b/i,
  /\b(reveal|show|print|repeat|output|leak|display|tell me|recite|translate)\b[^.!?]{0,40}\b(your|the|above|previous)\b[^.!?]{0,30}\b(instructions?|prompts?|rules|configuration|context|guidelines)\b/i,
  /\byou are (now|no longer)\b|\bpretend (to be|you are|you're)\b|\bact as (a|an|if|my)\b|\brole-?play\b|\bjailbreak|\bdeveloper mode\b|\bdo anything now\b|\bDAN\b/i,
  /\b(repeat|print|copy|output|show|recite|echo)\b[^.!?]{0,30}\b(text|words|message|messages|everything|conversation)\s+(above|before|so far)\b|\beverything above\b|\bstarting with ['"]?you are\b/i,
  /<\s*\/?\s*(system|assistant|context|instructions?|untrusted)\b|\[\s*\/?\s*(system|inst)\s*\]|^\s*#{2,}\s*(system|instruction)/im,
  /\b(new|updated|real) (instructions?|rules?|system prompt)\s*:/i,
  /\bfrom now on\b[^.!?]{0,40}\b(you|answer|respond|reply|only|always)\b/i,
];
const PERSONAL_ASK = [
  /\b(phone|cell|mobile|e-?mail|address|number|name|surname|contact)\b[^.?!]{0,30}\b(of|for)\b[^.?!]{0,30}\b(owner|homeowner|resident|user|organizer|organiser|member|person|neighbor|neighbour|admin|applicant|voter|judge|installer)\b/i,
  /\bwho (owns|lives|is the owner|is the homeowner|runs|posted|submitted|voted|are the judges)\b/i,
  /\b(list|give|show|export|dump|send)\b[^.?!]{0,30}\b(e-?mails?|users?|accounts?|phone numbers?|customers?|subscribers?|database|voters?|judges?)\b/i,
  /\b(who|which (people|users|accounts))\b[^.?!]{0,25}\b(voted|signed up|subscribed|entered|bought|paid)\b/i,
];
const TYPED_PERSONAL = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/,
  /\b(?:\d[ -]?){13,19}\b/, // a card-like number
  /\b\d{3}-\d{2}-\d{4}\b/,
];
const PAY_WIN = [/\b(pay|paid|paying|buy|buying|purchase|sponsor|sponsoring|featured?|upgrade)\b[^.?!]{0,60}\b(win|winning|vote|votes|voting|results?|rank(?:ing)?|judges?|score)\b/i, /\b(win|winning|votes?|results?|rank(?:ing)?|score)\b[^.?!]{0,60}\b(pay|paid|paying|buy|buying|purchase|sponsor|featured?)\b/i];
// Questions the assistant must not answer from its own judgment: results and predictions, then disputes, legal and prize matters.
const RESULTS = /\bwho (won|wins|will win|is winning|got|is going to win|came|placed)\b|\b(will|would|going to) (i|we|my|our|it|this)\b[^.?!]{0,20}\bwin\b|\b(chances?|odds)\b[^.?!]{0,20}\bwin|\bpredict\w*|\bwho(?:'?s| is| are) (?:ahead|leading|winning|in the lead|in first)\b|\b(current|live) (rankings?|standings?|vote counts?|leaderboard)\b|\bhow many votes (does|did|has|have|is|are)\b/i;
// Questions about how fraud is detected or how to get around the checks: answered with a fixed general statement, never from sources, so no detail can leak.
const ANTIFRAUD = [
  /\b(how|what|which)\b[^.?!]{0,50}\b(detect\w*|catch\w*|spot\w*|flag\w*|identif\w+|track\w*|monitor\w*|know)\b[^.?!]{0,40}\b(fake|fraud\w*|cheat\w*|bots?|duplicate|suspicious|spam)\b/i,
  /\b(threshold|cut-?off|trigger\w*|algorithm|rate ?limit\w*|how many votes (per|a|in)|how fast|how quickly)\b[^.?!]{0,50}\b(votes?|voting|fraud|flag\w*|fake|bots?)\b/i,
  /\b(bypass|get around|avoid|evade|trick|fool|beat|game|exploit|hack|spoof)\b[^.?!]{0,40}\b(votes?|voting|checks?|detection|limits?|protection|system|filters?)\b/i,
  /\b(vote|voting)\b[^.?!]{0,30}\b(multiple|many|several|more than one|twice|repeatedly|again and again)\b[^.?!]{0,20}\b(times|accounts?|emails?|devices?|ips?)\b|\b(multiple|several|many|extra|fake|second|new) (accounts?|emails?)\b[^.?!]{0,30}\bvot/i,
  /\b(vpn|proxy|incognito|clear (my )?cookies?|different (device|browser|phone|ip))\b[^.?!]{0,50}\bvot/i,
  /\bvot\w*\b[^.?!]{0,50}\b(vpn|proxy|incognito|clear (my )?cookies?|different (device|browser|phone|ip)|same (ip|wifi|network|device))\b/i,
];
const DEFER = /\b(disqualif\w*|disput\w*|appeals?|lawsuits?|sue|suing|legal(?:ly)?|attorney|lawyer|liab\w+|prizes? (?:tax|taxes|value|delivery|claim|money|cash)|taxes|rigged|cheat\w*|fraud\w*|unfair|(?:my|a|the) votes? (?:was|were|got|is|are) (?:removed|voided|deleted|not counted)|void(?:ed)? (?:my )?votes?|refund(?:ed)? (?:my )?(?:entry|vote))\b/i;
// Words that make a question plausibly about this site. This only saves a model call on obvious off-topic questions (the model is told the same scope); it is not the only defence.
const ON_TOPIC = /\b(lights?|lit|christmas|xmas|halloween|thanksgiving|new year'?s?|valentine\w*|spring|summer|events?|parades?|boat|tree|trees|homes?|houses?|displays?|contests?|votes?|voted|voting|winners?|winning|ties?|tied|announc\w*|categor\w+|scor\w+|rank\w*|judg\w+|sponsors?|organi[sz]\w+|judges?|entry|entries|enter|prices?|pricing|costs?|how much|free|pay|paid|payment|refunds?|featured?|pin|banner|sponsors?|installers?|installation|map|maps|route|routes|app|account|sign[ -]?in|log[ -]?in|profile|help|tonight|weekend|near|nearby|city|cities|county|counties|los angeles|orange|riverside|san bernardino|san diego|ventura|santa barbara|socal|southern california|socallights|email|alerts?|newsletter|submit|add|post|showcase|remove|delete|privacy|terms|happening|going on|things to do|visit|walk|drive|tour|market|festival|santa|snow|nativity|holiday|holidays|season|dates?|hours|tickets?|address|install|download|android|iphone|offline|dark mode|night mode|contact|support|phone|listings?|resume|cancell?ed|postponed|rescheduled|photos?|pictures?|upload\w*|approv\w+|donat\w+|tips?|tipping|qr|poster|posters|advertis\w+|accounts|two accounts|code|codes|passwords?|dog|dogs|pets?|parking|stroller|wheelchair|accessible|hi|hello|hey|thanks?|thank you|bye)\b|\b(change|update|edit)\b[^.?!]{0,15}\b(my )?(name|email)\b|\bwhat size\b|\bapi\b/i;

export function classify(text) {
  const t = String(text || "");
  if (INJECTION.some((r) => r.test(t))) return { kind: "injection", reply: MESSAGES.injection };
  if (TYPED_PERSONAL.some((r) => r.test(t))) return { kind: "typedPersonal", reply: MESSAGES.typedPersonal };
  if (PERSONAL_ASK.some((r) => r.test(t))) return { kind: "personal", reply: MESSAGES.personal };
  if (PAY_WIN.some((r) => r.test(t))) return { kind: "payWin", reply: MESSAGES.payWin };
  if (ANTIFRAUD.some((r) => r.test(t))) return { kind: "antifraud", reply: MESSAGES.antifraud };
  if (RESULTS.test(t)) return { kind: "results", reply: MESSAGES.results };
  if (DEFER.test(t)) return { kind: "defer", reply: MESSAGES.defer };
  if (!ON_TOPIC.test(t)) return { kind: "offtopic", reply: MESSAGES.offtopic };
  return { kind: "ok" };
}

// ---------- output ----------
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const MON = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const pad = (n) => String(n).padStart(2, "0");
// Every calendar date in a piece of text as "MM-DD" ("Dec 5", "5 December", "December 5th, 2026", "2026-12-05", "12/5").
export function datesIn(text) {
  const out = new Set(), s = String(text || "");
  for (const m of s.matchAll(new RegExp(`\\b${MON}\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?!\\s*(?:%|percent|people|homes|houses|events))`, "gi"))) out.add(pad(MONTHS[m[1].toLowerCase().slice(0, 3)]) + "-" + pad(+m[2]));
  for (const m of s.matchAll(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MON}\\b`, "gi"))) out.add(pad(MONTHS[m[2].toLowerCase().slice(0, 3)]) + "-" + pad(+m[1]));
  for (const m of s.matchAll(/\b20\d\d-(\d\d)-(\d\d)\b/g)) out.add(m[1] + "-" + m[2]);
  for (const m of s.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(?:20)?\d\d)?\b/g)) if (+m[1] >= 1 && +m[1] <= 12 && +m[2] >= 1 && +m[2] <= 31) out.add(pad(+m[1]) + "-" + pad(+m[2]));
  return out;
}
// A dollar amount anywhere in the text, as cents; [] when there is none. Word amounts ("twenty dollars") are returned as -1 (never allowed).
export function amountsIn(text) {
  const s = String(text || ""), out = [];
  for (const m of s.matchAll(/\$\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(k\b)?/gi)) out.push(Math.round(parseFloat(m[1].replace(/,/g, "")) * (m[2] ? 1000 : 1) * 100));
  for (const m of s.matchAll(/\b([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:dollars?|usd|bucks)\b/gi)) out.push(Math.round(parseFloat(m[1].replace(/,/g, "")) * 100));
  for (const m of s.matchAll(/\b(?:usd|us\$)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi)) out.push(Math.round(parseFloat(m[1].replace(/,/g, "")) * 100));
  if (/\b(?:a|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)[\w\s-]{0,24}?\s+(?:dollars?|bucks)\b/i.test(s)) out.push(-1);
  return out;
}
// Removes dollar figures and calendar dates from text we retrieve (help articles, event fields) before it reaches the model: prices come only from the PRICES block, dates only from the EVENTS block.
export function stripFigures(text) {
  return String(text || "")
    .replace(/\$\s*[0-9][0-9,]*(?:\.[0-9]{1,2})?(?:\s*(?:k|per\s+\w+|\/\s*\w+))?/gi, "(price: see pricing page)")
    .replace(/\b[0-9][0-9,]*(?:\.[0-9]{1,2})?\s*(?:dollars?|usd|bucks)\b/gi, "(price: see pricing page)")
    .replace(new RegExp(`\\b${MON}\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?(?:\\s*,?\\s*20\\d\\d)?\\b`, "gi"), "(date: see the event page)")
    .replace(new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MON}\\b(?:\\s*,?\\s*20\\d\\d)?`, "gi"), "(date: see the event page)")
    .replace(/\b20\d\d-\d\d-\d\d\b/g, "(date: see the event page)")
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/(?:20)?\d\d)?\b/g, "(date: see the event page)");
}

// Sentences that describe how fake votes are detected are removed from everything we retrieve, so a model can never repeat them (owner decision: describe fraud protection only in general terms).
const FRAUD_DETAIL = /\b(burst|velocity|thresholds?|odd patterns?|suspicious patterns?|flags? (?:odd|suspicious|unusual)|within (?:a few|\d+|several) (?:seconds|minutes)|per (?:second|minute)|rate[- ]limit\w*|fingerprint\w*)\b/i;
export const redactFraudDetail = (text) => String(text || "").split(/(?<=[.!?])\s+/).filter((x) => !FRAUD_DETAIL.test(x)).join(" ");
const OK_URL = /^https?:\/\/(?:www\.)?socallights\.app(?:[/?#][^\s]*)?$/i;
const LEAK = /untrusted_context|CONTEXT-BEGIN|CONTEXT-END|You are the SoCal Lights AI assistant|PRICES \(from the live price list|<<SCL-RULES/i;
// allowedCents: Set of the cents values in our price list. allowedDates: Set of "MM-DD" from the events given to the model.
// Returns { text, blocked } where blocked is "" or "price" | "date" | "leak" (the text is then the safe fallback message).
export function filterOutput(raw, { allowedCents = new Set(), allowedDates = new Set() } = {}) {
  let t = String(raw ?? "").replace(CTRL, "").replace(/```[\s\S]*?```/g, " ").replace(/<[^>]*>/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!t) return { text: MESSAGES.error, blocked: "empty" };
  if (LEAK.test(t)) return { text: MESSAGES.injection, blocked: "leak" };
  for (const c of amountsIn(t)) if (c < 0 || (c !== 0 && !allowedCents.has(c))) return { text: MESSAGES.price, blocked: "price" };
  for (const d of datesIn(t)) if (!allowedDates.has(d)) return { text: MESSAGES.date, blocked: "date" };
  // links: only our own site (relative paths are rewritten to full links); any other address or email is removed
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => (OK_URL.test(url) || /^\/[A-Za-z0-9\-_/#?=.&]*$/.test(url) ? `${label} (${url.startsWith("/") ? "https://socallights.app" + url : url})` : label));
  t = t.replace(/\b(?:https?:\/\/|www\.)[^\s)>\]]+/gi, (u) => (OK_URL.test(u.replace(/[.,;:!?]+$/, "")) ? u : "[link removed]"));
  t = t.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (e) => (e.toLowerCase() === EMAIL ? EMAIL : "[email removed]"));
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/^#{1,6}\s+/gm, "");
  if (t.length > 1200) t = t.slice(0, 1200).replace(/\s+\S*$/, "") + "...";
  return { text: t, blocked: "" };
}
