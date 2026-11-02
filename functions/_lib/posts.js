// Shared helpers for homes people posted: moving photos between the private pending/ folder and the public p/ folder.
export async function movePhotos(env, row, from, to) {
  const keys = JSON.parse(row.photos || "[]"), out = [];
  for (const k of keys) {
    if (!k.startsWith(from)) { out.push(k); continue; }
    const obj = await env.PHOTOS.get(k);
    if (!obj) continue;
    const nk = to + k.slice(from.length);
    await env.PHOTOS.put(nk, obj.body, { httpMetadata: obj.httpMetadata });
    out.push(nk);
  }
  await Promise.all(keys.filter((k) => k.startsWith(from)).map((k) => env.PHOTOS.delete(k)));
  return out;
}
