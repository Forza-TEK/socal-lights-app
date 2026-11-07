// ORGANIZER-COLLECTED SPONSORS (owner decision 2026-11-07). The site is NOT a party to sponsor money: the organizer collects it, receipts it and reports it. SoCal Lights does not process, hold or
// guarantee it. This file holds the rules in one place; functions/api/contests/[slug]/sponsors.js (organizer), functions/api/admin/sponsors.js (Admin) and the contest page all use them.
//
// A record: sponsor contact name, company name (contest_sponsors.name), website, phone, email, logo, level (the existing tiers), optional amount, and HOW the sponsorship counts:
//   basis 'paid'    : the organizer ticked "I collected this payment myself" with a date and a method (free text); an optional receipt or paid invoice is stored PRIVATELY.
//   basis 'in_kind' : donated in kind (goods or services, no money); needs a short note saying what was given.
//   basis ''        : neither confirmed yet. Saved as a draft record, never shown.
//   basis 'legacy'  : rows made before this feature; shown as before.
// SHOWN ON THE CONTEST PAGE only when: the organizer ticked "show on the contest page" AND the basis is paid or in_kind (or legacy) AND the organizer ticked that they have the sponsor's permission to list
// their name and logo AND Admin has not hidden it. Public output carries only logo, company name and website, labelled "Sponsor". Contact details and receipts are never public.
import { clean, webUrl, validHost } from "./util.js";

export const TIERS = ["presenting", "gold", "silver", "prize"];
export const TIER_LABEL = { presenting: "Presenting sponsor", gold: "Gold", silver: "Silver", prize: "Prize sponsor" };
export const MAX_SPONSORS = 12;
export const LOGO_MAX = 600 * 1024;
export const RECEIPT_MAX = 5 * 1024 * 1024;
export const METHOD_SUGGESTIONS = ["Cash", "Check", "Bank transfer", "Card on my own system", "Invoice paid"];
export const SPONSOR_SAYS = "Sponsors support this contest; they do not influence who wins. Sponsorship payments go to the organizer.";
export const RESPONSIBILITY = "You are responsible for collecting, receipting and reporting any sponsorship money. SoCal Lights does not process, hold or guarantee it. You must have the sponsor's permission to list their name, logo and contact details.";
// The SQL condition (on a contest_sponsors row) that makes a sponsor public.
export const PUBLIC_WHERE = "status = 'approved' AND show_public = 1 AND hidden_by_admin = 0 AND permission = 1 AND (basis = 'legacy' OR basis = 'paid' OR (basis = 'in_kind' AND in_kind_note != ''))";
export const isPublic = (r) => (r.status || "approved") === "approved" && !!r.show_public && !r.hidden_by_admin && !!r.permission && (r.basis === "legacy" || r.basis === "paid" || (r.basis === "in_kind" && !!r.in_kind_note));

export function sniffImage(bytes) {
  const b = new Uint8Array(bytes.slice(0, 12));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", type: "image/png" };
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return { ext: "webp", type: "image/webp" };
  return null;
}
// A receipt is a PDF, JPG or PNG (not WebP).
export function sniffReceipt(bytes) {
  const b = new Uint8Array(bytes.slice(0, 12));
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return { ext: "pdf", type: "application/pdf" };
  const i = sniffImage(bytes);
  return i && i.ext !== "webp" ? i : null;
}
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");

// Reads and checks the form fields shared by create and update. Returns { error } or { v }.
export function readSponsorForm(form) {
  const g = (k, n) => clean(form.get(k), n);
  const rawUrl = g("url", 200), url = rawUrl ? webUrl(rawUrl) : "", email = g("email", 120).toLowerCase(), basis = ["paid", "in_kind"].includes(form.get("basis")) ? form.get("basis") : "";
  const v = { name: g("name", 80), contact_name: g("contact_name", 80), tier: TIERS.includes(form.get("tier")) ? form.get("tier") : "prize", url, phone: g("phone", 40), email,
    basis, paid_date: g("paid_date", 10), paid_method: g("paid_method", 40), in_kind_note: g("in_kind_note", 200), show_public: form.get("show") === "1" ? 1 : 0, permission: form.get("permission") === "1" ? 1 : 0, amount_cents: null };
  if (v.name.length < 2) return { error: "Enter the sponsor's company name." };
  if (rawUrl && !url) return { error: "Enter a valid website address, like example.com." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid sponsor email, or leave it blank." };
  const amt = g("amount", 12).replace(/[$,\s]/g, "");
  if (amt) { if (!/^\d{1,7}(\.\d{1,2})?$/.test(amt)) return { error: "Enter the amount as a number, like 500 or 250.50, or leave it blank." }; v.amount_cents = Math.round(Number(amt) * 100); }
  if (basis === "paid") {
    if (form.get("collected") !== "1") return { error: "Tick \"Payment collected by me (the organizer)\" to confirm you received the money yourself." };
    if (!isDate(v.paid_date)) return { error: "Enter the date you received the payment." };
    if (v.paid_method.length < 2) return { error: "Say how it was paid (cash, check, bank transfer, card on your own system, invoice paid, or your own words)." };
  } else if (basis === "in_kind") { if (v.in_kind_note.length < 3) return { error: "Say what was donated in kind (for example: 20 yard signs, a gift card, printing)." }; }
  if (v.show_public && !basis) return { error: "To show a sponsor on the contest page, confirm that you collected the payment, or mark it donated in kind." };
  if (v.show_public && !v.permission) return { error: "Tick that you have the sponsor's permission to list their name and logo." };
  if (basis !== "paid") { v.paid_date = ""; v.paid_method = ""; }
  if (basis !== "in_kind") v.in_kind_note = "";
  return { v };
}

// What the organizer (and Admin) sees for one record. Never the receipt key, only whether there is one.
export const staffView = (r) => ({ id: r.id, name: r.name, contact_name: r.contact_name, tier: r.tier, url: r.url, phone: r.phone, email: r.email, logo: !!r.logo, amount_cents: r.amount_cents, basis: r.basis, paid_date: r.paid_date, paid_method: r.paid_method,
  in_kind_note: r.in_kind_note, receipt: !!r.receipt, receipt_name: r.receipt_name || "", show_public: !!r.show_public, permission: !!r.permission, hidden_by_admin: !!r.hidden_by_admin, shown: isPublic(r), status: r.status || "approved", source: r.source || "organizer", message: r.message || "", level_label: r.level_label || "", decline_note: r.decline_note || "" });
// ---- Sponsor self-service (the safer path: the site never takes a sponsor's money) ----
// The organizer's payment link and invite link are for contests that are live AND whose organizer we can trust: an organizer we could not tie to a website carries a review note until Admin clicks
// "Looks fine", so note === "" means the organizer matched their website or Admin vouched for them.
export const selfServiceReason = (c) => (!c ? "That contest doesn't exist." : c.status !== "live" ? "Your contest has to be live before you can invite sponsors." : c.note ? "We are still checking your contest. Once we have approved it, you can add a payment link and invite sponsors." : c.sponsor_admin_off ? "Sponsor invitations are switched off for this contest. Write to info@socallights.app." : "");
export const selfServiceOn = (c) => !selfServiceReason(c);
export const newToken = () => { const b = crypto.getRandomValues(new Uint8Array(18)); return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
export const TOKEN_RE = /^[A-Za-z0-9_-]{24}$/;

// The payment link: https only, a real host name, no user name or password in it, no look-alike (punycode) host, no javascript: or data: (anything but https is refused).
// Returns { url } ("" when empty) or { error }.
export function payLink(raw) {
  const s = clean(raw, 200); if (!s) return { url: "" };
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) && !/^https:\/\//i.test(s)) return { error: "The payment link must start with https://" };
  let u; try { u = new URL(/^https:\/\//i.test(s) ? s : "https://" + s); } catch { return { error: "That doesn't look like a web address. Use a link like https://example.com/your-payment-page." }; }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== "https:" || u.username || u.password) return { error: "The payment link must be a plain https:// link with no user name or password." };
  if (!validHost(host)) return { error: "That payment link's address isn't valid." };
  if (host.split(".").some((l) => l.startsWith("xn--"))) return { error: "Links with look-alike (international) characters in the address aren't allowed. Use the plain address." };
  return { url: u.href, host };
}
// Plain text only: control characters out, angle brackets out (it is escaped again wherever it is shown).
export const plainText = (v, n) => clean(String(v ?? "").replace(/[<>]/g, ""), n);
// Up to 3 levels: label up to 40 characters and an amount in dollars (display only).
export function parseLevels(raw) {
  let list = raw; if (typeof raw === "string") { try { list = JSON.parse(raw); } catch { return { error: "The levels couldn't be read." }; } }
  if (!Array.isArray(list)) return { levels: [] };
  const out = [];
  for (const x of list) {
    if (out.length >= 3) break;
    const label = plainText(x && x.label, 40); if (!label) continue;
    const d = String((x && (x.dollars ?? "")) ?? "").replace(/[$,\s]/g, ""); let cents = null;
    if (d) { if (!/^\d{1,6}(\.\d{1,2})?$/.test(d)) return { error: `The amount for "${label}" must be a number, like 250.` }; cents = Math.round(Number(d) * 100); }
    out.push({ label, cents });
  }
  return { levels: out };
}
export const levelsOf = (c) => { try { const l = JSON.parse(c.sponsor_levels || "[]"); return Array.isArray(l) ? l.slice(0, 3) : []; } catch { return []; } };

// What the contest page sees: logo, name and website only.
export const publicView = (r) => ({ id: r.id, name: r.name, tier: r.tier, url: r.url, logo: !!r.logo });
