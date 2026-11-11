// The Terms must describe paid placements accurately and stay consistent with the Feature page FAQ and the code's plan limits.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PLANS, OPEN_DAYS } from "../functions/_lib/featured.js";
import { sponsorSeasonTable } from "../functions/_lib/sponsor.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const terms = readFileSync(join(root, "public/terms.html"), "utf8");
const feature = readFileSync(join(root, "public/feature.html"), "utf8");
const text = terms.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("Terms have a paid placements section covering what it is, labels, contests, window, refunds, disputes and no guarantee", () => {
  assert.ok(/<h2 id="paid">Paid placements<\/h2>/.test(terms));
  for (const must of ["Featured", "Top of the list", "banner", "pill labeled \"Featured\"", "last day of the season it was bought in (Christmas lights: Jan 6)", "adds nothing new is not sold", "gold-ringed pin", "Stripe", "no subscription", "labeled", "never affects any contest result", "winner, 2nd or 3rd place",
    "starts when your payment goes through", "full refund", "payment dispute", "do not promise any number of views", "Installer Sponsor placements", "\"Sponsor\"", "per season", "inaccurate", "unpublish", "/pricing", "info@socallights.app"])
    assert.ok(text.includes(must) || terms.includes(must), "Terms should say: " + must);
  assert.ok(!/\b(house|display)s?\b/i.test(terms.split('<h2 id="paid">')[1].split("<h2>Accounts</h2>")[0].replace(/<[^>]+>/g, " ")), "the new section says home, not house or display");
});

test("Terms make no advertising-free claims and carry an Updated date", () => {
  for (const bad of ["We do not show ads", "no ads", "ad-free", "never show ads", "do not sell", "advertisers"]) assert.ok(!text.toLowerCase().includes(bad.toLowerCase()), bad);
  assert.ok(/Updated November 11, 2026/.test(terms));
});

test("the day limits stated in the Terms match the code", () => {
  assert.equal(OPEN_DAYS, 30); assert.equal(PLANS.pin.days, 30); assert.equal(PLANS.top.days, 30); // homes: 30 days from payment
  assert.equal(sponsorSeasonTable().christmas[1], "01-06"); // events end on their last day or the season's last day: Christmas lights, Jan 6
  assert.ok(text.includes("(Christmas lights: Jan 6), whichever comes first"));
  assert.ok(text.includes("30 days before an event starts"));
  assert.ok(text.includes("runs for 30 days from payment"));
  assert.ok(!text.includes("Full run"), "the old plan is not described as for sale");
});

test("the Feature page tells a claimant they will be emailed when the claim is reviewed", () => {
  assert.ok(feature.includes("We will email you when it has been reviewed"));
  assert.ok(!feature.includes("You can come back to this page once it is approved"));
});

test("the Feature page refund FAQ and the Terms say the same thing", () => {
  const faq = feature.match(/<summary>Can I get a refund\?<\/summary><p>(.*?)<\/p>/)[1].replace(/<[^>]+>/g, "");
  for (const s of ["you get a full refund", "payments are non-refundable", "move your placement to another of your events or refund the unused time", "switches your Featured placement off", "payment dispute", "banner", "top of the list"]) assert.ok(faq.includes(s), "FAQ: " + s);
  for (const s of ["you get a full refund", "payments are non-refundable", "move your placement to another of your events or refund the unused time", "switches your placement off", "payment dispute"]) assert.ok(text.includes(s), "Terms: " + s);
});
