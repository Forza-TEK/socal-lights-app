// Installer Sponsor placements: the season rule, the under-14-days rule, stacking, the booking horizon, profile gaps, and that prices live only in featured.js.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { SEASONS } from "../public/seasons.js";
import { INSTALLER_PLANS, PUBLIC_INSTALLER_PLANS, FULL_PRICE_DAYS, INSTALLER_MIN_CENTS } from "../functions/_lib/featured.js";
import { seasonOf, sponsorWindow, sponsorCents, applySponsor, profileGaps, sponsorProblem } from "../functions/_lib/sponsor.js";
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

test("proration: 14 or more days left (start day counts) is the full price; fewer is full x left / season days, whole dollars, floor $10", () => {
  assert.equal(FULL_PRICE_DAYS, 14); assert.equal(INSTALLER_MIN_CENTS, 1000);
  // Christmas season: Nov 3 to Dec 26 = 54 days
  const at = (d, plan = "banner") => sponsorWindow(plan, {}, d);
  assert.deepEqual([at("2026-12-13").days_left, at("2026-12-13").cents, at("2026-12-13").prorated], [14, 5000, false], "exactly 14 days: full price");
  assert.deepEqual([at("2026-12-14").days_left, at("2026-12-14").cents, at("2026-12-14").prorated], [13, 1200, true], "13 days: 50 x 13/54 = 12.04 -> $12");
  assert.equal(at("2026-12-14", "banner_top").cents, 1800, "75 x 13/54 = 18.06 -> $18");
  assert.equal(at("2026-12-14").to, "2026-12-26", "prorated placements still end on the season's last day, never roll to the next season");
  assert.equal(at("2026-12-15").cents, 1100, "12 days: 11.11 -> $11");
  assert.deepEqual([at("2026-12-18").days_left, at("2026-12-18").cents], [9, 1000], "9 days: 8.33 -> $8, raised to the $10 floor");
  assert.deepEqual([at("2026-12-25").days_left, at("2026-12-25").cents], [2, 1000]);
  assert.deepEqual([at("2026-12-26").days_left, at("2026-12-26").cents, at("2026-12-26").to], [1, 1000, "2026-12-26"], "the last day: 1 day left, the floor");
  assert.equal(sponsorCents("banner", 1, 54), 1000); assert.equal(sponsorCents("banner_top", 1, 54), 1000);
  assert.equal(sponsorCents("banner", 13, 15), 4300, "Valentine's (15 days): 13 left -> 43.33 -> $43");
  assert.equal(sponsorCents("banner", 14, 15), 5000); assert.equal(sponsorCents("banner", 54, 54), 5000);
  // season boundaries: the first day of a season is full price, the day before it belongs to the previous one
  assert.deepEqual([at("2026-11-03").to, at("2026-11-03").cents], ["2026-12-26", 5000]);
  assert.deepEqual([at("2026-11-02").to, at("2026-11-02").days_left, at("2026-11-02").cents], ["2026-11-02", 1, 1000], "Nov 2 is the last day of Halloween");
  assert.deepEqual([at("2026-12-27").to, at("2026-12-27").cents], ["2027-01-31", 5000]);
  assert.equal(at("2027-01-20").to, "2027-01-31"); assert.equal(at("2027-01-20").cents, 1700, "12 of 36 days left in New Year's: 50 x 12/36 = 16.67 -> $17");
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

test("upgrade: priced like a new banner + top for the days left (no credit), the top card starts today, the banner is left or extended to match", () => {
  const inst = { banner_until: "2026-12-26", top_until: "" };
  const u = applySponsor("banner_top", inst, "2026-11-06");
  assert.deepEqual([u.from, u.top_until, u.banner_until, u.running, u.cents], ["2026-11-06", "2026-12-26", "2026-12-26", false, 7500]);
  assert.equal(sponsorWindow("banner_top", inst, "2026-12-14").cents, 1800, "a mid-season upgrade is the prorated price of the new plan, not the difference");
  assert.equal(applySponsor("banner_top", { banner_until: "2026-11-20", top_until: "" }, "2026-11-06").banner_until, "2026-12-26", "extended to match");
  const renew = applySponsor("banner_top", { banner_until: "2026-12-26", top_until: "2026-12-26" }, "2026-11-06"); assert.deepEqual([renew.top_until, renew.banner_until], ["2027-01-31", "2027-01-31"]);
  assert.equal(applySponsor("banner", { banner_until: "", top_until: "2026-12-26" }, "2026-11-06").top_until, "2026-12-26", "a banner order leaves the top card alone");
});

test("profile gaps: active with a phone or website; areas are advice only", () => {
  assert.equal(profileGaps({ status: "active", phone: "", web: "", area: "" }).blocking[0].key, "contact");
  assert.equal(profileGaps({ status: "active", phone: "", web: "https://a.example", area: "" }).blocking.length, 0);
  assert.equal(profileGaps({ status: "active", phone: "626-555-0100", web: "", area: "" }).advice[0].key, "area");
  assert.equal(profileGaps({ status: "hidden", phone: "1", web: "", area: "x" }).blocking[0].key, "status");
  assert.equal(profileGaps({ status: "active", phone: "1", web: "", area: "Orange County" }).advice.length, 0);
});
