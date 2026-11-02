// Tidies boxes as people leave them, on every form, without each form having to ask:
// phone -> (310) 555-0123, website -> https://example.com/, ZIP -> 5 digits, email -> lowercase, street -> "123 Main St", names -> tidy capitals.
// A phone that can't be right gets a short message under the box. Forms keep their own checks too; this makes the text clean first.
import { normPhone, normUrl, normZip, normEmailText, normStreet, normName, normRadio, tidy, PHONE_HELP } from "/norm.js?v=20261102b";

function kind(el) {
  if (!el || !el.matches || !el.matches("input,textarea") || el.type === "password" || el.type === "file" || el.type === "checkbox" || el.type === "radio" || el.type === "hidden" || el.type === "date") return "";
  if (el.dataset.norm) return el.dataset.norm;
  const key = [el.dataset.k, el.id, el.name, el.getAttribute("autocomplete")].filter(Boolean).join(" ").toLowerCase();
  if (el.type === "tel" || /\b(tel|phone|mobile)\b|phone|^q-?p$|\bqp\b/.test(key) || el.inputMode === "tel") return "phone";
  if (el.type === "email" || /\bemail\b/.test(key)) return "email";
  if (/postal|\bzip\b|(^|[^a-z])zip($|[^a-z])/.test(key)) return "zip";
  if (el.type === "url" || el.inputMode === "url" || /(^|[^a-z])(web|website|site|url|instweb|installer_web)($|[^a-z])/.test(key)) return "url";
  if (/street|address-line1|(^|\s)e-?street/.test(key)) return "street";
  if (/(^|[^a-z])radio($|[^a-z])/.test(key)) return "radio";
  if (el.tagName === "INPUT" && (/(^|\s)(biz|org|instname|title|name|venue|sponsor)($|\s)/.test(key) || /(^|\s)(e-name|e-org|e-iname|sp-name|qn|f-name)($|\s)/.test(key) || /organization/.test(key))) return "name";
  if (el.tagName === "INPUT" && /(^|\s)(hours|price|where|lightson|lights_on|area|e-prize|sp-name)($|\s)/.test(key)) return "line";
  return "";
}
const HELP = { phone: PHONE_HELP };
const FIX = { phone: (v) => { const p = normPhone(v); return p ? { value: p.value } : { bad: true }; }, url: (v) => { const u = normUrl(v); return u ? { value: u.replace(/\/$/, "") } : { bad: true }; }, zip: (v) => { const z = normZip(v); return z ? { value: z } : { bad: true }; }, email: (v) => ({ value: normEmailText(v) }), street: (v) => ({ value: normStreet(v) }), radio: (v) => ({ value: normRadio(v) }), line: (v) => ({ value: tidy(v) }), name: (v) => ({ value: normName(v) }) };

document.addEventListener("focusin", (e) => {
  const el = e.target, k = kind(el); if (!k) return;
  if (k === "phone") { el.inputMode = "tel"; el.setAttribute("autocomplete", el.getAttribute("autocomplete") || "tel"); }
  if (k === "email" || k === "url") { el.setAttribute("autocapitalize", "none"); el.setAttribute("autocorrect", "off"); el.setAttribute("spellcheck", "false"); }
  if (k === "url") el.inputMode = "url";
  if (k === "zip") { el.inputMode = "numeric"; el.maxLength = 10; }
  if (k === "street" || k === "name") el.setAttribute("autocapitalize", "words");
});
function note(el, msg) {
  let n = el.nextElementSibling && el.nextElementSibling.classList && el.nextElementSibling.classList.contains("fixnote") ? el.nextElementSibling : null;
  if (!msg) { if (n) n.remove(); el.removeAttribute("aria-invalid"); return; }
  if (!n) { n = document.createElement("small"); n.className = "fixnote"; n.setAttribute("role", "alert"); el.insertAdjacentElement("afterend", n); }
  n.textContent = msg; el.setAttribute("aria-invalid", "true");
}
document.addEventListener("focusout", (e) => {
  const el = e.target, k = kind(el); if (!k || el.dataset.noNorm !== undefined) return;
  const raw = el.value; if (!tidy(raw)) { note(el, ""); return; }
  const r = FIX[k](raw);
  if (r.bad) { if (k === "phone") note(el, HELP.phone); else if (k === "zip") note(el, "The ZIP code needs 5 digits."); else if (k === "url") note(el, "That doesn't look like a website address. Try something like example.com."); return; }
  note(el, "");
  if (r.value !== raw) { el.value = r.value; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }
});
