// Contests are free (no pass, no limit) for organizations on the owner's own domains, and only those: whole-label matches, never lookalikes.
import test from "node:test";
import assert from "node:assert/strict";
import { FREE_DOMAINS, freeDomain, orgState, entitlementView } from "../functions/_lib/passes.js";
import { newEnv, ptToday } from "./_pay.mjs";

test("free domains: the owner's domains and their subdomains and account emails are free; lookalikes are not", () => {
  assert.deepEqual(FREE_DOMAINS, ["zerae.com", "forza-tek.com"]);
  for (const k of ["d:zerae.com", "d:forza-tek.com", "d:city.zerae.com", "u:rey@forza-tek.com", "u:Rey@Zerae.com", "u:a@mail.forza-tek.com"]) assert.equal(freeDomain(k), true, k);
  for (const k of ["d:notzerae.com", "d:forza-tek.com.evil.com", "d:zerae.com.au", "u:me@gmail.com", "u:me@forza-tek.com.evil.com", "u:forza-tek.com@gmail.com", "d:covinaca.gov", "", null, undefined]) assert.equal(freeDomain(k), false, String(k));
});

test("free domains: such an organization can always create a contest, unlimited, with no offers; others still need a pass", async () => {
  const { env } = newEnv(), today = ptToday();
  for (const key of ["d:forza-tek.com", "u:rey@zerae.com"]) {
    const ent = await orgState(env, key, today);
    assert.equal(ent.canCreate, true, key); assert.equal(ent.unlimited, true);
    const v = entitlementView(key, ent); assert.deepEqual(v.offers, [], "no price is shown");
    assert.ok(v.comp && v.comp.until >= "2099");
  }
  const paid = await orgState(env, "d:ordinarycity.gov", today);
  assert.equal(paid.canCreate, false, "an ordinary organization still needs a pass");
  assert.equal((await orgState(env, "u:someone@gmail.com", today)).canCreate, false);
});
