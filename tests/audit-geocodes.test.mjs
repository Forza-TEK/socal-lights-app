// F-24: the read-only geocode audit script finds city-center pins, far pins and shared points.
import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { auditGeocodes, readEvents, kmBetween } from "../scripts/audit-geocodes.mjs";

const CITY = { Irvine: [33.684, -117.826], Pasadena: [34.147, -118.144] };
const ev = (id, city, lat, lng, venue = id) => ({ id, name: "E " + id, city, lat, lng, venue, address: "" });

test("F-24: city-center, far and shared pins are reported; good pins are not", () => {
  const rows = [
    ev("good", "Irvine", 33.69, -117.83),
    ev("center", "Irvine", 33.6843, -117.8258),
    ev("far", "Pasadena", 33.684, -117.826),       // an Irvine point labelled Pasadena: about 55 km
    ev("nocoord", "Irvine", 0, 0),
    ev("nocity", "Atlantis", 33.5, -117.5),
    ...Array.from({ length: 7 }, (_, i) => ev("s" + i, "Irvine", 33.7, -117.8, "Venue " + i)),       // 7 venues on one point: shared
    ...Array.from({ length: 3 }, (_, i) => ev("t" + i, "Irvine", 33.71, -117.81, "Hall")),            // many events, one venue: fine
  ];
  const r = auditGeocodes(rows, CITY);
  assert.deepEqual(r.center.map((x) => x.id), ["center"]);
  assert.deepEqual(r.far.map((x) => x.id), ["far"]); assert.ok(r.far[0].km > 50);
  assert.equal(r.shared.length, 1); assert.equal(r.shared[0].venues, 7);
  assert.deepEqual(r.unknown.map((x) => x.id), ["nocity"]);
  assert.equal(r.skipped, 1);
  assert.ok(Math.abs(kmBetween([33.684, -117.826], [34.147, -118.144]) - 59) < 3);
  assert.equal(auditGeocodes(rows, CITY, { shared: 7 }).shared.length, 0, "the shared limit is more than N venues");
  assert.equal(auditGeocodes(rows, CITY, { km: 100 }).far.length, 0);
});

test("F-24: it reads a JSON export (array, or wrangler's [{results}]) and prints a report; it never writes the input", async () => {
  const dir = mkdtempSync(join(tmpdir(), "geo-")), rows = [ev("center", "Irvine", 33.684, -117.826), ev("good", "Pasadena", 34.15, -118.14)];
  writeFileSync(join(dir, "a.json"), JSON.stringify(rows));
  writeFileSync(join(dir, "b.json"), JSON.stringify([{ results: rows, success: true }]));
  assert.equal((await readEvents({ json: join(dir, "a.json") })).length, 2);
  assert.equal((await readEvents({ json: join(dir, "b.json") })).length, 2);
  const out = execFileSync(process.execPath, ["--no-warnings", "scripts/audit-geocodes.mjs", "--json", join(dir, "b.json")], { encoding: "utf8" });
  assert.match(out, /2 events with a pin checked/); assert.match(out, /At a city center \(1\)/); assert.match(out, /center {2}Irvine/);
});
