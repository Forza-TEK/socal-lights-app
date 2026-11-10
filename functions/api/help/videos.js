// GET /api/help/videos — which Help article carries each tutorial video: { "find-map": "find-lights-near-me", ... }.
// The Tutorials page uses it to send a video's play button to its Help article (one bigger player, same wording), so the two stay aligned.
// Several articles can share one video; the first in Help order wins. Public data only (slugs and file names).
import { json } from "../../_lib/util.js";
import { loadArticles } from "../../_lib/help.js";

export async function onRequestGet({ env }) {
  const map = {};
  for (const a of await loadArticles(env)) { if (/^[a-z0-9-]+$/.test(a.video || "") && !(a.video in map)) map[a.video] = a.slug; }
  return json(map, { headers: { "cache-control": "public, max-age=300" } });
}
