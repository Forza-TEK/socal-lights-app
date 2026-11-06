// Installer Sponsor placements: the season rule, the under-14-days rule, stacking, the booking horizon, profile gaps, and that prices live only in featured.js.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { SEASONS } from "../public/seasons.js";
import { INSTALLER_PLANS, PUBLIC_INSTALLER_PLANS } from "../functions/_lib/featured.js";
import { seasonOf, sponsorSeasonTable, sponsorWindow, applySponsor, profileGaps, sponsorProblem } from "../functions/_lib/sponsor.js";
import { onRequestGet as config } from "../functions/api/config.js";

test("prices: $50 banner and $75 banner + top, in cents, served to the browser from one place", async () => {
  assert.equal(INSTALLER_PLANS.banner.cents, 5000); assert.equal(INSTALLER_PLANS.banner_top.cents, 7500);
  assert.deepEqual(Object.keys(PUBLIC_INSTALLER_PLANS), ["banner", "banner_top"]);
  const c = await (await config({ env: {} })).json();
  assert.equal(c.installerPlans.banner.cents, 5000); assert.equal(c.installerPlans.banner_top.cents, 7500);
  assert.ok(!JSON.stringify(c).includes("min_cents") && !("installerFullPriceDays" in c) && !("installerUpgradeMinCents" in c), "no floors, no proration settings");
  assert.ok(c.installerSeason.from && c.installerSeason.to && c.installerSeason.season);
});

test("no page hardcodes the installer prices", () => {
  const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (["vendor", "tutorials", "img"].includes(n) ? [] : walk(p)) : [p]; });
  for (const f of walk("public").filter((p) => /\.(html|js)$/.test(p))) {
    const s = readFileSync(f, "utf8").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n"); // comments may name a price
    assert.ok(!/\$50\b|\$75\b/.test(s), `${f} hardcodes an installer price`);
  }
});

test("sponsor seasons follow the map windows, except Christmas ends Jan 6 and New Year's runs Jan 7 to Jan 31; seasons.js itself is unchanged", () => {
  // the map's windows are untouched: the map still defaults to New Year's from Dec 27
  assert.deepEqual(SEASONS.christmas.window, ["11-03", "12-26"]); assert.deepEqual(SEASONS.newyear.window, ["12-27", "01-31"]);
  assert.deepEqual(sponsorSeasonTable(), { newyear: ["01-07", "01-31"], valentines: ["02-01", "02-15"], spring: ["02-16", "05-15"], summer: ["05-16", "08-31"], halloween: ["09-01", "11-02"], christmas: ["11-03", "01-06"] });
  assert.deepEqual(seasonOf("2026-11-06"), { key: "christmas", label: SEASONS.christmas.label, start: "2026-11-03", end: "2027-01-06", days: 65 });
  // the year wraps: the end year comes from the start date, whether the purchase is in November, December or January
  for (const d of ["2026-11-03", "2026-12-26", "2026-12-27", "2026-12-31", "2027-01-01", "2027-01-06"]) assert.deepEqual([seasonOf(d).key, seasonOf(d).start, seasonOf(d).end], ["christmas", "2026-11-03", "2027-01-06"], d);
  for (const d of ["2027-11-03", "2027-12-31", "2028-01-06"]) assert.deepEqual([seasonOf(d).start, seasonOf(d).end], ["2027-11-03", "2028-01-06"], d);
  assert.deepEqual([seasonOf("2027-01-07").key, seasonOf("2027-01-07").start, seasonOf("2027-01-07").end, seasonOf("2027-01-07").days], ["newyear", "2027-01-07", "2027-01-31", 25]);
  assert.equal(seasonOf("2027-01-31").end, "2027-01-31");
  assert.equal(seasonOf("2027-02-01").key, "valentines"); assert.equal(seasonOf("2027-02-20").end, "2027-05-15");
  assert.equal(seasonOf("2027-09-01").end, "2027-11-02"); assert.equal(seasonOf("2026-11-02").end, "2026-11-02", "Nov 2 is the last day of Halloween");
  for (let d = Date.parse("2026-01-01"); d < Date.parse("2028-01-31"); d += 86400_000) { const y = new Date(d).toISOString().slice(0, 10), s = seasonOf(y); assert.ok(s.end >= y && s.start <= y, y + " is outside its own season"); }
});

test("a new placement runs from today to the end of the current season, at the plan's price", () => {
  const w = sponsorWindow("banner", {}, "2026-11-06");
  assert.deepEqual([w.from, w.to, w.running, w.cents, w.days, w.upgrade], ["2026-11-06", "2027-01-06", false, 5000, 62, false]);
  assert.equal(sponsorWindow("banner_top", {}, "2026-11-06").cents, 7500);
});

test("a purchase on any date from Nov 3 through Jan 6 ends Jan 6; Jan 7 ends Jan 31; the price is the same every day", () => {
  for (const d of ["2026-11-03", "2026-12-26", "2026-12-27", "2026-12-31", "2027-01-06"]) { const w = sponsorWindow("banner", {}, d); assert.deepEqual([w.to, w.cents], ["2027-01-06", 5000], d); assert.equal(sponsorWindow("banner_top", {}, d).cents, 7500); }
  const jan7 = sponsorWindow("banner", {}, "2027-01-07"); assert.deepEqual([jan7.to, jan7.cents, jan7.days], ["2027-01-31", 5000, 25]);
  for (const plan of ["banner", "banner_top"]) for (let d = Date.parse("2026-11-03"); d <= Date.parse("2027-01-06"); d += 86400_000) {
    const y = new Date(d).toISOString().slice(0, 10), w = sponsorWindow(plan, {}, y);
    assert.equal(w.cents, INSTALLER_PLANS[plan].cents, `${plan} on ${y}`); assert.equal(w.to, "2027-01-06");
  }
  const last = sponsorWindow("banner", {}, "2027-01-06"); assert.deepEqual([last.cents, last.days, last.to], [5000, 1, "2027-01-06"], "last day: full price, 1 day included");
  assert.equal(sponsorWindow("banner", {}, "2026-11-03").days, 65, "first day: all 65 days");
  assert.deepEqual([sponsorWindow("banner", {}, "2026-11-02").to, sponsorWindow("banner", {}, "2026-11-02").cents], ["2026-11-02", 5000], "Nov 2 is the last day of Halloween");
  assert.equal(sponsorWindow("banner", {}, "2027-01-20").cents, 5000);
});

test("renewing a running placement starts the day after it ends, at the full price of the next season, and never shortens it", () => {
  const inst = { banner_until: "2027-01-06", top_until: "" };
  const r = sponsorWindow("banner", inst, "2026-11-06");
  assert.deepEqual([r.from, r.to, r.running, r.booked_to, r.cents], ["2027-01-07", "2027-01-31", true, "2027-01-06", 5000]);
  assert.equal(applySponsor("banner", inst, "2026-11-06").banner_until, "2027-01-31");
  assert.ok(applySponsor("banner", { banner_until: "2030-01-01", top_until: "" }, "2026-11-06").banner_until >= "2030-01-01", "a hand-set later date is never shortened");
  const e = sponsorWindow("banner", { banner_until: "2026-10-01", top_until: "" }, "2026-11-06");
  assert.deepEqual([e.from, e.running], ["2026-11-06", false], "an expired placement is not running: it starts today");
});

test("at most one season ahead can be booked", () => {
  const ok = { status: "active", phone: "1", web: "", top_until: "" };
  assert.equal(sponsorProblem({ ...ok, banner_until: "" }, "banner", "2026-11-06"), "");
  assert.equal(sponsorProblem({ ...ok, banner_until: "2027-01-06" }, "banner", "2026-11-06"), "", "renewal for next season is allowed");
  assert.match(sponsorProblem({ ...ok, banner_until: "2027-01-31" }, "banner", "2026-11-06"), /already booked through 2027-01-31/);
});

test("upgrade: when the banner already runs to the season end, pay the difference between the two plans' prices (from INSTALLER_PLANS); the top card starts today and the banner stays", () => {
  const diff = INSTALLER_PLANS.banner_top.cents - INSTALLER_PLANS.banner.cents, inst = { banner_until: "2027-01-06", top_until: "" };
  const u = applySponsor("banner_top", inst, "2026-11-06");
  assert.deepEqual([u.from, u.top_until, u.banner_until, u.running, u.upgrade, u.cents], ["2026-11-06", "2027-01-06", "2027-01-06", false, true, diff]); assert.equal(diff, 2500);
  for (const d of ["2026-11-20", "2026-12-14", "2027-01-06"]) assert.equal(sponsorWindow("banner_top", inst, d).cents, diff, "the same difference on " + d);
  // a banner that ends sooner than the season is not "already covered": the full price of the new plan, and the banner is extended to match
  const shorter = applySponsor("banner_top", { banner_until: "2026-11-20", top_until: "" }, "2026-11-06"); assert.deepEqual([shorter.cents, shorter.upgrade, shorter.banner_until], [7500, false, "2027-01-06"]);
  const renew = applySponsor("banner_top", { banner_until: "2027-01-06", top_until: "2027-01-06" }, "2026-11-06"); assert.deepEqual([renew.top_until, renew.banner_until, renew.cents, renew.upgrade], ["2027-01-31", "2027-01-31", 7500, false]);
  assert.equal(applySponsor("banner", { banner_until: "", top_until: "2027-01-06" }, "2026-11-06").top_until, "2027-01-06", "a banner order leaves the top card alone");
});

test("profile gaps: active with a phone or website; areas are advice only", () => {
  assert.equal(profileGaps({ status: "active", phone: "", web: "", area: "" }).blocking[0].key, "contact");
  assert.equal(profileGaps({ status: "active", phone: "", web: "https://a.example", area: "" }).blocking.length, 0);
  assert.equal(profileGaps({ status: "active", phone: "626-555-0100", web: "", area: "" }).advice[0].key, "area");
  assert.equal(profileGaps({ status: "hidden", phone: "1", web: "", area: "x" }).blocking[0].key, "status");
  assert.equal(profileGaps({ status: "active", phone: "1", web: "", area: "Orange County" }).advice.length, 0);
});
