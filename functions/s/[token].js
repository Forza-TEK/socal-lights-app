// /s/<token> — the unlisted sponsor invite page an organizer shares. The page is public/sponsor-invite.html; it asks /api/sponsor-invite/<token> for its content.
// Not indexed (noindex header, not in the sitemap) and never cached. An unknown or switched-off token still gets the page, which then says the link is not active (no way to tell tokens apart from the HTML).
export async function onRequestGet({ request, env }) {
  const res = await env.ASSETS.fetch(new Request(new URL("/sponsor-invite", request.url), request));
  const h = new Headers(res.headers); h.set("x-robots-tag", "noindex, nofollow"); h.set("cache-control", "no-store"); h.set("referrer-policy", "no-referrer");
  return new Response(res.body, { status: 200, headers: h });
}
