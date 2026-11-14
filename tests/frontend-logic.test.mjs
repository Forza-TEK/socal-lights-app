// Pure browser-side logic that is already an ES module with no DOM dependency (public/norm.js, seasons.js, rules.js, sponsor-plans.js, feature-plans.js), tested in Node.
// Most of public/app.js is NOT covered: it has no exports and runs against the DOM (see docs/testing.md for the list).
import test from "node:test";
import assert from "node:assert/strict";
import { normPhone, fmtPhone, telHref, tidy, normEmailText, looksEmail, normZip, normUrl, normName, normStreet, normText, normRadio } from "../public/norm.js";
import { SEASONS, SEASON_KEYS, defaultSeason, seasonsFrom, seasonStarts, phaseFor } from "../public/seasons.js";
import { rulesDefault } from "../public/rules.js";
import { money, dayWord, SPONSOR_KEYS } from "../public/sponsor-plans.js";
import { planStatus, planWindow, eventEligibility, plusDays, EVENT_KEYS, quoteLine } from "../public/feature-plans.js";
import { PLANS, EVENT_PLANS, OPEN_DAYS, eventQuote } from "../functions/_lib/featured.js";
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
  assert.equal(dayWord(1), "1 day"); assert.equal(dayWord(30), "30 days"); assert.deepEqual(SPONSOR_KEYS, ["banner", "top", "banner_top"]);
});

// ---- the page and checkout must agree on who can buy which event plan and what it gives: the page reads the server's quotes (eventQuote), it holds no rule of its own ----
test("feature plans: eligibility follows the server's quotes on a grid of events and days; the dates the page shows are the quote's", () => {
  const today = "2026-11-10", mism = [];
  const starts = [-40, -5, 0, 5, 29, 30, 31, 45], lens = [0, 2, 5, 6, 7, 30, 31, 60, 120];
  for (const s of starts) for (const l of lens) {
    const ev = { start_date: plusDays(today, s), end_date: plusDays(today, s + l) };
    if (ev.end_date < today) continue; // ended events are refused earlier in checkout, and the page says "ended"
    const quotes = Object.fromEntries(EVENT_KEYS.map((k) => [k, eventQuote(ev, k, today)]));
    const el = eventEligibility({ state: "live" }, quotes);
    for (const k of EVENT_KEYS) {
      if (el.plans.includes(k) !== (quotes[k].problem === "")) mism.push(`${k} start ${s} len ${l}`);
      if (!quotes[k].problem) { // the placement ends on the event's last day or the season's last day, whichever comes first; never before today
        if (quotes[k].to > ev.end_date || quotes[k].to < today || (quotes[k].to < ev.end_date && quotes[k].to !== quotes[k].season_end)) mism.push(`${k} start ${s} len ${l}: ends ${quotes[k].to}`);
        if (quoteLine(quotes[k], money).ends.length < 6) mism.push("no end date shown");
      }
    }
  }
  assert.deepEqual(mism, []);
});
test("feature plans: the home plans (pin $10, top $15, 30 days) are unchanged and still shown by planWindow", () => {
  const today = "2026-11-10";
  assert.deepEqual([PLANS.pin.cents, PLANS.top.cents, PLANS.pin.days, PLANS.top.days], [1000, 1500, 30, 30]);
  assert.equal(planWindow("pin", {}, PLANS, today).until, plusDays(today, 30)); assert.equal(planStatus("top", { home: true }, PLANS, 30, today).ok, true);
});
test("feature plans: eligibility reasons for events that cannot be featured", () => {
  const today = "2026-11-10", qs = (s, e) => Object.fromEntries(EVENT_KEYS.map((k) => [k, eventQuote({ start_date: plusDays(today, s), end_date: plusDays(today, e) }, k, today)]));
  assert.equal(eventEligibility({ state: "cancelled" }, qs(20, 21)).ok, false);
  assert.match(eventEligibility({ state: "live" }, qs(90, 91)).reason, /opens 30 days before/);
  assert.match(eventEligibility({ state: "live" }, qs(-9, -8)).reason, /ended/);
  const ok = eventEligibility({ state: "live" }, qs(5, 9)); assert.equal(ok.ok, true); assert.deepEqual(ok.plans, ["ev_pin", "ev_banner", "ev_top", "ev_all"]);
});

test("Christmas has a Nativity type (Nativity & drive-thru nativity) that shows as a filter, has a short label and a photo fallback", async () => {
  const { SEASONS, TYPE_SHORT } = await import("../public/seasons.js");
  assert.match(SEASONS.christmas.types.nativity, /nativity/i); assert.match(SEASONS.christmas.types.nativity, /drive-thru/i); assert.equal(TYPE_SHORT.nativity, "Nativity");
  const { readFileSync } = await import("node:fs");
  
  assert.match(readFileSync("migrations/0246_nativity_type.sql", "utf8"), /type = 'nativity'/);
});

test("every stock photo listed in stock.js has its file, and nativity has its own photos (with a credit each)", async () => {
  const { STOCK } = await import("../public/stock.js"); const { existsSync } = await import("node:fs");
  for (const [k, list] of Object.entries(STOCK)) list.forEach((p, i) => { assert.ok(existsSync(`public/img/stock/${k}-${i + 1}.jpg`), `${k}-${i + 1}.jpg exists`); assert.ok(p.by && p.lic && /^https:\/\//.test(p.src), `${k}-${i + 1} has a credit`); });
  assert.ok(STOCK.nativity.length >= 3);
  assert.doesNotMatch((await import("node:fs")).readFileSync("public/app.js", "utf8"), /nativity: "tree"/, "nativity no longer borrows the tree-lighting photo");
});
