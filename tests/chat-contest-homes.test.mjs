// A Covina contest organizer asked the assistant how to enter homes and was not told the organizer could add them from a list (reported 2026-11-10).
// Every phrasing an organizer or resident might use about getting homes into a contest must give the model BOTH ways: residents entering, and the organizer adding homes.
import test from "node:test";
import assert from "node:assert/strict";
import { makeDB } from "./_d1.mjs";
import { buildContext, resetChatCache, RULES } from "../functions/_lib/chatkb.js";

const QS = [
  "How do I add homes to my contest?", "I created a contest for the city of Covina. How do residents enter their homes?", "my city collects addresses on a spreadsheet, can I enter the homes for them",
  "what are all the ways to enter a home in the system", "can I add homes myself to my contest", "how do I enter homes into a contest I created", "residents don't have photos, can I still add their homes",
  "how many homes can I add at once", "how do I enter my home in a contest", "our city has a list of participants, how do I load them", "the resident doesn't want to make an account, how do I enter her home", "can I bulk add homes",
];
test("questions about getting homes into a contest give the model the organizer's Add homes yourself route and the residents' Enter route", async () => {
  resetChatCache();
  const { DB } = makeDB();
  for (const q of QS) {
    const t = (await buildContext({ DB }, q)).dynamicSystem;
    assert.match(t, /Add homes yourself/, "organizer route missing for: " + q);
    if (!/limit|at once|bulk|how many/i.test(q)) assert.match(t, /tap Enter|Enter, sign in|opens the contest page/i, "resident route missing for: " + q);
  }
});
test("the organizer-added homes limits match the Help article (100 at a time, 500 per contest, 25 while a new contest waits for review), not the old 10", async () => {
  const { KB_CHUNKS } = await import("../functions/_lib/chatkb-data.js");
  const c = KB_CHUNKS.filter((x) => /^Organizer-added homes/.test(x.title)).map((x) => x.text).join(" ");
  assert.match(c, /up to 100 homes pasted at a time/); assert.match(c, /up to 500/); assert.match(c, /up to 25 while a new contest is waiting/); assert.doesNotMatch(c, /Up to 10 homes can be added at a time/);
  assert.match(RULES, /residents entering their own home, and the organizer adding homes from a list/);
});

test("the at-a-glance route chunks exist and do not push the step-by-step guides out of the top results", async () => {
  const { rankChunks } = await import("../functions/_lib/chatkb.js");
  assert.match(rankChunks("what are all the ways to get my home on the map", 3).map((c) => c.title).join(" | "), /Every route for a home at a glance/);
  assert.match(rankChunks("how do I add my home?", 2).map((c) => c.title).join(" | "), /Adding your home to the map/);
});

test("the newest organizer and homeowner features are found: edit an added home, the private link, the homeowner's page, the Founder city badge", async () => {
  const { rankChunks } = await import("../functions/_lib/chatkb.js");
  const has = (q, re) => assert.match(rankChunks(q, 3).map((c) => c.title).join(" | "), re, q);
  has("I typed the wrong street number for a home I added, how do I fix it?", /Fix a home you added/);
  has("can I edit the name of a home I added to my contest", /Fix a home you added/);
  has("how do I send the homeowner a link to add her own photos", /Send the homeowner a private link/);
  has("the wrong person got the link, how do I make a new one", /Send the homeowner a private link/);
  has("my city added my home to a contest, what do I do now", /Your city added your home/);
  has("I got a link from the city, how do I link my home to my account", /Your city added your home/);
  has("what does the Founder city badge mean", /Founder city badge/);
  has("can the homeowner delete the photos I added", /Send the homeowner a private link|Your city added your home/);
});
