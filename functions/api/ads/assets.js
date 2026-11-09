// GET /api/ads/assets: the creative files (pictures and videos) with absolute URLs, sha256 and the ad ids that use each one.
import { adsGuard, reply, loadAds, loadManifest, fileOut } from "../../_lib/ads.js";

export async function onRequest({ request, env }) {
  const g = await adsGuard(request, env, "GET");
  if (g.res) return g.res;
  const all = await loadAds(env), files = await loadManifest(env, request), origin = new URL(request.url).origin;
  const approved = all.items.filter((i) => i.status === "approved");
  const out = files.map((f) => ({ ...fileOut(f, origin), ad_ids: approved.filter((i) => i.asset_id === f.asset_id).map((i) => i.id) }));
  const missing = approved.filter((i) => i.asset_id && !files.some((f) => f.asset_id === i.asset_id)).map((i) => ({ ad_id: i.id, asset_id: i.asset_id }));
  const none = approved.filter((i) => !i.asset_id).map((i) => i.id);
  return reply(200, { ok: true, count: out.length, files: out, ads_missing_files: missing, ads_without_asset: none, note: "Files are public by URL but not linked or indexed. Check sha256 after download. Use only these files." });
}
