// /installer/<slug>/manage — the owner's page for editing the profile. The page itself is public/installer-manage.html.
export async function onRequestGet({ request, env }) {
  return env.ASSETS.fetch(new Request(new URL("/installer-manage", request.url), request));
}
