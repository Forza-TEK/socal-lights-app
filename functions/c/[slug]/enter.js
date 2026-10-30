// /c/<slug>/enter — the entry form for one contest (public/contest-enter.html).
export async function onRequestGet({ request, env }) {
  return env.ASSETS.fetch(new Request(new URL("/contest-enter", request.url), request));
}
