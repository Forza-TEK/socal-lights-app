// /c/<slug>/judge — the judges' ballot (public/judge.html). An old link that ended in "-" goes to the trimmed address.
import { trimmedSlugFor } from "../../_lib/contests.js";

export async function onRequestGet({ request, env, params }) {
  const url = new URL(request.url), t = await trimmedSlugFor(env, params.slug);
  if (t) return Response.redirect(`${url.origin}/c/${t}/judge${url.search}`, 301);
  return env.ASSETS.fetch(new Request(new URL("/judge", request.url), request));
}
