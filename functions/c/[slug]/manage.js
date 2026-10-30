// /c/<slug>/manage — the organizer's dashboard (public/organizer.html). The data behind it is checked against the signed-in owner.
export async function onRequestGet({ request, env }) {
  return env.ASSETS.fetch(new Request(new URL("/organizer", request.url), request));
}
