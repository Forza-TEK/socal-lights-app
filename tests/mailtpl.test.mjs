// Run with: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { renderTemplate, safeText } from "../functions/_lib/mailtpl.js";
import { cleanNote } from "../functions/_lib/sendlimit.js";

const env = { DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) } }; // no saved wording: the defaults are used
const evil = "[Verify your account](https://evil.example/login) ![x](https://evil.example/a.png) <img src=x onerror=alert(1)> `code` https://evil.example/p www.evil.example \"quoted\"";
const liveLinks = (html) => [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map((m) => m[1]).filter((u) => !u.startsWith("https://socallights.app") && !u.startsWith("mailto:info@socallights.app"));

test("a malicious contest name, organizer and note cannot make links, images or tags", async () => {
  const m = await renderTemplate(env, "contest_invite", { contest: evil, org: evil, city: evil, note: evil, contact: evil, link: "https://socallights.app/c/x" });
  assert.deepEqual(liveLinks(m.html), []);
  assert.ok(!/<img[^>]*evil/i.test(m.html) && !/<img src=x/.test(m.html));
  assert.ok(!m.html.includes("evil.example"));
  assert.ok(!m.text.includes("evil.example"));
  assert.ok(!/onerror=alert\(1\)>/.test(m.html) || m.html.includes("&lt;img"));
});

test("a person's name in other emails is neutralized the same way", async () => {
  for (const [id, vars] of [["entry_approved", { name: evil, contest: evil, vote_start: "Dec 1", vote_end: "Dec 20", link: "https://socallights.app/c/x" }], ["house_declined", { name: evil, reason: evil, link: "https://socallights.app/x" }], ["coorg_invite", { contest: evil, org: evil, link: "https://socallights.app/c/x/manage" }]]) {
    const m = await renderTemplate(env, id, vars);
    assert.deepEqual(liveLinks(m.html), [], id);
    assert.ok(!m.html.includes("evil.example"), id);
  }
});

test("newlines in a value cannot start a new block (title, quote, button)", async () => {
  const m = await renderTemplate(env, "contest_invite", { contest: "A\n\n# Fake title\n\n[Click](https://evil.example)", org: "B", city: "C", note: "x\n\n> quote\n\n@ 123456", contact: "", link: "https://socallights.app/c/x" });
  assert.ok(!m.html.includes("evil.example"));
  assert.equal((m.html.match(/<h1/g) || []).length, 1);          // still one title: the injected "# Fake title" stayed inside it as plain text
  assert.equal((m.html.match(/border-left:4px solid/g) || []).length, 1); // one quote box (the note), not two
  assert.ok(!m.html.includes("letter-spacing:.28em"));              // no big-code box
});

test("the site's own links and bold text still work", async () => {
  const m = await renderTemplate(env, "contest_invite", { contest: "Maple Street", org: "Maple Neighbors", city: "Irvine", note: "Cocoa at 6.", contact: "", link: "https://socallights.app/c/maple" });
  assert.ok(m.html.includes('href="https://socallights.app/c/maple"'));
  assert.ok(m.html.includes("Cocoa at 6."));
  assert.ok(m.text.includes("https://socallights.app/c/maple"));
});

test("quotes in a bare address cannot break out of an href", async () => {
  const m = await renderTemplate(env, "house_declined", { name: "x", reason: 'see https://socallights.app/a"onmouseover="alert(1)', link: 'https://socallights.app/x' });
  assert.ok(!/href="[^"]*"onmouseover/.test(m.html));
});

test("safeText and cleanNote", () => {
  assert.equal(safeText("a [b](c) <d> `e`"), "a ［b］（c） ＜d＞ ‘e‘");
  assert.equal(cleanNote("Come see https://x.example/a and www.y.com now\nline2"), "Come see and now line2");
  assert.equal(cleanNote("x".repeat(500)).length, 300);
});
