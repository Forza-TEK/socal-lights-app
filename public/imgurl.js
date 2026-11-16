// The one place that builds Cloudflare image-resizing addresses (/cdn-cgi/image/<options>/<source>).
// Only OUR OWN images are ever sent through the resizer: a photo on our domain (/img/..., /api/photo/...) or an absolute address on socallights.app. A photo hosted on
// another website is shown as it is (https), never resized. Reason: with "Resize from any origin" on, anybody can use /cdn-cgi/image/ on our domain to resize any
// image on the internet, and every different width or quality counts against the free plan's 5,000 transformations a month (audit 2026-11-16, finding H4). Keeping the
// site itself from asking for those addresses is half of the fix; the other half is the Cloudflare setting (docs/audit/2026-11-16/app-policy-decisions.md).
// Used by the map (app.js) and by the Functions that draw the event, city and share pages, so both follow the same rule (tests/image-resizer.test.mjs).
export const IMG_HOSTS = ["socallights.app", "www.socallights.app"];

// The absolute address of one of our own images, or "" when the image is somebody else's (or the address is not a plain web address).
export function ownImageUrl(u, origin = "https://socallights.app") {
  u = String(u || "").trim(); if (!u) return "";
  try {
    const x = new URL(u, origin), o = new URL(origin);
    if (x.protocol !== "https:" && x.protocol !== "http:") return "";
    if (x.username || x.password) return "";
    if (x.hostname !== o.hostname && !IMG_HOSTS.includes(x.hostname)) return "";
    return x.origin + x.pathname + x.search;
  } catch { return ""; }
}

// "/cdn-cgi/image/width=240,fit=cover/https://socallights.app/img/x.webp" for our own images, "" for anything else (the caller then uses the original).
export function resizedImage(u, options, origin = "https://socallights.app") {
  const own = ownImageUrl(u, origin);
  return own && /^[a-z0-9=,._-]+$/i.test(options) ? `/cdn-cgi/image/${options}/${own}` : "";
}
