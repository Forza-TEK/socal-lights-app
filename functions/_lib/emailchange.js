// Changing the email of an account (F-10a). Ownership of events, homes, installer profiles, contest staff and judges is keyed on email TEXT, so a new address has to be
// written into every place the old one is used as a key, together with the account itself, in one batch (all of it or none of it).
// Matching uses the same "same person" rule as sign-in (normEmail: lowercase, no +tag, no Gmail dots), so a row saved as "Jane.Doe+lights@gmail.com" follows the account too.
// Not moved (and why): feature_orders.email and email_prefs (a receipt address and a mailing preference belong to the address, not the account), contest_comps / pass keys "u:<email>" (granted by Admin to a
// named address: Admin re-issues them), and rows of OTHER people that happen to share the address (none can: an account email is unique).
import { normEmail } from "./auth.js";

const COLS = [
  ["event_submissions", "contact_email", "id", false],
  ["posts", "contact_email", "id", false],
  ["installers", "owner_email", "id", true], // exact match on the normalized account email is how ownership is checked, so it is written normalized
  ["event_claims", "email", "id", true],
  ["judges", "email", "id", true],
];
const chunks = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

// Rows of `table` whose `col` is the same person as `oldNorm` (a LIKE on the first letter and the domain narrows it; the exact rule is checked in code).
async function rowsFor(env, table, col, pk, oldNorm) {
  const [local, domain] = oldNorm.split("@");
  const domains = domain === "gmail.com" ? ["gmail.com", "googlemail.com"] : [domain];
  const out = [];
  for (const d of domains) {
    const r = await env.DB.prepare(`SELECT ${pk} AS k, ${col} AS v FROM ${table} WHERE lower(${col}) LIKE ? LIMIT 5000`).bind(`${local[0] || ""}%@${d}`).all();
    for (const x of r.results) if (normEmail(x.v) === oldNorm) out.push(x.k);
  }
  return out;
}

// Builds the batch that moves everything from oldNorm to newNorm (newTyped: the address as the person typed it, kept as the mail address). Returns { statements, counts }.
export async function emailChangeStatements(env, user, newNorm, newTyped) {
  const oldNorm = normEmail(user.email), st = [], counts = {};
  st.push(env.DB.prepare("UPDATE users SET email = ?, login_email = ? WHERE id = ?").bind(newNorm, String(newTyped).trim().toLowerCase(), user.id));
  for (const [table, col, pk, normalized] of COLS) {
    let ids = []; try { ids = await rowsFor(env, table, col, pk, oldNorm); } catch { continue; } // a table an old database does not have is skipped
    counts[table] = ids.length;
    for (const c of chunks(ids, 80)) st.push(env.DB.prepare(`UPDATE ${table} SET ${col} = ? WHERE ${pk} IN (${c.map(() => "?").join(",")})`).bind(normalized ? newNorm : String(newTyped).trim().toLowerCase(), ...c));
  }
  // contest_staff is keyed (contest_id, email): a row for the new address that already exists wins, the old one is dropped
  try {
    const staff = (await env.DB.prepare("SELECT contest_id, email FROM contest_staff WHERE lower(email) LIKE ? LIMIT 2000").bind(`${oldNorm[0]}%@%`).all()).results.filter((r) => normEmail(r.email) === oldNorm);
    counts.contest_staff = staff.length;
    for (const r of staff) {
      st.push(env.DB.prepare("UPDATE OR IGNORE contest_staff SET email = ? WHERE contest_id = ? AND email = ?").bind(newNorm, r.contest_id, r.email));
      st.push(env.DB.prepare("DELETE FROM contest_staff WHERE contest_id = ? AND email = ?").bind(r.contest_id, r.email));
    }
  } catch {}
  return { statements: st, counts };
}
