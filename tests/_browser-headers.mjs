// Loaded before every test file (npm test: node --import). A real browser always adds Sec-Fetch-Site to a request, and sameOrigin() (F-42) refuses a state-changing
// request that has neither Origin nor Sec-Fetch-Site. Tests build bare Requests, so this makes a POST/PUT/PATCH/DELETE without those headers look like a same-site
// browser call. A test that wants the "script with no browser headers" case sends the header  x-bare-client: 1  (removed here, so nothing is added).
const Native = globalThis.Request;
globalThis.Request = class extends Native {
  constructor(input, init) {
    const method = String((init && init.method) || (input && input.method) || "GET").toUpperCase();
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      const h = new Headers((init && init.headers) || (input && input.headers) || undefined);
      if (h.has("x-bare-client")) h.delete("x-bare-client");
      else if (!h.has("origin") && !h.has("sec-fetch-site")) h.set("sec-fetch-site", "same-origin");
      init = { ...(init || {}), headers: h };
    }
    super(input, init);
  }
};
