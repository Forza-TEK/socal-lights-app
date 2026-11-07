// "Event info" links jump to the event on the event's own web page by adding text fragments (#:~:text=...). Pages rarely repeat our
// full title, so the link also carries shorter versions (the browser scrolls to the first one it finds).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const infoUrl = new Function(src.slice(src.indexOf("function infoUrl"), src.indexOf("function safeUrl")) + "; return infoUrl;")();
const texts = (u) => [...new URL(u).hash.matchAll(/text=([^&]+)/g)].map((m) => decodeURIComponent(m[1]));

test("the full name always comes first", () => {
  assert.deepEqual(texts(infoUrl("https://x.com/p", "Candy Cane Lane"))[0], "Candy Cane Lane");
});
test("a name that ends in generic words also tries the distinctive part", () => {
  assert.deepEqual(texts(infoUrl("https://x.com/p", "Belquest Drive Christmas Lights")), ["Belquest Drive Christmas Lights", "Belquest Drive"]);
});
test("a title that starts with the city also tries it without the city", () => {
  assert.ok(texts(infoUrl("https://x.com/p", "Lake Forest Tree Lighting Ceremony", "Lake Forest")).includes("Tree Lighting Ceremony"));
});
test("no dangling connector words, and an existing # anchor is kept", () => {
  const t = texts(infoUrl("https://x.com/p#top", "Heritage Hill Candlelight Walk & Holiday Lights"));
  assert.ok(t.every((x) => !/[&]$/.test(x)), t.join("|"));
  assert.ok(infoUrl("https://x.com/p#top", "Heritage Hill Candlelight Walk").startsWith("https://x.com/p#top:~:text="));
});
