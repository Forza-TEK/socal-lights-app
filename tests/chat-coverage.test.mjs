// Completeness audit: for questions with several options or steps, the facts the visitor needs must reach the model (the top Help articles and knowledge chunks), not just one route.
// Born from the Covina report (an organizer was told how residents enter but not how she can add homes herself). Add a line when a pasted chat shows a missing option.
import test from "node:test";
import assert from "node:assert/strict";
import { makeDB } from "./_d1.mjs";
import { buildContext, resetChatCache } from "../functions/_lib/chatkb.js";

const C = [
 ["How do I share my contest?", ["QR", "poster", "link", "yard sign"]],
 ["how can I promote my contest to residents", ["QR", "poster", "link"]],
 ["What are the ways to vote?", ["one favorite", "category", "sign"]],
 ["how can someone become a judge", ["email", "invite|invited"]],
 ["what ways can judges score", ["Pick", "Score", "1 to 10"]],
 ["how do I set up a contest quickly vs customizing it", ["Quick start", "Customize"]],
 ["what are my options for who votes in my contest", ["public", "judges"]],
 ["how can I sign in", ["Google", "emailed|6-digit|code"]],
 ["what are all the ways to find lights near me", ["Use my location", "city", "Filters"]],
 ["how can I get my event on the map", ["Add", "web page|Confirmed", "claim|Claim"]],
 ["what are all the ways to promote my event", ["Featured", "banner|Banner", "Event Partner|Promote your event"]],
 ["how can I pay for a contest", ["pass", "Stripe"]],
 ["how can I contact SoCal Lights", ["info@socallights.app", "Send"]],
 ["what are the ways to get emails from SoCal Lights", ["weekly", "confirm"]],
 ["how can I plan a route for my night", ["heart|Favorites", "Route these", "nine|9"]],
 ["how do I install the app on iphone and android", ["Safari", "Chrome", "Home Screen|Home screen"]],
 ["how can an installer get leads", ["quote|Quote", "profile"]],
 ["what can a homeowner do after the city adds their home", ["link", "photos", "details"]],
 ["how do I remove a home from a contest as the organizer", ["Remove"]],
 ["how can I get my home on the map", ["Add", "Claim|claim", "installer"]],
 ["how many ways are there to approve entries", ["by hand|manual", "automatic|auto"]],
 ["how do I find out who won a contest", ["results|Results", "/past|past"]],
 ["how can I tell someone about my display", ["Share|share"]],
 ["can I change my entry after I submit", ["Edit", "withdraw|Withdraw"]],
 ["what happens at the end of a contest", ["winners", "email|emailed", "results"]],
 ["how can I get a refund", ["full refund", "non-refundable|payment"]],
 ["how do I add a sponsor to my contest", ["Sponsors", "invite|record"]],
 ["can I co-organize a contest with someone", ["co-organizer|Co-organizer|Team"]],
 ["how do I hide or show vote counts", ["hide|show", "counts"]],
 ["how can I enter a contest as a resident", ["Enter", "sign in|Sign in", "photos"]],
 ["how does the organizer add homes that residents sent to the city", ["Add homes yourself", "Check addresses"]],
 ["what ways can I use the map on my phone", ["Use my location", "Filters"]],
 ["how can I report something wrong on the map", ["Report a problem"]],
 ["what are the plans for installers", ["Banner", "Top of the list"]],
 ["how can cities run contests", ["pass|Pass", "Quick start|contest wizard"]],
 ["what's the difference between Expected and Confirmed events", ["Expected", "Confirmed"]],
];
test("every multi-option question gives the model all the facts it needs", async () => {
  resetChatCache();
  const { DB } = makeDB(), misses = [];
  for (const [q, facts] of C) { const t = (await buildContext({ DB }, q)).dynamicSystem; const lack = facts.filter((f) => !new RegExp(f).test(t)); if (lack.length) misses.push(`${q} lacks ${JSON.stringify(lack)}`); }
  assert.deepEqual(misses, []);
});
