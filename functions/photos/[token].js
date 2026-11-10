// /photos/<token> — the private page a city gives a homeowner to add photos of their home. The page is public/home-photos.html; it asks /api/home-photos/<token>.
// Not indexed, never cached, no referrer. An unknown or replaced token still gets the page, which then says the link is not active.
export async function onRequestGet({ request, env }) {
  const res = await env.ASSETS.fetch(new Request(new URL("/home-photos", request.url), request));
  const h = new Headers(res.headers); h.set("x-robots-tag", "noindex, nofollow"); h.set("cache-control", "no-store"); h.set("referrer-policy", "no-referrer");
  return new Response(res.body, { status: 200, headers: h });
}
