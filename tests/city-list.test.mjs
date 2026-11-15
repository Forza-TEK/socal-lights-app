// The city filter and POST /api/intake/events both accept a city only when it is an exact key of public/cities.js.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CITY } from "../public/cities.js";
import { checkFields } from "../functions/_lib/intake.js";
import { onRequest as intake } from "../functions/api/intake/events.js";
import { parseCities } from "../scripts/coverage-report.mjs";
import { newEnv, freezeNow, addEvent } from "./_pay.mjs";

// Wikipedia title coordinates, rounded to 3 decimal places (the precision used by almost every center already in CITY).
const ADDED = [
  ["Bradbury", [34.149, -117.974], "Los Angeles"],
  ["Hidden Hills", [34.168, -118.661], "Los Angeles"],
  ["La Habra Heights", [33.964, -117.953], "Los Angeles"],
  ["Rolling Hills", [33.759, -118.342], "Los Angeles"],
  ["Vernon", [34.001, -118.211], "Los Angeles"],
  ["Westlake Village", [34.142, -118.819], "Los Angeles"],
  ["Canyon Lake", [33.684, -117.256], "Riverside"],
  ["Loma Linda", [34.048, -117.251], "San Bernardino"],
  ["Needles", [34.848, -114.614], "San Bernardino"],
  ["Guadalupe", [34.966, -120.573], "Santa Barbara"],
];

const KEY = "test-intake-key-0123456789abcdef";
const TODAY = "2026-11-15";

test("the ten incorporated cities are exact keys, at the Wikipedia centers, and nothing already listed was renamed", () => {
  assert.equal(Object.keys(CITY).length, 263);
  for (const [name, ll] of ADDED) assert.deepEqual(CITY[name], ll, name);
  assert.deepEqual(CITY["Rolling Hills Estates"], [33.775, -118.373]);
  assert.deepEqual(CITY["La Habra"], [33.929, -117.947]);
  assert.deepEqual(CITY["Los Angeles"], [34.052, -118.244]);
  assert.equal(CITY["La Habra Hts"], undefined);
  assert.equal(CITY["Westlake"], undefined);
});

test("the sweep groups name Rolling Hills as its own city, beside Rolling Hills Estates", () => {
  const names = parseCities(readFileSync(new URL("../docs/coverage-cities.md", import.meta.url), "utf8")).map((c) => c.name);
  assert.ok(names.includes("Rolling Hills"));
  assert.ok(names.includes("Rolling Hills Estates"));
  for (const [name] of ADDED) assert.ok(names.includes(name), name);
});

const row = (city) => ({
  name: city + " Tree Lighting", city, season: "christmas", type: "tree", start: "2026-12-06", end: "2026-12-06", hours: "5pm–7pm", free: true, price: "Free",
  blurb: "The city lights its tree in the park and the public is welcome to come.", url: "https://example.org/lights/" + encodeURIComponent(city), venue: "City Park",
  address: "100 Main St, " + city + ", CA 92354", shows: ["date", "time", "place"], evidence: "Tree lighting December 6, 5 to 7 pm, at City Park.", seen: TODAY,
});

test("checkFields accepts each new city and still rejects a name that is not an exact key", () => {
  for (const [name] of ADDED) {
    const c = checkFields(row(name), TODAY);
    assert.ok(c.row, name + ": " + (c.problems || []).join("; "));
    assert.equal(c.row.city, name);
  }
  const bad = checkFields(row("La Habra Hts"), TODAY);
  assert.ok(bad.problems.some((p) => /not one of our cities/.test(p)));
});

test("POST /api/intake/events publishes a row in each new city", async () => {
  const undo = freezeNow("2026-11-15T20:00:00Z");
  const real = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const q = decodeURIComponent(String(url));
    const hit = [...ADDED].sort((a, b) => b[0].length - a[0].length).find(([name]) => q.includes(name));
    const [lat, lng] = hit ? hit[1] : [34, -118];
    return new Response(JSON.stringify({ result: { addressMatches: [{ matchedAddress: "X", coordinates: { x: lng, y: lat } }] } }));
  };
  try {
    const { env, raw } = newEnv({ GROK_INTAKE_KEY: KEY });
    for (const [name, ll, county] of ADDED) addEvent(raw, "seed-" + name.toLowerCase().replace(/[^a-z]+/g, "-"), { name: "Seed", county, city: name, lat: ll[0], lng: ll[1] });
    const send = (rows) => intake({ request: new Request("https://socallights.app/api/intake/events", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + KEY }, body: JSON.stringify({ rows }) }), env }).then(async (r) => ({ status: r.status, body: await r.json() }));
    const a = await send(ADDED.slice(0, 8).map(([name]) => row(name)));
    const b = await send(ADDED.slice(8).map(([name]) => row(name)));
    assert.equal(a.status, 200); assert.equal(b.status, 200);
    assert.equal(a.body.published, 8); assert.equal(b.body.published, 2);
    for (const [name, , county] of ADDED) {
      const ev = raw.prepare("SELECT county, city, status FROM events WHERE name = ?").get(name + " Tree Lighting");
      assert.deepEqual({ ...ev }, { county, city: name, status: "confirmed" });
    }
  } finally { undo(); globalThis.fetch = real; }
});
