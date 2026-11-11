// Data-quality rules shared by the migration validator and the sweep tools (audit 2026-11-11: DAT-01, DAT-03/04, DAT-06, DAT-07).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeHours, freeFlagProblem, imageProblem, isCityEvent, imageSize, sharedUrlKey } from "../scripts/event-rules.mjs";
import { parseCities, countCity, report, block } from "../scripts/coverage-report.mjs";

test("normalizeHours: one dash, one time style, one estimate phrase", () => {
  const cases = {
    "5pm - 9pm": "5pm–9pm", "5-9 PM": "5–9pm", "7:00 PM": "7pm", "7:30 PM": "7:30pm", "10:00 AM-3:00 PM": "10am–3pm", "10 a.m.-4 p.m.": "10am–4pm", "9 AM – 2 PM": "9am–2pm",
    "12:00-4:00 PM": "12–4pm", "Evenings, check site": "Evenings; check site", "Evening — check site": "Evening; check site", "6pm — check site": "6pm; check site",
    "Expected nightly after dusk in December – check site": "Expected nightly after dusk in December; check site", "Check site": "Check site",
    "Evenings with the boat parade, about 6:30 PM (check site), check site": "Evenings with the boat parade, about 6:30pm; check site",
    "Multiple performances; see site": "Multiple performances; check site", "See site for showtimes": "See site for showtimes", "Thu-Sun; check site": "Thu–Sun; check site",
    "Half 8:00 AM; 5K & 10K 8:30 AM": "Half 8am; 5K & 10K 8:30am", "Sat 9am-4pm, Sun 8am-2pm": "Sat 9am–4pm, Sun 8am–2pm", "": "",
  };
  for (const [a, b] of Object.entries(cases)) { assert.equal(normalizeHours(a), b, a); assert.equal(normalizeHours(b), b, "idempotent: " + b); }
});

test("freeFlagProblem: free=1 only when the price starts with Free", () => {
  assert.equal(freeFlagProblem(1, "Free"), ""); assert.equal(freeFlagProblem(1, "Free; parking $15"), ""); assert.equal(freeFlagProblem(0, "$20"), ""); assert.equal(freeFlagProblem(0, "Kids $5; adults free"), "");
  assert.match(freeFlagProblem(1, "Check listing"), /free=1/); assert.match(freeFlagProblem(1, "Mostly free"), /free=1/); assert.match(freeFlagProblem(0, "Free for adults; kids $5"), /free=0/); assert.match(freeFlagProblem(0, "Free"), /free=0/);
});

test("isCityEvent and imageProblem: a city or government event keeps its logo or seal, everyone else does not", () => {
  const poway = { name: "Poway's Christmas in the Park", venue: "Old Poway Park", blurb: "x", url: "https://www.poway.org/m/calendar/event/detail/6137", image: "https://www.poway.org/images/city-of-poway-logo.png" };
  const rec = { name: "Breakfast with Santa", venue: "Community Center", blurb: "Run by Tustin Parks and Recreation.", url: "https://example.org/x", image: "https://example.org/logo.png" };
  const gov = { name: "Tree lighting", venue: "Plaza", blurb: "x", url: "https://www.cityofexample.gov/events", image: "https://www.cityofexample.gov/files/Seal-logo.png" };
  const chamber = { name: "Spirit of San Pedro Parade", venue: "Pacific Ave", blurb: "San Pedro Chamber's parade.", url: "https://www.spholidayparade.com/", image: "https://static.example.com/parade-logo.png" };
  assert.equal(isCityEvent(rec), true); assert.equal(isCityEvent(gov), true); assert.equal(isCityEvent(chamber), false);
  assert.equal(imageProblem(rec), null); assert.equal(imageProblem(gov), null);
  assert.equal(imageProblem(chamber).level, "error");
  // a banner, a site default or a newsletter cover is never a photo of the event, city or not
  assert.equal(imageProblem({ ...rec, image: "https://example.org/mk-fb-default-2021.jpg" }).level, "error");
  assert.equal(imageProblem({ ...rec, image: "https://example.org/newsletter-december.jpg" }).level, "error");
  assert.equal(imageProblem({ ...rec, image: "https://www.endurancegrid.com/race/x-ca-1/opengraph-image?abc" }).level, "error");
  assert.equal(imageProblem({ ...rec, image: "https://example.org/winter-banner.png" }).level, "warn");
  assert.equal(imageProblem({ ...rec, image: "https://example.org/uploads/crowd-at-the-parade.jpg" }), null);
  assert.equal(imageProblem({ ...rec, image: "https://example.org/uploads/lights-300x200.jpg" }).level, "warn");
  assert.equal(imageProblem({ ...rec, image: "" }), null);
});

test("imageSize reads PNG, JPEG, GIF and WebP headers", () => {
  const png = new Uint8Array(33); png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0); png.set([0, 0, 0x04, 0xb0], 16); png.set([0, 0, 0x02, 0x58], 20);
  assert.deepEqual(imageSize(png), { w: 1200, h: 600 });
  const jpg = new Uint8Array(20); jpg.set([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, 0x01, 0xe0, 0x02, 0x80], 0);
  assert.deepEqual(imageSize(jpg), { w: 640, h: 480 });
  assert.equal(imageSize(new Uint8Array([1, 2, 3])), null);
});

test("sharedUrlKey ignores the fragment and the trailing slash", () => {
  assert.equal(sharedUrlKey("https://Example.org/a/#x"), sharedUrlKey("https://example.org/a"));
});

const DOC = readFileSync(new URL("../docs/coverage-cities.md", import.meta.url), "utf8");
test("coverage-report: the city names come from the numbered groups of docs/coverage-cities.md", () => {
  const cities = parseCities(DOC), names = cities.map((c) => c.name);
  assert.ok(cities.length > 250, String(cities.length));
  for (const n of ["Los Angeles", "Beverly Hills", "Azusa", "Port Hueneme", "Guadalupe", "Blythe", "Santa Clarita"]) assert.ok(names.includes(n), n);
  assert.deepEqual(cities.find((c) => c.name === "Los Angeles").aliases.slice(0, 2), ["Downtown", "Hollywood"]);
  assert.ok(!names.some((n) => /region-wide|county-wide/i.test(n)), "group 21 is not a city");
});

test("coverage-report: counts upcoming events by city or address, reports expected rows that already started, and writes a block", () => {
  const ev = [
    { id: "a", city: "Azusa", a: "1 Main St, Azusa, CA 91702", e: "2026-12-20", s: "2026-12-01", st: "c", t: "tree", h: "6pm", p: "Free", free: true, u: "https://x.org/1", c: "Los Angeles", img: "" },
    { id: "b", city: "Glendora", a: "2 Foothill Blvd, Azusa, CA 91702", e: "2026-12-20", s: "2026-11-01", st: "e", t: "drive", h: "Evenings; check site", p: "$5", free: true, u: "https://x.org/2", c: "Los Angeles", img: "" },
    { id: "c", city: "Azusa", a: "3 Main St, Azusa, CA 91702", e: "2026-11-01", s: "2026-10-30", st: "e", t: "tree", h: "6pm", p: "Free", free: true, u: "https://x.org/3", c: "Los Angeles", img: "" },
  ];
  const az = { name: "Azusa", aliases: [], group: 4 }, bd = { name: "Bradbury", aliases: [], group: 3 };
  assert.equal(countCity(ev.filter((e) => e.e >= "2026-11-11"), az), 2);
  const r = report(ev, [az, bd], "2026-11-11");
  assert.deepEqual(r.zero.map((c) => c.name), ["Bradbury"]); assert.equal(r.upcoming, 2); assert.equal(r.expected, 1);
  assert.deepEqual(r.expectedStarted, ["b"]); assert.deepEqual(r.expectedEnded, ["c"]); assert.deepEqual(r.freeMismatch, ["b"]);
  assert.match(block(r), /\*\*0 events \(1\):\*\* Bradbury \(group 3\)/);
});

test("docs/coverage-cities.md has exactly one generated block", () => {
  assert.equal(DOC.split("<!-- coverage:start -->").length, 2); assert.equal(DOC.split("<!-- coverage:end -->").length, 2);
});
