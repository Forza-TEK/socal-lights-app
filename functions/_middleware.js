// Security headers for every response a Function produces. Static files get the same four from public/_headers
// (Pages applies _headers to static assets only, not to Function responses).
//
// Rules: never change a body, never override a header the handler already set, never throw (any problem falls through to the plain response).
// A Content-Security-Policy is deliberately NOT set here: it needs a long test across the map app, Turnstile, Google sign-in and the admin pages
// (see docs/security-headers.md). Set-Cookie and cache headers are left exactly as the handler wrote them.
const HEADERS = [
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "geolocation=(self), camera=(), microphone=()"],
  ["X-Frame-Options", "SAMEORIGIN"],
];

export async function onRequest({ next }) {
  const res = await next();
  try {
    const missing = HEADERS.filter(([k]) => !res.headers.has(k));
    if (!missing.length) return res;
    try { for (const [k, v] of missing) res.headers.set(k, v); return res; } // the usual case: headers are mutable
    catch { // an immutable response (for example one passed straight through from fetch): copy the headers onto a new Response sharing the same body
      const h = new Headers(res.headers);
      for (const [k, v] of missing) h.set(k, v);
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h, webSocket: res.webSocket, encodeBody: "automatic" });
    }
  } catch { return res; }
}
