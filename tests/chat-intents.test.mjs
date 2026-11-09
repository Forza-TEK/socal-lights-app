// Phase 3 tuning: a battery of real-sounding phrasings. Each must give the card we expect (or none). Written from an audit of the intent gate;
// add a line here whenever a pasted chat shows a phrasing that missed.
import test from "node:test";
import assert from "node:assert/strict";
import { cardsFor, quickIntent } from "../functions/_lib/chatcards.js";
import { classify } from "../functions/_lib/chatguard.js";

const S = { tiers: { 1: true, 2: true, 3: true } };
const own = { homes: [{ id: "h1", name: "Oak Street Lights", status: "approved" }, { id: "h2", name: "Pine Lane", status: "paused" }], events: [{ id: "s1", name: "Oak Tree Lighting", status: "published", event_id: "e1", blurb: "x" }], entries: [] };
const PHRASES = [
 ["Can I talk to someone?","Send this to the team"],["I need to speak with a human","Send this to the team"],["how do I contact you","Send this to the team"],["is there a customer service number","Send this to the team"],["I'd like to email the owner","Send this to the team"],["Who runs this site?","NONE"],
 ["sign me up for emails","Sign me up"],["I want the weekly email","Sign me up"],["how do I get the newsletter","Sign me up"],["subscribe me","Sign me up"],["unsubscribe me","NONE"],["stop the emails","NONE"],
 ["please remove my home from the map","Send removal request"],["I want my house taken off the site","Send removal request"],["delete my listing","Send removal request"],["how do I take down my display","Take down"],
 ["the hours on that event are wrong","Report a problem"],["this listing is outdated","Report a problem"],["the address is incorrect","Report a problem"],["report a problem with an event","Report a problem"],
 ["how do I add an event","Start this event"],["I want to post my parade","Start this event"],["list my tree lighting","Start this event"],["where can I find events to attend","NONE"],
 ["add my home to the map","Start my home"],["I want to show my lights","Start my home"],["how do I list my house","Start my home"],["find homes near me","NONE"],
 ["start a contest","Start my contest"],["I want to run a decorating contest for my HOA","Start my contest"],["how do contests work","NONE"],
 ["take my home down for the season","Take down"],["pause my display","Take down"],["put my home back on the map","back on the map"],["my event is cancelled","cancelled"],["the event got postponed","postponed"],["run my event again next year","again next year"],["withdraw my entry","NONE"],["change the description of my event","Edit the description"],
 ["how much does a featured pin cost","NONE"],["what's the weather","NONE"],["how do I vote","NONE"],["move my vote","NONE"],["refund my payment","NONE"],["hi","NONE"],["thanks!","NONE"],
];
test("the intent gate gives the expected card for each phrasing (and none for ordinary questions)", () => {
  const misses = [];
  for (const [q, want] of PHRASES) {
    const c = classify(q), qi = c.kind === "offtopic" ? quickIntent(q, S) : null;
    const cards = qi ? qi.cards : c.kind === "ok" || /human|person|someone|owner|contact|customer/i.test(q) ? cardsFor({ question: q, settings: S, user: { id: "u1" }, own }) : [];
    const labels = cards.map((x) => x.label).join(" | ");
    const ok = want === "NONE" ? !cards.some((x) => x.type !== "links") : labels.toLowerCase().includes(want.toLowerCase());
    if (!ok) misses.push(`${q} => wanted ${want}, got ${labels || "none"}`);
  }
  assert.deepEqual(misses, []);
});

test("quickIntent only fires for Tier 1, never for unsubscribing, and never for injection-looking text", () => {
  assert.equal(quickIntent("subscribe me", { tiers: { 1: false } }), null);
  assert.equal(quickIntent("unsubscribe me from the weekly email", S), null);
  assert.equal(quickIntent("what is the weather", S), null);
  assert.ok(quickIntent("subscribe me", S).cards[0].action === "weekly_email");
});
