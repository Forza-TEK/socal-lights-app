// PAY-12: prices that were replaced must not come back in anything a visitor, buyer or the assistant can read. The old contest passes were $50 / $75 / $100 with a free first contest;
// the old event plans were $10 / $15 / $25. Current prices live only in functions/_lib/passes.js, partner.js, featured.js and are served by /api/config.
// Docs and migration history are not scanned: they may mention the old numbers when they say they are superseded.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SKIP = new Set(["vendor", "img", "node_modules"]);
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (SKIP.has(n) ? [] : walk(p)) : [p]; });
const files = [...walk("public"), ...walk("functions")].filter((p) => /\.(html|js|vtt|json|txt|md)$/.test(p));

const OLD = [
  [/\$50\s*(?:\/|,|and|or)\s*\$75\s*(?:\/|,|and|or)\s*\$100/i, "the old $50 / $75 / $100 passes"],
  [/\$10\s*(?:\/|,|and|or)\s*\$15\s*(?:\/|,|and|or)\s*\$25/i, "the old $10 / $15 / $25 event plans"],
  [/first contest[^.\n]{0,60}\bis free\b|first contest is free|free first contest|your first contest is free|one free contest|1 contest per 12 months/i, "a free first contest"],
  [/Top of the list \(\$75\)/, "a wrong Top of the list price"],
];

test("no replaced price or 'first contest is free' in user-facing files", () => {
  const hits = [];
  for (const f of files) {
    const s = readFileSync(f, "utf8");
    for (const [re, why] of OLD) if (re.test(s)) hits.push(`${f}: ${why}`);
  }
  assert.deepEqual(hits, [], "old prices found:\n  " + hits.join("\n  "));
});

test("the scan itself catches the old wording", () => {
  for (const sample of ["Passes cost $50 / $75 / $100.", "Plans: $10 / $15 / $25", "Your first contest is free.", "free first contest", "Top of the list ($75)"])
    assert.ok(OLD.some(([re]) => re.test(sample)), sample);
});
