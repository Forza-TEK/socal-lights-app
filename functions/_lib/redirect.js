// One permanent address per page (SEO-10): "/in/Los-Angeles", "/in/los-angeles/" and "/e/<id>/" are the same page as the lowercase, slash-less address,
// so they answer 301 to it (the query string is kept). A 301 is cached by browsers and search engines: only send one to an address that really exists.
export const hasTrailingSlash = (request) => { const p = new URL(request.url).pathname; return p.length > 1 && p.endsWith("/"); };
export const permanent = (request, path) => new Response(null, { status: 301, headers: { location: path + new URL(request.url).search, "cache-control": "public, max-age=3600" } });
