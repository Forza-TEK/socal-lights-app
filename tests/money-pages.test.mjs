// Pricing and payment pages (audit 2026-11-11, PAY-01/05/06/07/08/13/16/17/18/19, CON-06/07/24). Source checks: the wording and the wiring. Prices are never written in these pages.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { plansPreviewHtml } from "../public/contest-passes.js";

const read = (f) => readFileSync(f, "utf8");
const pricing = read("public/pricing.html"), pass = read("public/contest-pass.html");

test("CON-06: the three contest plans show on the pass page for signed-out visitors, with prices from /api/config, never in the app", () => {
  const cfg = { contestPasses: { plans: { pass_1: { label: "Single contest", cap: 1, cents: 14900 }, pass_5: { label: "Up to 5 contests", cap: 5, cents: 29900 }, pass_20: { label: "Up to 20 contests", cap: 20, cents: 49900 } } } };
  const h = plansPreviewHtml(cfg);
  for (const p of ["$149", "$299", "$499", "Single contest", "Up to 5 contests", "Up to 20 contests", "More than 20 contests"]) assert.ok(h.includes(p), p);
  assert.ok(!/data-pass=/.test(h), "no Choose button before sign-in");
  assert.equal(plansPreviewHtml({}), "");
  assert.ok(!/\$\d/.test(pass) && !/\$\d/.test(read("public/contest-passes.js").replace(/\/\/.*$/gm, "").replace(/\$\{/g, "")), "no price is written in the page or the shared wording");
  const signedOut = pass.slice(pass.indexOf("else if (!(await me()).user)"), pass.indexOf("} else {", pass.indexOf("else if (!(await me()).user)")));
  assert.ok(signedOut.includes("plansPreviewHtml(cfg)"));
  assert.ok(pass.indexOf("if (IN_APP)") < pass.indexOf("plansPreviewHtml(cfg)"), "the app branch comes first and shows no prices");
  assert.ok(pricing.includes("/api/config") && pricing.includes("data-pass-choose") && /IN_APP|SoCalLightsApp/.test(pricing), "Pricing shows the plans from /api/config and hides them in the app");
});

test("PAY-01: payment messages sit above the picker, are announced and scrolled into view", () => {
  assert.ok(pass.indexOf('id="msg"') < pass.indexOf('id="app"'), "the message is above the picker");
  assert.match(pass, /id="msg" role="status" aria-live="polite"/); assert.match(pass, /scrollIntoView/);
  assert.equal((pass.match(/\$\("#msg"\)\.textContent =/g) || []).length, 1, "only say() writes the message");
  for (const t of ["Payment cancelled", "Payment received", "couldn't be opened"]) assert.ok(pass.includes(t), t);
});

test("PAY-13 and PAY-06: each FAQ item belongs to tabs; the app hides paid items and says where paid options are", () => {
  const items = [...pricing.matchAll(/<details([^>]*)><summary>/g)].map((m) => m[1]);
  assert.ok(items.length >= 9 && items.every((a) => /data-for="/.test(a)), "every FAQ item is tagged with its tabs");
  assert.ok(/data-for="contests"/.test(pricing) && /data-for="events"/.test(pricing));
  assert.ok(pricing.includes("details[data-appoff]") && pricing.includes("data-paidfaq") && pricing.includes("Paid options are available at socallights.app"));
  assert.ok(pricing.includes('id="homecolon"') && pricing.includes('$("#homecolon").textContent = "."'), "no dangling colon in the app");
  assert.ok(!/with a card or Cash App Pay/.test(pricing));
});

test("PAY-19 and PAY-18: Event Partner is linked at the top of the Event organizers tab; cards can shrink", () => {
  assert.ok(pricing.indexOf('id="partnerlink"') < pricing.indexOf('id="featuredpic"') && pricing.includes('href="#partnerbox"'));
  assert.ok(/minmax\(min\(240px,100%\),1fr\)/.test(read("public/info.css")) && pricing.includes("min(200px,100%)"));
});

test("PAY-05: one refund statement per product, in Pricing, the receipts and Terms; PAY-04: Privacy covers every paid product", () => {
  assert.ok(pricing.includes("/refund-terms.js") && pricing.includes('id="refundtext"'));
  assert.ok(read("public/terms.html").includes('id="refunds"'));
  const priv = read("public/privacy.html");
  for (const w of ["contest pass", "Event Partner plan", "Sponsor placement", "renew automatically", "organization", "service emails"]) assert.ok(priv.includes(w), w);
  assert.ok(priv.includes("DRAFT (PAY-04)"), "marked for the owner's lawyer");
  assert.ok(/Updated November 11, 2026/.test(priv) && /Updated November 11, 2026/.test(read("public/terms.html")), "the Updated date logic is untouched");
});

test("PAY-07 and PAY-08: the same payment-method and no-tax wording on Pricing, Terms, the payment pages and the Help articles", () => {
  const sentence = "You can pay by card, Apple Pay, Google Pay, Amazon Pay, Cash App Pay or Link. Which options you see depends on your device and location.";
  for (const f of ["public/pricing.html", "public/terms.html", "public/feature.html", "public/sponsor.html", "migrations/0226_help_no_sales_tax.sql"]) assert.ok(read(f).includes(sentence), f);
  const tax = "The price you see is the price you pay. We do not add sales tax.";
  for (const f of ["public/pricing.html", "public/terms.html", "migrations/0226_help_no_sales_tax.sql"]) assert.ok(read(f).includes(tax), f);
  assert.ok(!/by card on Stripe|with a card or Cash App Pay|with a card;/.test(read("public/terms.html") + pricing + read("public/feature.html") + read("public/sponsor.html")));
  assert.ok(!/automatic_tax/.test(["contest-pass", "partner", "sponsor", "feature"].map((d) => read(`functions/api/${d}/checkout.js`)).join("")), "Stripe Tax is not switched on");
});

test("one-time payments do not pin payment_method_types; only the optional renewal asks for a card", () => {
  for (const d of ["contest-pass", "partner", "feature"]) assert.ok(!/payment_method_types/.test(read(`functions/api/${d}/checkout.js`)), d);
  const sp = read("functions/api/sponsor/checkout.js");
  assert.ok(/if \(renew\) \{[^}]*payment_method_types\[0\]", "card"/.test(sp), "only when the renewal box is ticked");
});

test("PAY-16: the Sponsor and Feature pages do not claim a payment that is not there", () => {
  const sp = read("public/sponsor.html"), ft = read("public/feature.html");
  assert.ok(sp.includes("Checking your payment") && sp.includes("/api/me/sponsor") && sp.includes("could not see a payment yet"));
  assert.ok(!ft.includes('"Thank you. Your payment went through."'));
});

test("PAY-17: Stripe page descriptions show dates like the emails", () => {
  for (const d of ["contest-pass", "partner", "sponsor", "feature"]) assert.ok(read(`functions/api/${d}/checkout.js`).includes("niceYmd("), d);
});

test("CON-07 and CON-24: the wizard review does not say 'right away' above a pass picker; Run it again mentions a pass and shows the allowance", () => {
  const w = read("public/add-contest.html"), o = read("public/organizer.html");
  const trust = w.slice(w.indexOf("const TRUST"), w.indexOf("\n", w.indexOf("const TRUST")));
  assert.ok(!/right away/.test(trust) && (trust.match(/after you choose a pass/g) || []).length === 4);
  assert.ok(o.includes("a pass may be needed") && o.includes("/api/contest-pass/entitlement") && o.includes("There is no room left for this one"));
});
