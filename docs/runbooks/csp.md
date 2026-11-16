# Content Security Policy: from report-only to enforced

Today every response carries `Content-Security-Policy-Report-Only` (values in `functions/_lib/secheaders.js` and `public/_headers`, kept identical by `tests/seo-admin.test.mjs`). Nothing is blocked. Since 2026-11-16 the policy also lists the Cloudflare analytics beacon (`https://static.cloudflareinsights.com` in `script-src`, `https://cloudflareinsights.com` in `connect-src`), which loaded on every page and would have been blocked.

## What would still break if it were enforced today
- `script-src 'unsafe-inline'` is needed by the many inline scripts (theme, early data fetch, page modules). Removing it needs nonces or moving the inline code to files.
- `style-src 'unsafe-inline'` is needed by inline `<style>` and style attributes.
- `https://fonts.googleapis.com` / `fonts.gstatic.com` are only needed by the server-rendered pages (the map self-hosts its font).
- Stripe: payment pages are reached by navigation (`form-action checkout.stripe.com`), no Stripe script is loaded on our pages.

## Path to enforcement (nothing here is urgent)
1. Collect reports. No collector is deployed on purpose: every page view would invoke a Function (free-plan quota). Use a free report collector (for example report-uri.com, free tier) by adding `report-uri <their address>` to the header, or open the map, a contest, the add forms, sign-in, a payment return, Help, Admin and a city page with the browser console open and read the "[Report Only]" lines. Do this in the iPhone app too (Safari Web Inspector, device attached).
2. Fix what shows up (add the host, or remove the call).
3. Enforce the directives that do not depend on inline code first, as a second header `Content-Security-Policy: frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self' checkout.stripe.com`. These are safe now.
4. Replace inline scripts with files (or add per-response nonces in `functions/_middleware.js`), drop `'unsafe-inline'` from `script-src`, keep the report-only header with the full policy for a week, then rename it.
5. Update `tests/seo-admin.test.mjs`, which currently asserts there is no enforced CSP.
