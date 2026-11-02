// Server-side tidying of submitted fields, with the same rules the forms use (public/norm.js).
import { normPhone, PHONE_HELP, normName, normStreet, normZip, normText, tidy, normEmailText, normRadio } from "../../public/norm.js";
import { clean } from "./util.js";
export { normName, normStreet, normZip, normText, tidy, normEmailText, normRadio, PHONE_HELP };

// An optional phone: blank is fine; otherwise it must be a US number and is saved as (310) 555-0123.
export function phoneField(raw) {
  const s = clean(raw, 40);
  if (!s) return { value: "" };
  const p = normPhone(s);
  return p ? { value: p.value } : { error: PHONE_HELP };
}
// Clean a single-line text field: no control characters, tidy spaces, length limit
export const line = (v, max) => tidy(clean(v, max * 2)).slice(0, max);
