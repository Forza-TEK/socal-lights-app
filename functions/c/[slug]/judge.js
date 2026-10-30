// /c/<slug>/judge — the judges' ballot (public/judge.html).
export async function onRequestGet({ request, env }) {
  return env.ASSETS.fetch(new Request(new URL("/judge", request.url), request));
}
