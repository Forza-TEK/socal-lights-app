// F-07: county comes from the city table, not from scanning the events table on every submit and edit.
import test from "node:test";
import assert from "node:assert/strict";
import { CITY } from "../public/cities.js";
import { CITY_COUNTY, countyOfCity, countyFor } from "../functions/_lib/citycounty.js";
import { makeDB } from "./_d1.mjs";

const COUNTIES = new Set(["Los Angeles", "Orange", "Riverside", "San Bernardino", "San Diego", "Santa Barbara", "Ventura"]);

test("every city in public/cities.js has a county, and every mapped city exists", () => {
  for (const c of Object.keys(CITY)) assert.ok(COUNTIES.has(CITY_COUNTY[c]), c + " has no county");
  for (const c of Object.keys(CITY_COUNTY)) assert.ok(CITY[c], c + " is in the county table but not in cities.js");
  assert.equal(countyOfCity("Irvine"), "Orange");
  assert.equal(countyOfCity("Needles"), "San Bernardino");
  assert.equal(countyOfCity("Atlantis"), null);
});

test("the map agrees with the county of the events already stored for each city", () => {
  const { raw } = makeDB();
  const rows = raw.prepare("SELECT city, county, COUNT(*) n FROM events GROUP BY city, county").all();
  const bad = rows.filter((r) => CITY_COUNTY[r.city] && CITY_COUNTY[r.city] !== r.county && r.n >= 2).map((r) => `${r.city}: map ${CITY_COUNTY[r.city]} vs events ${r.county} (${r.n})`);
  assert.deepEqual(bad, []);
});

test("countyFor reads no events for a listed city, and falls back to the nearest event for an unlisted one", async () => {
  let queries = 0;
  const env = { DB: { prepare: () => { queries++; return { all: async () => ({ results: [{ lat: 34, lng: -118, county: "Los Angeles" }, { lat: 33.7, lng: -117.8, county: "Orange" }] }) }; } } };
  assert.equal(await countyFor(env, "Irvine", 33.68, -117.82), "Orange");
  assert.equal(queries, 0, "no database read for a listed city");
  assert.equal(await countyFor(env, "Nowhere", 34.01, -118.01), "Los Angeles");
  assert.equal(queries, 1);
});
