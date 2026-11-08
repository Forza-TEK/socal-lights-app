// City and event pages (audit seo H1/H6): cards that link to /e/<id>, richer event pages, share and weekly-list boxes.
import test from "node:test";
import assert from "node:assert/strict";
import { onRequestGet as cityPage } from "../functions/in/[city].js";
import { onRequestGet as eventPage, summary } from "../functions/e/[id].js";
import { addrParts, eventTitle, eventDesc, secureUrl, usefulHours, whereText } from "../functions/_lib/eventld.js";
import { newEnv, addEvent } from "./_pay.mjs";

const lds = (h) => [...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].flatMap((m) => JSON.parse(m[1].replace(/\\u003c/g, "<"))).filter(Boolean);

const seedCity = () => {
  const { env, raw } = newEnv();
  addEvent(raw, "a", { name: "Candy Lane", city: "Altadena" });
  raw.prepare("UPDATE events SET status='confirmed', image='http://img.example.org/a.jpg', free=0, price='$12', venue='Candy Lane Park', address='100 Main St, Altadena, CA 91001', blurb='Lights & more', url='https://tickets.example.org/x' WHERE id='a'").run();
  addEvent(raw, "b", { name: "Tree Night", city: "Altadena" }); raw.prepare("UPDATE events SET status='confirmed' WHERE id='b'").run();
  addEvent(raw, "c", { name: "Maybe Fest", city: "Altadena" });
  addEvent(raw, "d", { name: "Elsewhere", city: "Pasadena" }); raw.prepare("UPDATE events SET status='confirmed' WHERE id='d'").run();
  return env;
};

test("city page: cards link to /e/<id>, keep an Open on the map action, Event data points at /e/, share and weekly list present", async () => {
  const env = seedCity(), r = await cityPage({ request: new Request("https://x.test/in/altadena"), env, params: { city: "altadena" }, waitUntil() {}, });
  const h = await r.text();
  assert.match(h, /<h3><a href="\/e\/a">Candy Lane<\/a><\/h3>/);
  assert.match(h, /href="\/#e-a"[^>]*>Open on the map</);
  assert.doesNotMatch(h, /<a class="ev" href="\/#e-/);
  const ld = lds(h).filter((x) => x["@type"] === "Event");
  assert.ok(ld.length >= 2); for (const e of ld) assert.match(e.url, /^https:\/\/x\.test\/e\//);
  const a = ld.find((e) => e.name === "Candy Lane");
  assert.equal(a.location.address.streetAddress, "100 Main St"); assert.equal(a.location.address.postalCode, "91001"); assert.deepEqual(a.image, ["https://img.example.org/a.jpg"]); assert.equal(a.offers.price, "12");
  assert.match(h, /data-share data-url="https:\/\/x\.test\/in\/altadena"/);
  assert.match(h, /<form class="sub-form" data-sub-form data-city="Altadena" data-src="city"/); assert.match(h, /src="\/subscribe\.js\?v=/); assert.match(h, /Get the weekly list/);
});

test("event page: summary, details, more in the city linking to /e/, nearby cities, share, weekly list, https photo", async () => {
  const env = seedCity(), r = await eventPage({ request: new Request("https://x.test/e/a"), env, params: { id: "a" }, waitUntil() {} });
  const h = await r.text();
  assert.match(h, /Candy Lane takes place in Altadena, [^.]* County/); assert.match(h, /Price: \$12\./);
  assert.match(h, /<h2>Details<\/h2>/); assert.match(h, /<dt>Where<\/dt><dd>Candy Lane Park, 100 Main St, Altadena, CA 91001 · <a href="https:\/\/www\.google\.com\/maps\/dir/);
  assert.match(h, /<h2>More events in Altadena<\/h2>/); assert.match(h, /href="\/e\/b"/); assert.match(h, /href="\/e\/c"/); assert.doesNotMatch(h, /href="\/e\/a"[^>]*class="ev"/);
  assert.match(h, /data-share data-url="https:\/\/x\.test\/e\/a"/); assert.match(h, /data-sub-form data-city="Altadena" data-src="event"/);
  assert.match(h, /og:image" content="https:\/\/img\.example\.org\/a\.jpg"/); assert.doesNotMatch(h, /http:\/\/img\.example\.org/);
  assert.match(h, /href="\/#e-a"/);
  const ld = lds(h).find((x) => x["@type"] === "Event");
  assert.equal(ld.url, "https://x.test/e/a"); assert.equal(ld.location.address.postalCode, "91001");
});

test("event helpers: address split, title and description limits, useful hours, one place line, https upgrade, plain-words summary", () => {
  assert.deepEqual(addrParts("555 The Shops at Mission Viejo, Mission Viejo, CA 92691", "Mission Viejo"), { street: "555 The Shops at Mission Viejo", zip: "92691" });
  assert.deepEqual(addrParts("W Main St", "Alhambra"), { street: "W Main St", zip: "" });
  const e = { n: "Alhambra Lunar New Year Festival Celebration Extravaganza", city: "Alhambra", c: "Los Angeles", s: "2027-02-13", e: "2027-02-13", h: "Feb 13, daytime; check site", a: "Main Street, Downtown Alhambra, W Main St & S Garfield Ave, Alhambra, CA 91801", v: "", b: "A long blurb ".repeat(30), st: "c", p: "", free: true, t: "lunar" };
  assert.ok(eventTitle(e).length <= 60); assert.ok(eventDesc(e).length <= 155);
  assert.equal(usefulHours(e), ""); assert.equal(usefulHours({ ...e, h: "6pm-9pm" }), "6pm-9pm");
  assert.ok(!/Alhambra, CA 91801, Alhambra\.?$/.test(whereText(e)), "the city is not added twice");
  assert.equal(secureUrl("http://a.example/x.jpg"), "https://a.example/x.jpg"); assert.equal(secureUrl("javascript:alert(1)"), "");
  assert.match(summary(e, false), /Admission is free\./); assert.match(summary({ ...e, st: "e" }, false), /estimated from past years/);
});

