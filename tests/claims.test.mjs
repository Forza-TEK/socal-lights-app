// Payments: who may claim an event without waiting for the admin (trustOf, free-mail list, aggregators, shared suffixes).
import test from "node:test";
import assert from "node:assert/strict";
import { trustOf, isFreeMail, ownLabels, hasOwnName, FREE_DOMAINS } from "../functions/_lib/contests.js";
import { isAggregator, onRequestPost as claim } from "../functions/api/me/claims.js";
import { newEnv, addEvent, addUser } from "./_pay.mjs";

test("trustOf: a business email that matches the site is a match; subdomains and www work both ways", () => {
  assert.equal(trustOf("a@lightshow.org", "https://www.lightshow.org/tickets"), "match");
  assert.equal(trustOf("a@lightshow.org", "lightshow.org"), "match", "a bare host is accepted");
  assert.equal(trustOf("a@lightshow.org", "https://tickets.lightshow.org"), "match", "a subdomain of their domain");
  assert.equal(trustOf("a@mail.lightshow.org", "https://lightshow.org"), "match", "their mail subdomain of the site");
  assert.equal(trustOf("a@lightshow.org", "https://lightshow.com"), "other");
  assert.equal(trustOf("a@lightshow.org", "https://notlightshow.org"), "other", "suffix match must be at a dot");
  assert.equal(trustOf("a@lightshow.org", ""), "none");
  assert.equal(trustOf("a@lightshow.org", "http://"), "other");
  assert.equal(trustOf("nobody", "https://x.org"), "free", "no domain at all is never trusted");
});

test("free mail: the long list of consumer providers and their regional editions are never a match", () => {
  for (const d of ["gmail.com", "ymail.com", "gmx.com", "mail.com", "zoho.com", "fastmail.com", "pm.me", "proton.me", "protonmail.com", "hey.com", "comcast.net", "sbcglobal.net", "att.net", "cox.net", "verizon.net", "aol.com", "live.com", "msn.com", "me.com", "mac.com", "icloud.com", "outlook.com", "hotmail.com", "yahoo.com", "charter.net", "earthlink.net", "frontier.com", "pacbell.net"])
    assert.ok(FREE_DOMAINS.has(d), d + " should be in the free-mail list");
  for (const d of ["yahoo.ca", "yahoo.co.uk", "hotmail.co.uk", "live.com.mx", "outlook.fr", "gmx.de", "aol.co.uk"]) assert.equal(isFreeMail(d), true, d);
  for (const d of ["lightshow.org", "yahooligans.org", "outlook-lights.com", "ci.pasadena.ca.us"]) assert.equal(isFreeMail(d), false, d);
  assert.equal(trustOf("owner@comcast.net", "https://comcast.net/events"), "free");
  assert.equal(trustOf("owner@yahoo.ca", "https://yahoo.ca"), "free");
  assert.equal(trustOf("owner@ymail.com", "https://ymail.com"), "free");
});

test("shared suffixes: a bare public suffix or shared government/education domain never matches the hosts under it", () => {
  assert.equal(ownLabels("pasadena.gov"), 1); assert.equal(ownLabels("ca.gov"), 0); assert.equal(ownLabels("gov"), 0); assert.equal(ownLabels("edu"), 0);
  assert.equal(ownLabels("k12.ca.us"), 0); assert.equal(ownLabels("lausd.k12.ca.us"), 1); assert.equal(ownLabels("dmv.ca.gov"), 1); assert.equal(ownLabels("example.co.uk"), 1); assert.equal(ownLabels("co.uk"), 0); assert.equal(ownLabels("cs.ucla.edu"), 2);
  assert.equal(hasOwnName("github.io"), false); assert.equal(hasOwnName("someone.github.io"), true);
  // a mailbox on the shared suffix itself
  assert.equal(trustOf("x@ca.gov", "https://www.dmv.ca.gov/events"), "other", "ca.gov covers every state agency");
  assert.equal(trustOf("x@ca.gov", "https://ca.gov"), "other", "not even its own bare name");
  assert.equal(trustOf("x@gov", "https://pasadena.gov"), "other");
  assert.equal(trustOf("x@edu", "https://ucla.edu"), "other");
  assert.equal(trustOf("x@k12.ca.us", "https://lausd.k12.ca.us"), "other");
  assert.equal(trustOf("x@com", "https://lightshow.com"), "other");
  assert.equal(trustOf("x@github.io", "https://someone.github.io"), "other");
  // a site that is itself a bare shared suffix does not give the parent rule to everyone under it
  assert.equal(trustOf("x@dmv.ca.gov", "https://ca.gov/events"), "other");
  // a real institution still matches its own site
  assert.equal(trustOf("events@pasadena.gov", "https://www.pasadena.gov/holiday"), "match");
  assert.equal(trustOf("x@ucla.edu", "https://events.ucla.edu"), "match");
  assert.equal(trustOf("x@lausd.k12.ca.us", "https://lausd.k12.ca.us/event"), "match");
  assert.equal(trustOf("x@dmv.ca.gov", "https://dmv.ca.gov/x"), "match");
});

test("aggregators: ticketing, listing, social sites and free website builders never auto-approve", () => {
  for (const u of ["https://www.eventbrite.com/e/1", "https://eventbrite.co.uk/e/1", "https://www.stubhub.com/x", "https://axs.com/events/1", "https://www.axs.com/x", "https://www.seetickets.us/x", "https://www.universe.com/x", "https://dice.fm/event/1", "https://www.ticketweb.com/x", "https://www.ticketleap.com/x", "https://www.bandsintown.com/x", "https://www.songkick.com/x", "https://seatgeek.com/x", "https://www.vividseats.com/x", "https://www.groupon.com/x", "https://www.livingsocial.com/x", "https://www.facebook.com/events/1", "https://someone.wixsite.com/lights", "https://someone.github.io/lights", "https://linktr.ee/lights", "https://new.express.adobe.com/webpage/abc", "https://shop.squarespace.com", "lights.blogspot.com", "https://sites.google.com/view/lights"])
    assert.equal(isAggregator(u), true, u);
  for (const u of ["https://lightshow.org", "https://www.pasadena.gov/x", "https://diceandco.example.org", "https://stubhubby.org"]) assert.equal(isAggregator(u), false, u);
  assert.equal(isAggregator("http://"), true, "an unparseable site is never trusted");
});

const post = (env, u, event_id) => claim({ request: new Request("https://socallights.app/api/me/claims", { method: "POST", headers: { "content-type": "application/json", cookie: u.cookie }, body: JSON.stringify({ event_id }) }), env }).then(async (r) => ({ status: r.status, body: await r.json() }));

test("claim endpoint: shared-suffix mailboxes, free-mail and aggregator sites wait for the admin; a real match is approved", async () => {
  const { env, raw } = newEnv();
  addEvent(raw, "dmv", { url: "https://www.dmv.ca.gov/holiday" }); addEvent(raw, "own", { url: "https://www.pasadena.gov/holiday" }); addEvent(raw, "ticket", { url: "https://www.axs.com/events/9" });
  addEvent(raw, "ticket2", { url: "https://www.pasadena.gov/x" });
  const state = await addUser(raw, "u1", "worker@ca.gov"), city = await addUser(raw, "u2", "clerk@pasadena.gov"), comcast = await addUser(raw, "u3", "me@comcast.net");
  assert.equal((await post(env, state, "dmv")).body.status, "pending", "@ca.gov is every agency's address");
  assert.equal((await post(env, city, "own")).body.status, "approved");
  assert.equal((await post(env, comcast, "own")).body.status, "pending", "free mail");
  addEvent(raw, "axs-own", { url: "https://pasadena.gov.axs.com/x" });
  assert.equal((await post(env, city, "ticket")).body.status, "pending", "aggregator site");
  assert.equal(raw.prepare("SELECT method FROM event_claims WHERE user_id = 'u2' AND event_id = 'own'").get().method, "domain");
});
