// Pure browser-side logic that is already an ES module with no DOM dependency (public/norm.js, seasons.js, rules.js, sponsor-plans.js, feature-plans.js), tested in Node.
// Most of public/app.js is NOT covered: it has no exports and runs against the DOM (see docs/testing.md for the list).
import test from "node:test";
import assert from "node:assert/strict";
import { normPhone, fmtPhone, telHref, tidy, normEmailText, looksEmail, normZip, normUrl, normName, normStreet, normText, normRadio } from "../public/norm.js";
import { SEASONS, SEASON_KEYS, defaultSeason, seasonsFrom, seasonStarts, phaseFor } from "../public/seasons.js";
import { rulesDefault } from "../public/rules.js";
import { money, dayWord, SPONSOR_KEYS } from "../public/sponsor-plans.js";
import { planStatus, planWindow, eventEligibility, plusDays, PLAN_KEYS } from "../public/feature-plans.js";
import { PLANS, OPEN_DAYS, applyPlan, eventPlanProblem } from "../functions/_lib/featured.js";
import * as serverFields from "../functions/_lib/fields.js";

test("norm: phone numbers", () => {
  assert.equal(normPhone("310.356.9577").value, "(310) 356-9577");
  assert.equal(normPhone("+1 (310) 356-9577 ext 12").value, "(310) 356-9577 x12");
  assert.equal(normPhone("1-310-356-9577 x5").ext, "5");
  for (const bad of ["", "   ", null, "12345", "0103569577", "1103569577", "1111111111", "310-356-957", "abc"]) assert.equal(normPhone(bad), null, String(bad));
  assert.equal(fmtPhone("3103569577"), "(310) 356-9577"); assert.equal(fmtPhone("call us"), "call us");
  assert.equal(telHref("(310) 356-9577 x9"), "tel:+13103569577;ext=9"); assert.equal(telHref("nope"), "");
});
test("norm: text, email, zip, url, radio", () => {
  assert.equal(tidy("  a \t b\n\u0001c  "), "a b c");
  assert.equal(normEmailText(" Foo @Example.COM "), "foo@example.com");
  assert.ok(looksEmail("a@b.co")); assert.ok(!looksEmail("a@b")); assert.ok(!looksEmail("a b@c.com"));
  assert.equal(normZip(" 91101-1234 "), "91101"); assert.equal(normZip("9110"), ""); assert.equal(normZip("911011234"), "91101");
  assert.equal(normUrl("Example.COM/path"), "https://example.com/path"); assert.equal(normUrl("http://a.org"), "http://a.org/");
  for (const bad of ["", "javascript:alert(1)", "ftp://a.org", "not a url", "localhost", "a..b"]) assert.equal(normUrl(bad), "", bad);
  assert.equal(normRadio("88.1fm"), "88.1 FM"); assert.equal(normRadio("710 am"), "710 AM"); assert.equal(normRadio("Kiss"), "Kiss");
  assert.equal(normText("a  b \n\n c\u0000"), "a b\nc");
});
test("norm: names and streets", () => {
  assert.equal(normName("MAPLE STREET HOA"), "Maple Street HOA"); assert.equal(normName("lights of the valley"), "Lights of the Valley"); assert.equal(normName("McDonald Lights"), "McDonald Lights", "mixed case is left alone"); assert.equal(normName("ab"), "ab");
  assert.equal(normStreet("123 MAIN STREET"), "123 Main St"); assert.equal(normStreet("45 oak avenue apt 4"), "45 Oak Ave Apt 4"); assert.equal(normStreet("9 elm drive."), "9 Elm Dr"); assert.equal(normStreet(""), "");
  assert.equal(normStreet("12 N Maple Rd"), "12 N Maple Rd");
});
test("the server's field cleaning is the same code as the browser's (one set of rules)", () => {
  for (const k of ["normName", "normStreet", "normZip", "normText", "tidy", "normEmailText", "normRadio"]) assert.equal(typeof serverFields[k], "function", k);
  assert.equal(serverFields.normName("MAPLE STREET HOA"), normName("MAPLE STREET HOA")); assert.equal(serverFields.phoneField("3103569577").value, "(310) 356-9577");
  assert.match(serverFields.phoneField("12").error, /10-digit/); assert.deepEqual(serverFields.phoneField(""), { value: "" });
});

test("seasons: every date of the year has a default season; windows wrap the new year; the next season is chosen between windows", () => {
  const dates = []; for (let d = Date.parse("2026-01-01T12:00:00Z"); d < Date.parse("2027-01-01T12:00:00Z"); d += 86400_000) dates.push(new Date(d).toISOString().slice(0, 10));
  for (const d of dates) assert.ok(SEASONS[defaultSeason(d)], d);
  assert.equal(defaultSeason("2026-11-03"), "christmas"); assert.equal(defaultSeason("2026-12-26"), "christmas"); assert.equal(defaultSeason("2026-12-27"), "newyear"); assert.equal(defaultSeason("2027-01-31"), "newyear");
  assert.equal(defaultSeason("2026-02-01"), "valentines"); assert.equal(defaultSeason("2026-11-02"), "halloween"); assert.equal(defaultSeason("2026-08-31"), "summer");
  assert.equal(seasonsFrom("christmas")[0], "christmas"); assert.equal(seasonsFrom("christmas").length, SEASON_KEYS.length);
  assert.equal(typeof seasonStarts("christmas", "2026-11-06"), "string"); assert.ok(phaseFor("christmas", "2026-11-06"));
  for (const k of SEASON_KEYS) { const S = SEASONS[k]; assert.ok(Object.keys(S.types).length && S.label && S.window.length === 2, k); }
});
test("rules text: includes the contest facts the organizer chose", () => {
  const t = rulesDefault({ name: "Maple Showdown", org: "Maple HOA", city: "Pasadena", closes: "2026-12-10", vs: "2026-12-11", ve: "2026-12-20", oneWin: true });
  assert.match(t, /Maple Showdown/); assert.match(t, /Maple HOA/); assert.ok(t.length > 200);
  assert.notEqual(rulesDefault({ name: "A", org: "B", city: "C", closes: "2026-12-10", vs: "2026-12-11", ve: "2026-12-20", oneWin: false }), t, "the one-win option changes the rules");
});
test("sponsor plan helpers", () => {
  assert.equal(money(2500), "$25"); assert.equal(money(1050), "$10.50"); assert.equal(money(0), "$0");
  assert.equal(dayWord(1), "1 day"); assert.equal(dayWord(30), "30 days"); assert.deepEqual(SPONSOR_KEYS, ["banner", "banner_top"]);
});

// ---- the page and checkout must agree on who can buy which Featured plan and what it gives (client planStatus/planWindow vs server eventPlanProblem/applyPlan) ----
test("feature plans: the page's plan status matches the server's checkout rule on a grid of events and days", () => {
  const today = "2026-11-10", mism = [];
  const starts = [-40, -5, 0, 5, 29, 30, 31, 45], lens = [0, 2, 5, 6, 7, 30, 31, 60, 120];
  for (const s of starts) for (const l of lens) for (const k of PLAN_KEYS) {
    const ev = { start_date: plusDays(today, s), end_date: plusDays(today, s + l) };
    if (ev.end_date < today) continue; // ended events are refused earlier in checkout, and the page says "ended"
    const page = planStatus(k, { start: ev.start_date, end: ev.end_date }, PLANS, OPEN_DAYS, today).ok, server = eventPlanProblem(ev, k, today) === "";
    if (page !== server) mism.push(`${k} start ${s} len ${l}: page ${page}, server ${server}`);
  }
  assert.deepEqual(mism, []);
});
test("feature plans: the dates the page promises equal the dates the server applies", () => {
  const today = "2026-11-10", mism = [];
  for (const s of [-20, 0, 10, 29]) for (const l of [0, 3, 10, 29, 31, 45, 80, 200]) for (const k of PLAN_KEYS) {
    const ev = { start_date: plusDays(today, s), end_date: plusDays(today, s + l) };
    if (ev.end_date < today || eventPlanProblem(ev, k, today)) continue;
    const w = planWindow(k, { start: ev.start_date, end: ev.end_date }, PLANS, today), a = applyPlan({ ...ev, featured: 0, featured_until: null }, k, today);
    if (w.until !== a.featured_until) mism.push(`${k} start ${s} len ${l}: page ${w.until}, server ${a.featured_until}`);
  }
  assert.deepEqual(mism, []);
});
test("feature plans: eligibility reasons for events that cannot be featured", () => {
  const today = "2026-11-10";
  assert.equal(eventEligibility({ state: "cancelled", start: "2026-12-01", end: "2026-12-02" }, PLANS, 30, today).ok, false);
  assert.match(eventEligibility({ state: "live", start: plusDays(today, 90), end: plusDays(today, 91) }, PLANS, 30, today).reason, /opens 30 days before/);
  assert.match(eventEligibility({ state: "live", start: plusDays(today, -9), end: plusDays(today, -8) }, PLANS, 30, today).reason, /ended/);
  const ok = eventEligibility({ state: "live", start: plusDays(today, 5), end: plusDays(today, 9) }, PLANS, 30, today); assert.equal(ok.ok, true); assert.deepEqual(ok.plans, ["pin", "top"], "a 5-day event cannot buy the 31-day Full run");
});
