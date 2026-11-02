// One set of rules for tidying what people type, used by the forms (as you leave a box) and by the server (before saving),
// so the same text gets the same result everywhere.

// US phone numbers: 10 digits, with or without +1, spaces, dots, dashes or brackets. An extension (x123, ext 123) is kept.
// Returns { value: "(310) 356-9577", digits: "3103569577", ext: "" } or null when it can't be a US number.
export function normPhone(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(.*?)(?:\s*(?:x|ext\.?|extension|#)\s*(\d{1,6}))?\s*$/i);
  let d = (m ? m[1] : s).replace(/\D/g, ""), ext = m && m[2] ? m[2] : "";
  if (d.length === 11 && d[0] === "1") d = d.slice(1);
  if (d.length !== 10 || d[0] === "0" || d[0] === "1" || /^(\d)\1{9}$/.test(d)) return null; // area codes don't start with 0 or 1
  return { value: `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}${ext ? " x" + ext : ""}`, digits: d, ext };
}
// Show a stored phone the same way everywhere (older entries may be plain digits). Anything that isn't a US number is shown as typed.
export const fmtPhone = (raw) => { const p = normPhone(raw); return p ? p.value : String(raw ?? "").trim(); };
export const telHref = (raw) => { const p = normPhone(raw); return p ? "tel:+1" + p.digits + (p.ext ? ";ext=" + p.ext : "") : ""; };

export const PHONE_HELP = "Enter a 10-digit phone number, like (310) 555-0123.";

// Collapse runs of spaces, strip control characters.
export const tidy = (s) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F​]/g, "").replace(/\s+/g, " ").trim();

// Email: trimmed and lowercase (addresses are not case sensitive in practice).
export const normEmailText = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, "");
export const looksEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

// ZIP: the first five digits (ZIP+4 is shortened). Returns "" if there are not five digits.
export const normZip = (s) => { const m = String(s ?? "").replace(/\s/g, "").match(/^(\d{5})(?:-?\d{4})?$/); return m ? m[1] : ""; };

// Web address: trimmed, https:// added when missing, host in lowercase. Returns "" when it isn't a plausible address.
export function normUrl(s) {
  let v = String(s ?? "").trim().replace(/\s+/g, "");
  if (!v) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = "https://" + v;
  try { const u = new URL(v); if (!/^https?:$/.test(u.protocol) || !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(u.hostname)) return ""; u.hostname = u.hostname.toLowerCase(); return u.toString(); } catch { return ""; }
}

// Names (people, businesses, displays): collapse spaces, and fix text typed all in capitals or all in lowercase.
const KEEP_UP = new Set(["LLC", "INC", "LTD", "USA", "LA", "OC", "DJ", "II", "III", "HOA", "RV", "TV", "BBQ", "PTA"]);
const SMALL = new Set(["a", "an", "and", "at", "by", "for", "in", "of", "on", "or", "the", "to", "vs"]);
export function normName(s) {
  const v = tidy(s);
  const letters = v.replace(/[^A-Za-z]/g, "");
  if (letters.length < 4 || (letters !== letters.toUpperCase() && letters !== letters.toLowerCase())) return v; // mixed case: leave it alone
  return v.toLowerCase().replace(/[A-Za-z][A-Za-z'.]*/g, (w, i) => { const up = w.toUpperCase().replace(/\./g, ""); if (KEEP_UP.has(up)) return up; if (i > 0 && SMALL.has(w)) return w; return w[0].toUpperCase() + w.slice(1); });
}

// Street address: USPS-style short suffixes (St, Ave, Dr, Ln...), capital letters fixed when typed all upper or lower, tidy spaces.
const SUFFIX = { street: "St", st: "St", avenue: "Ave", ave: "Ave", av: "Ave", drive: "Dr", dr: "Dr", lane: "Ln", ln: "Ln", road: "Rd", rd: "Rd", boulevard: "Blvd", blvd: "Blvd", court: "Ct", ct: "Ct", place: "Pl", pl: "Pl", circle: "Cir", cir: "Cir", terrace: "Ter", ter: "Ter", highway: "Hwy", hwy: "Hwy", parkway: "Pkwy", pkwy: "Pkwy", trail: "Trl", trl: "Trl", way: "Way", plaza: "Plz" };
const DIR = new Set(["n", "s", "e", "w", "ne", "nw", "se", "sw"]);
export function normStreet(s) {
  let v = tidy(s).replace(/[.,]+$/g, "");
  if (!v) return "";
  const letters = v.replace(/[^A-Za-z]/g, "");
  if (letters && (letters === letters.toUpperCase() || letters === letters.toLowerCase())) v = v.toLowerCase().replace(/[a-z][a-z']*/g, (w) => w[0].toUpperCase() + w.slice(1));
  const words = v.split(" ");
  // the suffix is the last word, or the word before a unit like "Apt 4" or "#12"
  let k = words.length - 1; const u = words.findIndex((w, i) => i > 0 && /^(apt|apartment|unit|ste|suite|#|bldg|building|fl|floor)\b/i.test(w));
  if (u > 1) k = u - 1;
  const key = (words[k] || "").replace(/\./g, "").toLowerCase();
  if (k > 0 && SUFFIX[key]) words[k] = SUFFIX[key];
  return words.map((w, i) => (DIR.has(w.replace(/\./g, "").toLowerCase()) && i > 0 && i < words.length - 1 ? w.replace(/\./g, "").toUpperCase() : w)).join(" ");
}
// Free text that is part of a listing (descriptions, tips): tidy spaces only, keep line breaks.
export const normText = (s) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F​]/g, "").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
// Radio station: "88.1fm" -> "88.1 FM"
export const normRadio = (s) => { const v = tidy(s); const m = v.match(/^(\d{2,3}(?:\.\d)?)\s*(fm|am)?$/i); return m ? `${m[1]} ${(m[2] || "FM").toUpperCase()}` : v; };
