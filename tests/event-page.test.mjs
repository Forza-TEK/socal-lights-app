// /e/<id>: preview tags, structured data only for confirmed upcoming events, noindex otherwise, 404 for unknown ids, sitemap entries.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as eventPage } from "../functions/e/[id].js";
import { onRequestGet as sitemap } from "../functions/sitemap.xml.js";
import { newEnv, addEvent, ptToday } from "./_pay.mjs";

const get = (env, id) => eventPage({ request: new Request("https://x.test/e/" + id), env, params: { id }, waitUntil() {} });
const seed = () => {
  const { env, raw } = newEnv();
  addEvent(raw, "conf", { name: "Candy Lane", city: "Altadena" });
  raw.prepare("UPDATE events SET status='confirmed', image='https://img.example.org/a.jpg', free=1, venue='Candy Lane', blurb='Lights & more' WHERE id='conf'").run();
  addEvent(raw, "exp", { name: "Maybe Fest" }); raw.prepare("UPDATE events SET status='expected' WHERE id='exp'").run();
  addEvent(raw, "old", { name: "Old Show", start_date: ptToday(-30), end_date: ptToday(-10) }); raw.prepare("UPDATE events SET status='confirmed' WHERE id='old'").run();
  return env;
};

test("confirmed upcoming event: own preview tags, Event data, indexable, map button", async () => {
  const h = await (await get(seed(), "conf")).text();
  assert.match(h, /<title>Candy Lane in Altadena, CA \| SoCal Lights<\/title>/);
  assert.match(h, /property="og:url" content="https:\/\/x\.test\/e\/conf"/); assert.match(h, /og:image" content="https:\/\/img\.example\.org\/a\.jpg"/);
  assert.match(h, /twitter:card/); assert.match(h, /"@type":"Event"/); assert.match(h, /"price":"0"/);
  assert.doesNotMatch(h, /name="robots"/); assert.match(h, /href="\/#e-conf"/); assert.match(h, /href="\/in\/altadena"/);
});

test("expected and ended events: no Event data, noindex; unknown id is 404", async () => {
  const env = seed();
  for (const id of ["exp", "old"]) { const h = await (await get(env, id)).text(); assert.doesNotMatch(h, /"@type":"Event"/); assert.match(h, /noindex,follow/); }
  assert.match(await (await get(env, "exp")).text(), /date estimated/);
  assert.equal((await get(env, "nope")).status, 404);
});

test("sitemap lists confirmed upcoming events only", async () => {
  const xml = await (await sitemap({ request: new Request("https://x.test/sitemap.xml"), env: seed() })).text();
  assert.match(xml, /\/e\/conf</); assert.doesNotMatch(xml, /\/e\/exp</); assert.doesNotMatch(xml, /\/e\/old</);
});
