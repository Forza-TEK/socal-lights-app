// robots.txt courtesy for our own fetches (functions/_lib/robots.js).
import test from "node:test";
import assert from "node:assert/strict";
import { parseRobots, robotsAllows, robotsCheck, _clearRobotsCache } from "../functions/_lib/robots.js";

const ok = (txt, path, token) => robotsAllows(parseRobots(txt, token), path);

test("the group for our name beats *, and * applies when we are not named", () => {
  const txt = "User-agent: *\nDisallow: /\n\nUser-agent: SoCalLightsBot\nAllow: /\nDisallow: /private/\n";
  assert.equal(ok(txt, "/events/x"), true); assert.equal(ok(txt, "/private/a"), false);
  assert.equal(ok("User-agent: *\nDisallow: /\n", "/anything"), false);
  assert.equal(ok("User-agent: googlebot\nDisallow: /\n", "/anything"), true, "another bot's rule is not ours");
});
test("longest match wins, Allow wins a tie, * and $ work, an empty Disallow allows everything, comments and case are ignored", () => {
  const txt = "User-agent: *\nDisallow: /calendar\nAllow: /calendar/holiday\nDisallow: /*.pdf$\nDISALLOW: /tmp # comment\n";
  assert.equal(ok(txt, "/calendar/month"), false); assert.equal(ok(txt, "/calendar/holiday/tree"), true);
  assert.equal(ok(txt, "/files/menu.pdf"), false); assert.equal(ok(txt, "/files/menu.pdf?x=1"), true); assert.equal(ok(txt, "/tmp/a"), false);
  assert.equal(ok("User-agent: *\nDisallow:\n", "/x"), true); assert.equal(ok("", "/x"), true);
  assert.equal(ok("User-agent: *\nAllow: /a\nDisallow: /a\n", "/a"), true, "tie goes to Allow");
});
test("several user-agent lines share one group", () => {
  const txt = "User-agent: foo\nUser-agent: socallightsbot\nDisallow: /nope\n";
  assert.equal(ok(txt, "/nope"), false); assert.equal(ok(txt, "/fine"), true);
});
test("robotsCheck fetches once per host (cached), treats a missing file as open, a server error as unknown (not cached), and obeys a Disallow", async () => {
  _clearRobotsCache(); let calls = 0;
  const f = (txt, status = 200) => async (u, init) => { calls++; assert.match(String(u), /\/robots\.txt$/); assert.match(init.headers["user-agent"], /SoCalLightsBot/); return new Response(txt, { status }); };
  assert.equal(await robotsCheck("https://a.test/events/1", f("User-agent: *\nDisallow: /events/\n")), false);
  assert.equal(await robotsCheck("https://a.test/about", f("never read")), true); assert.equal(calls, 1, "the second path used the cached file");
  assert.equal(await robotsCheck("https://b.test/x", f("", 404)), true);
  assert.equal(await robotsCheck("https://c.test/x", f("boom", 503)), true); const before = calls; await robotsCheck("https://c.test/y", f("boom", 503)); assert.equal(calls, before + 1, "a 5xx is not cached");
  assert.equal(await robotsCheck("https://d.test/x", async () => { throw new Error("down"); }), true);
  assert.equal(await robotsCheck("not a url"), true);
});
