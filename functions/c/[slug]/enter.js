// /c/<slug>/enter — the entry form for one contest (public/contest-enter.html).
// A contest that does not exist sends the visitor to the contest list instead of a dead end; an old link that ended in "-" goes to the trimmed address.
import { getContest, trimmedSlugFor } from "../../_lib/contests.js";

export async function onRequestGet({ request, env, params }) {
  const url = new URL(request.url), t = await trimmedSlugFor(env, params.slug);
  if (t) return Response.redirect(`${url.origin}/c/${t}/enter${url.search}`, 301);
  let c = null; try { c = await getContest(env, params.slug); } catch {}
  if (!c) return Response.redirect(`${url.origin}/contests`, 302);
  return env.ASSETS.fetch(new Request(new URL("/contest-enter", request.url), request));
}
