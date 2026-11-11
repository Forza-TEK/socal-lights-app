// Headers on every page. Static files get them from public/_headers (Pages applies _headers to static assets only); Function responses get them from functions/_middleware.js.
// tests/seo-admin.test.mjs keeps the two in step.
// HSTS: browsers use https for a year. No includeSubDomains and no preload on purpose (other subdomains and the preload list cannot be undone quickly).
// CSP: REPORT-ONLY. Nothing is blocked; a browser only notes in its console what the policy would have blocked ("[Report Only] Refused to ...").
// To enforce it later: watch the console on the map, a contest page, the add forms, sign-in, a payment return and Admin for a while, fix what shows up, then rename the header.
export const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://tiles.openfreemap.org https://nominatim.openstreetmap.org https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com https://player.vimeo.com iframe.videodelivery.net https://*.cloudflarestream.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' checkout.stripe.com",
  "frame-ancestors 'self'",
].join("; ");
export const HSTS = "max-age=31536000";
