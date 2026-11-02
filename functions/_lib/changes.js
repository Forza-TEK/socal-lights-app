// "Who changed what": compare a record before and after an edit, keep the differences, and tell the other people who share it.
import { newId } from "./util.js";
import { sendMail } from "./auth.js";

export const HOME_FIELDS = { title: "Display name", descr: "About it", where_txt: "Tips for visitors", season: "Season", lights_on: "Lights are on", visit: "How to see it", parking: "Parking", accessible: "Stroller and wheelchair friendly", radio: "Radio station", web: "Website", phone: "Phone for quotes", service_area: "Service area" };
export const CONTEST_FIELDS = { name: "Contest name", org: "Run by", descr: "Welcome message", entries_close: "Entries close", vote_start: "Voting starts", vote_end: "Voting ends", categories: "Voting categories", approval: "Entry approval", prize_mode: "Prize type", prize: "Prize", prizes: "Prizes per award", sponsor: "Prize provided by", rules: "Official rules", installer_name: "Presenting installer", installer_email: "Installer email", installer_url: "Installer website", show_counts: "Show vote counts", entries_open: "Entries open", voting_open: "Voting open", mode: "Who votes" };

const show = (v) => { if (v === 1 || v === true) return "Yes"; if (v === 0 || v === false) return "No"; let s = String(v ?? ""); try { const j = JSON.parse(s); if (Array.isArray(j)) s = j.join(", "); } catch {} return s.length > 140 ? s.slice(0, 137) + "..." : s; };
// [{ field, label, old, new }] for each field whose value really changed
export function diff(before, after, labels) {
  const out = [];
  for (const k of Object.keys(labels)) {
    if (!(k in after)) continue;
    const a = show(before[k]), b = show(after[k]);
    if (a !== b) out.push({ field: k, label: labels[k], old: a, new: b });
  }
  return out;
}
export async function logHome(env, postId, by, changes) {
  for (const c of changes) await env.DB.prepare("INSERT INTO listing_changes (id, post_id, by_email, by_name, by_role, field, old, new) VALUES (?,?,?,?,?,?,?,?)").bind(newId(), postId, by.email, by.name || "", by.role, c.label, c.old, c.new).run();
}
export async function logContest(env, contestId, by, changes) {
  for (const c of changes) await env.DB.prepare("INSERT INTO contest_changes (id, contest_id, by_email, by_name, field, old, new) VALUES (?,?,?,?,?,?,?)").bind(newId(), contestId, by.email, by.name || "", c.label, c.old, c.new).run();
}
export const lines = (changes) => changes.map((c) => `- ${c.label}: ${c.old || "(blank)"} -> ${c.new || "(blank)"}`).join("\n");
export async function notify(env, to, subject, text) { const list = [...new Set([].concat(to).filter(Boolean))]; for (const t of list) await sendMail(env, { to: t, subject, text }).catch(() => {}); }

// The people who run a contest together: the creator and the co-organizers. `actor` is left out of the notification.
export async function teamEmails(env, c, actor) {
  const staff = (await env.DB.prepare("SELECT email FROM contest_staff WHERE contest_id = ?").bind(c.id).all()).results.map((r) => r.email);
  const all = [...new Set([c.contact_email, ...staff].filter(Boolean).map((e) => String(e).toLowerCase()))];
  return all.filter((e) => e !== String(actor || "").toLowerCase());
}
// Log what one organizer changed and tell the others. `changes` = [{ label, old, new }].
export async function teamChanged(env, c, user, changes, waitUntil) {
  if (!changes.length) return;
  const by = { email: user.email, name: user.name || user.email };
  await logContest(env, c.id, by, changes);
  const job = (async () => { const to = await teamEmails(env, c, user.email); if (to.length) await notify(env, to, `${by.name} updated ${c.name}`, `${by.name} changed:\n\n${lines(changes)}\n\nSee everything the team changed: https://socallights.app/c/${c.slug}/manage`); })();
  if (waitUntil) waitUntil(job); else await job;
}
