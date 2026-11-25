// POST /api/client-error — a tiny error beacon from the map (public/errors.js): when a script throws in a visitor's browser, one short line reaches the Admin log
// (Admin > Activity log, and the digest), so front-end breakage is not invisible. At most 3 beacons per page load, 20 an hour per connection, the same line once an hour, no personal data.
import { err } from "../_lib/util.js";
import { sameOrigin } from "../_lib/auth.js";
import { logOpOnce } from "../_lib/oplog.js";
import { checkThrottle, hashKey } from "../_lib/throttle.js";

const NOISE = /ResizeObserver|Script error|extension|chrome-extension|moz-extension|safari-extension|Non-Error promise rejection|Load failed|NetworkError|Failed to fetch|AbortError|AutofillCallbackHandler|webkit\.messageHandlers|__gCrWeb/i; // the last three: scripts injected by iOS autofill and in-app browsers, not ours
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return err(403, "Not allowed.");
  const raw = await request.text().catch(() => ""); if (raw.length > 2000) return new Response(null, { status: 204 });
  let b; try { b = JSON.parse(raw); } catch { return new Response(null, { status: 204 }); }
  const m = String((b && b.m) || "").replace(/\s+/g, " ").slice(0, 160), f = String((b && b.f) || "").replace(/[?#].*$/, "").replace(/[^\w.\-]/g, "").slice(0, 60), p = String((b && b.p) || "").replace(/[^\w/\-.]/g, "").slice(0, 80), l = Math.max(0, Math.min(99999, Number(b && b.l) || 0));
  if (!m || NOISE.test(m)) return new Response(null, { status: 204 });
  const slow = await checkThrottle(env, [{ kind: "client-error-ip", key: await hashKey(env, "ip", request.headers.get("CF-Connecting-IP") || "unknown"), max: 20, windowSeconds: 3600, msg: "slow down" }]);
  if (!slow) await logOpOnce(env, "client_error", `${p || "/"} ${f}${l ? ":" + l : ""} ${m}`, 60);
  return new Response(null, { status: 204 });
}
