// A description the organizer writes for each voting category (contests.category_desc): saved on create and edit, kept to the contest's own categories,
// shown to the public, copied by "run it again", and held to the same word rules as the rest of the contest's text.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { onRequestPost as create } from "../functions/api/contests/index.js";
import { onRequestPatch as patch, onRequestGet as contestGet } from "../functions/api/contests/[slug].js";
import { cleanCatDescs, catDescOf } from "../functions/_lib/contests.js";
import { newEnv as baseEnv, addUser, ptToday, compEveryone } from "./_pay.mjs";
const newEnv = (extra) => { const r = baseEnv(extra); compEveryone(r.raw); return r; };

const O = "https://socallights.app";
const post = (env, cookie, b) => create({ request: new Request(O + "/api/contests", { method: "POST", headers: { "content-type": "application/json", cookie, origin: O }, body: JSON.stringify(b) }), env, waitUntil: () => {} });
const edit = (env, cookie, slug, b) => patch({ params: { slug }, request: new Request(O + "/api/contests/" + slug, { method: "PATCH", headers: { "content-type": "application/json", cookie, origin: O }, body: JSON.stringify({ action: "edit", ...b }) }), env, waitUntil: () => {} });
const page = async (env, slug, cookie = "") => (await contestGet({ params: { slug }, request: new Request(O + "/api/contests/" + slug, { headers: cookie ? { cookie } : {} }), env })).json();
const good = (o = {}) => ({ name: "Maple Street Showdown", org: "Maple Street Neighbors", city: "Pasadena", descr: "Neighbors decorate, everyone votes for a favorite.", site: "", closes: ptToday(10), vs: ptToday(11), ve: ptToday(25), cats: ["Best Overall", "Twinkle All the Way"], ...o });
const fields = (c, o = {}) => ({ name: c.name, org: c.org, descr: c.descr, closes: c.entriesClose, vs: c.voteStart, ve: c.voteEnd, rules: c.rules, approval: "manual", prizeMode: "none", ...o });

test("cleanCatDescs keeps only the contest's categories, one trimmed line of at most 140 characters; catDescOf survives bad JSON", () => {
  const d = cleanCatDescs({ "Best Overall": "  The home that wows   you\nmost.  ", "Nope": "not a category", "Twinkle All the Way": "", "Other": 5 }, ["Best Overall", "Twinkle All the Way", "Other"]);
  assert.deepEqual(d, { "Best Overall": "The home that wows you most.", Other: "5" });
  assert.equal(cleanCatDescs({ "Best Overall": "x".repeat(300) }, ["Best Overall"])["Best Overall"].length, 140);
  assert.deepEqual(cleanCatDescs(null, ["a"]), {}); assert.deepEqual(cleanCatDescs([1, 2], ["a"]), {});
  assert.deepEqual(catDescOf({ category_desc: "{not json" }), {}); assert.deepEqual(catDescOf({}), {}); assert.deepEqual(catDescOf({ category_desc: '["x"]' }), {});
});

test("create saves the descriptions, the public page shows them, an edit changes them, and an older page that sends none keeps what is saved", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@city.gov");
  const r = await post(env, u.cookie, good({ catDescs: { "Best Overall": "The home that wows you most.", "Twinkle All the Way": "Best use of twinkling lights.", "Not a category": "dropped" } }));
  assert.equal(r.status, 200); const slug = (await r.json()).slug;
  assert.deepEqual(JSON.parse(raw.prepare("SELECT category_desc FROM contests WHERE slug = ?").get(slug).category_desc), { "Best Overall": "The home that wows you most.", "Twinkle All the Way": "Best use of twinkling lights." });
  let p = await page(env, slug); assert.equal(p.contest.catDescs["Twinkle All the Way"], "Best use of twinkling lights.");
  let e = await edit(env, u.cookie, slug, fields(p.contest, { catDescs: { "Best Overall": "The best home overall." } })); assert.equal(e.status, 200);
  p = await page(env, slug); assert.deepEqual(p.contest.catDescs, { "Best Overall": "The best home overall." });
  e = await edit(env, u.cookie, slug, fields(p.contest, { descr: "Neighbors decorate, everyone votes for a favorite, again." })); assert.equal(e.status, 200);
  p = await page(env, slug); assert.deepEqual(p.contest.catDescs, { "Best Overall": "The best home overall." }, "no catDescs sent: the saved ones stay");
});

test("a description with a review word is held on create (the contest waits for Admin) and refused on edit; contests made before this have none", async () => {
  const { env, raw } = newEnv(); const u = await addUser(raw, "u1", "o@city.gov");
  const held = await post(env, u.cookie, good({ name: "Pine Street Lights", catDescs: { "Best Overall": "Win free crypto and bitcoin" } }));
  assert.equal(held.status, 200); assert.equal(raw.prepare("SELECT status FROM contests WHERE name = ?").get("Pine Street Lights").status, "pending");
  const u2 = await addUser(raw, "u2", "p@city.gov"), ok = await post(env, u2.cookie, good({ name: "Elm Street Lights" })); const slug = (await ok.json()).slug; // a second account: one contest waiting for review per account at a time
  assert.equal(raw.prepare("SELECT category_desc FROM contests WHERE slug = ?").get(slug).category_desc, "{}");
  const p = await page(env, slug); assert.deepEqual(p.contest.catDescs, {});
  const bad = await edit(env, u2.cookie, slug, fields(p.contest, { catDescs: { "Best Overall": "Free bitcoin giveaway" } }));
  assert.equal(bad.status, 400); assert.match((await bad.json()).error, /category description/i);
});

test("the pages: example text in the boxes, descriptions under each category, the prize once, and no stray full stop before 'for each winner'", () => {
  const ex = readFileSync("public/cat-examples.js", "utf8");
  for (const n of ["Best Overall", "Most Creative", "Best Lights & Music", "Best Traditional", "Twinkle All the Way"]) assert.ok(ex.includes(`"${n}":`), n);
  assert.match(ex, /"Example: " \+/);
  const org = readFileSync("public/organizer.html", "utf8");
  assert.match(org, /import \{ exampleFor \} from "\/cat-examples\.js\?v=20261125a"/);
  assert.match(org, /Describe each category \(optional\)/); assert.match(org, /placeholder="\$\{esc\(exampleFor\(g\)\)\}"/);
  assert.match(org, /\(c\.prizeMode === "each" && prizeOf\(g, k\)/, "the shared prize line is not repeated under every category");
  assert.match(org, /Prize for every winner: /); assert.match(org, /catDescs: readDescs\(\)/);
  const add = readFileSync("public/add-contest.html", "utf8");
  assert.match(add, /import \{ exampleFor \} from "\/cat-examples\.js\?v=20261125a"/); assert.match(add, /catDescs: Object\.fromEntries\(x\.on\.filter/);
  const pub = readFileSync("public/contest.html", "utf8");
  assert.match(pub, /const catsBox = \(\) =>/); assert.match(pub, /\$\{winnersBox\(\)\}\$\{prizeBox\(\)\}\$\{catsBox\(\)\}/);
  assert.match(pub, /replace\(\/\[\.\\s\]\+\$\/, ""\)\)\} for each winner/);
});

test("the organizer's category boxes follow the category list as it is typed: the builder is reachable from the typing handler, and a renamed line keeps its sentence", () => {
  const org = readFileSync("public/organizer.html", "utf8");
  const top = org.indexOf("const catDescFields = "), card = org.indexOf("function editCard()");
  assert.ok(top > 0 && top < card, "catDescFields is defined at module level, above editCard (a ReferenceError inside the input handler stopped the boxes refreshing)");
  assert.ok(!/function editCard\(\)[\s\S]{0,900}const catDescFields/.test(org), "no second, local copy");
  assert.match(org, /\$\("#e-cats"\)\.addEventListener\("input", syncCatDescs\)/);
  assert.match(org, /const was = lastNames\[i\]; if \(was && !names\.includes\(was\) && keep\[was\] != null\) next\[n\] = keep\[was\]/, "a renamed line keeps its description (by position)");
});
