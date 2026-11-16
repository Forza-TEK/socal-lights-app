// Help Center audit 2026-11-16: the articles and the Add event form say what the product does today, and no article keeps a phrase that went stale.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { makeDB } from "./_d1.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");
const { raw } = makeDB();
const rows = raw.prepare("SELECT * FROM help_articles WHERE status = 'published'").all();
const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]));
const text = (r) => [r.title, r.summary, r.keywords, r.body].join("\n");

// Each phrase was true once and is not true now. If one comes back in any article, the article is out of date again.
const STALE = [
  [/marked Expected until the dates are checked/, "an event added from a signed-in account is Confirmed (migration 0242)"],
  [/shows as Expected until we check the dates/, "an event added from a signed-in account is Confirmed"],
  [/Entries are closed/, "the contest page has no Entries are closed button; it says when entries closed"],
  [/Voting not open(?! yet)/, "the button says Voting not open yet"],
  [/with a card or Cash App Pay/, "Stripe offers card, Apple Pay, Google Pay, Amazon Pay, Cash App Pay or Link"],
  [/Promote your event/, "the menu item is Feature your event"],
  [/does not do anything for you on the site/, "the assistant offers action cards"],
  [/tap \*\*Report a problem\*\* on it/, "the link on a card is Something wrong? Tell us"],
  [/nothing to download from an app store/i, "the iPhone app is in the App Store"],
  [/not in the Apple App Store/i, "the iPhone app is in the App Store"],
];

test("no published help article keeps a phrase that went stale", () => {
  for (const r of rows) for (const [re, why] of STALE) assert.doesNotMatch(text(r), re, `${r.slug}: ${why}`);
});

test("the Add event form tells people an event from their account is Confirmed", () => {
  const f = read("public/add-event.html");
  assert.doesNotMatch(f, /Expected until/);
  assert.doesNotMatch(f, /It shows as Expected/);
  assert.doesNotMatch(f, /"Expected"\]/, "the preview tag");
  assert.match(f, /goes on the map as Confirmed either way, because you gave the dates/);
  assert.match(f, /It shows as Confirmed, because you gave the dates/);
  assert.match(f, /"Confirmed"\]/, "the preview tag");
  // what the server does
  assert.match(read("functions/api/submit-event.js"), /status: "confirmed"/);
});

test("the articles that were wrong or stale now say what the product does", () => {
  const b = (slug) => bySlug[slug].body;
  assert.match(b("add-an-event"), /Your event goes on the map as Confirmed either way, because you gave the dates/);
  assert.match(b("add-an-event"), /round \*\*\+\*\* \(Add\) button in the top bar/);
  assert.match(b("enter-your-home-in-a-contest"), /there is no \*\*Enter my home\*\* button/);
  assert.match(b("feature-an-event-or-home"), /\*\*Feature your event\*\*/);
  assert.match(b("feature-an-event-or-home"), /Apple Pay, Google Pay, Amazon Pay, Cash App Pay or Link/);
  assert.doesNotMatch(b("feature-an-event-or-home").split("tap **Pay on Stripe**")[1].split("\n")[0], /Cash App/);
  assert.match(b("ask-socal-lights-ai-assistant"), /Buttons it can offer/);
  assert.match(b("ask-socal-lights-ai-assistant"), /nothing is sent or changed until you tap a button/);
  assert.match(b("edit-or-cancel-your-event"), /\*\*Video link\*\*.*YouTube or Vimeo/);
  assert.match(b("i-cannot-vote"), /\*\*Voting not open yet\*\*.*\*\*Voting is paused\*\*.*\*\*Voting is over\*\*/);
  assert.match(b("wheelchair-and-stroller-friendly-places"), /\*\*Something wrong\? Tell us\*\*/);
  assert.match(b("install-the-app"), /search for \*\*SoCal Lights\*\*/);
});

test("the wording the articles quote is the wording the contest page uses", () => {
  const page = read("public/contest.html"), fmt = read("public/contestfmt.js");
  for (const s of ["Voting not open yet", "Voting is paused", "Voting is over"]) assert.ok(page.includes(s), s);
  assert.ok(fmt.includes("The organizer has paused new entries for now."));
  assert.ok(read("public/app.js").includes("Something wrong? Tell us"));
  assert.ok(read("public/index.html").includes('id="addbtn"'), "the + Add button in the top bar");
});

test("every link between help articles goes to a published article", () => {
  for (const r of rows) for (const [, slug] of r.body.matchAll(/\]\(\/help\/([a-z0-9-]+)\)/g)) assert.ok(bySlug[slug], `${r.slug} links to missing article ${slug}`);
});

test("help text quotes no price of ours (they are on /pricing); the one dollar amount is an example event price", () => {
  for (const r of rows) {
    const found = (text(r).match(/\$\s?\d[\d,.]*/g) || []);
    if (r.slug === "add-an-event") assert.deepEqual(found, ["$15"]); else assert.deepEqual(found, [], r.slug);
  }
});

test("the assistant's knowledge file matches the product on the three audited passages", () => {
  const kb = read("docs/ai-assistant-kb.md");
  assert.match(kb, /round \+ \(Add\) button/);
  assert.doesNotMatch(kb, /The map has two buttons at the top right/);
  assert.match(kb, /tap Something wrong\? Tell us on it/);
  assert.doesNotMatch(kb, /by card or Cash App Pay|with a card or Cash App Pay/);
  assert.match(kb, /Apple Pay, Google Pay, Amazon Pay, Cash App Pay or Link/);
  assert.match(kb, /Yes, for iPhone: SoCal Lights is in the Apple App Store/);
});

test("help migrations are add-only: this audit changes articles only where nobody edited them in Admin", () => {
  for (const f of readdirSync(join(root, "migrations")).filter((n) => /^02(6[7-9]|7\d)_help_.*\.sql$/.test(n))) {
    const sql = read("migrations/" + f);
    assert.doesNotMatch(sql, /^(DELETE|DROP|ALTER)\b/im, f);
    const n = (re) => (sql.match(re) || []).length;
    assert.equal(n(/^UPDATE help_articles/gm), n(/ AND updated_by = 'seed';$/gm), f + ": every UPDATE is limited to articles nobody edited");
    assert.equal(n(/^INSERT /gm), n(/^INSERT OR IGNORE INTO help_articles/gm), f);
  }
});
