// What kind of picture is this, judged by its first bytes (not by what the browser said it was). Returns { ext, type } or null.
export function sniffImage(bytes) {
  const b = new Uint8Array(bytes.slice(0, 12));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", type: "image/png" };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return { ext: "webp", type: "image/webp" };
  return null;
}

// F-06: pixel size read from the header bytes only (no decoding, no library). Returns { w, h } or null when the header cannot be read.
// JPEG: the first SOF marker; PNG: the IHDR chunk; WebP: VP8 (lossy), VP8L (lossless) or VP8X (extended).
export function imageSize(bytes) {
  const b = new Uint8Array(bytes), n = b.length;
  if (n > 3 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < n) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      const len = (b[i + 2] << 8) | b[i + 3];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] };
      if (len < 2) return null;
      i += 2 + len;
    }
    return null;
  }
  if (n >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const u = (o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
    return { w: u(16), h: u(20) };
  }
  if (n >= 30 && b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45) {
    const tag = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (tag === "VP8X") return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    if (tag === "VP8L" && b[20] === 0x2f) { const v = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24); return { w: 1 + (v & 0x3fff), h: 1 + ((v >>> 14) & 0x3fff) }; }
    if (tag === "VP8 " && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) return { w: (b[26] | (b[27] << 8)) & 0x3fff, h: (b[28] | (b[29] << 8)) & 0x3fff };
  }
  return null;
}

// Limits (F-06). The add form shrinks every photo to 1600 px on the device, so these only stop a script that sends originals.
export const MAX_SIDE_PX = 8000, MAX_PIXELS = 40_000_000, MAX_TOTAL_BYTES = 24 * 1024 * 1024;
// A plain-words problem with this picture's size, or "" when it is fine or its header cannot be read (the bytes were already checked as a real JPG, PNG or WebP).
export function sizeProblem(bytes) {
  const s = imageSize(bytes);
  if (!s) return "";
  if (!s.w || !s.h || s.w > MAX_SIDE_PX || s.h > MAX_SIDE_PX || s.w * s.h > MAX_PIXELS) return "A photo is too many pixels wide or tall. Use photos under 8000 pixels on a side (a phone photo shared at normal size is fine).";
  return "";
}
