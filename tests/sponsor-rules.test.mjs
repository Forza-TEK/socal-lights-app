// Installer Sponsor placements: the season rule, the under-14-days rule, stacking, the booking horizon, profile gaps, and that prices live only in featured.js.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { SEASONS } from "../public/seasons.js";
import { INSTALLER_PLANS, PUBLIC_INSTALLER_PLANS, FULL_PRICE_DAYS, installerUpgradeMin, installerPrice } from "../functions/_lib/featured.js";
import { seasonOf, sponsorWindow, applySponsor, profileGaps, sponsorProblem } from "../functions/_lib/sponsor.js";
import { onRequestGet as config } from "../functions/api/config.js";

test("prices: $50 banner and $75 banner + top, in cents, served to the browser from one place", async () => {
  assert.equal(INSTALLER_PLANS.banner.cents, 5000); assert.equal(INSTALLER_PLANS.banner_top.cents, 7500);
  assert.deepEqual(Object.keys(PUBLIC_INSTALLER_PLANS), ["banner", "banner_top"]);
  const c = await (await config({ env: {} })).json();
  assert.equal(c.installerPlans.banner.cents, 5000); assert.equal(c.installerPlans.banner_top.cents, 7500); assert.equal(c.installerFullPriceDays, 14);
  assert.ok(c.installerSeason.from && c.installerSeason.to && c.installerSeason.season);
});

test("no page hardcodes the installer prices", () => {
  const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (["vendor", "tutorials", "img"].includes(n) ? [] : walk(p)) : [p]; });
  for (const f of walk("public").filter((p) => /\.(html|js)$/.test(p))) {
    const s = readFileSync(f, "utf8").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n"); // comments may name a price
    assert.ok(!/\$50\b|\$75\b/.test(s), `${f} hardcodes an installer price`);
  }
});

test("season end comes from the site's season windows", () => {
  const xmas = SEASONS.christmas.window; assert.deepEqual(xmas, ["11-03", "12-26"]);
  assert.deepEqual(seasonOf("2026-11-06"), { key: "christmas", label: SEASONS.christmas.label, start: "2026-11-03", end: "2026-12-26", days: 54 });
  assert.equal(seasonOf("2026-12-26").end, "2026-12-26");
  assert.equal(seasonOf("2026-12-27").key, "newyear"); assert.equal(seasonOf("2026-12-27").end, "2027-01-31", "a window that wraps the year end finishes next January");
  assert.equal(seasonOf("2027-01-10").end, "2027-01-31");
  assert.equal(seasonOf("2027-02-01").key, "valentines"); assert.equal(seasonOf("2027-02-20").end, "2027-05-15");
  assert.equal(seasonOf("2027-09-01").end, "2027-11-02");
  for (let d = Date.parse("2026-01-01"); d < Date.parse("2027-12-31"); d += 86400_000) { const y = new Date(d).toISOString().slice(0, 10), s = seasonOf(y); assert.ok(s.end >= y, y + " ends before it starts"); }
});

test("a new placement runs from today to the end of the current season, at the full price", () => {
  const w = sponsorWindow("banner", {}, "2026-11-06");
  assert.deepEqual([w.from, w.to, w.running, w.prorated, w.cents, w.days_left, w.season_days], ["2026-11-06", "2026-12-26", false, false, 5000, 51, 54]);
  assert.equal(sponsorWindow("banner_top", {}, "2026-11-06").cents, 7500);
  assert.deepEqual([seasonOf("2027-01-10").start, seasonOf("2027-01-10").days], ["2026-12-27", 36], "a window that wraps the year end counts from last December");
  assert.deepEqual([seasonOf("2026-12-30").start, seasonOf("2026-12-30").end], ["2026-12-27", "2027-01-31"]);
});

test("price (option C): full for days 1 to 14 of the season, then falling day by day to the $10 floor, never a cliff", () => {
  assert.equal(FULL_PRICE_DAYS, 14); assert.deepEqual([INSTALLER_PLANS.banner.min_cents, INSTALLER_PLANS.banner_top.min_cents, installerUpgradeMin()], [1000, 2500, 1500], "a floor per plan");
  // Christmas season: Nov 3 to Dec 26 = 54 days; day 14 is Nov 16 and has 41 days left
  const at = (d, plan = "banner") => sponsorWindow(plan, {}, d);
  const row = (d) => [at(d).day_of_season, at(d).days_left, at(d).cents / 100, at(d, "banner_top").cents / 100];
  assert.deepEqual(row("2026-11-03"), [1, 54, 50, 75], "day 1: full");
  assert.deepEqual(row("2026-11-16"), [14, 41, 50, 75], "day 14: the last full-price day");
  assert.deepEqual(row("2026-11-17"), [15, 40, 49, 73], "day 15: just below full: 50 x 40/41 = 48.78, 75 x 40/41 = 73.17");
  assert.deepEqual(row("2026-11-18"), [16, 39, 48, 71]);
  assert.deepEqual(row("2026-12-01"), [29, 26, 32, 48], "mid-season: 50 x 26/41 = 31.7");
  assert.deepEqual(row("2026-12-14"), [42, 13, 16, 25], "75 x 13/41 = 23.8 -> $24, raised to the $25 floor of that plan");
  assert.deepEqual(row("2026-12-01"), [29, 26, 32, 48]);
  assert.deepEqual(row("2026-12-24"), [52, 3, 10, 25], "the floors: Banner $10 (50 x 3/41 = 3.66), Banner and top $25 (75 x 3/41 = 5.5)");
  assert.deepEqual(row("2026-12-26"), [54, 1, 10, 25], "last day: each plan's floor, and it still ends on the season's last day");
  assert.equal(at("2026-12-13", "banner_top").cents, 2600, "the $75 plan reaches its floor on Dec 14 ($25): Dec 13 is $26"); assert.equal(at("2026-12-14", "banner_top").cents, 2500);
  assert.equal(at("2026-12-26").to, "2026-12-26"); assert.equal(at("2026-12-14").to, "2026-12-26", "never rolls into the next season");
  // monotonic: no day costs more than the day before, and day 15 is strictly below full
  for (const plan of ["banner", "banner_top"]) { let prev = Infinity; for (let d = Date.parse("2026-11-03"); d <= Date.parse("2026-12-26"); d += 86400_000) { const c = at(new Date(d).toISOString().slice(0, 10), plan).cents; assert.ok(c <= prev && c >= 1000, "price rises or dips under the floor"); prev = c; } }
  assert.ok(at("2026-11-17").cents < INSTALLER_PLANS.banner.cents && at("2026-11-17", "banner_top").cents < INSTALLER_PLANS.banner_top.cents);
  // the wording
  assert.equal(at("2026-11-16").label, "Full price: the first 14 days of a season cost $50.");
  assert.equal(at("2026-12-14").label, "Day 42 of 54: the season is 76% over, so this season costs $16 instead of $50.");
  assert.equal(at("2026-12-01").percent_over, 52);
  // a long season never rounds back up to full after day 14 (summer is 108 days)
  assert.equal(sponsorWindow("banner", {}, "2027-05-30").cents, 4900); assert.equal(sponsorWindow("banner_top", {}, "2027-05-30").cents, 7400);
  // a season shorter than 14 days is prorated over the whole season; an unknown start is the full price
  const short = installerPrice("banner", { start: "2027-02-01", end: "2027-02-10" }, "2027-02-06");
  assert.deepEqual([short.amount_cents, short.daysLeft, short.seasonDays], [2500, 5, 10], "50 x 5/10");
  assert.equal(installerPrice("banner", { start: "2027-02-01", end: "2027-02-10" }, "2027-02-08").amount_cents, 1500);
  assert.equal(installerPrice("banner", { end: "2027-02-10" }, "2027-02-08").amount_cents, 5000);
  // season boundaries: the first day of a season is full price, the day before it belongs to the previous one
  assert.deepEqual([at("2026-11-03").to, at("2026-11-03").cents], ["2026-12-26", 5000]);
  assert.deepEqual([at("2026-11-02").to, at("2026-11-02").cents, at("2026-11-02").day_of_season], ["2026-11-02", 1000, 63]);
  assert.deepEqual([at("2026-12-27").to, at("2026-12-27").cents, at("2026-12-27").day_of_season], ["2027-01-31", 5000, 1]);
  assert.equal(at("2027-01-09").cents, 5000, "day 14 of New Year's (Dec 27 start)"); assert.equal(at("2027-01-10").cents, 4800, "day 15 of 36: 50 x 22/23 = 47.8 -> $48");
});

test("renewing a running placement starts the day after it ends, at the full price of the next season, and never shortens it", () => {
  const inst = { banner_until: "2026-12-26", top_until: "" };
  const r = sponsorWindow("banner", inst, "2026-11-06");
  assert.deepEqual([r.from, r.to, r.running, r.booked_to, r.cents, r.prorated], ["2026-12-27", "2027-01-31", true, "2026-12-26", 5000, false]);
  assert.equal(applySponsor("banner", inst, "2026-11-06").banner_until, "2027-01-31");
  assert.ok(applySponsor("banner", { banner_until: "2030-01-01", top_until: "" }, "2026-11-06").banner_until >= "2030-01-01", "a hand-set later date is never shortened");
  const e = sponsorWindow("banner", { banner_until: "2026-10-01", top_until: "" }, "2026-11-06");
  assert.deepEqual([e.from, e.running], ["2026-11-06", false], "an expired placement is not running: it starts today");
});

test("at most one season ahead can be booked", () => {
  const ok = { status: "active", phone: "1", web: "", top_until: "" };
  assert.equal(sponsorProblem({ ...ok, banner_until: "" }, "banner", "2026-11-06"), "");
  assert.equal(sponsorProblem({ ...ok, banner_until: "2026-12-26" }, "banner", "2026-11-06"), "", "renewal for next season is allowed");
  assert.match(sponsorProblem({ ...ok, banner_until: "2027-01-31" }, "banner", "2026-11-06"), /already booked through 2027-01-31/);
});

test("upgrade: when the banner already runs to the season end, pay the difference between the two plans' prices today (floor $10); the top card starts today and the banner stays", () => {
  const inst = { banner_until: "2026-12-26", top_until: "" };
  const u = applySponsor("banner_top", inst, "2026-11-06");
  assert.deepEqual([u.from, u.top_until, u.banner_until, u.running, u.upgrade, u.cents], ["2026-11-06", "2026-12-26", "2026-12-26", false, true, 2500], "$75 - $50 in the first 14 days");
  assert.match(u.label, /^Upgrade: .*difference/);
  assert.equal(sponsorWindow("banner_top", inst, "2026-11-20").cents, 2300, "day 18: banner_top $68 minus banner $45");
  assert.equal(sponsorWindow("banner_top", inst, "2026-12-01").cents, 1600, "day 29: banner_top $48 minus banner $32");
  assert.equal(sponsorWindow("banner_top", inst, "2026-12-14").cents, 1500, "$25 - $16 = $9, raised to the upgrade minimum ($25 floor - $10 floor = $15)");
  assert.equal(sponsorWindow("banner_top", inst, "2026-12-26").cents, 1500, "last day: $25 - $10 = $15");
  assert.ok(sponsorWindow("banner_top", inst, "2026-11-06").cents <= 2500, "never above the full difference");
  // a banner that ends sooner than the season is not "already covered": the full price of the new plan for the days left, and the banner is extended to match
  const shorter = applySponsor("banner_top", { banner_until: "2026-11-20", top_until: "" }, "2026-11-06"); assert.deepEqual([shorter.cents, shorter.upgrade, shorter.banner_until], [7500, false, "2026-12-26"]);
  const renew = applySponsor("banner_top", { banner_until: "2026-12-26", top_until: "2026-12-26" }, "2026-11-06"); assert.deepEqual([renew.top_until, renew.banner_until, renew.cents, renew.upgrade], ["2027-01-31", "2027-01-31", 7500, false]);
  assert.equal(applySponsor("banner", { banner_until: "", top_until: "2026-12-26" }, "2026-11-06").top_until, "2026-12-26", "a banner order leaves the top card alone");
});

test("profile gaps: active with a phone or website; areas are advice only", () => {
  assert.equal(profileGaps({ status: "active", phone: "", web: "", area: "" }).blocking[0].key, "contact");
  assert.equal(profileGaps({ status: "active", phone: "", web: "https://a.example", area: "" }).blocking.length, 0);
  assert.equal(profileGaps({ status: "active", phone: "626-555-0100", web: "", area: "" }).advice[0].key, "area");
  assert.equal(profileGaps({ status: "hidden", phone: "1", web: "", area: "x" }).blocking[0].key, "status");
  assert.equal(profileGaps({ status: "active", phone: "1", web: "", area: "Orange County" }).advice.length, 0);
});
