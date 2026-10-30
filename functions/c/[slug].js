// /c/<slug> — the public page for one contest (the QR code points here). The page itself is public/contest.html.
export async function onRequestGet({ request, env }) {
  return env.ASSETS.fetch(new Request(new URL("/contest", request.url), request));
}
